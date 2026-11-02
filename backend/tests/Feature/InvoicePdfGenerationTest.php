<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Gym;
use App\Models\MemberProfile;
use App\Models\Invoice;
use App\Services\InvoicePdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InvoicePdfGenerationTest extends TestCase
{
    use RefreshDatabase;

    protected Gym $gym;
    protected User $user;
    protected Invoice $invoice;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gym = Gym::create([
            'id' => 1,
            'name' => 'ArchFit Flagship',
            'phone' => '9888877777',
            'address' => 'Plot 42, Hiranandani Business Park, Powai',
            'city' => 'Mumbai',
            'status' => 'Active',
        ]);

        $this->user = User::factory()->create([
            'role' => 'member',
            'gym_id' => 1,
            'name' => 'Rahul Sharma',
            'phone' => '9876543210',
            'email' => 'rahul.sharma@example.test',
        ]);

        MemberProfile::create([
            'user_id' => $this->user->id,
            'status' => 'Active',
            'qr_pass_code' => 'PF-M-999-TEST',
            'join_date' => now()->toDateString(),
            'expiry_date' => now()->addDays(30)->toDateString(),
        ]);

        $this->invoice = Invoice::create([
            'gym_id' => 1,
            'user_id' => $this->user->id,
            'invoice_number' => 'INV-2026-TEST-001',
            'amount' => 5000,
            'total_amount' => 5000,
            'pending_amount' => 0,
            'status' => 'Paid',
            'payment_method' => 'UPI',
            'package_type' => 'Gym-Cardio',
            'date' => now(),
        ]);
    }

    public function test_normal_invoice_generates_valid_pdf_1_4(): void
    {
        $pdf = InvoicePdfService::generate($this->invoice);

        $this->assertStringStartsWith("%PDF-1.4\n", $pdf);
        $this->assertStringEndsWith("%%EOF\n", $pdf);
        $this->assertStringContainsString('ArchFit Flagship', $pdf);
        $this->assertStringContainsString('INV-2026-TEST-001', $pdf);
        $this->assertStringContainsString('Rahul Sharma', $pdf);
        $this->assertStringContainsString('/Count 1', $pdf);
    }

    public function test_worst_case_overflow_data_wraps_properly_without_truncation(): void
    {
        $unbrokenWord = str_repeat('SUPERLONGUNBROKENNAMEWITHOUTSPACES', 6);
        $longName = 'Dr. Alexander Bartholomew Montgomery-Wellington III of Kensington-upon-Thames and Greater London';

        $this->user->name = $longName;
        $this->user->saveQuietly();

        $items = [];
        for ($i = 1; $i <= 30; $i++) {
            $items[] = [
                'name' => ($i === 1) ? "Unbroken: {$unbrokenWord}" : "Standard Package Tier {$i}",
                'validity' => '01 Nov 2026 to 01 Nov 2027',
                'amount' => 1500,
            ];
        }

        $this->invoice->items = $items;
        $this->invoice->total_amount = 45000;
        $this->invoice->amount = 45000;
        $this->invoice->saveQuietly();

        $pdf = InvoicePdfService::generate($this->invoice);

        $this->assertStringStartsWith("%PDF-1.4\n", $pdf);
        $this->assertStringEndsWith("%%EOF\n", $pdf);

        // Assert all 30 items appear in the PDF stream (not capped at 4)
        $this->assertStringContainsString('Standard Package Tier 30', $pdf);

        // Assert multi-page count > 1
        preg_match('/\/Count\s+(\d+)/', $pdf, $matches);
        $this->assertNotEmpty($matches);
        $pageCount = (int)$matches[1];
        $this->assertGreaterThan(1, $pageCount);
        $this->assertStringContainsString("Page 1 of {$pageCount}", $pdf);
        $this->assertStringContainsString("Page {$pageCount} of {$pageCount}", $pdf);
    }

    public function test_wrap_text_splits_unbroken_words(): void
    {
        $unbroken = str_repeat('X', 150);
        $lines = InvoicePdfService::wrapText($unbroken, 100, 10);

        $this->assertGreaterThan(1, count($lines));
        foreach ($lines as $line) {
            $width = InvoicePdfService::getTextWidth($line, 10);
            $this->assertLessThanOrEqual(100.0, $width);
        }
    }
}

