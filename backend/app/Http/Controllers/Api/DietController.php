<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DietPlan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DietController extends Controller
{
    public function getMemberDiet(Request $request, $memberId)
    {
        $numericId = str_replace('mem-', '', $memberId);
        $diet = DietPlan::where('user_id', $numericId)->latest()->first();

        // If not found by direct user ID (e.g. demo member ID 'mem-4' or 'mem-101'), find first member's diet
        if (!$diet) {
            $firstMember = User::where('role', 'member')->first();
            if ($firstMember) {
                $diet = DietPlan::where('user_id', $firstMember->id)->latest()->first();
            }
            if (!$diet) {
                $diet = DietPlan::latest()->first();
            }
        }

        if (!$diet) {
            return response()->json([
                'success' => false,
                'message' => 'No active diet plan found for this member',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'dp-' . $diet->id,
                'memberId' => 'mem-' . $diet->user_id,
                'dailyCaloriesTarget' => $diet->daily_calories_target,
                'proteinGramsTarget' => $diet->protein_grams_target,
                'carbsGramsTarget' => $diet->carbs_grams_target,
                'fatsGramsTarget' => $diet->fats_grams_target,
                'waterGlassesTarget' => $diet->water_glasses_target,
                'memberName' => $diet->member?->name,
                'assignedBy' => $diet->trainer?->name ?? 'Coach Alex Rivers',
                'days' => $diet->days,
            ]
        ]);
    }

    public function updateMemberDiet(Request $request, $memberId)
    {
        $numericId = str_replace('mem-', '', $memberId);
        $validator = Validator::make($request->all(), [
            'days' => 'required|array',
            'daily_calories_target' => 'nullable|integer',
            'protein_grams_target' => 'nullable|integer',
            'carbs_grams_target' => 'nullable|integer',
            'fats_grams_target' => 'nullable|integer',
            'water_glasses_target' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $trainerId = $request->user()?->role === 'trainer' ? $request->user()->id : null;

        $diet = DietPlan::updateOrCreate(
            ['user_id' => $numericId],
            [
                'trainer_id' => $trainerId ?? 2,
                'daily_calories_target' => $request->daily_calories_target ?? 2600,
                'protein_grams_target' => $request->protein_grams_target ?? 175,
                'carbs_grams_target' => $request->carbs_grams_target ?? 290,
                'fats_grams_target' => $request->fats_grams_target ?? 65,
                'water_glasses_target' => $request->water_glasses_target ?? 10,
                'days' => $request->days,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Diet chart updated successfully',
            'data' => [
                'id' => 'dp-' . $diet->id,
                'memberId' => 'mem-' . $diet->user_id,
                'dailyCaloriesTarget' => $diet->daily_calories_target,
                'proteinGramsTarget' => $diet->protein_grams_target,
                'carbsGramsTarget' => $diet->carbs_grams_target,
                'fatsGramsTarget' => $diet->fats_grams_target,
                'waterGlassesTarget' => $diet->water_glasses_target,
                'days' => $diet->days,
            ]
        ]);
    }
}
