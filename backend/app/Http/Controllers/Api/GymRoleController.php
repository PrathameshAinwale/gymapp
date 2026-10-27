<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GymRole;
use App\Models\Gym;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class GymRoleController extends Controller
{
    /**
     * Default page lists for seeding
     */
    public static function getDefaultPagesForRole(string $role): array
    {
        switch ($role) {
            case 'manager':
                return [
                    'dashboard', 'whatsapp-automation', 'analytics', 'members',
                    'classes', 'pt-sessions', 'enquiries', 'attendance',
                    'plans', 'membership-freeze', 'products', 'equipment',
                    'privacy-policy', 'terms-conditions', 'help-support'
                ];
            case 'accounts':
                return [
                    'dashboard', 'members', 'classes', 'pt-sessions', 'enquiries', 'attendance',
                    'whatsapp-automation', 'plans', 'membership-freeze', 'staff-accounts', 'shifts',
                    'leaves', 'advance-pay', 'payroll', 'commissions', 'analytics', 'reports',
                    'financials', 'invoices', 'products', 'equipment', 'settings',
                    'privacy-policy', 'terms-conditions', 'help-support'
                ];
            case 'trainer':
                return [
                    'dashboard', 'sessions', 'clients', 'workout-builder', 'diet-builder',
                    'advance-request', 'trainer-leaves', 'commissions', 'profile',
                    'privacy-policy', 'terms-conditions', 'help-support'
                ];
            default:
                return ['dashboard', 'members', 'attendance'];
        }
    }

    /**
     * Ensure gym_roles table exists on the database (self-healing for unmigrated production environments)
     */
    public static function ensureTableExists(): void
    {
        try {
            if (!Schema::hasTable('gym_roles')) {
                Schema::create('gym_roles', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('gym_id');
                    $table->string('name');
                    $table->string('slug');
                    $table->text('description')->nullable();
                    $table->string('color')->default('indigo');
                    $table->json('assigned_pages')->nullable();
                    $table->boolean('is_default')->default(false);
                    $table->timestamps();

                    $table->unique(['gym_id', 'slug']);
                    $table->index('gym_id');
                });
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("GymRoleController::ensureTableExists note: " . $e->getMessage());
        }
    }

    /**
     * Ensure default 3 roles exist for a gym
     */
    public static function ensureDefaultRolesExist(int $gymId): void
    {
        self::ensureTableExists();

        if (!Schema::hasTable('gym_roles')) {
            return;
        }

        $existingCount = GymRole::where('gym_id', $gymId)->count();
        if ($existingCount === 0) {
            $now = now();
            GymRole::insert([
                [
                    'gym_id' => $gymId,
                    'name' => 'Manager',
                    'slug' => 'manager',
                    'description' => 'Front desk, admissions & daily club operations',
                    'color' => 'indigo',
                    'assigned_pages' => json_encode(self::getDefaultPagesForRole('manager')),
                    'is_default' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'gym_id' => $gymId,
                    'name' => 'Accounts',
                    'slug' => 'accounts',
                    'description' => 'Finances, payroll, invoices & billing ledger',
                    'color' => 'amber',
                    'assigned_pages' => json_encode(self::getDefaultPagesForRole('accounts')),
                    'is_default' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'gym_id' => $gymId,
                    'name' => 'Trainer',
                    'slug' => 'trainer',
                    'description' => '1-on-1 PT coaching, workout & diet plans',
                    'color' => 'purple',
                    'assigned_pages' => json_encode(self::getDefaultPagesForRole('trainer')),
                    'is_default' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    /**
     * List all roles for superadmin (optionally filtered by gym_id)
     */
    public function index(Request $request)
    {
        self::ensureTableExists();

        if (!Schema::hasTable('gym_roles')) {
            return response()->json([
                'success' => true,
                'roles' => [],
            ]);
        }

        $gymId = $request->query('gym_id');

        if ($gymId) {
            self::ensureDefaultRolesExist((int)$gymId);
            $query = GymRole::where('gym_id', $gymId);
        } else {
            $query = GymRole::with('gym:id,name,city,status');
        }

        $roles = $query->orderBy('name', 'asc')->get();

        // Attach staff count to each role
        $rolesWithCount = $roles->map(function ($r) {
            $arr = $r->toArray();
            $arr['staff_count'] = User::where('gym_id', $r->gym_id)
                ->where('role', $r->slug)
                ->count();
            return $arr;
        });

        return response()->json([
            'success' => true,
            'roles' => $rolesWithCount,
        ]);
    }

    /**
     * List available roles for a specific gym (used by Gym Owner / Staff in Create Staff page)
     */
    public function getGymRoles(Request $request)
    {
        self::ensureTableExists();

        if (!Schema::hasTable('gym_roles')) {
            return response()->json([
                'success' => true,
                'roles' => [],
            ]);
        }

        $gymId = $request->query('gym_id');
        if (!$gymId && $request->user()) {
            $gymId = $request->user()->gym_id;
        }
        if (!$gymId) {
            $firstGym = Gym::first();
            $gymId = $firstGym ? $firstGym->id : 1;
        }

        if ($gymId) {
            self::ensureDefaultRolesExist((int)$gymId);
        }

        $roles = GymRole::where('gym_id', $gymId)
            ->orderBy('name', 'asc')
            ->get();

        $rolesWithCount = $roles->map(function ($r) use ($gymId) {
            $arr = $r->toArray();
            $arr['staff_count'] = User::where('gym_id', $gymId)
                ->where('role', $r->slug)
                ->count();
            return $arr;
        });

        return response()->json([
            'success' => true,
            'roles' => $rolesWithCount,
        ]);
    }

    /**
     * Create a new role for a gym (Superadmin or Gym Owner in Settings)
     */
    public function store(Request $request)
    {
        self::ensureTableExists();
        $user = $request->user();
        $targetGymId = $request->input('gym_id') ?? ($user ? $user->gym_id : null);
        if (!$targetGymId) {
            $firstGym = Gym::first();
            $targetGymId = $firstGym ? $firstGym->id : 1;
        }

        $validated = $request->validate([
            'gym_id'         => 'nullable|integer|exists:gyms,id',
            'name'           => 'required|string|min:2|max:100',
            'slug'           => 'nullable|string|max:100',
            'description'    => 'nullable|string|max:500',
            'color'          => 'nullable|string|max:50',
            'assigned_pages' => 'required|array',
        ], [
            'name.required'           => 'Role title/name is required.',
            'assigned_pages.required' => 'At least one page/permission must be assigned to this role.',
        ]);

        $gymId = (int)$targetGymId;
        $rawSlug = !empty($validated['slug']) ? trim($validated['slug']) : trim($validated['name']);
        $slug = Str::slug($rawSlug, '_');

        // Check uniqueness for this gym
        $exists = GymRole::where('gym_id', $gymId)
            ->where('slug', $slug)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => "A role with identifier '{$slug}' already exists for this gym. Please choose a different title."
            ], 422);
        }

        $role = GymRole::create([
            'gym_id'         => $gymId,
            'name'           => $validated['name'],
            'slug'           => $slug,
            'description'    => $validated['description'] ?? null,
            'color'          => $validated['color'] ?? 'indigo',
            'assigned_pages' => $validated['assigned_pages'],
            'is_default'     => false,
        ]);

        $responseData = $role->toArray();
        $responseData['staff_count'] = 0;

        return response()->json([
            'success' => true,
            'message' => "Role '{$role->name}' created successfully.",
            'role'    => $responseData,
        ], 201);
    }

    /**
     * Update an existing role
     */
    public function update(Request $request, $id)
    {
        self::ensureTableExists();
        $role = GymRole::findOrFail($id);
        $user = $request->user();

        if ($user && $user->role !== 'superadmin' && (int)$role->gym_id !== (int)$user->gym_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this gym role.'
            ], 403);
        }

        $validated = $request->validate([
            'name'           => 'sometimes|required|string|min:2|max:100',
            'description'    => 'nullable|string|max:500',
            'color'          => 'nullable|string|max:50',
            'assigned_pages' => 'sometimes|required|array',
        ]);

        if (isset($validated['name'])) {
            $role->name = $validated['name'];
        }
        if (array_key_exists('description', $validated)) {
            $role->description = $validated['description'];
        }
        if (isset($validated['color'])) {
            $role->color = $validated['color'];
        }
        if (isset($validated['assigned_pages'])) {
            $role->assigned_pages = $validated['assigned_pages'];
        }

        $role->save();

        $responseData = $role->toArray();
        $responseData['staff_count'] = User::where('gym_id', $role->gym_id)
            ->where('role', $role->slug)
            ->count();

        return response()->json([
            'success' => true,
            'message' => "Role '{$role->name}' updated successfully.",
            'role'    => $responseData,
        ]);
    }

    /**
     * Delete a role (guards against deleting if staff are assigned or if default)
     */
    public function destroy(Request $request, $id)
    {
        self::ensureTableExists();
        $role = GymRole::findOrFail($id);
        $user = $request->user();

        if ($user && $user->role !== 'superadmin' && (int)$role->gym_id !== (int)$user->gym_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this gym role.'
            ], 403);
        }

        $assignedStaffCount = User::where('gym_id', $role->gym_id)
            ->where('role', $role->slug)
            ->count();

        if ($assignedStaffCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete role '{$role->name}' because {$assignedStaffCount} staff member(s) are currently assigned to this role. Please reassign them before deleting."
            ], 422);
        }

        $roleName = $role->name;
        $role->delete();

        return response()->json([
            'success' => true,
            'message' => "Role '{$roleName}' has been removed successfully."
        ]);
    }
}
