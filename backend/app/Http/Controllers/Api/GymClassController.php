<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GymClass;
use App\Models\ClassBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GymClassController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = GymClass::with('trainer');
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) {
                    $q->orWhereNull('gym_id');
                }
            });
        }

        $classes = $query->get()->map(function ($cls) {
            $days = is_array($cls->days) ? $cls->days : (is_string($cls->days) ? (json_decode($cls->days, true) ?? [$cls->days]) : ['Mon', 'Wed', 'Fri']);
            return [
                'id' => 'cls-' . $cls->id,
                'numericId' => $cls->id,
                'gymId' => $cls->gym_id,
                'name' => $cls->name,
                'title' => $cls->name,
                'trainerId' => $cls->trainer_id ? 'trn-' . $cls->trainer_id : null,
                'trainerName' => $cls->trainer?->name ?? 'Coach Unassigned',
                'time' => $cls->time,
                'days' => $days,
                'capacity' => (int)$cls->capacity,
                'bookedCount' => (int)$cls->booked_count,
                'enrolledCount' => (int)$cls->booked_count,
                'category' => $cls->category ?? 'Group Fitness',
                'room' => $cls->room ?? 'Main Studio A',
                'difficulty' => $cls->difficulty ?? 'Intermediate',
                'intensity' => $cls->difficulty ?? 'High',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $classes,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'time' => 'required|string',
            'capacity' => 'required|integer',
            'days' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $gymId = $this->resolveGymId($request) ?? 1;
        $trainerId = $request->trainer_id ? (int)str_replace('trn-', '', $request->trainer_id) : null;

        $cls = GymClass::create([
            'gym_id' => $gymId,
            'name' => $request->name,
            'trainer_id' => $trainerId,
            'time' => $request->time,
            'days' => $request->days ?? ['Mon', 'Wed', 'Fri'],
            'capacity' => $request->capacity ?? 20,
            'booked_count' => 0,
            'category' => $request->category ?? 'General Group Class',
            'room' => $request->room ?? 'Studio A',
            'difficulty' => $request->difficulty ?? 'All Levels',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Class scheduled successfully',
            'data' => $cls,
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
        $numericClassId = (int)str_replace('cls-', '', $id);
        $cls = GymClass::findOrFail($numericClassId);

        $trainerId = $request->trainer_id ?? $request->trainerId;
        if ($trainerId) {
            $trainerId = (int)str_replace(['trn-', 'tr-'], '', $trainerId);
        }

        $cls->update([
            'name' => $request->input('name', $cls->name),
            'trainer_id' => $trainerId ?? $cls->trainer_id,
            'time' => $request->input('time', $cls->time),
            'days' => $request->input('days', $cls->days),
            'capacity' => $request->input('capacity', $cls->capacity),
            'category' => $request->input('category', $cls->category),
            'room' => $request->input('room', $cls->room),
            'difficulty' => $request->input('difficulty', $cls->difficulty),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Class updated successfully',
            'data' => $cls
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
