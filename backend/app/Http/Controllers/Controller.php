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
        $user = auth('sanctum')->user();
        if ($user) {
            if ($user->gym_id) {
                return (int) $user->gym_id;
            }
            if ($user->role === 'owner') {
                $ownedGym = Gym::where('owner_id', $user->id)->first();
                if ($ownedGym) {
                    // Also persist the gym_id on the user for future requests
                    $user->gym_id = $ownedGym->id;
                    $user->save();
                    return (int) $ownedGym->id;
                }
            }
        }

        // 2. Custom header X-Gym-Id (only trust if the gym actually exists)
        if ($request->hasHeader('X-Gym-Id')) {
            $hVal = (int) $request->header('X-Gym-Id');
            if ($hVal > 0 && Gym::where('id', $hVal)->exists()) {
                return $hVal;
            }
        }

        // 3. Query or Body Parameter gym_id (only trust if the gym actually exists)
        if ($request->filled('gym_id')) {
            $pVal = (int) $request->gym_id;
            if ($pVal > 0 && Gym::where('id', $pVal)->exists()) {
                return $pVal;
            }
        }

        // 4. No fallback — return null to enforce strict data isolation
        return null;
    }
}
