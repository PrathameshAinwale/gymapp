<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\MemberProfile;
use App\Models\NotificationRead;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class NotificationService
{
    public const PAYMENT_DUE_DAYS_WINDOW = 3;
    public const PLAN_EXPIRING_DAYS_WINDOW = 5;
    public const TIMEZONE = 'Asia/Kolkata';

    /**
     * Get all calculated notifications for a specific gym and staff user today.
     */
    public function getNotificationsForUser(int $gymId, int $userId): array
    {
        $today = Carbon::now(self::TIMEZONE)->format('Y-m-d');

        // Fetch already read reference IDs for this staff user today in IST
        $readReferenceIds = NotificationRead::where('gym_id', $gymId)
            ->where('user_id', $userId)
            ->where('read_date', $today)
            ->pluck('reference_id')
            ->flip()
            ->all();

        $dueItems = $this->getPaymentDueItems($gymId, $readReferenceIds);
        $expiringItems = $this->getPlanExpiringItems($gymId, $readReferenceIds);

        $unreadDueCount = $dueItems->where('is_read', false)->count();
        $unreadExpiringCount = $expiringItems->where('is_read', false)->count();
        $totalUnreadCount = $unreadDueCount + $unreadExpiringCount;

        return [
            'success' => true,
            'today' => $today,
            'unread_count' => $totalUnreadCount,
            'summary' => [
                'payment_due_count' => $dueItems->count(),
                'payment_due_unread' => $unreadDueCount,
                'payment_due_line' => $dueItems->count() === 1
                    ? '1 member has payment due'
                    : "{$dueItems->count()} members have payments due",
                'plan_expiring_count' => $expiringItems->count(),
                'plan_expiring_unread' => $unreadExpiringCount,
                'plan_expiring_line' => $expiringItems->count() === 1
                    ? '1 membership plan expiring soon'
                    : "{$expiringItems->count()} membership plans expiring soon",
            ],
            'payment_due' => [
                'total' => $dueItems->count(),
                'unread' => $unreadDueCount,
                'items' => $dueItems->values()->all(),
            ],
            'plan_expiring' => [
                'total' => $expiringItems->count(),
                'unread' => $unreadExpiringCount,
                'items' => $expiringItems->values()->all(),
            ],
        ];
    }

    /**
     * Payment Due notification generator.
     * Finds members with invoices having pending_amount > 0 and due_date <= today + 3 days.
     */
    public function getPaymentDueItems(int $gymId, array $readReferenceIds = []): Collection
    {
        $today = Carbon::now(self::TIMEZONE)->format('Y-m-d');
        $maxDueDate = Carbon::now(self::TIMEZONE)->addDays(self::PAYMENT_DUE_DAYS_WINDOW)->format('Y-m-d');

        $invoices = Invoice::with(['user.memberProfile', 'plan'])
            ->where('gym_id', $gymId)
            ->where('pending_amount', '>', 0)
            ->whereNotNull('due_date')
            ->where('due_date', '<=', $maxDueDate)
            ->whereNotIn('status', ['Cancelled', 'Refunded'])
            ->orderBy('due_date', 'asc')
            ->get();

        return $invoices->map(function ($inv) use ($today, $readReferenceIds) {
            $user = $inv->user;
            if (!$user) {
                return null;
            }

            $dueDateStr = $inv->due_date instanceof \DateTimeInterface
                ? $inv->due_date->format('Y-m-d')
                : (string)$inv->due_date;

            $isOverdue = $dueDateStr < $today;
            $refId = "payment_due:inv_{$inv->id}";

            return [
                'id' => $refId,
                'type' => 'payment_due',
                'reference_id' => $refId,
                'invoice_id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'member_id' => $user->id,
                'member_name' => $user->name,
                'member_phone' => $user->phone,
                'pending_amount' => (float)$inv->pending_amount,
                'due_date' => $dueDateStr,
                'is_overdue' => $isOverdue,
                'urgency' => $isOverdue ? 'high' : 'normal',
                'is_read' => isset($readReferenceIds[$refId]),
                'title' => $isOverdue ? 'Payment Overdue' : 'Payment Due Soon',
                'message' => $isOverdue
                    ? "₹" . number_format($inv->pending_amount, 0) . " overdue since " . Carbon::parse($dueDateStr)->format('d M')
                    : "₹" . number_format($inv->pending_amount, 0) . " due on " . Carbon::parse($dueDateStr)->format('d M'),
            ];
        })->filter()->values();
    }

    /**
     * Plan Expiring notification generator.
     * Evaluates per package type, checks chaining, falls back to member profile expiry.
     * Highly optimized for facilities with thousands of members using indexed date lookups.
     */
    public function getPlanExpiringItems(int $gymId, array $readReferenceIds = []): Collection
    {
        $today = Carbon::now(self::TIMEZONE)->format('Y-m-d');
        $maxExpiringDate = Carbon::now(self::TIMEZONE)->addDays(self::PLAN_EXPIRING_DAYS_WINDOW)->format('Y-m-d');

        // 1. Direct indexed candidate lookup: invoices expiring within window
        $candidateInvoices = Invoice::with(['user.memberProfile', 'plan'])
            ->where('gym_id', $gymId)
            ->whereNotNull('end_date')
            ->where('end_date', '>=', $today)
            ->where('end_date', '<=', $maxExpiringDate)
            ->whereNotIn('status', ['Cancelled', 'Refunded'])
            ->whereHas('user', function ($q) {
                $q->where('role', 'member')
                    ->whereHas('memberProfile', function ($mq) {
                        $mq->whereNotIn('status', ['Inactive', 'Deleted']);
                    });
            })
            ->get();

        $notifications = collect();
        $processedMemberPackages = [];

        // Pre-fetch candidate member IDs to batch check for later chained plans
        $candidateUserIds = $candidateInvoices->pluck('user_id')->unique()->filter()->all();
        $laterInvoicesByUser = [];

        if (!empty($candidateUserIds)) {
            $laterInvoices = Invoice::where('gym_id', $gymId)
                ->whereIn('user_id', $candidateUserIds)
                ->where('end_date', '>', $maxExpiringDate)
                ->whereNotIn('status', ['Cancelled', 'Refunded'])
                ->get();

            foreach ($laterInvoices as $linv) {
                $pType = $this->normalizePackageType($linv->package_type ?: ($linv->plan?->package_type ?: 'Gym-Cardio'));
                $laterInvoicesByUser[$linv->user_id][$pType] = true;
            }
        }

        foreach ($candidateInvoices as $inv) {
            $member = $inv->user;
            if (!$member) continue;

            $pkgType = $this->normalizePackageType($inv->package_type ?: ($inv->plan?->package_type ?: 'Gym-Cardio'));
            $memberPkgKey = "{$member->id}:{$pkgType}";

            // If we already added an expiring notice for this member & package, skip duplicates
            if (isset($processedMemberPackages[$memberPkgKey])) {
                continue;
            }

            // Chaining check: if member has another invoice of the SAME package type ending beyond the window,
            // they have already renewed! Suppress notification.
            if (!empty($laterInvoicesByUser[$member->id][$pkgType])) {
                continue;
            }

            $endDateStr = $inv->end_date instanceof \DateTimeInterface
                ? $inv->end_date->format('Y-m-d')
                : (string)$inv->end_date;

            $daysLeft = Carbon::parse($today)->diffInDays(Carbon::parse($endDateStr), false);
            $refId = "plan_expiring:mem_{$member->id}:pkg_{$pkgType}";
            $processedMemberPackages[$memberPkgKey] = true;

            $notifications->push([
                'id' => $refId,
                'type' => 'plan_expiring',
                'reference_id' => $refId,
                'member_id' => $member->id,
                'member_name' => $member->name,
                'member_phone' => $member->phone,
                'package_type' => $pkgType,
                'plan_name' => $inv->plan?->name ?: $pkgType,
                'expiry_date' => $endDateStr,
                'days_left' => max(0, (int)$daysLeft),
                'urgency' => $daysLeft <= 1 ? 'high' : 'normal',
                'is_read' => isset($readReferenceIds[$refId]),
                'title' => 'Plan Expiring Soon',
                'message' => "{$pkgType} expires in {$daysLeft} " . ($daysLeft === 1 ? 'day' : 'days') . " (" . Carbon::parse($endDateStr)->format('d M') . ")",
            ]);
        }

        // 2. Legacy fallback: member profiles with expiry_date in window who do NOT have any dated invoices
        $legacyCandidates = MemberProfile::with(['user', 'plan'])
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '>=', $today)
            ->where('expiry_date', '<=', $maxExpiringDate)
            ->whereNotIn('status', ['Inactive', 'Deleted'])
            ->where(function ($q) {
                $q->whereNotNull('plan_id')
                    ->orWhereHas('user.invoices', function ($qi) {
                        $qi->whereNotIn('status', ['Cancelled', 'Refunded']);
                    });
            })
            ->whereHas('user', function ($q) use ($gymId) {
                $q->where('gym_id', $gymId)
                    ->where('role', 'member');
            })
            ->whereDoesntHave('user.invoices', function ($q) {
                $q->whereNotNull('end_date')->whereNotIn('status', ['Cancelled', 'Refunded']);
            })
            ->get();

        foreach ($legacyCandidates as $profile) {
            $member = $profile->user;
            if (!$member) continue;

            $pkgType = 'Gym-Cardio';
            $memberPkgKey = "{$member->id}:{$pkgType}";
            if (isset($processedMemberPackages[$memberPkgKey])) continue;

            $rawExpStr = $profile->expiry_date instanceof \DateTimeInterface
                ? $profile->expiry_date->format('Y-m-d')
                : (string)$profile->expiry_date;

            $daysLeft = Carbon::parse($today)->diffInDays(Carbon::parse($rawExpStr), false);
            $refId = "plan_expiring:mem_{$member->id}:legacy";
            $processedMemberPackages[$memberPkgKey] = true;

            $notifications->push([
                'id' => $refId,
                'type' => 'plan_expiring',
                'reference_id' => $refId,
                'member_id' => $member->id,
                'member_name' => $member->name,
                'member_phone' => $member->phone,
                'package_type' => $pkgType,
                'plan_name' => $profile->plan?->name ?: 'Membership Plan',
                'expiry_date' => $rawExpStr,
                'days_left' => max(0, (int)$daysLeft),
                'urgency' => $daysLeft <= 1 ? 'high' : 'normal',
                'is_read' => isset($readReferenceIds[$refId]),
                'title' => 'Plan Expiring Soon',
                'message' => "Expires in {$daysLeft} " . ($daysLeft === 1 ? 'day' : 'days') . " (" . Carbon::parse($rawExpStr)->format('d M') . ")",
            ]);
        }

        return $notifications->sortBy('expiry_date')->values();
    }

    /**
     * Mark a specific notification reference as read for the user today.
     */
    public function markAsRead(int $gymId, int $userId, string $type, string $referenceId): bool
    {
        $today = Carbon::now(self::TIMEZONE)->format('Y-m-d');

        NotificationRead::firstOrCreate([
            'user_id' => $userId,
            'gym_id' => $gymId,
            'notification_type' => $type,
            'reference_id' => $referenceId,
            'read_date' => $today,
        ]);

        return true;
    }

    /**
     * Mark all active notifications as read for the user today.
     */
    public function markAllAsRead(int $gymId, int $userId): int
    {
        $today = Carbon::now(self::TIMEZONE)->format('Y-m-d');
        $notifs = $this->getNotificationsForUser($gymId, $userId);

        $count = 0;
        foreach (['payment_due', 'plan_expiring'] as $key) {
            foreach ($notifs[$key]['items'] as $item) {
                if (!$item['is_read']) {
                    NotificationRead::firstOrCreate([
                        'user_id' => $userId,
                        'gym_id' => $gymId,
                        'notification_type' => $item['type'],
                        'reference_id' => $item['reference_id'],
                        'read_date' => $today,
                    ]);
                    $count++;
                }
            }
        }

        return $count;
    }

    /**
     * Get matching member IDs for a filter type to guarantee 100% agreement with directory list.
     */
    public function getMemberIdsForFilter(int $gymId, string $type): array
    {
        if ($type === 'payment_due') {
            return $this->getPaymentDueItems($gymId)
                ->pluck('member_id')
                ->unique()
                ->values()
                ->all();
        }

        if ($type === 'plan_expiring') {
            return $this->getPlanExpiringItems($gymId)
                ->pluck('member_id')
                ->unique()
                ->values()
                ->all();
        }

        return [];
    }

    protected function normalizePackageType(?string $raw): string
    {
        $norm = strtolower(trim((string)$raw));
        if (str_contains($norm, 'pt') || str_contains($norm, 'personal')) {
            return 'Personal Training';
        }
        if (str_contains($norm, 'massage') || str_contains($norm, 'recovery') || str_contains($norm, 'activities')) {
            return 'Recovery';
        }
        return 'Gym-Cardio';
    }
}
