<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\GymSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GymSettingUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym;
    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create([
            'role' => 'owner',
            'name' => 'Test Owner',
            'email' => 'owner@gym.test',
            'phone' => '9876543210',
        ]);

        $this->gym = Gym::create([
            'name' => 'Initial Gym Name',
            'owner_id' => $this->owner->id,
            'phone' => '9876543210',
            'package' => 'Bronze',
            'package_tier' => 'Bronze',
            'status' => 'Active',
            'currency' => '₹',
        ]);

        $this->owner->gym_id = $this->gym->id;
        $this->owner->save();
    }

    public function test_owner_can_update_gym_settings_fields(): void
    {
        $payload = [
            'name' => 'Updated Gym Name',
            'tagline' => 'Best Gym in Town',
            'address' => '123 Fitness Street',
            'phone' => '9876543210',
            'email' => 'contact@updatedgym.com',
            'operatingHours' => '6:00 AM - 10:00 PM',
            'currency' => '₹',
            'gstNumber' => '27AAAAA0000A1Z5',
            'upiId' => 'updated@upi',
            'bankDetails' => 'HDFC Bank - Acc 1234567890',
            'termsAndConditions' => 'No refund after 7 days',
            'footerText' => 'Thank you for choosing Updated Gym',
            'signatoryText' => 'Authorized Manager',
            'taxRate' => 18,
            'deviceIp' => '192.168.1.205',
            'devicePort' => 4370,
        ];

        $response = $this->actingAs($this->owner, 'sanctum')
            ->putJson('/api/v1/gym-info', $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('gyms', [
            'id' => $this->gym->id,
            'name' => 'Updated Gym Name',
            'tagline' => 'Best Gym in Town',
            'address' => '123 Fitness Street',
            'email' => 'contact@updatedgym.com',
            'gst_number' => '27AAAAA0000A1Z5',
            'upi_id' => 'updated@upi',
        ]);
    }

    public function test_owner_with_unlinked_owner_id_can_still_update_their_gym(): void
    {
        // Simulate a gym created where owner_id was not set, but user->gym_id points to it
        $this->gym->owner_id = null;
        $this->gym->save();

        $payload = [
            'name' => 'Recovered Gym Name',
            'address' => '456 Power Lane',
        ];

        $response = $this->actingAs($this->owner, 'sanctum')
            ->putJson('/api/v1/gym-info', $payload);

        $response->assertStatus(200);
        $this->assertDatabaseHas('gyms', [
            'id' => $this->gym->id,
            'name' => 'Recovered Gym Name',
            'address' => '456 Power Lane',
        ]);
    }
}
