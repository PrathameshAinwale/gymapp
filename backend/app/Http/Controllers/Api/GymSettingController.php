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
                        'name' => $gym->name,
                        'tagline' => $gym->tagline ?? "High-Performance Athletic & Fitness Club",
                        'address' => ($gym->address ? $gym->address . ', ' : '') . ($gym->city ?? 'India'),
                        'phone' => $gym->phone ?? '+91 98000 00000',
                        'email' => $gym->email,
                        'operatingHours' => 'Mon-Sat: 6:00 AM - 10:30 PM | Sun: 7:00 AM - 6:00 PM',
                        'currency' => '₹',
                    ]
                ]);
            }
        }

        $setting = GymSetting::firstOrCreate([], [
            'name' => 'PULSE FIT ATHLETIC CLUB',
            'tagline' => "India's Premier Strength & Conditioning Hub",
            'address' => 'Plot 42, Hiranandani Business Park, Powai, Mumbai, Maharashtra 400076',
            'phone' => '+91 98201 54321',
            'email' => 'contact@pulsefit.in',
            'operating_hours' => 'Mon-Sat: 5:30 AM - 11:00 PM | Sun: 6:00 AM - 8:00 PM',
            'currency' => '₹',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'name' => $setting->name,
                'tagline' => $setting->tagline,
                'address' => $setting->address,
                'phone' => $setting->phone,
                'email' => $setting->email,
                'operatingHours' => $setting->operating_hours,
                'currency' => $setting->currency,
            ]
        ]);
    }

    public function update(Request $request)
    {
        $setting = GymSetting::first();
        if (!$setting) {
            $setting = new GymSetting();
        }

        if ($request->has('name')) $setting->name = $request->name;
        if ($request->has('tagline')) $setting->tagline = $request->tagline;
        if ($request->has('address')) $setting->address = $request->address;
        if ($request->has('phone')) $setting->phone = $request->phone;
        if ($request->has('email')) $setting->email = $request->email;
        if ($request->has('operatingHours')) $setting->operating_hours = $request->operatingHours;
        if ($request->has('currency')) $setting->currency = $request->currency;
        $setting->save();

        return response()->json([
            'success' => true,
            'message' => 'Gym settings updated successfully',
            'data' => $this->show()->original['data'],
        ]);
    }
}
