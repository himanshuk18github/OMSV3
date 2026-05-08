<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RolePermissionMiddleware
{
    public function handle(Request $request, Closure $next, string $module, string $action = 'view')
    {
        $user = $request->user();
        if (!$user || !$user->canAccess($module, $action)) {
            return response()->json([
                'status' => 'error',
                'message' => 'You do not have permission to access this module.',
            ], 403);
        }

        return $next($request);
    }
}
