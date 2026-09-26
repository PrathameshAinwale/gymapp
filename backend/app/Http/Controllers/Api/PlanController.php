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
                $q->where('gym_id', $gymId)
                  ->orWhereNull('gym_id')
                  ->orWhere('gym_id', 1);
            });
        }

        $plans = $query->get()->map(function ($plan) {
            return [
                'id' => 'plan-' . $plan->id,
                'numericId' => $plan->id,
                'gymId' => $plan->gym_id,
                'name' => $plan->name,
                'price' => $plan->price,
                'maxDiscount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'max_discount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'offer' => $plan->offer,
                'offerText' => $plan->offer,
                'offerDays' => (int)($plan->offer_days ?? 0),
                'offer_days' => (int)($plan->offer_days ?? 0),
                'period' => $plan->period,
                'durationMonths' => $plan->duration_months,
                'popular' => (bool)$plan->popular,
                'color' => $plan->color ?? 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
                'features' => $this->parseFeatures($plan->features),
                'activeSubscribers' => $plan->memberProfiles()->count() ?: $plan->active_subscribers,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    protected function parseFeatures($features): array
    {
        if (is_array($features)) {
            return array_values($features);
        }
        if (is_string($features)) {
            $decoded = json_decode($features, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $this->parseFeatures($decoded);
            }
            $lines = array_filter(array_map('trim', preg_split('/[\r\n,]+/', $features)));
            if (!empty($lines)) {
                return array_values($lines);
            }
        }
        return [];
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
                'maxDiscount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'max_discount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'offer' => $plan->offer,
                'offerText' => $plan->offer,
                'offerDays' => (int)($plan->offer_days ?? 0),
                'offer_days' => (int)($plan->offer_days ?? 0),
                'period' => $plan->period,
                'durationMonths' => $plan->duration_months,
                'popular' => (bool)$plan->popular,
                'color' => $plan->color,
                'features' => $this->parseFeatures($plan->features),
                'activeSubscribers' => $plan->memberProfiles()->count() ?: $plan->active_subscribers,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'price' => 'required|numeric',
            'max_discount' => 'nullable|numeric',
            'maxDiscount' => 'nullable|numeric',
            'period' => 'nullable|string',
            'duration_months' => 'nullable|integer',
            'durationMonths' => 'nullable|integer',
            'features' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request);
        $durationMonths = (int)($request->duration_months ?? $request->durationMonths ?? 1);
        $period = $request->period ?? ($durationMonths > 1 ? "{$durationMonths} Months" : 'Monthly');

        $plan = Plan::create([
            'gym_id' => $gymId,
            'name' => $request->name,
            'price' => $request->price,
            'max_discount' => $request->max_discount ?? $request->maxDiscount ?? 0,
            'offer' => $request->offer ?? $request->offerText ?? null,
            'offer_days' => (int)($request->offer_days ?? $request->offerDays ?? 0),
            'period' => $period,
            'duration_months' => $durationMonths,
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
        if ($request->has('max_discount') || $request->has('maxDiscount')) {
            $plan->max_discount = $request->max_discount ?? $request->maxDiscount;
        }
        if ($request->has('offer') || $request->has('offerText')) {
            $plan->offer = $request->offer ?? $request->offerText;
        }
        if ($request->has('offer_days') || $request->has('offerDays')) {
            $plan->offer_days = (int)($request->offer_days ?? $request->offerDays ?? 0);
        }
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
