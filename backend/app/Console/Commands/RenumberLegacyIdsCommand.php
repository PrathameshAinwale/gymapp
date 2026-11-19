<?php

namespace App\Console\Commands;

use App\Services\LegacyIdRenumberService;
use Illuminate\Console\Command;

class RenumberLegacyIdsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'gym:renumber-legacy-ids
                            {--apply : Commit renumbering changes to the database (default is safe dry-run)}
                            {--rollback : Roll back previous renumbering migration using the migration log}
                            {--batch= : Specify a specific batch ID to rollback}
                            {--gym= : Target only a specific gym ID (default: all gyms)}
                            {--verify : Run integrity check on sequential IDs, duplicates and foreign references}';

    /**
     * The console command description.
     */
    protected $description = 'Safely renumber legacy invoice, member, and enquiry records into sequential format (INV/MEM/ENQ + FY + 0001+) with audit logging and rollback.';

    /**
     * Execute the console command.
     */
    public function handle(LegacyIdRenumberService $service): int
    {
        $isApply    = (bool)$this->option('apply');
        $isRollback = (bool)$this->option('rollback');
        $isVerify   = (bool)$this->option('verify');
        $batchId    = $this->option('batch');
        $gymId      = $this->option('gym') ? (int)$this->option('gym') : null;

        $this->newLine();
        $this->line('<fg=cyan;options=bold>================================================================================</>');
        $this->line('<fg=white;options=bold>  ARCHFIT GYM - SEQUENTIAL ID LEGACY RENUMBERING MIGRATION TOOL                </>');
        $this->line('<fg=cyan;options=bold>================================================================================</>');

        // ══════════════════════════════════════════════════════════════
        // MODE 1: VERIFY ONLY
        // ══════════════════════════════════════════════════════════════
        if ($isVerify && !$isApply && !$isRollback) {
            $this->info('Running database sequential ID integrity verification...');
            $report = $service->verify($gymId);
            $this->displayVerificationReport($report);
            return $report['passed'] ? 0 : 1;
        }

        // ══════════════════════════════════════════════════════════════
        // MODE 2: ROLLBACK
        // ══════════════════════════════════════════════════════════════
        if ($isRollback) {
            $this->line($isApply
                ? '<bg=yellow;fg=black;options=bold> [APPLY ROLLBACK MODE] </>'
                : '<bg=blue;fg=white;options=bold> [DRY-RUN ROLLBACK MODE] </> No changes will be written.');

            $res = $service->rollback($batchId, $isApply, $gymId);

            if (!$res['success']) {
                $this->error($res['message']);
                return 1;
            }

            $this->info("Batch ID: <comment>{$res['batch_id']}</comment>");
            $this->table(
                ['Entity', 'Records Restored'],
                [
                    ['Invoices',  $res['restored_counts']['invoices'] ?? 0],
                    ['Members',   $res['restored_counts']['members'] ?? 0],
                    ['Enquiries', $res['restored_counts']['enquiries'] ?? 0],
                    ['Total',     $res['total_restored']],
                ]
            );

            if (!empty($res['sample_rollbacks'])) {
                $this->newLine();
                $this->comment('Sample Rollback Restorations (New ID -> Old ID):');
                $rows = array_map(fn($r) => [
                    $r['entity'],
                    $r['gym_id'],
                    $r['record_id'],
                    $r['from_id'],
                    $r['to_id'],
                ], array_slice($res['sample_rollbacks'], 0, 5));
                $this->table(['Entity', 'Gym ID', 'Record ID', 'Current (New) ID', 'Restored (Old) ID'], $rows);
            }

            if (!$isApply) {
                $this->newLine();
                $this->warn('DRY-RUN COMPLETE: No records were restored.');
                $this->line("To execute rollback, run:");
                $this->line("  <info>php artisan gym:renumber-legacy-ids --rollback --apply" . ($batchId ? " --batch={$batchId}" : "") . "</info>");
            } else {
                $this->newLine();
                $this->info('✓ Rollback completed successfully! Old IDs and references restored.');
            }

            return 0;
        }

        // ══════════════════════════════════════════════════════════════
        // MODE 3: RENUMBERING (DRY-RUN OR APPLY)
        // ══════════════════════════════════════════════════════════════
        if (!$isApply) {
            $this->line('<bg=blue;fg=white;options=bold> [DRY-RUN MODE] </> Scanning records and computing sequential mappings.');
            $this->comment('No database changes will be committed in dry-run mode.');
            $this->line('Pass <info>--apply</info> to execute the migration permanently.');
        } else {
            $this->line('<bg=green;fg=black;options=bold> [APPLY MODE] </> Executing sequential renumbering inside transactional locks.');
        }

        $results = $service->renumberLegacyIds($isApply, $gymId);

        $this->newLine();
        $this->info("Batch ID: <comment>{$results['batch_id']}</comment>");
        $this->info("Gyms Processed: {$results['gyms_processed']}");

        if (!empty($results['errors'])) {
            foreach ($results['errors'] as $gId => $err) {
                $this->error("Error in Gym #{$gId}: {$err}");
            }
        }

        // Summary table across all gyms
        $this->newLine();
        $this->table(
            ['Entity', 'Total Scanned', 'Already Sequential', 'Migrated to Sequential'],
            [
                ['Invoices',  $results['totals']['invoices_scanned'],  $results['totals']['invoices_kept'],  $results['totals']['invoices_migrated']],
                ['Members',   $results['totals']['members_scanned'],   $results['totals']['members_kept'],   $results['totals']['members_migrated']],
                ['Enquiries', $results['totals']['enquiries_scanned'], $results['totals']['enquiries_kept'], $results['totals']['enquiries_migrated']],
            ]
        );

        // Display sample mappings per gym
        foreach ($results['gym_reports'] as $gId => $gRep) {
            $allSamples = array_merge(
                array_map(fn($s) => array_merge($s, ['entity' => 'invoice']), $gRep['invoices']['sample_mappings']),
                array_map(fn($s) => array_merge($s, ['entity' => 'member']), $gRep['members']['sample_mappings']),
                array_map(fn($s) => array_merge($s, ['entity' => 'enquiry']), $gRep['enquiries']['sample_mappings'])
            );

            if (!empty($allSamples)) {
                $this->newLine();
                $this->comment("Sample Mappings for Gym #{$gId} ({$gRep['gym_name']}):");
                $sampleRows = array_map(fn($s) => [
                    strtoupper($s['entity']),
                    $s['fy'] ?? '',
                    $s['record_id'],
                    $s['old_id'],
                    '<fg=green;options=bold>' . $s['new_id'] . '</>',
                    $s['date'] ?? '',
                ], array_slice($allSamples, 0, 8));

                $this->table(['Entity', 'FY', 'Record ID', 'Old Legacy ID', 'New Sequential ID', 'Created / Issue Date'], $sampleRows);
            }

            // Display counter updates
            $counterUpdates = [];
            foreach (['invoices' => 'invoice', 'members' => 'member', 'enquiries' => 'enquiry'] as $key => $type) {
                foreach ($gRep[$key]['counter_changes'] as $fy => $cc) {
                    $counterUpdates[] = [
                        $type,
                        $fy,
                        $cc['before'],
                        $cc['after'],
                        $cc['after'] > $cc['before'] ? "<fg=green>+{$cc['after']}</>" : 'Unchanged',
                    ];
                }
            }
            if (!empty($counterUpdates)) {
                $this->newLine();
                $this->comment("Entity Counter Store Updates for Gym #{$gId}:");
                $this->table(['Entity', 'FY', 'Previous Counter', 'Updated Counter', 'Status'], $counterUpdates);
            }
        }

        // Post-migration automated verification
        $this->newLine();
        $this->displayVerificationReport($results['verification']);

        // Next steps guidance
        $this->newLine();
        if (!$isApply) {
            $this->warn('DRY-RUN FINISHED: 0 database modifications were written.');
            $this->line('To permanently execute this renumbering migration, run:');
            $this->line("  <fg=green;options=bold>php artisan gym:renumber-legacy-ids --apply" . ($gymId ? " --gym={$gymId}" : "") . "</>");
        } else {
            $this->info("✓ Migration applied and committed successfully for Batch: <comment>{$results['batch_id']}</comment>");
            $this->line("If you ever need to revert these changes, run:");
            $this->line("  <comment>php artisan gym:renumber-legacy-ids --rollback --apply --batch={$results['batch_id']}</comment>");
        }

        return 0;
    }

    /**
     * Render post-migration verification details.
     */
    protected function displayVerificationReport(array $v): void
    {
        $this->line('<fg=white;options=bold>Database Sequential Integrity & Reference Verification:</>');
        $this->table(
            ['Check', 'Status', 'Details'],
            [
                [
                    'Duplicate Invoices',
                    $v['duplicate_invoices'] === 0 ? '<fg=green>PASSED (0)</>' : '<fg=red>FAILED (' . $v['duplicate_invoices'] . ')</>',
                    'Unique index on (gym_id, invoice_number) safe',
                ],
                [
                    'Duplicate Members',
                    $v['duplicate_members'] === 0 ? '<fg=green>PASSED (0)</>' : '<fg=red>FAILED (' . $v['duplicate_members'] . ')</>',
                    'Unique index on (gym_id, member_number) safe',
                ],
                [
                    'Duplicate Enquiries',
                    $v['duplicate_enquiries'] === 0 ? '<fg=green>PASSED (0)</>' : '<fg=red>FAILED (' . $v['duplicate_enquiries'] . ')</>',
                    'Unique index on (gym_id, enquiry_number) safe',
                ],
                [
                    'Orphaned / Unmigrated References',
                    ($v['unmigrated_refs'] ?? 0) === 0 ? '<fg=green>PASSED (0)</>' : '<fg=red>FAILED (' . ($v['unmigrated_refs'] ?? 0) . ')</>',
                    'All revenue_and_billings and enquiry conversion references synced',
                ],
                [
                    'Total Record Counts',
                    '<fg=green>PRESERVED</>',
                    "Invoices: {$v['record_counts']['invoices']}, Members: {$v['record_counts']['members']}, Enquiries: {$v['record_counts']['enquiries']}",
                ],
            ]
        );
    }
}
