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
        $timingError = $this->validateTimingsNoOverlap($validated['timings']);
        if ($timingError) {
            return response()->json([
                'success' => false,
                'message' => $timingError,
                'errors'  => [
                    'timings' => [$timingError]
                ]
            ], 422);
        }

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

        if (isset($validated['timings'])) {
            $timingError = $this->validateTimingsNoOverlap($validated['timings']);
            if ($timingError) {
                return response()->json([
                    'success' => false,
                    'message' => $timingError,
                    'errors'  => [
                        'timings' => [$timingError]
                    ]
                ], 422);
            }
        }

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

    /**
     * Validate that shift timing slots do not have identical start/end or overlap with each other.
     *
     * @param array $timings
     * @return string|null Returns error message if validation fails, or null if valid
     */
    protected function validateTimingsNoOverlap(array $timings): ?string
    {
        if (empty($timings)) {
            return 'Shift must have at least one timing slot.';
        }

        $parsedSlots = [];
        foreach ($timings as $idx => $slot) {
            $startStr = trim($slot['start_time'] ?? '');
            $endStr   = trim($slot['end_time'] ?? '');
            $slotNum  = $idx + 1;

            if (empty($startStr) || empty($endStr)) {
                return "Timing slot #{$slotNum} must have both start time and end time.";
            }

            $sMin = $this->timeStringToMinutes($startStr);
            $eMin = $this->timeStringToMinutes($endStr);

            if ($sMin === null || $eMin === null) {
                return "Timing slot #{$slotNum} has an invalid time format.";
            }

            if ($sMin === $eMin) {
                return "Timing slot #{$slotNum} cannot have the same start and end time ({$startStr}).";
            }

            // Intervals for this slot
            if ($sMin < $eMin) {
                $intervals = [[$sMin, $eMin]];
            } else {
                // Overnight crossing midnight (e.g. 10:00 PM to 06:00 AM)
                $intervals = [[$sMin, 1440], [0, $eMin]];
            }

            $parsedSlots[] = [
                'index'      => $slotNum,
                'label'      => !empty($slot['label']) ? $slot['label'] : "Slot {$slotNum}",
                'start_time' => $startStr,
                'end_time'   => $endStr,
                'intervals'  => $intervals,
            ];
        }

        // Compare every pair of timing slots for overlaps
        $count = count($parsedSlots);
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $slotA = $parsedSlots[$i];
                $slotB = $parsedSlots[$j];

                foreach ($slotA['intervals'] as $intA) {
                    foreach ($slotB['intervals'] as $intB) {
                        if (max($intA[0], $intB[0]) < min($intA[1], $intB[1])) {
                            $labelA = "{$slotA['label']} ({$slotA['start_time']} - {$slotA['end_time']})";
                            $labelB = "{$slotB['label']} ({$slotB['start_time']} - {$slotB['end_time']})";
                            return "Timing conflict detected: {$labelA} and {$labelB} overlap. Timing slots within a shift cannot overlap.";
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Convert "HH:MM", "H:MM", or "HH:MM AM/PM" to minute of day (0 - 1439).
     */
    protected function timeStringToMinutes(string $timeStr): ?int
    {
        $clean = strtoupper(trim($timeStr));
        $isPM = str_contains($clean, 'PM');
        $isAM = str_contains($clean, 'AM');
        $raw = trim(preg_replace('/[^0-9:]/', '', $clean));
        $parts = explode(':', $raw);
        if (count($parts) < 2) {
            return null;
        }

        $h = (int)$parts[0];
        $m = (int)$parts[1];

        if ($isPM && $h < 12) {
            $h += 12;
        } elseif ($isAM && $h === 12) {
            $h = 0;
        }

        return ($h * 60) + $m;
    }
}
