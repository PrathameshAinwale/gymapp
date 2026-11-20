<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SequentialIdService
{
    /**
     * Compute Financial Year code based on Asia/Kolkata (IST) timezone.
     * Indian FY starts 1 April and ends 31 March.
     * FY code is either:
     * - 2 digits (e.g. '26' for FY 2026-27), or
     * - 4-digit span (e.g. '2627' for FY 2026-27, '2728' for FY 2027-28)
     *
     * Examples:
     * - 2026-03-31 23:59:59 IST -> FY25 (starts 1 Apr 2025) / span '2526'
     * - 2026-04-01 00:00:00 IST -> FY26 (starts 1 Apr 2026) / span '2627'
     * - 2026-11-19 IST          -> FY26 / span '2627'
     * - 2027-03-31 23:59:59 IST -> FY26 / span '2627'
     * - 2027-04-01 00:00:00 IST -> FY27 / span '2728'
     */
    public static function getFinancialYearCode($date = null, bool $fourDigitSpan = false): string
    {
        $ist = self::parseDateToIst($date);

        $month = (int)$ist->format('n');
        $year = (int)$ist->format('Y');

        $fyStartYear = ($month >= 4) ? $year : ($year - 1);

        $start2 = substr((string)$fyStartYear, -2);

        if ($fourDigitSpan) {
            $end2 = substr((string)($fyStartYear + 1), -2);
            return "{$start2}{$end2}";
        }

        return $start2;
    }

    /**
     * Parse any date / timestamp strictly to Asia/Kolkata Carbon instance.
     */
    public static function parseDateToIst($date = null): Carbon
    {
        if ($date === null) {
            return Carbon::now('Asia/Kolkata');
        }

        if ($date instanceof Carbon) {
            return $date->copy()->setTimezone('Asia/Kolkata');
        }

        if ($date instanceof \DateTimeInterface) {
            return Carbon::instance($date)->setTimezone('Asia/Kolkata');
        }

        if (is_numeric($date)) {
            return Carbon::createFromTimestamp($date, 'Asia/Kolkata');
        }

        $dateStr = trim((string)$date);
        if ($dateStr === '') {
            return Carbon::now('Asia/Kolkata');
        }

        try {
            // If date string contains timezone or 'Z', parse with timezone then convert to IST
            if (str_contains($dateStr, 'Z') || preg_match('/[+-]\d{2}:?\d{2}$/', $dateStr)) {
                return Carbon::parse($dateStr)->setTimezone('Asia/Kolkata');
            }
            // Date-only string (YYYY-MM-DD): construct in Asia/Kolkata at noon to avoid boundary drift
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)) {
                return Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} 12:00:00", 'Asia/Kolkata');
            }
            return Carbon::parse($dateStr, 'Asia/Kolkata')->setTimezone('Asia/Kolkata');
        } catch (\Throwable $e) {
            return Carbon::now('Asia/Kolkata');
        }
    }

    /**
     * Atomically get and increment the next sequential number for a given gym, entity, and FY.
     * Guaranteed concurrency-safe using DB transaction and row-level locking.
     */
    public static function getNextNumber(int $gymId, string $entityType, $date = null): string
    {
        $gymId = max(1, $gymId);
        $entityType = strtolower(trim($entityType));
        $isInvoice = in_array($entityType, ['invoice', 'inv'], true);
        $fyCode = self::getFinancialYearCode($date, $isInvoice);

        $prefix = match ($entityType) {
            'invoice', 'inv' => 'INV',
            'member', 'mem' => 'MEM',
            'enquiry', 'enq' => 'ENQ',
            default => strtoupper(substr($entityType, 0, 3)),
        };

        $normalizedType = match ($entityType) {
            'inv' => 'invoice',
            'mem' => 'member',
            'enq' => 'enquiry',
            default => $entityType,
        };

        return DB::transaction(function () use ($gymId, $normalizedType, $fyCode, $prefix) {
            // 1. Ensure counter row exists (atomic upsert / insertOrIgnore)
            DB::table('entity_sequences')->insertOrIgnore([
                'gym_id' => $gymId,
                'entity_type' => $normalizedType,
                'fy_code' => $fyCode,
                'last_number' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 2. Lock counter row for update
            $row = DB::table('entity_sequences')
                ->where('gym_id', $gymId)
                ->where('entity_type', $normalizedType)
                ->where('fy_code', $fyCode)
                ->lockForUpdate()
                ->first();

            $nextNum = ($row ? (int)$row->last_number : 0) + 1;

            // 3. Update counter atomically
            DB::table('entity_sequences')
                ->where('gym_id', $gymId)
                ->where('entity_type', $normalizedType)
                ->where('fy_code', $fyCode)
                ->update([
                    'last_number' => $nextNum,
                    'updated_at' => now(),
                ]);

            // 4. Format zero-padded to 4 digits (e.g. INV260001; 10000+ grows to 5 digits naturally)
            $paddedSeq = str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);

            return "{$prefix}{$fyCode}{$paddedSeq}";
        });
    }

    /**
     * Generate next sequential Invoice Number (e.g. INV26270001).
     */
    public static function generateInvoiceNumber(int $gymId, $date = null): string
    {
        return self::getNextNumber($gymId, 'invoice', $date);
    }

    /**
     * Generate next sequential Member Number (e.g. MEM260001).
     */
    public static function generateMemberNumber(int $gymId, $date = null): string
    {
        return self::getNextNumber($gymId, 'member', $date);
    }

    /**
     * Generate next sequential Enquiry Number (e.g. ENQ260001).
     */
    public static function generateEnquiryNumber(int $gymId, $date = null): string
    {
        return self::getNextNumber($gymId, 'enquiry', $date);
    }

    /**
     * Idempotent seed helper: Scans existing records matching sequential pattern
     * and initializes each gym's counter to the highest existing sequence.
     * Records in old random format are ignored and counter starts at 0.
     */
    public static function seedCountersForAllGyms(): array
    {
        $gymIds = DB::table('gyms')->pluck('id')->all();
        if (empty($gymIds)) {
            $gymIds = [1];
        }

        $currentFy = self::getFinancialYearCode();
        $currentInvoiceFy = self::getFinancialYearCode(null, true);
        $summary = [];

        foreach ($gymIds as $gymId) {
            $summary[$gymId] = [
                'invoice' => self::seedEntityCounter($gymId, 'invoice', 'invoices', 'invoice_number', 'INV', $currentInvoiceFy),
                'member' => self::seedEntityCounter($gymId, 'member', 'users', 'member_number', 'MEM', $currentFy),
                'enquiry' => self::seedEntityCounter($gymId, 'enquiry', 'enquiries', 'enquiry_number', 'ENQ', $currentFy),
            ];
        }

        return $summary;
    }

    protected static function seedEntityCounter(int $gymId, string $entityType, string $table, string $column, string $prefix, string $currentFy): int
    {
        $maxSeq = 0;

        try {
            // Find records matching pattern: PREFIX + 2 to 4 digit FY + 4+ digit sequence
            $records = DB::table($table)
                ->where('gym_id', $gymId)
                ->whereNotNull($column)
                ->pluck($column);

            $pattern = '/^' . preg_quote($prefix, '/') . '(\d{2,4})(\d{4,})$/i';

            foreach ($records as $val) {
                if (preg_match($pattern, trim((string)$val), $matches)) {
                    $recordFy = $matches[1];
                    $seqVal = (int)$matches[2];

                    if ($recordFy === $currentFy && $seqVal > $maxSeq) {
                        $maxSeq = $seqVal;
                    }
                }
            }
        } catch (\Throwable $e) {}

        // Ensure counter row is initialized with at least maxSeq
        DB::table('entity_sequences')->updateOrInsert(
            [
                'gym_id' => $gymId,
                'entity_type' => $entityType,
                'fy_code' => $currentFy,
            ],
            [
                'last_number' => DB::raw("GREATEST(last_number, {$maxSeq})"),
                'updated_at' => now(),
            ]
        );

        return $maxSeq;
    }
}
