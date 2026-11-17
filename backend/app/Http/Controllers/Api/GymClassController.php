<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GymClass;
use App\Models\ClassBooking;
use App\Models\ClassEnrollment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GymClassController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = GymClass::with('trainer');
        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

        $classes = $query->get()->map(function ($cls) {
            $days = is_array($cls->days) ? $cls->days : (is_string($cls->days) ? (json_decode($cls->days, true) ?? array_map('trim', explode(',', $cls->days))) : ['Mon', 'Wed', 'Fri']);
            $trainerDisplayName = $cls->trainer?->name ?? $cls->instructor_name ?? 'Coach Alex Rivers';
            return [
                'id' => 'cls-' . $cls->id,
                'numericId' => $cls->id,
                'gymId' => $cls->gym_id,
                'name' => $cls->name,
                'title' => $cls->name,
                'trainerId' => $cls->trainer_id ? 'trn-' . $cls->trainer_id : null,
                'trainerName' => $trainerDisplayName,
                'time' => $cls->time,
                'days' => is_array($days) ? $days : ['Mon', 'Wed', 'Fri'],
                'capacity' => (int)$cls->capacity,
                'bookedCount' => (int)$cls->booked_count,
                'enrolledCount' => (int)$cls->booked_count,
                'category' => $cls->category ?? 'Group Fitness',
                'room' => $cls->room ?? 'Main Studio A',
                'difficulty' => $cls->difficulty ?? 'Intermediate',
                'intensity' => $cls->difficulty ?? 'High',
                'duration' => $cls->duration ?? '45 min',
                'status' => $cls->status ?? 'Active',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $classes,
        ]);
    }

    /**
     * Parse a time string like "07:00 AM" to total minutes since midnight.
     */
    private function parseTimeToMinutes(string $timeStr): ?int
    {
        $timeStr = trim($timeStr);
        $timestamp = strtotime($timeStr);
        if ($timestamp === false) {
            return null;
        }
        return (int)date('H', $timestamp) * 60 + (int)date('i', $timestamp);
    }

    /**
     * Check if two time intervals like "07:00 AM - 08:00 AM" overlap.
     */
    private function timesOverlap(string $t1, string $t2): bool
    {
        $p1 = explode('-', $t1);
        $p2 = explode('-', $t2);
        if (count($p1) !== 2 || count($p2) !== 2) {
            return false;
        }

        $s1 = $this->parseTimeToMinutes($p1[0]);
        $e1 = $this->parseTimeToMinutes($p1[1]);
        $s2 = $this->parseTimeToMinutes($p2[0]);
        $e2 = $this->parseTimeToMinutes($p2[1]);

        if ($s1 === null || $e1 === null || $s2 === null || $e2 === null) {
            return false;
        }

        return max($s1, $s2) < min($e1, $e2);
    }

    /**
     * Normalize days input to array of day strings (e.g. ['Mon', 'Wed']).
     */
    private function normalizeDays($rawDays): array
    {
        if (is_array($rawDays)) {
            return array_values(array_filter($rawDays));
        }
        if (is_string($rawDays)) {
            $decoded = json_decode($rawDays, true);
            if (is_array($decoded)) {
                return array_values(array_filter($decoded));
            }
            return array_values(array_filter(array_map('trim', explode(',', $rawDays))));
        }
        return ['Mon', 'Wed', 'Fri'];
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'time' => 'required|string',
            'capacity' => 'required',
            'days' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $gymId = $this->resolveGymId($request);
        $trainerId = $request->trainer_id ? (int)str_replace(['trn-', 'tr-'], '', $request->trainer_id) : null;
        $trainerUser = $trainerId ? User::find($trainerId) : null;
        $trainerName = $trainerUser?->name ?? $request->trainer_name ?? $request->trainerName ?? $request->instructor_name ?? null;

        $rawDays = $request->days ?? ['Mon', 'Wed', 'Fri'];
        $days = $this->normalizeDays($rawDays);

        // Schedule Overlap Validation: check trainer conflicts across days and time slot
        if ($trainerId && $gymId) {
            $otherClasses = GymClass::where('gym_id', $gymId)
                ->where('trainer_id', $trainerId)
                ->get();

            foreach ($otherClasses as $other) {
                $otherDays = $this->normalizeDays($other->days);
                $commonDays = array_intersect($days, $otherDays);
                if (!empty($commonDays) && $this->timesOverlap($request->time, $other->time)) {
                    $cDaysStr = implode(', ', $commonDays);
                    return response()->json([
                        'success' => false,
                        'message' => "Trainer '{$trainerName}' already has an overlapping class ('{$other->name}') on {$cDaysStr} at {$other->time}.",
                        'conflicting_class' => $other->name,
                        'conflicting_time' => $other->time,
                    ], 422);
                }
            }
        }

        $cls = GymClass::create([
            'gym_id' => $gymId,
            'name' => $request->name,
            'trainer_id' => $trainerId,
            'instructor_name' => $trainerName,
            'time' => $request->time,
            'days' => $days,
            'capacity' => (int)$request->capacity ?: 20,
            'booked_count' => 0,
            'category' => $request->category ?? 'Group Fitness',
            'room' => $request->room ?? 'Studio A',
            'difficulty' => $request->difficulty ?? $request->intensity ?? 'All Levels',
            'status' => 'Active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Class scheduled successfully',
            'data' => [
                'id' => 'cls-' . $cls->id,
                'numericId' => $cls->id,
                'name' => $cls->name,
                'title' => $cls->name,
                'trainerId' => $trainerId ? 'trn-' . $trainerId : null,
                'trainerName' => $trainerName ?? 'Coach Alex Rivers',
                'time' => $cls->time,
                'days' => $days,
                'capacity' => (int)$cls->capacity,
                'bookedCount' => 0,
                'enrolledCount' => 0,
                'category' => $cls->category,
                'room' => $cls->room,
                'difficulty' => $cls->difficulty,
                'intensity' => $cls->difficulty,
            ],
        ], 201);
    }

    public function book(Request $request, $id)
    {
        $numericClassId = str_replace('cls-', '', $id);
        $cls = GymClass::findOrFail($numericClassId);

        $userId = $request->user()?->id ?? ($request->user_id ? (int)str_replace('mem-', '', $request->user_id) : null);

        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'User ID is required to book a class'], 400);
        }

        if ($cls->booked_count >= $cls->capacity) {
            return response()->json(['success' => false, 'message' => 'Class is already full'], 400);
        }

        $existing = ClassBooking::where('gym_class_id', $cls->id)
            ->where('user_id', $userId)
            ->where('booking_date', now()->toDateString())
            ->first();

        if ($existing) {
            return response()->json(['success' => false, 'message' => 'You have already booked this class for today'], 400);
        }

        $booking = ClassBooking::create([
            'gym_class_id' => $cls->id,
            'user_id' => $userId,
            'booking_date' => now()->toDateString(),
            'status' => 'Confirmed',
        ]);

        $cls->increment('booked_count');

        return response()->json([
            'success' => true,
            'message' => 'Class slot confirmed successfully',
            'booking' => $booking,
            'bookedCount' => $cls->booked_count,
        ]);
    }

    public function cancel(Request $request, $id)
    {
        $numericClassId = str_replace('cls-', '', $id);
        $cls = GymClass::findOrFail($numericClassId);

        $userId = $request->user()?->id ?? ($request->user_id ? (int)str_replace('mem-', '', $request->user_id) : null);

        $booking = ClassBooking::where('gym_class_id', $cls->id)
            ->where('user_id', $userId)
            ->where('status', 'Confirmed')
            ->first();

        if ($booking) {
            $booking->update(['status' => 'Cancelled']);
            if ($cls->booked_count > 0) {
                $cls->decrement('booked_count');
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Booking cancelled successfully',
            'bookedCount' => $cls->booked_count,
        ]);
    }

    public function update(Request $request, $id)
    {
        $gymId = $this->resolveGymId($request);
        $numericClassId = (int)str_replace('cls-', '', $id);
        $cls = GymClass::where('id', $numericClassId);
        if ($gymId) {
            $cls->where('gym_id', $gymId);
        }
        $cls = $cls->firstOrFail();

        $trainerId = $request->has('trainer_id') || $request->has('trainerId')
            ? (int)str_replace(['trn-', 'tr-'], '', $request->input('trainer_id', $request->input('trainerId')))
            : $cls->trainer_id;
        $trainerUser = $trainerId ? User::find($trainerId) : null;
        $trainerName = $trainerUser?->name ?? $request->input('trainer_name', $request->input('trainerName', $cls->instructor_name));

        $rawDays = $request->input('days', $cls->days);
        $days = $this->normalizeDays($rawDays);
        $time = $request->input('time', $cls->time);

        // Check if trainer, days, or time changed - only then validate overlap
        $currentDays = $this->normalizeDays($cls->days);
        $daysChanged = $request->has('days') && (array_diff($days, $currentDays) || array_diff($currentDays, $days));
        $timeChanged = $request->has('time') && $time !== $cls->time;
        $trainerChanged = ($request->has('trainer_id') || $request->has('trainerId')) && $trainerId != $cls->trainer_id;

        if ($trainerId && ($daysChanged || $timeChanged || $trainerChanged)) {
            $conflicts = GymClass::where('gym_id', $cls->gym_id)
                ->where('id', '!=', $cls->id)
                ->where('trainer_id', $trainerId)
                ->get();

            foreach ($conflicts as $conflict) {
                $cDays = $this->normalizeDays($conflict->days);
                $common = array_intersect($days, $cDays);
                if (!empty($common) && $this->timesOverlap($time, $conflict->time)) {
                    $cDaysStr = implode(', ', $common);
                    return response()->json([
                        'success' => false,
                        'message' => "Trainer '{$trainerName}' already has an overlapping class ('{$conflict->name}') on {$cDaysStr} at {$conflict->time}.",
                        'conflicting_class' => $conflict->name,
                        'conflicting_time' => $conflict->time,
                    ], 422);
                }
            }
        }

        $cls->update([
            'name' => $request->input('name', $cls->name),
            'trainer_id' => $trainerId,
            'instructor_name' => $trainerName,
            'time' => $time,
            'days' => $days,
            'capacity' => $request->input('capacity', $cls->capacity),
            'category' => $request->input('category', $cls->category),
            'room' => $request->input('room', $cls->room),
            'difficulty' => $request->input('difficulty', $cls->difficulty),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Class updated successfully',
            'data' => [
                'id' => 'cls-' . $cls->id,
                'numericId' => $cls->id,
                'gymId' => $cls->gym_id,
                'name' => $cls->name,
                'title' => $cls->name,
                'trainerId' => $trainerId ? 'trn-' . $trainerId : null,
                'trainerName' => $trainerName ?? 'Coach Alex Rivers',
                'time' => $cls->time,
                'days' => $days,
                'capacity' => (int)$cls->capacity,
                'bookedCount' => (int)$cls->booked_count,
                'enrolledCount' => (int)$cls->booked_count,
                'category' => $cls->category,
                'room' => $cls->room,
                'difficulty' => $cls->difficulty,
                'intensity' => $cls->difficulty,
            ]
        ]);
    }

    /**
     * Get active member enrollments for a class.
     */
    public function getEnrollments(Request $request, $id)
    {
        $gymId = $this->resolveGymId($request);
        $numericClassId = (int)str_replace('cls-', '', $id);
        $cls = GymClass::where('id', $numericClassId);
        if ($gymId) {
            $cls->where('gym_id', $gymId);
        }
        $cls = $cls->firstOrFail();

        $enrollments = ClassEnrollment::with('user')
            ->where('gym_class_id', $cls->id)
            ->where('status', 'Active')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($enr) {
                return [
                    'id' => $enr->id,
                    'userId' => $enr->user_id,
                    'memberId' => 'mem-' . $enr->user_id,
                    'name' => $enr->user?->name ?? 'Member',
                    'phone' => $enr->user?->phone,
                    'email' => $enr->user?->email,
                    'enrolledDate' => $enr->enrolled_date ? $enr->enrolled_date->toDateString() : null,
                    'status' => $enr->status,
                    'invoiceId' => $enr->invoice_id,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $enrollments,
            'capacity' => (int)$cls->capacity,
            'enrolledCount' => $enrollments->count(),
        ]);
    }

    /**
     * Enroll a member into a class roster.
     */
    public function enrollMember(Request $request, $id)
    {
        $gymId = $this->resolveGymId($request);
        $numericClassId = (int)str_replace('cls-', '', $id);
        $cls = GymClass::where('id', $numericClassId);
        if ($gymId) {
            $cls->where('gym_id', $gymId);
        }
        $cls = $cls->firstOrFail();

        $rawUserId = $request->user_id ?? $request->userId;
        $userId = (int)preg_replace('/[^0-9]/', '', (string)$rawUserId);
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Valid member selection is required.'], 422);
        }

        // Verify member belongs to same gym facility
        $memberUser = User::where('id', $userId)->first();
        if (!$memberUser || ($gymId && $memberUser->gym_id != $gymId)) {
            return response()->json(['success' => false, 'message' => 'Member not found in current facility.'], 404);
        }

        // Check class capacity
        $activeEnrollmentsCount = ClassEnrollment::where('gym_class_id', $cls->id)->where('status', 'Active')->count();
        if ($activeEnrollmentsCount >= $cls->capacity) {
            return response()->json([
                'success' => false,
                'message' => "Class has reached its maximum capacity of {$cls->capacity} members."
            ], 422);
        }

        // Prevent duplicate enrollment
        $existing = ClassEnrollment::where('gym_class_id', $cls->id)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            if ($existing->status === 'Active') {
                return response()->json([
                    'success' => false,
                    'message' => "Member '{$memberUser->name}' is already enrolled in this class."
                ], 422);
            }
            $existing->update(['status' => 'Active', 'enrolled_date' => now()->toDateString()]);
            $cls->increment('booked_count');
            return response()->json([
                'success' => true,
                'message' => "Member '{$memberUser->name}' re-enrolled in class successfully.",
                'data' => [
                    'id' => $existing->id,
                    'userId' => $existing->user_id,
                    'memberId' => 'mem-' . $existing->user_id,
                    'name' => $memberUser->name,
                    'phone' => $memberUser->phone,
                    'email' => $memberUser->email,
                    'enrolledDate' => now()->toDateString(),
                    'status' => 'Active',
                    'invoiceId' => $existing->invoice_id,
                ],
                'enrolledCount' => $activeEnrollmentsCount + 1,
            ]);
        }

        $enrollment = ClassEnrollment::create([
            'gym_id' => $cls->gym_id,
            'gym_class_id' => $cls->id,
            'user_id' => $userId,
            'enrolled_date' => now()->toDateString(),
            'status' => 'Active',
        ]);

        $cls->increment('booked_count');

        return response()->json([
            'success' => true,
            'message' => "Member '{$memberUser->name}' enrolled in class successfully.",
            'data' => [
                'id' => $enrollment->id,
                'userId' => $enrollment->user_id,
                'memberId' => 'mem-' . $enrollment->user_id,
                'name' => $memberUser->name,
                'phone' => $memberUser->phone,
                'email' => $memberUser->email,
                'enrolledDate' => $enrollment->enrolled_date->toDateString(),
                'status' => $enrollment->status,
                'invoiceId' => null,
            ],
            'enrolledCount' => $activeEnrollmentsCount + 1,
        ], 201);
    }

    /**
     * Unenroll a member from a class roster.
     */
    public function unenrollMember(Request $request, $id, $userId)
    {
        $gymId = $this->resolveGymId($request);
        $numericClassId = (int)str_replace('cls-', '', $id);
        $numericUserId = (int)preg_replace('/[^0-9]/', '', (string)$userId);

        $cls = GymClass::where('id', $numericClassId);
        if ($gymId) {
            $cls->where('gym_id', $gymId);
        }
        $cls = $cls->firstOrFail();

        $enrollment = ClassEnrollment::where('gym_class_id', $cls->id)
            ->where('user_id', $numericUserId)
            ->first();

        if (!$enrollment) {
            return response()->json(['success' => false, 'message' => 'Enrollment record not found.'], 404);
        }

        $enrollment->delete();

        if ($cls->booked_count > 0) {
            $cls->decrement('booked_count');
        }

        $remainingCount = ClassEnrollment::where('gym_class_id', $cls->id)->where('status', 'Active')->count();

        return response()->json([
            'success' => true,
            'message' => 'Member removed from class roster successfully.',
            'enrolledCount' => $remainingCount,
        ]);
    }

    public function destroy($id)
    {
        $numericClassId = (int)str_replace('cls-', '', $id);
        GymClass::findOrFail($numericClassId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Class deleted from database'
        ]);
    }
}
