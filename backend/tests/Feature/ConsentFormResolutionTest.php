<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\User;
use App\Models\ConsentForm;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConsentFormResolutionTest extends TestCase
{
    use RefreshDatabase;

    public function test_consent_form_resolves_sequential_member_id_and_inserts_successfully(): void
    {
        $gym = Gym::first() ?: Gym::create([
            'name' => 'Test Gym',
            'email' => 'testgym@example.com',
            'phone' => '9999999999',
            'address' => 'Pune',
            'status' => 'Active',
        ]);

        $owner = User::where('gym_id', $gym->id)->where('role', 'owner')->first() ?: User::create([
            'name' => 'Gym Owner',
            'email' => 'owner_' . uniqid() . '@example.com',
            'password' => bcrypt('password'),
            'role' => 'owner',
            'gym_id' => $gym->id,
        ]);

        $member = User::create([
            'name' => 'Ankit Rahane',
            'email' => 'ankit_' . uniqid() . '@example.com',
            'phone' => '8788629374',
            'password' => bcrypt('password'),
            'role' => 'member',
            'gym_id' => $gym->id,
            'member_number' => 'MEM260001',
        ]);

        Sanctum::actingAs($owner);

        // 1. Submit consent form using sequential member_number string 'MEM260001'
        $response = $this->postJson('/api/v1/consent-forms', [
            'memberId' => 'MEM260001',
            'memberName' => 'Ankit Rahane',
            'phone' => '8788629374',
            'planName' => 'Founder 6 Months',
            'status' => 'Signed',
        ]);

        $response->assertStatus(201);
        $data = $response->json('data');
        $this->assertEquals($member->id, $data['numericId'] ? ConsentForm::find($data['numericId'])->member_id : null);

        // 2. Submit consent form with unresolvable or null memberId (should save member_id as null, never 0)
        $response2 = $this->postJson('/api/v1/consent-forms', [
            'memberId' => 'MEM999999',
            'memberName' => 'Unknown Walk-in',
            'phone' => '9888888888',
            'planName' => 'Trial Session',
            'status' => 'Signed',
        ]);

        $response2->assertStatus(201);
        $cf2 = ConsentForm::find($response2->json('data.numericId'));
        $this->assertNull($cf2->member_id);
    }
}
