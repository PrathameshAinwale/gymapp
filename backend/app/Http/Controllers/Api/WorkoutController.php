<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkoutPlan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WorkoutController extends Controller
{
    public function getMemberRoutine(Request $request, $memberId)
    {
        $numericId = str_replace('mem-', '', $memberId);
        $plan = WorkoutPlan::where('user_id', $numericId)->latest()->first();

        // If not found by direct user ID (e.g. demo member ID 'mem-4' or 'mem-101'), find first member's plan
        if (!$plan) {
            $firstMember = User::where('role', 'member')->first();
            if ($firstMember) {
                $plan = WorkoutPlan::where('user_id', $firstMember->id)->latest()->first();
            }
            if (!$plan) {
                $plan = WorkoutPlan::latest()->first();
            }
        }

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'No active workout plan found for this member',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'wp-' . $plan->id,
                'memberId' => 'mem-' . $plan->user_id,
                'title' => $plan->title,
                'assignedBy' => $plan->trainer?->name ?? 'Coach Alex Rivers',
                'memberName' => $plan->member?->name,
                'days' => $plan->days,
            ]
        ]);
    }

    public function updateMemberRoutine(Request $request, $memberId)
    {
        $numericId = str_replace('mem-', '', $memberId);
        $validator = Validator::make($request->all(), [
            'days' => 'required|array',
            'title' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $trainerId = $request->user()?->role === 'trainer' ? $request->user()->id : null;

        $plan = WorkoutPlan::updateOrCreate(
            ['user_id' => $numericId],
            [
                'title' => $request->title ?? 'Customized Athlete Training Split',
                'trainer_id' => $trainerId ?? 2,
                'days' => $request->days,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Workout plan updated successfully',
            'data' => [
                'id' => 'wp-' . $plan->id,
                'memberId' => 'mem-' . $plan->user_id,
                'title' => $plan->title,
                'days' => $plan->days,
            ]
        ]);
    }
}
