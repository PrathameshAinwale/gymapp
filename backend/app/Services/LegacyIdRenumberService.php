<?php

namespace App\Services;

use App\Models\Enquiry;
use App\Models\IdMigrationLog;
use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Models\RevenueBilling;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LegacyIdRenumberService
{
    /**
     * Pattern matcher for sequential entity IDs (e.g. INV260001, MEM260001, ENQ260001).
     * Prefix: 3 uppercase letters, FY: 2 digits, Sequence: 4 or more digits.
     */
    public const PATTERN_INVOICE = '/^INV(\d{2})(\d{4,})$/i';
    public const PATTERN_MEMBER  = '/^MEM(\d{2})(\d{4,})$/i';
    public const PATTERN_ENQUIRY = '/^ENQ(\d{2})(\d{4,})$/i';

    /**
     * Check if a given string matches the sequential format for an entity.
     */
    public static function isSequentialId(?string $id, string $entityType): bool
    {
        if ($id === null || trim($id) === '') {
            return false;
        }

        $pattern = match (strtolower(trim($entityType))) {
            'invoice', 'inv' => self::PATTERN_INVOICE,
            'member', 'mem'  => self::PATTERN_MEMBER,
            'enquiry', 'enq' => self::PATTERN_ENQUIRY,
            default          => '/^[A-Z]{3}(\d{2})(\d{4,})$/i',
        };

        return (bool)preg_match($pattern, trim($id));
    }

    /**
     * Execute the renumbering migration process.
     *
     * @param bool $apply True to execute and commit DB writes; False for dry-run report.
     * @param int|null $specificGymId Optional filter to limit migration to a single gym.
     * @param string|null $batchId Optional batch identifier for logging.
     * @return array Migration results summary including sample mappings, counts, and verification.
     */
    public function renumberLegacyIds(bool $apply = false, ?int $specificGymId = null, ?string $batchId = null): array
    {
        $batchId = $batchId ?: ('batch_' . Carbon::now('Asia/Kolkata')->format('Ymd_His') . '_' . Str::lower(Str::random(6)));

        // Determine list of gyms to process
        $gymQuery = DB::table('gyms')->select('id', 'name');
        if ($specificGymId !== null) {
            $gymQuery->where('id', $specificGymId);
        }
        $gyms = $gymQuery->orderBy('id')->get();

        if ($gyms->isEmpty()) {
            // Fallback for setups with no explicit gyms table rows
            $gyms = collect([(object)['id' => $specificGymId ?: 1, 'name' => 'Default Gym']]);
        }

        $results = [
            'mode'           => $apply ? 'apply' : 'dry_run',
            'batch_id'       => $batchId,
            'started_at'     => Carbon::now('Asia/Kolkata')->toIso8601String(),
            'gyms_processed' => 0,
            'totals'         => [
                'invoices_scanned'   => 0,
                'invoices_migrated'  => 0,
                'invoices_kept'      => 0,
                'members_scanned'    => 0,
                'members_migrated'   => 0,
                'members_kept'       => 0,
                'enquiries_scanned'  => 0,
                'enquiries_migrated' => 0,
                'enquiries_kept'     => 0,
            ],
            'gym_reports'    => [],
            'errors'         => [],
        ];

        foreach ($gyms as $gym) {
            $gymId = (int)$gym->id;
            $gymName = $gym->name ?? "Gym #{$gymId}";

            try {
                if ($apply) {
                    $gymReport = DB::transaction(function () use ($gymId, $gymName, $batchId) {
                        return $this->processGym($gymId, $gymName, $batchId, true);
                    });
                } else {
                    $gymReport = $this->processGym($gymId, $gymName, $batchId, false);
                }

                $results['gym_reports'][$gymId] = $gymReport;
                $results['gyms_processed']++;

                // Aggregate totals
                $results['totals']['invoices_scanned']   += $gymReport['invoices']['scanned'];
                $results['totals']['invoices_migrated']  += $gymReport['invoices']['migrated'];
                $results['totals']['invoices_kept']      += $gymReport['invoices']['already_sequential'];
                $results['totals']['members_scanned']    += $gymReport['members']['scanned'];
                $results['totals']['members_migrated']   += $gymReport['members']['migrated'];
                $results['totals']['members_kept']       += $gymReport['members']['already_sequential'];
                $results['totals']['enquiries_scanned']  += $gymReport['enquiries']['scanned'];
                $results['totals']['enquiries_migrated'] += $gymReport['enquiries']['migrated'];
                $results['totals']['enquiries_kept']     += $gymReport['enquiries']['already_sequential'];
            } catch (\Throwable $e) {
                $results['errors'][$gymId] = "Gym #{$gymId} ({$gymName}) failed: " . $e->getMessage();
            }
        }

        // Post-migration automated verification (Rule 7)
        $results['verification'] = $this->verify($specificGymId);

        return $results;
    }

    /**
     * Process all 3 entities for a single gym.
     */
    protected function processGym(int $gymId, string $gymName, string $batchId, bool $apply): array
    {
        $report = [
            'gym_id'    => $gymId,
            'gym_name'  => $gymName,
            'invoices'  => $this->processInvoicesForGym($gymId, $batchId, $apply),
            'members'   => $this->processMembersForGym($gymId, $batchId, $apply),
            'enquiries' => $this->processEnquiriesForGym($gymId, $batchId, $apply),
        ];

        return $report;
    }

    /**
     * ══════════════════════════════════════════════════════════════
     * ENTITY 1: INVOICES
     * ══════════════════════════════════════════════════════════════
     */
    protected function processInvoicesForGym(int $gymId, string $batchId, bool $apply): array
    {
        // Fetch all invoices for gym ordered chronologically
        $invoices = Invoice::where('gym_id', $gymId)
            ->orderBy('created_at', 'asc')
            ->orderBy('date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $scanned = $invoices->count();
        $alreadySequential = 0;
        $migrated = 0;
        $sampleMappings = [];
        $counterChanges = [];

        // Group invoices by Indian Financial Year (strict IST)
        $byFy = [];
        foreach ($invoices as $inv) {
            $fyDate = $inv->date ?: $inv->created_at;
            $fyCode = SequentialIdService::getFinancialYearCode($fyDate);
            $byFy[$fyCode][] = $inv;
        }

        foreach ($byFy as $fyRaw => $fyInvoices) {
            $fyCode = (string)$fyRaw;
            // Find existing taken sequence numbers in this FY
            $takenSeqs = [];
            $legacyInvoices = [];

            foreach ($fyInvoices as $inv) {
                $rawNo = trim((string)$inv->invoice_number);
                if (preg_match(self::PATTERN_INVOICE, $rawNo, $matches)) {
                    $invFy = (string)$matches[1];
                    $seqVal = (int)$matches[2];
                    if ($invFy === $fyCode) {
                        $takenSeqs[$seqVal] = true;
                        $alreadySequential++;
                        continue;
                    }
                }
                $legacyInvoices[] = $inv;
            }

            // Current stored counter
            $currentCounterRow = DB::table('entity_sequences')
                ->where('gym_id', $gymId)
                ->where('entity_type', 'invoice')
                ->where('fy_code', $fyCode)
                ->first();
            $currentLastNumber = $currentCounterRow ? (int)$currentCounterRow->last_number : 0;

            // Sequential assignment starting at 1, skipping already taken numbers
            $nextSeq = 1;
            $maxAssignedInFy = !empty($takenSeqs) ? max(array_keys($takenSeqs)) : 0;

            foreach ($legacyInvoices as $inv) {
                while (isset($takenSeqs[$nextSeq])) {
                    $nextSeq++;
                }

                $newNumber = 'INV' . $fyCode . str_pad((string)$nextSeq, 4, '0', STR_PAD_LEFT);
                $takenSeqs[$nextSeq] = true;
                if ($nextSeq > $maxAssignedInFy) {
                    $maxAssignedInFy = $nextSeq;
                }

                $oldNumber = $inv->invoice_number ?: ('INV-legacy-' . $inv->id);

                if (count($sampleMappings) < 5) {
                    $sampleMappings[] = [
                        'record_id' => $inv->id,
                        'fy'        => $fyCode,
                        'old_id'    => $oldNumber,
                        'new_id'    => $newNumber,
                        'date'      => SequentialIdService::parseDateToIst($inv->date ?: $inv->created_at)->format('Y-m-d H:i:s'),
                    ];
                }

                if ($apply) {
                    // 1. Update Invoice table
                    DB::table('invoices')
                        ->where('id', $inv->id)
                        ->update([
                            'invoice_number' => $newNumber,
                            'legacy_id'      => $oldNumber,
                            'updated_at'     => now(),
                        ]);

                    // 2. Synchronize RevenueBilling references in the same transaction
                    DB::table('revenue_and_billings')
                        ->where('gym_id', $gymId)
                        ->where('reference_no', $oldNumber)
                        ->update([
                            'reference_no' => $newNumber,
                            'updated_at'   => now(),
                        ]);

                    // 3. Log migration entry
                    IdMigrationLog::create([
                        'entity'      => 'invoice',
                        'gym_id'      => $gymId,
                        'record_id'   => $inv->id,
                        'old_id'      => $oldNumber,
                        'new_id'      => $newNumber,
                        'batch_id'    => $batchId,
                        'migrated_at' => now(),
                    ]);
                }

                $migrated++;
                $nextSeq++;
            }

            // Target counter is max of existing counter and max assigned sequence (never lowered)
            $targetCounter = max($currentLastNumber, $maxAssignedInFy);
            $counterChanges[$fyCode] = [
                'before' => $currentLastNumber,
                'after'  => $targetCounter,
            ];

            if ($apply && $targetCounter > $currentLastNumber) {
                DB::table('entity_sequences')->updateOrInsert(
                    [
                        'gym_id'      => $gymId,
                        'entity_type' => 'invoice',
                        'fy_code'     => $fyCode,
                    ],
                    [
                        'last_number' => $targetCounter,
                        'updated_at'  => now(),
                    ]
                );
            }
        }

        return [
            'scanned'            => $scanned,
            'already_sequential' => $alreadySequential,
            'migrated'           => $migrated,
            'counter_changes'    => $counterChanges,
            'sample_mappings'    => $sampleMappings,
        ];
    }

    /**
     * ══════════════════════════════════════════════════════════════
     * ENTITY 2: MEMBERS
     * ══════════════════════════════════════════════════════════════
     */
    protected function processMembersForGym(int $gymId, string $batchId, bool $apply): array
    {
        // Query all members for gym ordered chronologically
        $members = User::where('gym_id', $gymId)
            ->where('role', 'member')
            ->orderBy('joining_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $scanned = $members->count();
        $alreadySequential = 0;
        $migrated = 0;
        $sampleMappings = [];
        $counterChanges = [];

        // Group members by Indian Financial Year (strict IST)
        $byFy = [];
        foreach ($members as $u) {
            $fyDate = $u->joining_date ?: $u->created_at;
            $fyCode = SequentialIdService::getFinancialYearCode($fyDate);
            $byFy[$fyCode][] = $u;
        }

        foreach ($byFy as $fyRaw => $fyMembers) {
            $fyCode = (string)$fyRaw;
            $takenSeqs = [];
            $legacyMembers = [];

            foreach ($fyMembers as $u) {
                $rawNo = trim((string)$u->member_number);
                if (preg_match(self::PATTERN_MEMBER, $rawNo, $matches)) {
                    $memFy = (string)$matches[1];
                    $seqVal = (int)$matches[2];
                    if ($memFy === $fyCode) {
                        $takenSeqs[$seqVal] = true;
                        $alreadySequential++;
                        continue;
                    }
                }
                $legacyMembers[] = $u;
            }

            // Current stored counter
            $currentCounterRow = DB::table('entity_sequences')
                ->where('gym_id', $gymId)
                ->where('entity_type', 'member')
                ->where('fy_code', $fyCode)
                ->first();
            $currentLastNumber = $currentCounterRow ? (int)$currentCounterRow->last_number : 0;

            $nextSeq = 1;
            $maxAssignedInFy = !empty($takenSeqs) ? max(array_keys($takenSeqs)) : 0;

            foreach ($legacyMembers as $u) {
                while (isset($takenSeqs[$nextSeq])) {
                    $nextSeq++;
                }

                $newNumber = 'MEM' . $fyCode . str_pad((string)$nextSeq, 4, '0', STR_PAD_LEFT);
                $takenSeqs[$nextSeq] = true;
                if ($nextSeq > $maxAssignedInFy) {
                    $maxAssignedInFy = $nextSeq;
                }

                $oldNumber = $u->member_number ?: ('mem-' . $u->id);

                if (count($sampleMappings) < 5) {
                    $sampleMappings[] = [
                        'record_id' => $u->id,
                        'fy'        => $fyCode,
                        'old_id'    => $oldNumber,
                        'new_id'    => $newNumber,
                        'name'      => $u->name,
                        'date'      => SequentialIdService::parseDateToIst($u->joining_date ?: $u->created_at)->format('Y-m-d H:i:s'),
                    ];
                }

                if ($apply) {
                    // 1. Update Users table
                    DB::table('users')
                        ->where('id', $u->id)
                        ->update([
                            'member_number' => $newNumber,
                            'legacy_id'     => $oldNumber,
                            'updated_at'    => now(),
                        ]);

                    // 2. Update MemberProfile table
                    DB::table('member_profiles')
                        ->where('user_id', $u->id)
                        ->update([
                            'member_number' => $newNumber,
                            'legacy_id'     => $oldNumber,
                            'updated_at'    => now(),
                        ]);

                    // 3. Log migration entry
                    IdMigrationLog::create([
                        'entity'      => 'member',
                        'gym_id'      => $gymId,
                        'record_id'   => $u->id,
                        'old_id'      => $oldNumber,
                        'new_id'      => $newNumber,
                        'batch_id'    => $batchId,
                        'migrated_at' => now(),
                    ]);
                }

                $migrated++;
                $nextSeq++;
            }

            $targetCounter = max($currentLastNumber, $maxAssignedInFy);
            $counterChanges[$fyCode] = [
                'before' => $currentLastNumber,
                'after'  => $targetCounter,
            ];

            if ($apply && $targetCounter > $currentLastNumber) {
                DB::table('entity_sequences')->updateOrInsert(
                    [
                        'gym_id'      => $gymId,
                        'entity_type' => 'member',
                        'fy_code'     => $fyCode,
                    ],
                    [
                        'last_number' => $targetCounter,
                        'updated_at'  => now(),
                    ]
                );
            }
        }

        return [
            'scanned'            => $scanned,
            'already_sequential' => $alreadySequential,
            'migrated'           => $migrated,
            'counter_changes'    => $counterChanges,
            'sample_mappings'    => $sampleMappings,
        ];
    }

    /**
     * ══════════════════════════════════════════════════════════════
     * ENTITY 3: ENQUIRIES
     * ══════════════════════════════════════════════════════════════
     */
    protected function processEnquiriesForGym(int $gymId, string $batchId, bool $apply): array
    {
        // Query all enquiries for gym ordered chronologically
        $enquiries = Enquiry::where('gym_id', $gymId)
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $scanned = $enquiries->count();
        $alreadySequential = 0;
        $migrated = 0;
        $sampleMappings = [];
        $counterChanges = [];

        // Group enquiries by Indian Financial Year (strict IST)
        $byFy = [];
        foreach ($enquiries as $enq) {
            $fyDate = $enq->created_at;
            $fyCode = SequentialIdService::getFinancialYearCode($fyDate);
            $byFy[$fyCode][] = $enq;
        }

        foreach ($byFy as $fyRaw => $fyEnquiries) {
            $fyCode = (string)$fyRaw;
            $takenSeqs = [];
            $legacyEnquiries = [];

            foreach ($fyEnquiries as $enq) {
                $rawNo = trim((string)$enq->enquiry_number);
                if (preg_match(self::PATTERN_ENQUIRY, $rawNo, $matches)) {
                    $enqFy = (string)$matches[1];
                    $seqVal = (int)$matches[2];
                    if ($enqFy === $fyCode) {
                        $takenSeqs[$seqVal] = true;
                        $alreadySequential++;
                        continue;
                    }
                }
                $legacyEnquiries[] = $enq;
            }

            // Current stored counter
            $currentCounterRow = DB::table('entity_sequences')
                ->where('gym_id', $gymId)
                ->where('entity_type', 'enquiry')
                ->where('fy_code', $fyCode)
                ->first();
            $currentLastNumber = $currentCounterRow ? (int)$currentCounterRow->last_number : 0;

            $nextSeq = 1;
            $maxAssignedInFy = !empty($takenSeqs) ? max(array_keys($takenSeqs)) : 0;

            foreach ($legacyEnquiries as $enq) {
                while (isset($takenSeqs[$nextSeq])) {
                    $nextSeq++;
                }

                $newNumber = 'ENQ' . $fyCode . str_pad((string)$nextSeq, 4, '0', STR_PAD_LEFT);
                $takenSeqs[$nextSeq] = true;
                if ($nextSeq > $maxAssignedInFy) {
                    $maxAssignedInFy = $nextSeq;
                }

                $oldNumber = $enq->enquiry_number ?: (string)$enq->id;

                if (count($sampleMappings) < 5) {
                    $sampleMappings[] = [
                        'record_id' => $enq->id,
                        'fy'        => $fyCode,
                        'old_id'    => $oldNumber,
                        'new_id'    => $newNumber,
                        'name'      => $enq->name,
                        'date'      => SequentialIdService::parseDateToIst($enq->created_at)->format('Y-m-d H:i:s'),
                    ];
                }

                if ($apply) {
                    // 1. Update Enquiries table
                    DB::table('enquiries')
                        ->where('id', $enq->id)
                        ->update([
                            'enquiry_number' => $newNumber,
                            'legacy_id'      => $oldNumber,
                            'updated_at'     => now(),
                        ]);

                    // 2. Update converted_from_enquiry_number on MemberProfile if converted
                    $possibleOldEnqRefs = [
                        $oldNumber,
                        (string)$enq->id,
                        'ENQ-' . $enq->id,
                        'enq-' . $enq->id,
                    ];
                    DB::table('member_profiles')
                        ->whereIn('converted_from_enquiry_number', $possibleOldEnqRefs)
                        ->update([
                            'converted_from_enquiry_number' => $newNumber,
                            'updated_at'                    => now(),
                        ]);

                    // 3. Log migration entry
                    IdMigrationLog::create([
                        'entity'      => 'enquiry',
                        'gym_id'      => $gymId,
                        'record_id'   => $enq->id,
                        'old_id'      => $oldNumber,
                        'new_id'      => $newNumber,
                        'batch_id'    => $batchId,
                        'migrated_at' => now(),
                    ]);
                }

                $migrated++;
                $nextSeq++;
            }

            $targetCounter = max($currentLastNumber, $maxAssignedInFy);
            $counterChanges[$fyCode] = [
                'before' => $currentLastNumber,
                'after'  => $targetCounter,
            ];

            if ($apply && $targetCounter > $currentLastNumber) {
                DB::table('entity_sequences')->updateOrInsert(
                    [
                        'gym_id'      => $gymId,
                        'entity_type' => 'enquiry',
                        'fy_code'     => $fyCode,
                    ],
                    [
                        'last_number' => $targetCounter,
                        'updated_at'  => now(),
                    ]
                );
            }
        }

        return [
            'scanned'            => $scanned,
            'already_sequential' => $alreadySequential,
            'migrated'           => $migrated,
            'counter_changes'    => $counterChanges,
            'sample_mappings'    => $sampleMappings,
        ];
    }

    /**
     * ══════════════════════════════════════════════════════════════
     * ROLLBACK MIGRATION
     * ══════════════════════════════════════════════════════════════
     * Restores previous legacy IDs using id_migration_log entries.
     */
    public function rollback(?string $batchId = null, bool $apply = false, ?int $specificGymId = null): array
    {
        // If batchId not specified, select the most recent batch in log
        if (empty($batchId)) {
            $latestLog = IdMigrationLog::orderByDesc('id')->first();
            if (!$latestLog) {
                return [
                    'success' => false,
                    'message' => 'No migration logs found to roll back.',
                    'restored_count' => 0,
                ];
            }
            $batchId = $latestLog->batch_id;
        }

        $logQuery = IdMigrationLog::where('batch_id', $batchId);
        if ($specificGymId !== null) {
            $logQuery->where('gym_id', $specificGymId);
        }
        $logs = $logQuery->orderByDesc('id')->get();

        if ($logs->isEmpty()) {
            return [
                'success'        => false,
                'message'        => "No logs found for batch ID '{$batchId}'.",
                'restored_count' => 0,
            ];
        }

        $byGym = $logs->groupBy('gym_id');
        $restored = [
            'invoices'  => 0,
            'members'   => 0,
            'enquiries' => 0,
        ];
        $sampleRollbacks = [];

        foreach ($byGym as $gymId => $gymLogs) {
            $gymIdInt = (int)$gymId;

            $processGymRollback = function () use ($gymIdInt, $gymLogs, $apply, &$restored, &$sampleRollbacks) {
                foreach ($gymLogs as $log) {
                    if (count($sampleRollbacks) < 10) {
                        $sampleRollbacks[] = [
                            'entity'    => $log->entity,
                            'gym_id'    => $log->gym_id,
                            'record_id' => $log->record_id,
                            'from_id'   => $log->new_id,
                            'to_id'     => $log->old_id,
                        ];
                    }

                    if ($apply) {
                        switch ($log->entity) {
                            case 'invoice':
                                DB::table('invoices')
                                    ->where('id', $log->record_id)
                                    ->update([
                                        'invoice_number' => $log->old_id,
                                        'legacy_id'      => null,
                                        'updated_at'     => now(),
                                    ]);

                                DB::table('revenue_and_billings')
                                    ->where('gym_id', $gymIdInt)
                                    ->where('reference_no', $log->new_id)
                                    ->update([
                                        'reference_no' => $log->old_id,
                                        'updated_at'   => now(),
                                    ]);
                                $restored['invoices']++;
                                break;

                            case 'member':
                                $prevMemberNo = str_starts_with($log->old_id, 'mem-') ? null : $log->old_id;

                                DB::table('users')
                                    ->where('id', $log->record_id)
                                    ->update([
                                        'member_number' => $prevMemberNo,
                                        'legacy_id'      => null,
                                        'updated_at'     => now(),
                                    ]);

                                DB::table('member_profiles')
                                    ->where('user_id', $log->record_id)
                                    ->update([
                                        'member_number' => $prevMemberNo,
                                        'legacy_id'      => null,
                                        'updated_at'     => now(),
                                    ]);
                                $restored['members']++;
                                break;

                            case 'enquiry':
                                $prevEnqNo = is_numeric($log->old_id) ? null : $log->old_id;

                                DB::table('enquiries')
                                    ->where('id', $log->record_id)
                                    ->update([
                                        'enquiry_number' => $prevEnqNo,
                                        'legacy_id'      => null,
                                        'updated_at'     => now(),
                                    ]);

                                DB::table('member_profiles')
                                    ->where('converted_from_enquiry_number', $log->new_id)
                                    ->update([
                                        'converted_from_enquiry_number' => $log->old_id,
                                        'updated_at'                    => now(),
                                    ]);
                                $restored['enquiries']++;
                                break;
                        }
                    } else {
                        // Dry run counts
                        $restored[$log->entity . 's'] = ($restored[$log->entity . 's'] ?? 0) + 1;
                    }
                }

                if ($apply) {
                    // Remove rolled back logs
                    IdMigrationLog::whereIn('id', $gymLogs->pluck('id'))->delete();
                }
            };

            if ($apply) {
                DB::transaction($processGymRollback);
            } else {
                $processGymRollback();
            }
        }

        return [
            'success'          => true,
            'mode'             => $apply ? 'applied' : 'dry_run',
            'batch_id'         => $batchId,
            'restored_counts'  => $restored,
            'total_restored'   => array_sum($restored),
            'sample_rollbacks' => $sampleRollbacks,
            'verification'     => $this->verify($specificGymId),
        ];
    }

    /**
     * ══════════════════════════════════════════════════════════════
     * RULE 7: POST-MIGRATION AUTOMATED VERIFICATION
     * ══════════════════════════════════════════════════════════════
     * Asserts:
     * 1. Zero duplicate numbers per gym across invoices, members, and enquiries.
     * 2. Zero orphaned references in revenue_and_billings and member_profiles.
     * 3. Total record counts match expectations.
     */
    public function verify(?int $specificGymId = null): array
    {
        $duplicateInvoices = DB::table('invoices')
            ->select('gym_id', 'invoice_number', DB::raw('COUNT(*) as total'))
            ->when($specificGymId, fn($q) => $q->where('gym_id', $specificGymId))
            ->whereNotNull('invoice_number')
            ->groupBy('gym_id', 'invoice_number')
            ->having('total', '>', 1)
            ->get();

        $duplicateMembers = DB::table('users')
            ->select('gym_id', 'member_number', DB::raw('COUNT(*) as total'))
            ->when($specificGymId, fn($q) => $q->where('gym_id', $specificGymId))
            ->where('role', 'member')
            ->whereNotNull('member_number')
            ->where('member_number', '!=', '')
            ->groupBy('gym_id', 'member_number')
            ->having('total', '>', 1)
            ->get();

        $duplicateEnquiries = DB::table('enquiries')
            ->select('gym_id', 'enquiry_number', DB::raw('COUNT(*) as total'))
            ->when($specificGymId, fn($q) => $q->where('gym_id', $specificGymId))
            ->whereNotNull('enquiry_number')
            ->where('enquiry_number', '!=', '')
            ->groupBy('gym_id', 'enquiry_number')
            ->having('total', '>', 1)
            ->get();

        // Check 1: Any revenue_and_billings reference still pointing to a legacy_id (unmigrated reference)
        $unmigratedBillingRefs = DB::table('revenue_and_billings')
            ->join('invoices', 'revenue_and_billings.reference_no', '=', 'invoices.legacy_id')
            ->when($specificGymId, fn($q) => $q->where('revenue_and_billings.gym_id', $specificGymId))
            ->whereNotNull('invoices.legacy_id')
            ->count();

        // Check 2: Any member_profiles converted enquiry reference still pointing to a legacy enquiry ID
        $unmigratedEnquiryRefs = DB::table('member_profiles')
            ->join('enquiries', 'member_profiles.converted_from_enquiry_number', '=', 'enquiries.legacy_id')
            ->whereNotNull('enquiries.legacy_id')
            ->count();

        $totalUnmigratedRefs = $unmigratedBillingRefs + $unmigratedEnquiryRefs;

        $counts = [
            'invoices'   => Invoice::when($specificGymId, fn($q) => $q->where('gym_id', $specificGymId))->count(),
            'members'    => User::where('role', 'member')->when($specificGymId, fn($q) => $q->where('gym_id', $specificGymId))->count(),
            'enquiries'  => Enquiry::when($specificGymId, fn($q) => $q->where('gym_id', $specificGymId))->count(),
        ];

        $hasDuplicates = ($duplicateInvoices->count() > 0 || $duplicateMembers->count() > 0 || $duplicateEnquiries->count() > 0);
        $isClean = !$hasDuplicates && ($totalUnmigratedRefs === 0);

        return [
            'passed'                  => $isClean,
            'duplicate_invoices'      => $duplicateInvoices->count(),
            'duplicate_members'       => $duplicateMembers->count(),
            'duplicate_enquiries'     => $duplicateEnquiries->count(),
            'unmigrated_refs'         => $totalUnmigratedRefs,
            'unmigrated_billing_refs' => $unmigratedBillingRefs,
            'unmigrated_enquiry_refs' => $unmigratedEnquiryRefs,
            'record_counts'           => $counts,
            'details'                 => [
                'dup_invoices'  => $duplicateInvoices->take(3)->toArray(),
                'dup_members'   => $duplicateMembers->take(3)->toArray(),
                'dup_enquiries' => $duplicateEnquiries->take(3)->toArray(),
            ],
        ];
    }
}
