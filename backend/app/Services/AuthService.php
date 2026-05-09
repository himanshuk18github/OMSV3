<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(string $email, string $password, string $deviceName = 'api'): array
    {
        $user = User::with('role')->where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (Hash::needsRehash($user->password)) {
            $user->password = Hash::make($password);
            $user->save();
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated.'],
            ]);
        }

        // Revoke old tokens (single device login)
        $user->tokens()->delete();

        $token = $user->createToken($deviceName)->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
            'role' => $user->role?->name,
        ];
    }

    public function logout(): void
    {
        Auth::user()->currentAccessToken()->delete();
    }

    public function me(): User
    {
        $user = Auth::user()->load('role');
        $user->role_permissions = $user->rolePermissions();

        return $user;
    }
}
