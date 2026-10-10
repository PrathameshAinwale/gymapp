<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;

class PlanController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $paramGymId = $request->input('gym_id') ?? $request->query('gym_id');
        $effectiveGymId = $gymId ?: ($paramGymId ? (int)$paramGymId : 0);

        $cacheKey = "gym_plans_v1_{$effectiveGymId}";
        $plans = Cache::remember($cacheKey, 600, function () use ($effectiveGymId) {
            $query = Plan::query();
            if ($effectiveGymId) {
                $query->where('gym_id', $effectiveGymId);
            } else {
                $query->whereRaw('1 = 0');
            }

            return $query->get()->map(function ($plan) {
                $pkgType = $this->normalizePackageType($plan->package_type);
                return [
                    'id' => 'plan-' . $plan->id,
                    'numericId' => $plan->id,
                    'gymId' => $plan->gym_id,
                    'name' => $plan->name,
                    'packageType' => $pkgType,
                    'package_type' => $pkgType,
                    'sessions' => $plan->sessions ?? '',
                    'price' => $plan->price,
                    'discount' => (float)($plan->discount ?? 0),
                    'maxDiscount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                    'max_discount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                    'offer' => $plan->offer,
                    'offerText' => $plan->offer,
                    'offerDays' => (int)($plan->offer_days ?? 0),
                    'offer_days' => (int)($plan->offer_days ?? 0),
                    'period' => $plan->period,
                    'durationMonths' => $plan->duration_months,
                    'popular' => (bool)$plan->popular,
                    'status' => $plan->status ?? 'Active',
                    'color' => $plan->color ?? 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
                    'features' => $this->parseFeatures($plan->features),
                    'activeSubscribers' => $plan->memberProfiles()->count() ?: $plan->active_subscribers,
                ];
            })->toArray();
        });

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    protected function normalizePackageType(?string $packageType): string
    {
        if (empty($packageType)) {
            return 'Gym-Cardio';
        }
        $clean = strtolower(trim($packageType));
        if ($clean === 'membership' || $clean === 'gym' || $clean === 'cardio' || $clean === 'gym cardio') {
            return 'Gym-Cardio';
        }
        return trim($packageType);
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

    public function show(Request $request, $id)
    {
        $numericId = str_replace('plan-', '', $id);
        $plan = Plan::findOrFail($numericId);
        $gymId = $this->resolveGymId($request);
        $user = $request->user() ?: auth('sanctum')->user();

        if ($user && $user->role !== 'superadmin' && $gymId && (int)$plan->gym_id !== (int)$gymId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to access this plan.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'plan-' . $plan->id,
                'numericId' => $plan->id,
                'gymId' => $plan->gym_id,
                'name' => $plan->name,
                'packageType' => $this->normalizePackageType($plan->package_type),
                'package_type' => $this->normalizePackageType($plan->package_type),
                'sessions' => $plan->sessions ?? '',
                'price' => $plan->price,
                'discount' => (float)($plan->discount ?? 0),
                'maxDiscount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'max_discount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'offer' => $plan->offer,
                'offerText' => $plan->offer,
                'offerDays' => (int)($plan->offer_days ?? 0),
                'offer_days' => (int)($plan->offer_days ?? 0),
                'period' => $plan->period,
                'durationMonths' => $plan->duration_months,
                'popular' => (bool)$plan->popular,
                'status' => $plan->status ?? 'Active',
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
            'package_type' => 'nullable|string',
            'packageType' => 'nullable|string',
            'sessions' => 'nullable|string',
            'price' => 'required|numeric',
            'discount' => 'nullable|numeric',
            'max_discount' => 'nullable|numeric',
            'maxDiscount' => 'nullable|numeric',
            'period' => 'nullable|string',
            'duration_months' => 'nullable|numeric',
            'durationMonths' => 'nullable|numeric',
            'status' => 'nullable|string',
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
        if (!$gymId) {
            $user = $request->user() ?: auth('sanctum')->user();
            $gymId = $user?->gym_id;
        }

        $durationMonths = (int)($request->duration_months ?? $request->durationMonths ?? 1);
        $period = $request->period ?? ($durationMonths > 1 ? "{$durationMonths} Months" : 'Monthly');
        $packageType = $this->normalizePackageType($request->package_type ?? $request->packageType);

        $plan = Plan::create([
            'gym_id' => $gymId,
            'name' => $request->name,
            'package_type' => $packageType,
            'sessions' => $request->sessions ?? null,
            'price' => $request->price,
            'discount' => $request->discount ?? 0,
            'max_discount' => $request->max_discount ?? $request->maxDiscount ?? 0,
            'offer' => $request->offer ?? $request->offerText ?? null,
            'offer_days' => (int)($request->offer_days ?? $request->offerDays ?? 0),
            'period' => $period,
            'duration_months' => $durationMonths,
            'popular' => $request->popular ?? false,
            'status' => $request->status ?? 'Active',
            'color' => $request->color ?? 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
            'features' => $request->features ?? [],
            'active_subscribers' => 0,
        ]);

        $this->clearPlanCache($plan->gym_id);

        return response()->json([
            'success' => true,
            'message' => 'Plan created successfully',
            'data' => [
                'id' => 'plan-' . $plan->id,
                'numericId' => $plan->id,
                'gymId' => $plan->gym_id,
                'name' => $plan->name,
                'packageType' => $packageType,
                'package_type' => $packageType,
                'sessions' => $plan->sessions ?? '',
                'price' => $plan->price,
                'discount' => (float)($plan->discount ?? 0),
                'maxDiscount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'max_discount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'offer' => $plan->offer,
                'offerText' => $plan->offer,
                'offerDays' => (int)($plan->offer_days ?? 0),
                'offer_days' => (int)($plan->offer_days ?? 0),
                'period' => $plan->period,
                'durationMonths' => $plan->duration_months,
                'popular' => (bool)$plan->popular,
                'status' => $plan->status ?? 'Active',
                'color' => $plan->color,
                'features' => $this->parseFeatures($plan->features),
                'activeSubscribers' => 0,
            ],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $numericId = str_replace('plan-', '', $id);
        $plan = Plan::findOrFail($numericId);
        $gymId = $this->resolveGymId($request);
        $user = $request->user() ?: auth('sanctum')->user();

        if ($user && $user->role !== 'superadmin' && $gymId && (int)$plan->gym_id !== (int)$gymId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to update this plan.'
            ], 403);
        }

        if ($request->has('name')) $plan->name = $request->name;
        if ($request->has('package_type') || $request->has('packageType')) {
            $plan->package_type = $this->normalizePackageType($request->package_type ?? $request->packageType);
        }
        if ($request->has('sessions')) $plan->sessions = $request->sessions;
        if ($request->has('price')) $plan->price = $request->price;
        if ($request->has('discount')) $plan->discount = $request->discount;
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
        if ($request->has('duration_months') || $request->has('durationMonths')) {
            $plan->duration_months = (int)($request->duration_months ?? $request->durationMonths);
        }
        if ($request->has('popular')) $plan->popular = $request->popular;
        if ($request->has('status')) $plan->status = $request->status;
        if ($request->has('color')) $plan->color = $request->color;
        if ($request->has('features')) $plan->features = $request->features;
        $plan->save();

        $this->clearPlanCache($plan->gym_id);

        $resolvedType = $this->normalizePackageType($plan->package_type);

        return response()->json([
            'success' => true,
            'message' => 'Plan updated successfully',
            'data' => [
                'id' => 'plan-' . $plan->id,
                'numericId' => $plan->id,
                'gymId' => $plan->gym_id,
                'name' => $plan->name,
                'packageType' => $resolvedType,
                'package_type' => $resolvedType,
                'sessions' => $plan->sessions ?? '',
                'price' => $plan->price,
                'discount' => (float)($plan->discount ?? 0),
                'maxDiscount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'max_discount' => $plan->max_discount !== null ? (float)$plan->max_discount : 0,
                'offer' => $plan->offer,
                'offerText' => $plan->offer,
                'offerDays' => (int)($plan->offer_days ?? 0),
                'offer_days' => (int)($plan->offer_days ?? 0),
                'period' => $plan->period,
                'durationMonths' => $plan->duration_months,
                'popular' => (bool)$plan->popular,
                'status' => $plan->status ?? 'Active',
                'color' => $plan->color,
                'features' => $this->parseFeatures($plan->features),
                'activeSubscribers' => $plan->memberProfiles()->count() ?: $plan->active_subscribers,
            ],
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $numericId = str_replace('plan-', '', $id);
        $plan = Plan::findOrFail($numericId);
        $gymId = $this->resolveGymId($request);
        $user = $request->user() ?: auth('sanctum')->user();

        if ($user && $user->role !== 'superadmin' && $gymId && (int)$plan->gym_id !== (int)$gymId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to delete this plan.'
            ], 403);
        }

        $planGymId = $plan->gym_id;
        $plan->delete();
        $this->clearPlanCache($planGymId);

        return response()->json([
            'success' => true,
            'message' => 'Plan deleted successfully'
        ]);
    }

    private function clearPlanCache($gymId): void
    {
        $id = $gymId ? (int)$gymId : 0;
        Cache::forget("gym_plans_v1_{$id}");
        Cache::forget("gym_plans_v1_0");
    }
}
