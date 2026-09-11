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
        // 1. Authenticated Sanctum User
        $user = auth('sanctum')->user();
        if ($user) {
            if ($user->gym_id) {
                return (int) $user->gym_id;
            }
            if ($user->role === 'owner') {
                $ownedGym = Gym::where('owner_id', $user->id)->first();
                if ($ownedGym) {
                    return (int) $ownedGym->id;
                }
            }
        }

        // 2. Custom header X-Gym-Id
        if ($request->hasHeader('X-Gym-Id')) {
            $hVal = (int) $request->header('X-Gym-Id');
            if ($hVal > 0) {
                return $hVal;
            }
        }

        // 3. Query or Body Parameter gym_id
        if ($request->filled('gym_id')) {
            $pVal = (int) $request->gym_id;
            if ($pVal > 0) {
                return $pVal;
            }
        }

        return null;
    }
}
