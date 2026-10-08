<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Gym;

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
                    if ($hVal > 0 && Gym::where('id', $hVal)->where('owner_id', $user->id)->exists()) {
                        return $hVal;
                    }
                }

                $paramGymId = $request->input('gym_id') ?? $request->input('gymId') ?? $request->query('gym_id') ?? $request->query('gymId');
                if ($paramGymId) {
                    $pVal = (int) $paramGymId;
                    if ($pVal > 0 && Gym::where('id', $pVal)->where('owner_id', $user->id)->exists()) {
                        return $pVal;
                    }
                }

                // If user's gym_id belongs to them, use it
                if ($user->gym_id && Gym::where('id', $user->gym_id)->where('owner_id', $user->id)->exists()) {
                    return (int) $user->gym_id;
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
}
