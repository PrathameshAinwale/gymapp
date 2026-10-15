<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Plan;
use App\Services\PlanChainingService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BackfillInvoicePackageDetails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:backfill-package-details {--dry-run : Only show how many rows would be updated without applying changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely and idempotently backfill missing package_type, start_date and end_date on older invoices';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        $invoices = Invoice::with('plan')->get();
        $toUpdate = [];

        foreach ($invoices as $inv) {
            $needsType = empty($inv->package_type);
            $needsStart = empty($inv->start_date);
            $needsEnd = empty($inv->end_date);

            if (!$needsType && !$needsStart && !$needsEnd) {
                continue;
            }

            $plan = $inv->plan;
            $planName = $plan ? $plan->name : ($inv->title ?? '');

            // Determine package type
            $pkgType = $inv->package_type;
            if (empty($pkgType)) {
                $pkgType = PlanChainingService::normalizePackageType($plan?->type ?? $planName);
            }

            // Determine start and end date
            $startDate = $inv->start_date ? Carbon::parse($inv->start_date) : ($inv->created_at ? Carbon::parse($inv->created_at) : Carbon::now());

            $endDate = $inv->end_date ? Carbon::parse($inv->end_date) : null;
            if (!$endDate) {
                $duration = $plan ? (int)$plan->duration_months : 1;
                if ($duration <= 0) $duration = 1;
                $endDate = $startDate->copy()->addMonthsNoOverflow($duration)->subDay();
            }

            $toUpdate[] = [
                'invoice' => $inv,
                'package_type' => $pkgType,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
            ];
        }

        $count = count($toUpdate);
        $this->info("Found {$count} invoice(s) needing backfill.");

        foreach ($toUpdate as $item) {
            $inv = $item['invoice'];
            $this->line("Invoice ID: {$inv->id} ({$inv->invoice_number}): Pkg='{$item['package_type']}', Start={$item['start_date']}, End={$item['end_date']}");
        }

        if ($dryRun) {
            $this->warn("DRY RUN: No database changes applied. {$count} rows would be updated.");
            return Command::SUCCESS;
        }

        if ($count > 0) {
            foreach ($toUpdate as $item) {
                $inv = $item['invoice'];
                $inv->package_type = $item['package_type'];
                $inv->start_date = $item['start_date'];
                $inv->end_date = $item['end_date'];
                $inv->save();
            }
            $this->info("Successfully backfilled {$count} invoice(s).");
        } else {
            $this->info("All invoices are already up to date. 0 rows changed.");
        }

        return Command::SUCCESS;
    }
}
