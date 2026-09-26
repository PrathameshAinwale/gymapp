<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use Illuminate\Http\Request;

class OfferController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Offer::query();
        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

        $offers = $query->orderBy('id', 'desc')->get()->map(function ($o) {
            return [
                'id' => $o->id,
                'title' => $o->title,
                'code' => $o->code,
                'discountType' => $o->discount_type,
                'discountValue' => (float)$o->discount_value,
                'planId' => $o->plan_id,
                'planName' => $o->plan_name,
                'startDate' => $o->start_date?->format('Y-m-d') ?? (string)$o->start_date,
                'endDate' => $o->end_date?->format('Y-m-d') ?? (string)$o->end_date,
                'description' => $o->description,
                'isActive' => (bool)$o->is_active,
                'createdAt' => $o->created_at?->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json(['success' => true, 'data' => $offers]);
    }

    public function store(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'code' => 'nullable|string|max:50',
            'discountType' => 'nullable|in:percentage,fixed',
            'discount_type' => 'nullable|in:percentage,fixed',
            'discountValue' => 'nullable|numeric|min:0',
            'discount_value' => 'nullable|numeric|min:0',
            'planId' => 'nullable',
            'plan_id' => 'nullable',
            'planName' => 'nullable|string',
            'plan_name' => 'nullable|string',
            'startDate' => 'nullable|date',
            'start_date' => 'nullable|date',
            'endDate' => 'nullable|date',
            'end_date' => 'nullable|date',
            'description' => 'nullable|string',
            'isActive' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        $offer = Offer::create([
            'gym_id' => $gymId,
            'title' => $request->title,
            'code' => strtoupper($request->code ?? ('OFFER' . rand(100, 999))),
            'discount_type' => $request->discountType ?? $request->discount_type ?? 'percentage',
            'discount_value' => $request->discountValue ?? $request->discount_value ?? 10,
            'plan_id' => $request->planId ?? $request->plan_id ?? null,
            'plan_name' => $request->planName ?? $request->plan_name ?? 'All Plans',
            'start_date' => $request->startDate ?? $request->start_date ?? now()->toDateString(),
            'end_date' => $request->endDate ?? $request->end_date ?? now()->addMonths(1)->toDateString(),
            'description' => $request->description,
            'is_active' => $request->has('isActive') ? (bool)$request->isActive : ($request->has('is_active') ? (bool)$request->is_active : true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Offer created successfully',
            'data' => [
                'id' => $offer->id,
                'title' => $offer->title,
                'code' => $offer->code,
                'discountType' => $offer->discount_type,
                'discountValue' => (float)$offer->discount_value,
                'planId' => $offer->plan_id,
                'planName' => $offer->plan_name,
                'startDate' => (string)$offer->start_date,
                'endDate' => (string)$offer->end_date,
                'description' => $offer->description,
                'isActive' => (bool)$offer->is_active,
            ]
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $offer = Offer::findOrFail($id);

        if ($request->has('title')) $offer->title = $request->title;
        if ($request->has('code')) $offer->code = strtoupper($request->code);
        if ($request->has('discountType') || $request->has('discount_type')) {
            $offer->discount_type = $request->discountType ?? $request->discount_type;
        }
        if ($request->has('discountValue') || $request->has('discount_value')) {
            $offer->discount_value = $request->discountValue ?? $request->discount_value;
        }
        if ($request->has('planId') || $request->has('plan_id')) {
            $offer->plan_id = $request->planId ?? $request->plan_id;
        }
        if ($request->has('planName') || $request->has('plan_name')) {
            $offer->plan_name = $request->planName ?? $request->plan_name;
        }
        if ($request->has('startDate') || $request->has('start_date')) {
            $offer->start_date = $request->startDate ?? $request->start_date;
        }
        if ($request->has('endDate') || $request->has('end_date')) {
            $offer->end_date = $request->endDate ?? $request->end_date;
        }
        if ($request->has('description')) $offer->description = $request->description;
        if ($request->has('isActive')) $offer->is_active = (bool)$request->isActive;
        if ($request->has('is_active')) $offer->is_active = (bool)$request->is_active;

        $offer->save();

        return response()->json([
            'success' => true,
            'message' => 'Offer updated successfully',
            'data' => [
                'id' => $offer->id,
                'title' => $offer->title,
                'code' => $offer->code,
                'discountType' => $offer->discount_type,
                'discountValue' => (float)$offer->discount_value,
                'planId' => $offer->plan_id,
                'planName' => $offer->plan_name,
                'startDate' => (string)$offer->start_date,
                'endDate' => (string)$offer->end_date,
                'description' => $offer->description,
                'isActive' => (bool)$offer->is_active,
            ]
        ]);
    }

    public function destroy($id)
    {
        $offer = Offer::findOrFail($id);
        $offer->delete();

        return response()->json(['success' => true, 'message' => 'Offer deleted successfully']);
    }

    public function toggle($id)
    {
        $offer = Offer::findOrFail($id);
        $offer->is_active = !$offer->is_active;
        $offer->save();

        return response()->json([
            'success' => true, 
            'message' => 'Offer status updated', 
            'data' => ['id' => $offer->id, 'isActive' => (bool)$offer->is_active]
        ]);
    }
}
