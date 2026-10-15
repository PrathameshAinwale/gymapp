<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Gym;
use App\Models\Enquiry;
use App\Models\MemberProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class ValidationAndDataMappingTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gym = Gym::create([
            'id' => 1,
            'name' => 'PulseFit Test Gym',
            'address' => 'Test Address',
            'phone' => '9876543210',
            'email' => 'contact@pulsefit.test',
            'package_tier' => 'platinum',
        ]);
    }

    private function authenticateSuperAdmin()
    {
        $user = User::create([
            'name' => 'Super Admin',
            'email' => 'admin_' . uniqid() . '@pulsefit.in',
            'password' => Hash::make('secret123'),
            'role' => 'superadmin',
            'phone' => '9876543210',
            'gym_id' => $this->gym->id
        ]);
        return $this->actingAs($user, 'sanctum');
    }

    public function test_name_validation_rejects_numeric_and_special_character_only_names()
    {
        $this->authenticateSuperAdmin();

        // 1. Numeric-only name rejected
        $response = $this->postJson('/api/v1/members', [
            'name' => '12345678',
            'phone' => '9876500001',
            'gym_id' => $this->gym->id
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);

        // 2. Name containing prohibited digits rejected
        $response2 = $this->postJson('/api/v1/members', [
            'name' => 'Vikram 2nd',
            'phone' => '9876500002',
            'gym_id' => $this->gym->id
        ]);
        $response2->assertStatus(422);
        $response2->assertJsonValidationErrors(['name']);

        // 3. Special characters only rejected
        $response3 = $this->postJson('/api/v1/members', [
            'name' => '@@##$$%%',
            'phone' => '9876500003',
            'gym_id' => $this->gym->id
        ]);
        $response3->assertStatus(422);
        $response3->assertJsonValidationErrors(['name']);

        // 4. Valid name with spaces and hyphens accepted
        $response4 = $this->postJson('/api/v1/members', [
            'name' => 'Jean-Luc Picard',
            'phone' => '9876500004',
            'gym_id' => $this->gym->id
        ]);
        $this->assertTrue(in_array($response4->status(), [200, 201]));
    }

    public function test_phone_and_emergency_contact_reject_alphabetic_characters()
    {
        $this->authenticateSuperAdmin();

        // 1. Alphabetic mobile rejected
        $resPhone = $this->postJson('/api/v1/members', [
            'name' => 'Aditi Rao',
            'phone' => '98765abcde',
            'gym_id' => $this->gym->id
        ]);
        $resPhone->assertStatus(422);
        $resPhone->assertJsonValidationErrors(['phone']);

        // 2. Alphabetic emergency contact rejected
        $resEmergency = $this->postJson('/api/v1/members', [
            'name' => 'Aditi Rao',
            'phone' => '9876500005',
            'emergency_contact' => 'Brother',
            'gym_id' => $this->gym->id
        ]);
        $resEmergency->assertStatus(422);
        $resEmergency->assertJsonValidationErrors(['emergency_contact']);

        // 3. Valid 10-digit emergency contact accepted
        $resValid = $this->postJson('/api/v1/members', [
            'name' => 'Aditi Rao',
            'phone' => '9876500006',
            'emergency_contact' => '9123456789',
            'gym_id' => $this->gym->id
        ]);
        $this->assertTrue(in_array($resValid->status(), [200, 201]));
    }

    public function test_date_of_birth_rejects_future_dates_and_accepts_today_and_past()
    {
        $this->authenticateSuperAdmin();

        // 1. Future DOB rejected
        $tomorrow = now()->addDays(2)->toDateString();
        $resFuture = $this->postJson('/api/v1/members', [
            'name' => 'Rohan Sen',
            'phone' => '9876500007',
            'dob' => $tomorrow,
            'gym_id' => $this->gym->id
        ]);
        $resFuture->assertStatus(422);
        $resFuture->assertJsonValidationErrors(['dob']);

        // 2. Today's DOB accepted
        $today = now()->toDateString();
        $resToday = $this->postJson('/api/v1/members', [
            'name' => 'Rohan Sen',
            'phone' => '9876500008',
            'dob' => $today,
            'gym_id' => $this->gym->id
        ]);
        $this->assertTrue(in_array($resToday->status(), [200, 201]));

        // 3. Past DOB accepted
        $resPast = $this->postJson('/api/v1/members', [
            'name' => 'Rohan Sen',
            'phone' => '9876500009',
            'dob' => '1995-08-20',
            'gym_id' => $this->gym->id
        ]);
        $this->assertTrue(in_array($resPast->status(), [200, 201]));
    }

    public function test_enquiry_conversion_does_not_populate_emergency_contact_with_mobile()
    {
        $this->authenticateSuperAdmin();

        // Create enquiry
        $enquiry = Enquiry::create([
            'gym_id' => $this->gym->id,
            'name' => 'Karan Johar',
            'phone' => '9876500010',
            'email' => 'karan@example.com',
            'source' => 'Walk-in',
            'status' => 'Hot',
            'priority' => 'Hot'
        ]);

        $res = $this->postJson("/api/v1/enquiries/{$enquiry->id}/convert", [
            'name' => 'Karan Johar',
            'phone' => '9876500010',
            'email' => 'karan@example.com',
        ]);

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals('9876500010', $data['phone']);
        $this->assertEquals('', $data['emergencyContact'] ?? '');
        $this->assertNotEquals($data['phone'], $data['emergencyContact']);
    }
}
