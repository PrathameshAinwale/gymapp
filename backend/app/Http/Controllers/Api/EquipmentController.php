<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Equipment::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) {
                    $q->orWhereNull('gym_id');
                }
            });
        }

        $equipment = $query->get()->map(function ($eq) {
            return [
                'id' => 'eq-' . $eq->id,
                'numericId' => $eq->id,
                'gymId' => $eq->gym_id,
                'name' => $eq->name,
                'brand' => $eq->brand,
                'category' => $eq->category,
                'location' => $eq->location ?? 'Zone A - Main Floor',
                'status' => $eq->status,
                'lastServiced' => $eq->last_serviced?->format('Y-m-d') ?? now()->toDateString(),
                'lastServiceDate' => $eq->last_serviced?->format('Y-m-d') ?? now()->toDateString(),
                'nextServiceDue' => $eq->next_service_due?->format('Y-m-d') ?? now()->addMonths(3)->toDateString(),
                'condition' => $eq->condition ?? 'Good',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $equipment,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'category' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $gymId = $this->resolveGymId($request) ?? 1;

        $eq = Equipment::create([
            'gym_id' => $gymId,
            'name' => $request->name,
            'brand' => $request->brand ?? 'Commercial Grade',
            'category' => $request->category ?? 'Cardio & Strength',
            'location' => $request->location ?? 'Main Workout Floor',
            'status' => $request->status ?? 'Operational',
            'last_serviced' => $request->last_serviced ?? $request->lastServiceDate ?? now()->toDateString(),
            'next_service_due' => $request->next_service_due ?? $request->nextServiceDue ?? now()->addMonths(3)->toDateString(),
            'condition' => $request->condition ?? 'Good',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Equipment logged successfully',
            'data' => [
                'id' => 'eq-' . $eq->id,
                'numericId' => $eq->id,
                'gymId' => $eq->gym_id,
                'name' => $eq->name,
                'brand' => $eq->brand,
                'category' => $eq->category,
                'location' => $eq->location,
                'status' => $eq->status,
                'lastServiced' => $eq->last_serviced?->format('Y-m-d'),
                'lastServiceDate' => $eq->last_serviced?->format('Y-m-d'),
                'nextServiceDue' => $eq->next_service_due?->format('Y-m-d'),
                'condition' => $eq->condition,
            ],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $numericId = str_replace('eq-', '', $id);
        $eq = Equipment::findOrFail($numericId);

        if ($request->has('name')) $eq->name = $request->name;
        if ($request->has('brand')) $eq->brand = $request->brand;
        if ($request->has('category')) $eq->category = $request->category;
        if ($request->has('location')) $eq->location = $request->location;
        if ($request->has('status')) $eq->status = $request->status;
        if ($request->has('last_serviced') || $request->has('lastServiceDate')) {
            $eq->last_serviced = $request->last_serviced ?? $request->lastServiceDate;
        }
        if ($request->has('next_service_due') || $request->has('nextServiceDue')) {
            $eq->next_service_due = $request->next_service_due ?? $request->nextServiceDue;
        }
        if ($request->has('condition')) $eq->condition = $request->condition;
        $eq->save();

        return response()->json([
            'success' => true,
            'message' => 'Equipment status updated',
            'data' => [
                'id' => 'eq-' . $eq->id,
                'numericId' => $eq->id,
                'gymId' => $eq->gym_id,
                'name' => $eq->name,
                'brand' => $eq->brand,
                'category' => $eq->category,
                'location' => $eq->location,
                'status' => $eq->status,
                'lastServiced' => $eq->last_serviced?->format('Y-m-d'),
                'lastServiceDate' => $eq->last_serviced?->format('Y-m-d'),
                'nextServiceDue' => $eq->next_service_due?->format('Y-m-d'),
                'condition' => $eq->condition,
            ],
        ]);
    }

    public function destroy($id)
    {
        $numericId = str_replace('eq-', '', $id);
        $eq = Equipment::findOrFail($numericId);
        $eq->delete();

        return response()->json([
            'success' => true,
            'message' => 'Equipment record removed'
        ]);
    }
}
