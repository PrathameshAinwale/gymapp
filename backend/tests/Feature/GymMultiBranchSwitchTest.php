<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GymMultiBranchSwitchTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_switch_branches_and_each_gym_persists_its_own_settings_and_logo(): void
    {
        Storage::fake('public');

        // 1. Create Owner User
        $owner = User::create([
            'name' => 'John Owner',
            'email' => 'owner@multigym.com',
            'phone' => '9876543210',
            'password' => bcrypt('password123'),
            'role' => 'owner',
        ]);

        // 2. Create Gym 1
        $gym1 = Gym::create([
            'name' => 'Downtown Fitness Hub',
            'owner_id' => $owner->id,
            'phone' => '9876543210',
            'email' => 'downtown@multigym.com',
            'package' => 'Platinum',
            'package_tier' => 'Platinum',
            'max_branches' => 5,
            'status' => 'Active',
            'address' => '100 Main Street',
            'currency' => '₹',
            'logo' => 'https://example.com/gym1-initial-logo.png',
        ]);

        // 3. Create Gym 2
        $gym2 = Gym::create([
            'name' => 'Uptown Crossfit Arena',
            'owner_id' => $owner->id,
            'phone' => '9876543211',
            'email' => 'uptown@multigym.com',
            'package' => 'Platinum',
            'package_tier' => 'Platinum',
            'max_branches' => 5,
            'status' => 'Active',
            'address' => '500 Park Avenue',
            'currency' => '$',
            'logo' => 'https://example.com/gym2-initial-logo.png',
        ]);

        $owner->gym_id = $gym1->id;
        $owner->save();

        $this->actingAs($owner, 'sanctum');

        // Step A: Save unique settings for Gym 1
        $updateGym1Response = $this->putJson('/api/v1/gym-info', [
            'gym_id' => $gym1->id,
            'name' => 'Downtown Fitness Hub Updated',
            'tagline' => 'Best in Downtown',
            'phone' => '9876543210',
            'logo' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'upi_id' => 'downtown@upi',
            'bank_details' => 'HDFC Bank - A/C 11112222',
            'currency' => '₹',
            'tax_rate' => 18,
        ], ['X-Gym-Id' => $gym1->id]);

        $updateGym1Response->assertStatus(200);
        $updateGym1Response->assertJsonPath('success', true);
        $updateGym1Response->assertJsonPath('data.name', 'Downtown Fitness Hub Updated');

        // Step B: Switch to Gym 2 via /api/v1/owner/switch-branch
        $switchResponse = $this->postJson('/api/v1/owner/switch-branch', [
            'gym_id' => $gym2->id,
        ]);
        $switchResponse->assertStatus(200);
        $switchResponse->assertJsonPath('success', true);
        $switchResponse->assertJsonPath('active_gym_id', $gym2->id);

        // Step C: Verify /api/v1/auth/me retains Gym 2 and does NOT reset to Gym 1
        $meResponse = $this->getJson('/api/v1/auth/me');
        $meResponse->assertStatus(200);
        $this->assertEquals($gym2->id, $meResponse->json('user.gym_id'));

        // Step D: Verify Gym 2's settings endpoint returns Gym 2's data
        $showGym2Response = $this->getJson('/api/v1/gym-info', ['X-Gym-Id' => $gym2->id]);
        $showGym2Response->assertStatus(200);
        $this->assertEquals('Uptown Crossfit Arena', $showGym2Response->json('data.name'));

        // Step E: Save unique settings for Gym 2
        $updateGym2Response = $this->putJson('/api/v1/gym-info', [
            'gym_id' => $gym2->id,
            'name' => 'Uptown Crossfit Arena Updated',
            'tagline' => 'Elite Training Studio',
            'phone' => '9998887776',
            'logo' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9QzwAEjAwMABuMAgG7+5aIAAAAAElFTkSuQmCC',
            'upi_id' => 'uptown@okaxis',
            'bank_details' => 'ICICI Bank - A/C 99998888',
            'currency' => '$',
            'tax_rate' => 5,
        ], ['X-Gym-Id' => $gym2->id]);

        $updateGym2Response->assertStatus(200);
        $updateGym2Response->assertJsonPath('success', true);
        $updateGym2Response->assertJsonPath('data.name', 'Uptown Crossfit Arena Updated');
        $updateGym2Response->assertJsonPath('data.upiId', 'uptown@okaxis');

        // Step F: Switch back to Gym 1
        $switchBackResponse = $this->postJson('/api/v1/owner/switch-branch', [
            'gym_id' => $gym1->id,
        ]);
        $switchBackResponse->assertStatus(200);
        $switchBackResponse->assertJsonPath('active_gym_id', $gym1->id);

        // Step G: Verify Gym 1 still has its original distinct settings
        $gym1Final = Gym::find($gym1->id);
        $gym2Final = Gym::find($gym2->id);

        $this->assertEquals('Downtown Fitness Hub Updated', $gym1Final->name);
        $this->assertEquals('downtown@upi', $gym1Final->upi_id);
        $this->assertEquals('HDFC Bank - A/C 11112222', $gym1Final->bank_details);
        $this->assertEquals(18, (int)$gym1Final->tax_rate);

        $this->assertEquals('Uptown Crossfit Arena Updated', $gym2Final->name);
        $this->assertEquals('uptown@okaxis', $gym2Final->upi_id);
        $this->assertEquals('ICICI Bank - A/C 99998888', $gym2Final->bank_details);
        $this->assertEquals(5, (int)$gym2Final->tax_rate);

        // Step H: Test dedicated multipart logo upload route for Gym 1
        $file = UploadedFile::fake()->image('gym1_brand_logo.png', 400, 400);
        $uploadResponse = $this->postJson('/api/v1/gym-info/logo', [
            'logo' => $file,
            'gym_id' => $gym1->id,
        ], ['X-Gym-Id' => $gym1->id]);

        $uploadResponse->assertStatus(200);
        $uploadResponse->assertJsonPath('success', true);
        $this->assertNotEmpty($uploadResponse->json('logo'));

        $gym1Refreshed = Gym::find($gym1->id);
        $this->assertStringContainsString('logos/gym_' . $gym1->id . '_logo_', $gym1Refreshed->logo);

        // Confirm Gym 2's logo was not overwritten
        $this->assertStringNotContainsString('gym_' . $gym1->id, $gym2Final->logo);
    }
}
