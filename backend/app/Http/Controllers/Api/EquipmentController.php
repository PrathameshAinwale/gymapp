<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Equipment::query();
        if ($gymId) {
            $query->where('gym_id', $gymId);
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

        $gymId = $this->resolveGymId($request);

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
        $previousStatus = $eq->status;

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

        // Create notification only when status changes TO 'Maintenance Needed'
        if ($eq->status === 'Maintenance Needed' && $previousStatus !== 'Maintenance Needed') {
            $gymId = (int) ($eq->gym_id ?: $this->resolveGymId($request));
            if ($gymId > 0) {
                $staffUsers = User::where('gym_id', $gymId)
                    ->whereIn('role', ['owner', 'superadmin', 'manager', 'accounts', 'trainer'])
                    ->get();

                if ($staffUsers->isNotEmpty()) {
                    $notificationService = app(NotificationService::class);
                    foreach ($staffUsers as $staffUser) {
                        $notificationService->notify(
                            $gymId,
                            $staffUser->id,
                            'maintenance',
                            'Equipment Maintenance Needed',
                            "Machine \"{$eq->name}\" was flagged for maintenance inspection.",
                            [
                                'equipment_id' => $eq->id,
                                'equipment_name' => $eq->name,
                                'location' => $eq->location ?? 'Main Workout Floor',
                                'status' => $eq->status,
                            ],
                            'high',
                            'equipment_maintenance_' . $eq->id . '_' . $staffUser->id
                        );
                    }
                }
            }
        }

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
