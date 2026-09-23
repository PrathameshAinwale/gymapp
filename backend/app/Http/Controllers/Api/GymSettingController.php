<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GymSetting;
use Illuminate\Http\Request;

class GymSettingController extends Controller
{
    public function show(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        if ($gymId) {
            $gym = \App\Models\Gym::find($gymId);
            if ($gym) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'name' => $gym->name ?? '',
                        'tagline' => $gym->tagline ?? '',
                        'address' => $gym->address ?? '',
                        'phone' => $gym->phone ?? '',
                        'email' => $gym->email ?? '',
                        'operatingHours' => $gym->operating_hours ?? '',
                        'currency' => $gym->currency ?? '₹',
                    ]
                ]);
            }
        }

        $setting = GymSetting::first();
        if ($setting) {
            return response()->json([
                'success' => true,
                'data' => [
                    'name' => $setting->name ?? '',
                    'tagline' => $setting->tagline ?? '',
                    'address' => $setting->address ?? '',
                    'phone' => $setting->phone ?? '',
                    'email' => $setting->email ?? '',
                    'operatingHours' => $setting->operating_hours ?? '',
                    'currency' => $setting->currency ?? '₹',
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'name' => '',
                'tagline' => '',
                'address' => '',
                'phone' => '',
                'email' => '',
                'operatingHours' => '',
                'currency' => '₹',
            ]
        ]);
    }

    public function update(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $gym = $gymId ? \App\Models\Gym::find($gymId) : null;

        if ($gym) {
            if ($request->has('name')) $gym->name = $request->input('name') ?: '';
            if ($request->has('tagline')) $gym->tagline = $request->input('tagline') ?: null;
            if ($request->has('address')) $gym->address = $request->input('address') ?: null;
            if ($request->has('phone')) $gym->phone = $request->input('phone') ?: null;
            if ($request->has('email')) $gym->email = $request->input('email') ?: null;
            if ($request->has('operatingHours') || $request->has('operating_hours')) {
                $gym->operating_hours = $request->input('operatingHours') ?? $request->input('operating_hours') ?: null;
            }
            if ($request->has('currency')) $gym->currency = $request->input('currency') ?: '₹';
            $gym->save();
        }

        // Also keep GymSetting updated if any exists or if no gym found
        $setting = GymSetting::first();
        if ($setting || !$gym) {
            if (!$setting) {
                $setting = new GymSetting();
            }
            if ($request->has('name')) $setting->name = $request->input('name') ?: '';
            if ($request->has('tagline')) $setting->tagline = $request->input('tagline') ?: null;
            if ($request->has('address')) $setting->address = $request->input('address') ?: null;
            if ($request->has('phone')) $setting->phone = $request->input('phone') ?: null;
            if ($request->has('email')) $setting->email = $request->input('email') ?: null;
            if ($request->has('operatingHours') || $request->has('operating_hours')) {
                $setting->operating_hours = $request->input('operatingHours') ?? $request->input('operating_hours') ?: null;
            }
            if ($request->has('currency')) $setting->currency = $request->input('currency') ?: '₹';
            $setting->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Gym settings updated successfully',
            'data' => $this->show($request)->original['data'],
        ]);
    }
}
