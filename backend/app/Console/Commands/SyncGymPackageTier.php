<?php

namespace App\Console\Commands;

use App\Models\Gym;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class SyncGymPackageTier extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'gyms:sync-package-tier {--dry-run : Simulate the synchronization without making any database updates}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely and idempotently synchronize package and package_tier columns across all gyms.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');

        if (!Schema::hasTable('gyms')) {
            $this->error('The gyms table does not exist.');
            return 1;
        }

        $hasPackageTier = Schema::hasColumn('gyms', 'package_tier');
        $hasPackage = Schema::hasColumn('gyms', 'package');

        if (!$hasPackageTier || !$hasPackage) {
            $this->warn('Both package and package_tier columns are required in gyms table.');
            return 0;
        }

        $gyms = Gym::all();
        $mismatchedGyms = [];

        foreach ($gyms as $gym) {
            $pkg = $gym->package ? trim($gym->package) : null;
            $tier = $gym->package_tier ? trim($gym->package_tier) : null;

            // Check if values differ or if one is missing while the other is set
            if ($pkg !== $tier || empty($pkg) || empty($tier)) {
                $canonicalPlan = $tier ?: ($pkg ?: 'Bronze');
                $mismatchedGyms[] = [
                    'gym' => $gym,
                    'current_package' => $pkg,
                    'current_tier' => $tier,
                    'target_plan' => $canonicalPlan,
                ];
            }
        }

        $count = count($mismatchedGyms);

        if ($count === 0) {
            $this->info("Audit complete: All {$gyms->count()} gym(s) have synchronized package and package_tier values. 0 rows need changes.");
            return 0;
        }

        $this->warn("Found {$count} gym(s) with mismatched or incomplete plan columns:");

        $tableData = [];
        foreach ($mismatchedGyms as $item) {
            $tableData[] = [
                'ID' => $item['gym']->id,
                'Name' => $item['gym']->name,
                'Current Package' => $item['current_package'] ?? 'NULL',
                'Current Tier' => $item['current_tier'] ?? 'NULL',
                'Target Plan' => $item['target_plan'],
            ];
        }

        $this->table(['ID', 'Name', 'Current Package', 'Current Tier', 'Target Plan'], $tableData);

        if ($isDryRun) {
            $this->info("[DRY RUN] Would update {$count} gym row(s). No database modifications were made.");
            return 0;
        }

        foreach ($mismatchedGyms as $item) {
            /** @var Gym $gym */
            $gym = $item['gym'];
            $target = $item['target_plan'];

            $gym->package = $target;
            $gym->package_tier = $target;
            $gym->save();

            Cache::forget("gym_setting_v1_{$gym->id}");
        }

        $this->info("Successfully synchronized package and package_tier on {$count} gym row(s) and cleared caches.");
        return 0;
    }
}
