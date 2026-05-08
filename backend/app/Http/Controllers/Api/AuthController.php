<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email:rfc,dns|max:255',
            'password' => 'required|string|min:8|max:255',
        ]);

        try {
            $result = $this->authService->login(
                strtolower(trim($validated['email'])),
                $validated['password'],
                $request->header('User-Agent', 'api')
            );

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid credentials',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout();
        return response()->json(['status' => 'success', 'message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->authService->me(),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        $user = $request->user();

        if (!$user) {
            abort(401);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        $user->tokens()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Password updated successfully.',
        ]);
    }

    public function sendForgotPasswordOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email:rfc,dns|max:255',
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::query()->where('email', $email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => 'No account found with this email address.',
            ]);
        }

        $rateLimitKey = sprintf('forgot-password:otp:%s', sha1($email));
        if (RateLimiter::tooManyAttempts($rateLimitKey, 3)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            return response()->json([
                'status' => 'error',
                'message' => "Too many OTP requests. Try again in {$seconds} seconds.",
            ], 429);
        }

        $otp = (string) random_int(100000, 999999);
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token' => Hash::make($otp),
                'created_at' => now(),
            ]
        );

        try {
            Mail::raw(
                "Your OMS password reset OTP is: {$otp}. It will expire in 5 minutes.",
                function ($message) use ($email) {
                    $message->to($email)->subject('OMS Password Reset OTP');
                }
            );
        } catch (Throwable $e) {
            Log::error('Forgot password OTP mail failed.', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'email' => 'Unable to send OTP email right now. Please contact admin to verify SMTP settings.',
            ]);
        }

        RateLimiter::hit($rateLimitKey, 900);

        return response()->json([
            'status' => 'success',
            'message' => 'OTP sent to your registered email address.',
        ]);
    }

    public function verifyForgotPasswordOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email:rfc,dns|max:255',
            'otp' => 'required|digits:6',
        ]);

        $email = strtolower(trim($validated['email']));
        $otp = $validated['otp'];

        $row = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (!$row || !$row->created_at) {
            throw ValidationException::withMessages([
                'otp' => 'OTP not found. Please request a new OTP.',
            ]);
        }

        $createdAt = now()->parse($row->created_at);
        if ($createdAt->lt(now()->subMinutes(5))) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            throw ValidationException::withMessages([
                'otp' => 'OTP expired. Please request a new OTP.',
            ]);
        }

        if (!Hash::check($otp, $row->token)) {
            throw ValidationException::withMessages([
                'otp' => 'Invalid OTP.',
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'OTP verified successfully.',
        ]);
    }

    public function resetForgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email:rfc,dns|max:255',
            'otp' => 'required|digits:6',
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        $email = strtolower(trim($validated['email']));
        $otp = $validated['otp'];

        $row = DB::table('password_reset_tokens')->where('email', $email)->first();
        if (!$row || !$row->created_at) {
            throw ValidationException::withMessages([
                'otp' => 'OTP not found. Please request a new OTP.',
            ]);
        }

        $createdAt = now()->parse($row->created_at);
        if ($createdAt->lt(now()->subMinutes(5))) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            throw ValidationException::withMessages([
                'otp' => 'OTP expired. Please request a new OTP.',
            ]);
        }

        if (!Hash::check($otp, $row->token)) {
            throw ValidationException::withMessages([
                'otp' => 'Invalid OTP.',
            ]);
        }

        $user = User::query()->where('email', $email)->first();
        if (!$user) {
            throw ValidationException::withMessages([
                'email' => 'No account found with this email address.',
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Password reset successful. You can now sign in.',
        ]);
    }
}
