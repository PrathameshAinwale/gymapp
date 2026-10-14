<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Models\MembershipFreeze;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class PlanChainingService
{
    public const TIMEZONE = 'Asia/Kolkata';

    /**
     * Normalize package type to a canonical key for reliable comparisons.
     */
    public static function normalizePackageType(?string $type): string
    {
        if (!$type) {
            return 'Gym-Cardio';
        }

        $clean = trim(strtolower($type));

        if (in_array($clean, ['personal training', 'pt', 'personal-training'])) {
            return 'Personal Training';
        }
        if (in_array($clean, ['massage', 'recovery', 'spa'])) {
            return 'Massage';
        }
        if (in_array($clean, ['crossfit', 'gym-cardio-crossfit', 'cross-fit'])) {
            return 'Crossfit';
        }
        if (in_array($clean, ['activities', 'activity'])) {
            return 'Activities';
        }
        if (in_array($clean, ['functional training', 'functional-training'])) {
            return 'Functional Training';
        }
        if (in_array($clean, ['kids training', 'kids-training'])) {
            return 'Kids Training';
        }
        if (in_array($clean, ['club membership', 'club'])) {
            return 'Club Membership';
        }
        if (in_array($clean, ['zumba'])) {
            return 'Zumba';
        }
        if (in_array($clean, ['general fitness', 'fitness'])) {
            return 'General Fitness';
        }
        if (in_array($clean, ['locker'])) {
            return 'Locker';
        }

        return 'Gym-Cardio';
    }

    /**
     * Get the current date in IST.
     */
    public static function getTodayIst(): Carbon
    {
        return Carbon::now(self::TIMEZONE)->startOfDay();
    }

    /**
     * Find the latest active or upcoming plan end date for a member and package type.
     * Evaluates uncancelled invoices first; falls back to legacy member_profiles.expiry_date.
     * Incorporates approved freeze days (Option 1).
     */
    public static function getLatestPlanEndDate(int $userId, string $packageType, ?int $gymId = null): ?Carbon
    {
        $normalizedType = self::normalizePackageType($packageType);
        $today = self::getTodayIst();

        // 1. Query invoices with explicit package_type and end_date (not Cancelled)
        $invoiceQuery = Invoice::where('user_id', $userId)
            ->where('status', '!=', 'Cancelled')
            ->whereNotNull('end_date')
            ->where(function ($q) use ($normalizedType) {
                $q->where('package_type', $normalizedType);
                if ($normalizedType === 'Gym-Cardio') {
                    $q->orWhereNull('package_type');
                }
            })
            ->whereDate('end_date', '>=', $today->toDateString());

        if ($gymId) {
            $invoiceQuery->where('gym_id', $gymId);
        }

        $latestInvoice = $invoiceQuery->orderBy('end_date', 'desc')->first();

        $latestEndDate = null;
        if ($latestInvoice && $latestInvoice->end_date) {
            $dateStr = $latestInvoice->end_date instanceof \DateTimeInterface
                ? $latestInvoice->end_date->format('Y-m-d')
                : substr((string)$latestInvoice->end_date, 0, 10);
            $latestEndDate = Carbon::createFromFormat('Y-m-d', $dateStr, self::TIMEZONE)->startOfDay();
        }

        // 2. Legacy fallback: Check member_profiles.expiry_date if no invoice end_date found or if profile is further ahead
        // Layer 2: Ignore orphan profile expiry when plan_id is null and there are no uncancelled invoices
        $profile = MemberProfile::with('plan')->where('user_id', $userId)->first();
        if ($profile && $profile->expiry_date) {
            $hasLegitimatePlan = ($profile->plan_id !== null) || Invoice::where('user_id', $userId)->where('status', '!=', 'Cancelled')->exists();
            if ($hasLegitimatePlan) {
                $profDateStr = $profile->expiry_date instanceof \DateTimeInterface
                    ? $profile->expiry_date->format('Y-m-d')
                    : substr((string)$profile->expiry_date, 0, 10);
                $profileExpiry = Carbon::createFromFormat('Y-m-d', $profDateStr, self::TIMEZONE)->startOfDay();
                if ($profileExpiry->toDateString() >= $today->toDateString()) {
                    $profileType = self::normalizePackageType(
                        $profile->plan?->package_type ?? ($profile->training_type === 'pt' ? 'Personal Training' : 'Gym-Cardio')
                    );

                    if ($profileType === $normalizedType) {
                        if (!$latestEndDate || $profileExpiry->toDateString() > $latestEndDate->toDateString()) {
                            $latestEndDate = $profileExpiry;
                        }
                    }
                }
            }
        }

        // 3. Frozen Plans (Option 1): Check if there is an active/approved freeze extending this period
        if ($latestEndDate) {
            $activeFreezeDays = MembershipFreeze::where('member_id', $userId)
                ->whereIn('status', ['Active Freeze', 'Approved', 'Active'])
                ->sum('days_frozen');

            if ($activeFreezeDays > 0) {
                $latestEndDate = $latestEndDate->copy()->addDays((int)$activeFreezeDays);
            }
        }

        return $latestEndDate;
    }

    /**
     * Calculate start date, minimum date, and user-facing status message for a member + package type.
     */
    public static function calculatePlanDates(int $userId, string $packageType, ?int $gymId = null): array
    {
        $normalizedType = self::normalizePackageType($packageType);
        $today = self::getTodayIst();
        $todayStr = $today->toDateString();

        $latestEnd = self::getLatestPlanEndDate($userId, $normalizedType, $gymId);

        if ($latestEnd && $latestEnd->greaterThanOrEqualTo($today)) {
            // A chained plan starts the DAY AFTER the previous plan's end date
            $defaultStartDate = $latestEnd->copy()->addDay()->toDateString();
            $minStartDate = $defaultStartDate;
            $formattedEnd = $latestEnd->format('d M Y');
            $formattedStart = Carbon::parse($defaultStartDate)->format('d M Y');

            return [
                'user_id' => $userId,
                'package_type' => $normalizedType,
                'has_active_plan' => true,
                'latest_end_date' => $latestEnd->toDateString(),
                'latest_end_date_formatted' => $formattedEnd,
                'default_start_date' => $defaultStartDate,
                'min_start_date' => $minStartDate,
                'today' => $todayStr,
                'chaining_mode' => 'chained',
                'message' => "Current {$normalizedType} plan ends on {$formattedEnd}. New plan will chain from {$formattedStart}.",
            ];
        }

        return [
            'user_id' => $userId,
            'package_type' => $normalizedType,
            'has_active_plan' => false,
            'latest_end_date' => null,
            'latest_end_date_formatted' => null,
            'default_start_date' => $todayStr,
            'min_start_date' => $todayStr,
            'today' => $todayStr,
            'chaining_mode' => 'fresh',
            'message' => "No active {$normalizedType} plan found. Starts {$today->format('d M Y')} by default.",
        ];
    }

    /**
     * Compute plan end date given a start date and plan duration/offer rules.
     * Note: End date is inclusive (the last active day of service).
     */
    public static function computePlanEndDate(
        string $startDateStr,
        ?Plan $plan = null,
        int $durationMonths = 1,
        int $offerDays = 0,
        string $period = ''
    ): string {
        $start = Carbon::parse($startDateStr, self::TIMEZONE)->startOfDay();

        $months = $plan ? (int)($plan->duration_months ?? 1) : $durationMonths;
        $bonus = $plan ? (int)($plan->offer_days ?? 0) : $offerDays;
        $periodStr = $plan ? ($plan->period ?? '') : $period;

        // Parse days from period if specified (e.g. "45 Days")
        if (preg_match('/(\d+)\s*days?/i', $periodStr, $matches)) {
            $days = (int)$matches[1];
            $end = $start->copy()->addDays(max(1, $days));
        } else {
            // Standard 30 days per month count: e.g. 1 month = 30 days (13 Oct -> 12 Nov)
            $monthsCount = max(1, $months);
            $totalDays = $monthsCount * 30;
            $end = $start->copy()->addDays($totalDays);
        }

        if ($bonus > 0) {
            $end = $end->addDays($bonus);
        }

        return $end->toDateString();
    }

    /**
     * Validate that a chosen start date satisfies business rules.
     * Throws ValidationException with specific error messages if invalid.
     */
    public static function validateStartDate(int $userId, string $packageType, string $startDateStr, ?int $gymId = null): void
    {
        $today = self::getTodayIst();
        $startStr = substr((string)$startDateStr, 0, 10);
        $chosenStart = Carbon::createFromFormat('Y-m-d', $startStr, self::TIMEZONE)->startOfDay();

        if ($chosenStart->toDateString() < $today->toDateString()) {
            throw ValidationException::withMessages([
                'start_date' => ["The start date ({$chosenStart->toDateString()}) cannot be in the past."],
            ]);
        }

        $normalizedType = self::normalizePackageType($packageType);
        $latestEnd = self::getLatestPlanEndDate($userId, $normalizedType, $gymId);

        if ($latestEnd && $latestEnd->toDateString() >= $today->toDateString()) {
            $requiredMinStart = $latestEnd->copy()->addDay();
            if ($chosenStart->toDateString() < $requiredMinStart->toDateString()) {
                $formattedEnd = $latestEnd->format('d M Y');
                $formattedReq = $requiredMinStart->format('d M Y');
                throw ValidationException::withMessages([
                    'start_date' => [
                        "The start date cannot overlap with an existing {$normalizedType} plan ending on {$formattedEnd}. Minimum allowable start date is {$formattedReq}."
                    ],
                ]);
            }
        }
    }

    /**
     * Safety Check (Option 1): Prevent cancelling or deleting an earlier plan if subsequent chained plans exist.
     */
    public static function checkCanCancelOrDeleteInvoice(Invoice $invoice): array
    {
        if (!$invoice->end_date || !$invoice->user_id) {
            return ['can_cancel' => true];
        }

        $packageType = self::normalizePackageType($invoice->package_type);
        $invoiceEndDate = Carbon::parse($invoice->end_date, self::TIMEZONE)->startOfDay();

        // Check if there are any later active/pending invoices of the same package type
        $laterChainedInvoices = Invoice::where('user_id', $invoice->user_id)
            ->where('id', '!=', $invoice->id)
            ->where('status', '!=', 'Cancelled')
            ->where('package_type', $packageType)
            ->whereDate('start_date', '>=', $invoiceEndDate->toDateString())
            ->get();

        if ($laterChainedInvoices->isNotEmpty()) {
            $chainedNumbers = $laterChainedInvoices->pluck('invoice_number')->implode(', ');
            return [
                'can_cancel' => false,
                'message' => "Cannot cancel invoice {$invoice->invoice_number} because subsequent chained plan(s) ({$chainedNumbers}) depend on it. Cancel or adjust subsequent chained plans first.",
            ];
        }

        return ['can_cancel' => true];
    }

    /**
     * Synchronize member_profiles.expiry_date with the furthest end_date across the member's non-cancelled invoices.
     * Preserves existing profile expiry date for legacy invoices with null dates and prevents moving backwards.
     */
    public static function syncMemberProfileExpiry(int $userId): ?string
    {
        $profile = MemberProfile::where('user_id', $userId)->first();
        if (!$profile) {
            return null;
        }

        $furthestInvoiceEndDate = Invoice::where('user_id', $userId)
            ->where('status', '!=', 'Cancelled')
            ->whereNotNull('end_date')
            ->max('end_date');

        if ($furthestInvoiceEndDate instanceof \DateTimeInterface) {
            $furthestInvoiceEndDate = $furthestInvoiceEndDate->format('Y-m-d');
        } elseif ($furthestInvoiceEndDate) {
            $furthestInvoiceEndDate = substr((string)$furthestInvoiceEndDate, 0, 10);
        }

        $currentProfileExpiry = $profile->expiry_date
            ? ($profile->expiry_date instanceof \DateTimeInterface
                ? $profile->expiry_date->format('Y-m-d')
                : substr((string)$profile->expiry_date, 0, 10))
            : null;

        $finalExpiry = $furthestInvoiceEndDate ?: $currentProfileExpiry;

        $hasLegitimatePriorPlan = ($profile->plan_id !== null) || Invoice::where('user_id', $userId)->where('status', '!=', 'Cancelled')->whereNotNull('end_date')->exists();
        if ($currentProfileExpiry && $hasLegitimatePriorPlan && (!$finalExpiry || $currentProfileExpiry > $finalExpiry)) {
            $finalExpiry = $currentProfileExpiry;
        }

        if ($finalExpiry && $finalExpiry !== $currentProfileExpiry) {
            $newStatus = \App\Http\Controllers\Api\MemberController::computeMemberStatus($finalExpiry, $profile->status);
            $profile->update([
                'expiry_date' => $finalExpiry,
                'status' => $newStatus,
            ]);
        }

        return $finalExpiry;
    }
}

