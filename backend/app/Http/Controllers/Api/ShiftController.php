<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class ShiftController extends Controller
{
    /**
     * List all shifts for the gym.
     */
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $query = Shift::query();
        if ($gymId && $gymId > 0) {
            $query->where('gym_id', $gymId);
        }

        $shifts = $query->orderBy('id', 'asc')->get();

        // Attach staff count to each shift
        $staffCountQuery = User::whereIn('role', ['trainer', 'manager', 'accounts', 'staff']);
        if ($gymId && $gymId > 0) {
            $staffCountQuery->where('gym_id', $gymId);
        }
        $allStaff = $staffCountQuery->get(['id', 'name', 'shifts']);

        $shiftsWithStaff = $shifts->map(function ($s) use ($allStaff) {
            $assignedCount = $allStaff->filter(function ($u) use ($s) {
                if (empty($u->shifts)) return false;
                return stripos($u->shifts, $s->name) !== false;
            })->count();

            $arr = $s->toArray();
            $arr['assigned_staff_count'] = $assignedCount;
            return $arr;
        });

        return response()->json([
            'success' => true,
            'data'    => $shiftsWithStaff
        ]);
    }

    /**
     * Store a new shift.
     */
    public function store(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $validated = $request->validate([
            'name'                 => 'required|string|max:150',
            'description'          => 'nullable|string',
            'timings'              => 'required|array|min:1',
            'timings.*.start_time' => 'required|string',
            'timings.*.end_time'   => 'required|string',
            'timings.*.label'      => 'nullable|string',
            'color'                => 'nullable|string|max:50',
            'is_active'            => 'nullable|boolean',
        ]);

        $shift = Shift::create([
            'gym_id'      => $gymId,
            'name'        => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'timings'     => $validated['timings'],
            'color'       => $validated['color'] ?? 'emerald',
            'is_active'   => $validated['is_active'] ?? true,
        ]);

        $resData = $shift->toArray();
        $resData['assigned_staff_count'] = 0;

        return response()->json([
            'success' => true,
            'message' => 'Shift created successfully',
            'data'    => $resData
        ], 201);
    }

    /**
     * Display a specific shift.
     */
    public function show(Request $request, int $id)
    {
        $shift = Shift::find($id);
        if (!$shift) {
            return response()->json(['success' => false, 'message' => 'Shift not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $shift
        ]);
    }

    /**
     * Update an existing shift.
     */
    public function update(Request $request, int $id)
    {
        $shift = Shift::find($id);
        if (!$shift) {
            return response()->json(['success' => false, 'message' => 'Shift not found'], 404);
        }

        $validated = $request->validate([
            'name'                 => 'sometimes|required|string|max:150',
            'description'          => 'nullable|string',
            'timings'              => 'sometimes|required|array|min:1',
            'timings.*.start_time' => 'required|string',
            'timings.*.end_time'   => 'required|string',
            'timings.*.label'      => 'nullable|string',
            'color'                => 'nullable|string|max:50',
            'is_active'            => 'nullable|boolean',
        ]);

        if (isset($validated['name'])) $shift->name = trim($validated['name']);
        if (array_key_exists('description', $validated)) $shift->description = $validated['description'];
        if (isset($validated['timings'])) $shift->timings = $validated['timings'];
        if (isset($validated['color'])) $shift->color = $validated['color'];
        if (isset($validated['is_active'])) $shift->is_active = $validated['is_active'];

        $shift->save();

        return response()->json([
            'success' => true,
            'message' => 'Shift updated successfully',
            'data'    => $shift
        ]);
    }

    /**
     * Delete a shift.
     */
    public function destroy(Request $request, int $id)
    {
        $shift = Shift::find($id);
        if (!$shift) {
            return response()->json(['success' => true, 'message' => 'Shift already removed']);
        }

        $shift->delete();

        return response()->json([
            'success' => true,
            'message' => 'Shift deleted successfully'
        ]);
    }
}
