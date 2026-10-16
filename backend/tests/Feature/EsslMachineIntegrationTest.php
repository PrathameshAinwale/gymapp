<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EsslMachineIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        DB::table('gyms')->insert([
            'id' => 1,
            'name' => 'PulseFit Gym',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('biometric_devices')->insert([
            'id' => 1,
            'gym_id' => 1,
            'name' => 'eSSL Test Gate',
            'ip_address' => '127.0.0.1',
            'port' => 4370,
            'api_token' => 'test_token_12345',
            'status' => 'online',
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_staff_creation_sets_biometric_id()
    {
        $admin = User::factory()->create(['role' => 'superadmin', 'gym_id' => 1]);

        $response = $this->actingAs($admin)->postJson('/api/v1/staff', [
            'name' => 'Aarav Coach',
            'phone' => '9876543210',
            'email' => 'aarav.coach@example.com',
            'password' => 'secret123',
            'role' => 'trainer',
            'gym_id' => 1,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'name' => 'Aarav Coach',
            'role' => 'trainer',
        ]);

        $user = User::where('email', 'aarav.coach@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->biometric_user_id);
    }

    public function test_attendance_open_session_and_checkout_and_reentry()
    {
        $memberUser = User::factory()->create([
            'name' => 'Kabir Sharma',
            'role' => 'member',
            'gym_id' => 1,
            'biometric_user_id' => '101',
        ]);

        $tz = 'Asia/Kolkata';
        $today = Carbon::now($tz)->toDateString();
        $inTime = Carbon::now($tz)->subMinutes(30);
        $outTime = Carbon::now($tz)->subMinutes(10);
        $reentryTime = Carbon::now($tz);

        // 1. First Punch: Check-in 30 mins ago
        $firstPunchTime = $inTime->format('Y-m-d H:i:s');
        $res1 = $this->withHeaders(['X-Collector-Token' => 'test_token_12345'])
            ->postJson('/api/attendance/sync', [
                'records' => [
                    [
                        'biometric_user_id' => '101',
                        'punched_at' => $firstPunchTime,
                        'punch_direction' => 'auto',
                    ]
                ]
            ]);

        $res1->assertStatus(200);
        $this->assertDatabaseHas('attendances', [
            'user_id' => $memberUser->id,
            'date' => $today,
            'check_in_time' => $inTime->toTimeString(),
            'check_out_time' => null,
            'status' => 'Inside Gym',
        ]);

        // 2. Second Punch: Check-out 10 mins ago
        $secondPunchTime = $outTime->format('Y-m-d H:i:s');
        $res2 = $this->withHeaders(['X-Collector-Token' => 'test_token_12345'])
            ->postJson('/api/attendance/sync', [
                'records' => [
                    [
                        'biometric_user_id' => '101',
                        'punched_at' => $secondPunchTime,
                        'punch_direction' => 'auto',
                    ]
                ]
            ]);

        $res2->assertStatus(200);
        $this->assertDatabaseHas('attendances', [
            'user_id' => $memberUser->id,
            'date' => $today,
            'check_in_time' => $inTime->toTimeString(),
            'check_out_time' => $outTime->toTimeString(),
            'duration' => '20m',
            'status' => 'Completed',
        ]);

        // 3. Third Punch: Re-entry now (Previously failed due to existing record)
        $thirdPunchTime = $reentryTime->format('Y-m-d H:i:s');
        $res3 = $this->withHeaders(['X-Collector-Token' => 'test_token_12345'])
            ->postJson('/api/attendance/sync', [
                'records' => [
                    [
                        'biometric_user_id' => '101',
                        'punched_at' => $thirdPunchTime,
                        'punch_direction' => 'auto',
                    ]
                ]
            ]);

        $res3->assertStatus(200);

        // Verify two attendance sessions exist today: one completed, one open!
        $sessions = DB::table('attendances')->where('user_id', $memberUser->id)->where('date', $today)->get();
        $this->assertCount(2, $sessions);

        $openSession = $sessions->firstWhere('check_out_time', null);
        $this->assertNotNull($openSession);
        $this->assertEquals($reentryTime->toTimeString(), $openSession->check_in_time);
        $this->assertEquals('Inside Gym', $openSession->status);
    }

    public function test_machine_reconciliation_deletes_users_removed_on_hardware()
    {
        // User A was synced to device, but user is deleted from machine
        $userA = User::factory()->create([
            'name' => 'Deleted On Device',
            'role' => 'member',
            'gym_id' => 1,
            'biometric_user_id' => '9999',
            'synced_to_device' => 1,
        ]);
        MemberProfile::create([
            'user_id' => $userA->id,
            'biometric_user_id' => '9999',
            'synced_to_device' => 1,
        ]);

        // User B is still on machine
        $userB = User::factory()->create([
            'name' => 'Active On Device',
            'role' => 'trainer',
            'gym_id' => 1,
            'biometric_user_id' => '8888',
            'synced_to_device' => 1,
        ]);

        // Reconcile: machine only reports user 8888
        $response = $this->withHeaders(['X-Collector-Token' => 'test_token_12345'])
            ->postJson('/api/attendance/reconcile-machine-users', [
                'machine_users' => [
                    ['user_id' => '8888', 'uid' => 8888, 'name' => 'Active On Device']
                ]
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'deleted_from_system_count' => 1,
        ]);

        // User A must be removed from system
        $this->assertDatabaseMissing('users', ['id' => $userA->id]);
        $this->assertDatabaseMissing('member_profiles', ['user_id' => $userA->id]);

        // User B must remain intact
        $this->assertDatabaseHas('users', ['id' => $userB->id]);
    }
}
