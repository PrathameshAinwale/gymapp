<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\RevenueBilling;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MergeSplitInvoicesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:merge-split-invoices 
                            {--dry-run : Preview groups of split invoices that would be merged without writing changes to the database}
                            {--window=120 : Maximum seconds between split invoice creations to consider part of the same form submission}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Detect and safely merge legacy split invoices (from pre-fix multi-package submissions) into single invoices with line items';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run') ?? true;
        $windowSeconds = (int)$this->option('window');

        $this->info("Scanning for legacy split invoices (Creation window: {$windowSeconds}s)...");

        // 1. Group invoices by user_id and gym_id that have multiple entries on the same date
        $candidates = Invoice::with(['plan', 'user'])
            ->whereNotNull('user_id')
            ->where(function ($q) {
                $q->whereNull('items')->orWhere('items', '[]')->orWhere('items', '');
            })
            ->orderBy('user_id')
            ->orderBy('created_at')
            ->get();

        $groups = [];
        $currentGroup = [];

        foreach ($candidates as $inv) {
            if (empty($currentGroup)) {
                $currentGroup[] = $inv;
                continue;
            }

            $last = end($currentGroup);
            $sameUser = $last->user_id === $inv->user_id && $last->gym_id === $inv->gym_id;
            $diffSeconds = $last->created_at && $inv->created_at
                ? abs(Carbon::parse($inv->created_at)->diffInSeconds(Carbon::parse($last->created_at)))
                : 999999;

            if ($sameUser && $diffSeconds <= $windowSeconds) {
                $currentGroup[] = $inv;
            } else {
                if (count($currentGroup) > 1) {
                    $groups[] = $currentGroup;
                }
                $currentGroup = [$inv];
            }
        }

        if (count($currentGroup) > 1) {
            $groups[] = $currentGroup;
        }

        if (empty($groups)) {
            $this->info("No legacy split invoices found. All invoice submissions are clean.");
            return 0;
        }

        $this->warn("Found " . count($groups) . " groups of split invoices (" . array_sum(array_map('count', $groups)) . " total invoices).");

        $tableRows = [];
        foreach ($groups as $idx => $group) {
            $primary = $group[0];
            $secondaryIds = array_slice(array_column($group, 'invoice_number'), 1);
            $packages = array_map(function ($inv) {
                return ($inv->plan?->name ?? $inv->package_type ?? 'Plan') . ' (₹' . number_format($inv->amount, 2) . ')';
            }, $group);
            $totalAmount = array_sum(array_column($group, 'amount'));

            $tableRows[] = [
                'Group' => $idx + 1,
                'User' => $primary->user?->name ?? "User #{$primary->user_id}",
                'Primary Invoice' => $primary->invoice_number,
                'Secondary Invoices' => implode(', ', $secondaryIds),
                'Packages' => implode(' + ', $packages),
                'Total Amount' => '₹' . number_format($totalAmount, 2),
            ];
        }

        $this->table(['Group', 'User', 'Primary Invoice', 'Secondary Invoices', 'Packages', 'Total Amount'], $tableRows);

        if ($dryRun) {
            $this->info("\n[DRY RUN]: No database records were modified. To execute changes, run without --dry-run (or with --no-dry-run).");
            return 0;
        }

        $this->info("\nApplying safe merge inside atomic database transactions...");

        DB::beginTransaction();
        try {
            foreach ($groups as $group) {
                $primary = $group[0];
                $mergedItems = [];
                $totalAmount = 0;
                $totalDues = 0;

                foreach ($group as $inv) {
                    $totalAmount += (float)$inv->amount;
                    $totalDues += (float)($inv->dues_amount ?? 0);

                    $mergedItems[] = [
                        'name' => $inv->plan?->name ?? ($inv->package_type . ' Package'),
                        'plan_id' => $inv->plan_id,
                        'package_type' => $inv->package_type ?? 'Gym-Cardio',
                        'price' => (float)$inv->amount,
                        'start_date' => $inv->start_date ? Carbon::parse($inv->start_date)->toDateString() : null,
                        'end_date' => $inv->end_date ? Carbon::parse($inv->end_date)->toDateString() : null,
                        'trainer_id' => $inv->trainer_id ?? null,
                    ];
                }

                // Update primary invoice with merged items and aggregated totals
                $primary->items = $mergedItems;
                $primary->amount = $totalAmount;
                $primary->paid_amount = $totalAmount;
                $primary->dues_amount = $totalDues;
                $primary->save();

                // Synchronize RevenueBilling for primary invoice
                $billing = RevenueBilling::where('invoice_number', $primary->invoice_number)->first();
                if ($billing) {
                    $billing->amount = $totalAmount;
                    $billing->plan_name = implode(' + ', array_column($mergedItems, 'name'));
                    $billing->save();
                }

                // Delete secondary invoices and their revenue billing entries
                for ($i = 1; $i < count($group); $i++) {
                    $secondary = $group[$i];
                    RevenueBilling::where('invoice_number', $secondary->invoice_number)->delete();
                    $secondary->delete();
                }
            }

            DB::commit();
            $this->info("Successfully merged all " . count($groups) . " groups of split invoices into single invoices.");
            return 0;
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error("Failed to merge invoices: " . $e->getMessage());
            return 1;
        }
    }
}
