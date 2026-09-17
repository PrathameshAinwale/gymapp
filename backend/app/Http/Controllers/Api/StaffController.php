<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StaffController extends Controller
{
    /**
     * List all staff accounts (superadmin, manager, accounts, trainer)
     * Excludes plain members from this view.
     */
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $staff = User::where(function ($q) use ($gymId) {
                if ($gymId) {
                    $q->where('gym_id', $gymId);
                }
            })
            ->whereIn('role', ['superadmin', 'owner', 'manager', 'accounts', 'trainer'])
            ->orderByRaw("CASE role
                WHEN 'superadmin' THEN 1
                WHEN 'owner'      THEN 1
                WHEN 'accounts'   THEN 2
                WHEN 'manager'    THEN 3
                WHEN 'trainer'    THEN 4
                ELSE 5 END")
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'phone', 'avatar', 'gym_id', 'must_change_password', 'created_at']);

        return response()->json(['success' => true, 'data' => $staff]);
    }

    /**
     * Create a new staff account (superadmin provisions manager / accounts / trainer)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|in:manager,accounts,trainer',
            'phone'    => 'nullable|string|max:20',
            'gym_id'   => 'nullable|integer',
        ]);

        $gymId = $validated['gym_id'] ?? $this->resolveGymId($request);

        // Default avatars by role
        $avatarMap = [
            'manager'  => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
            'accounts' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
            'trainer'  => 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80',
        ];

        $user = User::create([
            'name'                => $validated['name'],
            'email'               => $validated['email'],
            'password'            => Hash::make($validated['password']),
            'role'                => $validated['role'],
            'phone'               => $validated['phone'] ?? null,
            'gym_id'              => $gymId,
            'avatar'              => $avatarMap[$validated['role']] ?? null,
            'must_change_password' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Staff account created for {$user->name} as {$user->role}.",
            'data'    => $user->only(['id', 'name', 'email', 'role', 'phone', 'avatar', 'gym_id']),
        ], 201);
    }

    /**
     * Update a staff account
     */
    public function update(Request $request, int $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'  => 'sometimes|string|max:100',
            'email' => "sometimes|email|unique:users,email,{$id}",
            'phone' => 'nullable|string|max:20',
            'role'  => 'sometimes|in:manager,accounts,trainer',
        ]);

        $user->update($validated);

        // Update password if provided
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
            $user->save();
        }

        return response()->json(['success' => true, 'data' => $user]);
    }

    /**
     * Delete a staff account
     */
    public function destroy(int $id)
    {
        $user = User::findOrFail($id);

        // Protect superadmin accounts from deletion
        if (in_array($user->role, ['superadmin', 'owner'])) {
            return response()->json(['success' => false, 'message' => 'Cannot delete superadmin account.'], 403);
        }

        $user->delete();

        return response()->json(['success' => true, 'message' => "Staff account for {$user->name} deleted."]);
    }
}
