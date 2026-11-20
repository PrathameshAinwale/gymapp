<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Gym;
use App\Models\User;

abstract class Controller
{
    /**
     * Resolve the active gym_id from Sanctum user, X-Gym-Id header, or request parameter.
     */
    protected function resolveGymId(Request $request): ?int
    {
        // 1. Authenticated Sanctum User — resolve from request or Bearer token
        $user = $request->user();
        if (!$user && $request->bearerToken()) {
            $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken());
            if ($tokenModel && $tokenModel->tokenable) {
                $user = $tokenModel->tokenable;
            }
        }
        if (!$user) {
            $user = auth('sanctum')->user();
        }

        if ($user) {
            // Superadmin has global platform access and can inspect any facility
            if ($user->role === 'superadmin') {
                $headerGymId = $request->header('X-Gym-Id') ?? $request->header('X-Gym-ID') ?? $request->header('x-gym-id');
                if ($headerGymId) {
                    $hVal = (int) $headerGymId;
                    if ($hVal > 0 && Gym::where('id', $hVal)->exists()) {
                        return $hVal;
                    }
                }
                $paramGymId = $request->input('gym_id') ?? $request->input('gymId') ?? $request->query('gym_id') ?? $request->query('gymId');
                if ($paramGymId) {
                    $pVal = (int) $paramGymId;
                    if ($pVal > 0 && Gym::where('id', $pVal)->exists()) {
                        return $pVal;
                    }
                }
                return $user->gym_id ?: (Gym::first()?->id ?? 1);
            }

            // Gym Owner: Strictly scoped to their OWN gym facility
            if ($user->role === 'owner') {
                $headerGymId = $request->header('X-Gym-Id') ?? $request->header('X-Gym-ID') ?? $request->header('x-gym-id');
                if ($headerGymId) {
                    $hVal = (int) $headerGymId;
                    if ($hVal > 0) {
                        $targetGym = Gym::find($hVal);
                        if ($targetGym && ((int)$targetGym->owner_id === (int)$user->id || (int)$user->gym_id === $hVal || empty($targetGym->owner_id))) {
                            if (empty($targetGym->owner_id)) {
                                $targetGym->owner_id = $user->id;
                                $targetGym->save();
                            }
                            return $hVal;
                        }
                    }
                }

                $paramGymId = $request->input('gym_id') ?? $request->input('gymId') ?? $request->query('gym_id') ?? $request->query('gymId');
                if ($paramGymId) {
                    $pVal = (int) $paramGymId;
                    if ($pVal > 0) {
                        $targetGym = Gym::find($pVal);
                        if ($targetGym && ((int)$targetGym->owner_id === (int)$user->id || (int)$user->gym_id === $pVal || empty($targetGym->owner_id))) {
                            if (empty($targetGym->owner_id)) {
                                $targetGym->owner_id = $user->id;
                                $targetGym->save();
                            }
                            return $pVal;
                        }
                    }
                }

                // If user has an assigned gym_id and that Gym exists, use it
                if ($user->gym_id) {
                    $existingGym = Gym::find($user->gym_id);
                    if ($existingGym && ((int)$existingGym->owner_id === (int)$user->id || empty($existingGym->owner_id) || (int)$user->gym_id === (int)$existingGym->id)) {
                        if (empty($existingGym->owner_id)) {
                            $existingGym->owner_id = $user->id;
                            $existingGym->save();
                        }
                        return (int) $existingGym->id;
                    }
                }

                // If they own a gym, synchronize user's gym_id to it
                $ownedGym = Gym::where('owner_id', $user->id)->first();
                if ($ownedGym) {
                    $user->gym_id = $ownedGym->id;
                    $user->save();
                    return (int) $ownedGym->id;
                }

                // Auto-provision their dedicated facility so an owner NEVER sees another club
                $newGym = Gym::create([
                    'name' => ($user->name ? $user->name . "'s Gym" : 'Club Facility'),
                    'owner_id' => $user->id,
                    'phone' => $user->phone,
                    'email' => $user->email,
                    'package' => 'Bronze',
                    'package_tier' => 'Bronze',
                    'billing_cycle' => 'Annual',
                    'status' => 'Active',
                    'currency' => '₹',
                ]);
                $user->gym_id = $newGym->id;
                $user->save();
                return (int) $newGym->id;
            }

            // Regular user (trainer, member, manager, accounts):
            // Strictly scoped to their assigned gym.
            if ($user->gym_id && Gym::where('id', $user->gym_id)->exists()) {
                return (int) $user->gym_id;
            }

            return null;
        }

        // 2. Custom header X-Gym-Id or X-Gym-ID (case-tolerant) for guest/public endpoints
        $headerGymId = $request->header('X-Gym-Id') ?? $request->header('X-Gym-ID') ?? $request->header('x-gym-id');
        if ($headerGymId) {
            $hVal = (int) $headerGymId;
            if ($hVal > 0 && Gym::where('id', $hVal)->exists()) {
                return $hVal;
            }
            return null;
        }

        // 3. Query or Body Parameter gym_id or gymId
        $paramGymId = $request->input('gym_id') ?? $request->input('gymId') ?? $request->query('gym_id') ?? $request->query('gymId');
        if ($paramGymId) {
            $pVal = (int) $paramGymId;
            if ($pVal > 0 && Gym::where('id', $pVal)->exists()) {
                return $pVal;
            }
            return null;
        }

        // 4. Fallback only for unauthenticated general public browsing
        return Gym::first()?->id ?? null;
    }

    /**
     * Safely resolve a member User record from any input representation
     * (database PK, mem-{id}, sequential member_number like MEM0001 or MEM260001, legacy_id, biometric_user_id, or name).
     */
    protected function resolveMemberUser($rawId, ?int $gymId = null, ?string $name = null): ?User
    {
        $rawStr = is_string($rawId) ? trim($rawId) : (string)$rawId;

        // 1. Direct PK if numeric (and not prefixed with MEM)
        if (is_numeric($rawStr) && (int)$rawStr > 0 && !preg_match('/^MEM/i', $rawStr)) {
            $num = (int)$rawStr;
            $user = User::query()
                ->when($gymId, fn($q) => $q->where('gym_id', $gymId))
                ->find($num);
            if ($user) {
                // If name was provided and matches (or user has member role), return it
                if (empty($name) || stripos($user->name, trim($name)) !== false || stripos(trim($name), $user->name) !== false) {
                    return $user;
                }
            }
        }

        // 2. Prefixed 'mem-123' format (where 123 is the primary key id)
        if (is_string($rawId) && preg_match('/^mem-(\d+)$/i', $rawId, $m)) {
            $num = (int)$m[1];
            if ($num > 0) {
                $user = User::query()
                    ->when($gymId, fn($q) => $q->where('gym_id', $gymId))
                    ->find($num);
                if ($user) {
                    return $user;
                }
            }
        }

        // 3. Sequential member number (e.g. MEM0001, MEM260001, 260001, MEM-0001), legacy ID, or biometric ID
        if (!empty($rawStr) && strtolower($rawStr) !== 'null' && strtolower($rawStr) !== 'undefined') {
            $cleanMemNo = preg_replace('/^mem-/i', '', $rawStr);
            $numericOnly = preg_replace('/[^0-9]/', '', $rawStr);
            $user = User::query()
                ->when($gymId, fn($q) => $q->where('gym_id', $gymId))
                ->where(function ($q) use ($rawStr, $cleanMemNo, $numericOnly) {
                    $q->where('member_number', $cleanMemNo)
                      ->orWhere('member_number', $rawStr)
                      ->orWhere('legacy_id', $rawStr)
                      ->orWhere('biometric_user_id', $rawStr);
                    if (!empty($numericOnly)) {
                        $q->orWhere('member_number', 'MEM' . $numericOnly)
                          ->orWhere('member_number', 'MEM' . str_pad($numericOnly, 4, '0', STR_PAD_LEFT))
                          ->orWhere('member_number', $numericOnly);
                    }
                })
                ->first();

            if ($user) {
                return $user;
            }
        }

        // 4. Try global search by PK if gymId was restricting and not found yet
        if ($gymId && is_numeric($rawStr) && (int)$rawStr > 0 && !preg_match('/^MEM/i', $rawStr)) {
            $user = User::find((int)$rawStr);
            if ($user && (empty($name) || stripos($user->name, trim($name)) !== false || stripos(trim($name), $user->name) !== false)) {
                return $user;
            }
        }

        // 5. Lookup by member name within gym
        if (!empty($name)) {
            $cleanName = trim($name);
            $user = User::query()
                ->when($gymId, fn($q) => $q->where('gym_id', $gymId))
                ->where('role', 'member')
                ->where(function ($q) use ($cleanName) {
                    $q->where('name', $cleanName)
                      ->orWhere('name', 'like', "%{$cleanName}%");
                })
                ->first();

            if ($user) {
                return $user;
            }
        }

        return null;
    }
}
