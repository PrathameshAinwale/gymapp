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
        // 1. Authenticated Sanctum User — most reliable source
        $user = $request->user() ?: auth('sanctum')->user();
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

            // Multi-gym owner branch header check
            if ($user->role === 'owner') {
                $headerGymId = $request->header('X-Gym-Id') ?? $request->header('X-Gym-ID') ?? $request->header('x-gym-id');
                if ($headerGymId) {
                    $hVal = (int) $headerGymId;
                    if ($hVal > 0 && Gym::where('id', $hVal)->where('owner_id', $user->id)->exists()) {
                        return $hVal;
                    }
                }
            }

            // Regular user (owner, trainer, member, manager, accounts):
            // Strictly scoped to their own verified gym.
            if ($user->gym_id && Gym::where('id', $user->gym_id)->exists()) {
                return (int) $user->gym_id;
            }

            if ($user->role === 'owner') {
                $ownedGym = Gym::where('owner_id', $user->id)->first();
                if ($ownedGym) {
                    $user->gym_id = $ownedGym->id;
                    $user->save();
                    return (int) $ownedGym->id;
                }
            }

            // CRITICAL: If the gym was deleted, NEVER fall back to another gym (e.g. Sohan's gym)
            return null;
        }

        // 2. Custom header X-Gym-Id or X-Gym-ID (case-tolerant) for guest/public endpoints
        $headerGymId = $request->header('X-Gym-Id') ?? $request->header('X-Gym-ID') ?? $request->header('x-gym-id');
        if ($headerGymId) {
            $hVal = (int) $headerGymId;
            if ($hVal > 0 && Gym::where('id', $hVal)->exists()) {
                return $hVal;
            }
        }

        // 3. Query or Body Parameter gym_id or gymId
        $paramGymId = $request->input('gym_id') ?? $request->input('gymId') ?? $request->query('gym_id') ?? $request->query('gymId');
        if ($paramGymId) {
            $pVal = (int) $paramGymId;
            if ($pVal > 0 && Gym::where('id', $pVal)->exists()) {
                return $pVal;
            }
        }

        // 4. Fallback only for unauthenticated public browsing
        return Gym::first()?->id ?? null;
    }
}
