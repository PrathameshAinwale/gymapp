<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\User;
use App\Models\GymRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GymRoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_gym_roles_endpoint_auto_seeds_defaults_and_creates_roles(): void
    {
        $gym = Gym::create([
            'name' => 'Fitness Zone',
            'email' => 'fitness@zone.com',
            'phone' => '9988776655',
            'status' => 'Active',
        ]);

        $owner = User::create([
            'name' => 'Owner User',
            'email' => 'owner@zone.com',
            'password' => bcrypt('password123'),
            'role' => 'owner',
            'gym_id' => $gym->id,
        ]);

        $this->actingAs($owner, 'sanctum');

        // 1. Fetch roles - should self-heal and seed default 3 roles
        $response = $this->getJson("/api/v1/gym-roles?gym_id={$gym->id}");
        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $this->assertCount(3, $response->json('roles'));

        // 2. Create custom role 'Front Desk' (slug: front_desk)
        $storeResponse = $this->postJson('/api/v1/gym-roles', [
            'gym_id' => $gym->id,
            'name' => 'Front Desk',
            'slug' => 'front_desk',
            'description' => 'Reception and visitor check-in',
            'color' => 'teal',
            'assigned_pages' => ['dashboard', 'members', 'attendance'],
        ]);

        $storeResponse->assertStatus(201);
        $storeResponse->assertJsonPath('success', true);
        $storeResponse->assertJsonPath('role.slug', 'front_desk');

        $this->assertDatabaseHas('gym_roles', [
            'gym_id' => $gym->id,
            'slug' => 'front_desk',
        ]);
    }

    public function test_gym_roles_self_heals_if_table_was_missing(): void
    {
        $gym = Gym::create([
            'name' => 'Alpha Gym',
            'email' => 'alpha@gym.com',
            'phone' => '9123456780',
            'status' => 'Active',
        ]);

        $owner = User::create([
            'name' => 'Alpha Owner',
            'email' => 'alpha@owner.com',
            'password' => bcrypt('password123'),
            'role' => 'owner',
            'gym_id' => $gym->id,
        ]);

        // Drop gym_roles to simulate unmigrated production DB
        Schema::dropIfExists('gym_roles');
        $this->assertFalse(Schema::hasTable('gym_roles'));

        $this->actingAs($owner, 'sanctum');

        // Calling store should recreate table on the fly and create the role
        $storeResponse = $this->postJson('/api/v1/gym-roles', [
            'gym_id' => $gym->id,
            'name' => 'Floor Trainer',
            'slug' => 'floor_trainer',
            'assigned_pages' => ['dashboard', 'sessions'],
        ]);

        $storeResponse->assertStatus(201);
        $this->assertTrue(Schema::hasTable('gym_roles'));
        $this->assertDatabaseHas('gym_roles', [
            'gym_id' => $gym->id,
            'slug' => 'floor_trainer',
        ]);
    }
}
