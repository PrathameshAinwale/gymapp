<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PlanController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Plan::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) {
                    $q->orWhereNull('gym_id');
                }
            });
        }

        $plans = $query->get()->map(function ($plan) {
            return [
                'id' => 'plan-' . $plan->id,
                'numericId' => $plan->id,
                'gymId' => $plan->gym_id,
                'name' => $plan->name,
                'price' => $plan->price,
                'period' => $plan->period,
                'durationMonths' => $plan->duration_months,
                'popular' => (bool)$plan->popular,
                'color' => $plan->color ?? 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
                'features' => $plan->features ?? [],
                'activeSubscribers' => $plan->memberProfiles()->count() ?: $plan->active_subscribers,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    public function show($id)
    {
        $numericId = str_replace('plan-', '', $id);
        $plan = Plan::findOrFail($numericId);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'plan-' . $plan->id,
                'numericId' => $plan->id,
                'gymId' => $plan->gym_id,
                'name' => $plan->name,
                'price' => $plan->price,
                'period' => $plan->period,
                'durationMonths' => $plan->duration_months,
                'popular' => (bool)$plan->popular,
                'color' => $plan->color,
                'features' => $plan->features,
                'activeSubscribers' => $plan->memberProfiles()->count() ?: $plan->active_subscribers,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'price' => 'required|numeric',
            'period' => 'required|string',
            'duration_months' => 'nullable|integer',
            'features' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request) ?? 1;

        $plan = Plan::create([
            'gym_id' => $gymId,
            'name' => $request->name,
            'price' => $request->price,
            'period' => $request->period,
            'duration_months' => $request->duration_months ?? 1,
            'popular' => $request->popular ?? false,
            'color' => $request->color ?? 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
            'features' => $request->features ?? [],
            'active_subscribers' => 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Plan created successfully',
            'data' => $this->show('plan-' . $plan->id)->original['data'],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $numericId = str_replace('plan-', '', $id);
        $plan = Plan::findOrFail($numericId);

        if ($request->has('name')) $plan->name = $request->name;
        if ($request->has('price')) $plan->price = $request->price;
        if ($request->has('period')) $plan->period = $request->period;
        if ($request->has('duration_months')) $plan->duration_months = $request->duration_months;
        if ($request->has('popular')) $plan->popular = $request->popular;
        if ($request->has('color')) $plan->color = $request->color;
        if ($request->has('features')) $plan->features = $request->features;
        $plan->save();

        return response()->json([
            'success' => true,
            'message' => 'Plan updated successfully',
            'data' => $this->show('plan-' . $plan->id)->original['data'],
        ]);
    }

    public function destroy($id)
    {
        $numericId = str_replace('plan-', '', $id);
        $plan = Plan::findOrFail($numericId);
        $plan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Plan deleted successfully'
        ]);
    }
}
