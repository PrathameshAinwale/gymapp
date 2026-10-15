<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\GymSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class GymSubscriptionPlanTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym;
    protected User $owner;
    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create([
            'role' => 'owner',
            'name' => 'Prathamesh',
            'email' => 'prathamesh@gym.test',
            'phone' => '8767227125',
        ]);

        $this->gym = Gym::create([
            'name' => 'Prathamesh Gym',
            'owner_id' => $this->owner->id,
            'phone' => '8767227125',
            'package' => 'Bronze',
            'package_tier' => 'Bronze',
            'status' => 'Active',
            'currency' => '₹',
        ]);

        $this->owner->gym_id = $this->gym->id;
        $this->owner->save();

        $this->superadmin = User::factory()->create([
            'role' => 'superadmin',
            'email' => 'superadmin@archfit.test',
        ]);

        GymSetting::create([
            'id' => 1,
            'name' => 'Pulse Fit Flagship',
            'tagline' => 'Premier Fitness',
            'currency' => '₹',
        ]);
    }

    public function test_superadmin_updates_gym_to_platinum_and_settings_returns_platinum_immediately(): void
    {
        // 1. Warm cache with initial Bronze data
        $initialRes = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/v1/gym-info?gym_id={$this->gym->id}");

        $initialRes->assertStatus(200);
        $this->assertEquals('Bronze', $initialRes->json('data.packageTier'));

        // Cache must have been created
        $this->assertTrue(Cache::has("gym_setting_v1_{$this->gym->id}"));

        // 2. Superadmin updates the gym to Platinum
        $updateRes = $this->actingAs($this->superadmin, 'sanctum')
            ->putJson("/api/v1/superadmin/gyms/{$this->gym->id}", [
                'package_tier' => 'Platinum',
                'package' => 'Platinum',
                'max_branches' => 3,
            ]);

        $updateRes->assertStatus(200);

        // 3. Cache must be cleared immediately by superadmin update path
        $this->assertFalse(Cache::has("gym_setting_v1_{$this->gym->id}"));

        // 4. Settings endpoint called right after update must return Platinum
        $settingsRes = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/v1/gym-info?gym_id={$this->gym->id}");

        $settingsRes->assertStatus(200);
        $this->assertEquals('Platinum', $settingsRes->json('data.package'));
        $this->assertEquals('Platinum', $settingsRes->json('data.packageTier'));
        $this->assertEquals('Platinum', $settingsRes->json('data.package_tier'));
        $this->assertEquals(false, $settingsRes->json('data.is_fallback'));
    }

    public function test_fallback_response_never_returns_bronze_for_unknown_or_missing_gym(): void
    {
        // Request without a matching gym ID (e.g. invalid public ID 99999)
        $fallbackRes = $this->getJson('/api/v1/gym-info?gym_id=99999');

        $fallbackRes->assertStatus(200);
        $data = $fallbackRes->json('data');

        // Fallback response must indicate it is a fallback
        $this->assertTrue($data['is_fallback'] ?? false);
        $this->assertTrue($data['isFallback'] ?? false);

        // Fallback response must NOT spoof a Bronze plan or features
        $this->assertNull($data['package'] ?? null);
        $this->assertNull($data['packageTier'] ?? null);
        $this->assertNull($data['package_tier'] ?? null);
    }
}
