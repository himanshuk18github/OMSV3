<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can access users and roles.');

        $perPage = min(max((int) $request->query('per_page', 25), 1), 100);

        $users = User::query()
            ->with(['role:id,name,display_name'])
            ->orderBy('name')
            ->paginate($perPage);

        $users->getCollection()->transform(function (User $user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'is_active' => (bool) $user->is_active,
                'role_id' => $user->role_id,
                'role_name' => $user->role?->name,
                'role_display_name' => $user->role?->display_name,
                'created_at' => optional($user->created_at)->toDateTimeString(),
                'updated_at' => optional($user->updated_at)->toDateTimeString(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => [
                'users' => $users->items(),
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                ],
                'roles' => Role::query()
                    ->orderBy('display_name')
                    ->get(['id', 'name', 'display_name', 'description', 'permissions'])
                    ->map(fn (Role $role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                        'display_name' => $role->display_name,
                        'description' => $role->description,
                        'permissions' => Role::normalizePermissions($role->permissions),
                    ])
                    ->values(),
                'permission_catalog' => Role::permissionCatalog(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage users.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role_id' => ['required', 'exists:roles,id'],
            'is_active' => ['required', 'boolean'],
        ]);

        $user = User::query()->create([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'phone' => trim((string) ($validated['phone'] ?? '')) ?: null,
            'password' => Hash::make($validated['password']),
            'role_id' => (int) $validated['role_id'],
            'is_active' => (bool) $validated['is_active'],
        ]);

        $user->load('role:id,name,display_name');

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'is_active' => (bool) $user->is_active,
                'role_id' => $user->role_id,
                'role_name' => $user->role?->name,
                'role_display_name' => $user->role?->display_name,
            ],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage users.');

        $user = User::query()->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'role_id' => ['sometimes', 'exists:roles,id'],
            'is_active' => ['required', 'boolean'],
        ]);

        $payload = [
            'is_active' => (bool) $validated['is_active'],
        ];

        if (array_key_exists('name', $validated)) {
            $payload['name'] = trim($validated['name']);
        }

        if (array_key_exists('email', $validated)) {
            $payload['email'] = strtolower(trim($validated['email']));
        }

        if (array_key_exists('phone', $validated)) {
            $payload['phone'] = trim((string) $validated['phone']) ?: null;
        }

        if (array_key_exists('role_id', $validated)) {
            $payload['role_id'] = (int) $validated['role_id'];
        }

        if (!empty($validated['password'])) {
            $payload['password'] = Hash::make($validated['password']);
        }

        $user->update($payload);
        $user->load('role:id,name,display_name');

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'is_active' => (bool) $user->is_active,
                'role_id' => $user->role_id,
                'role_name' => $user->role?->name,
                'role_display_name' => $user->role?->display_name,
            ],
        ]);
    }

    public function updateRolePermissions(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage role permissions.');

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
        ]);

        $role = Role::query()->findOrFail($id);
        $normalized = Role::normalizePermissions($validated['permissions']);

        $role->update([
            'permissions' => $normalized,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $role->id,
                'permissions' => $normalized,
            ],
        ]);
    }
}
