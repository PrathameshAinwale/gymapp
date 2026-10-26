<?php

namespace App\Services;

use App\Models\User;
use App\Models\MemberProfile;

class IdentityValidationService
{
    /**
     * Common placeholder strings that should never trigger uniqueness conflicts.
     */
    protected static array $ignorePlaceholders = [
        'not provided',
        'null',
        'n/a',
        'na',
        'none',
        'undefined',
        '-',
        '--',
    ];

    /**
     * Check if an Aadhaar number is already registered to another user (member, staff, trainer, etc.)
     *
     * @param string|null $aadhaar
     * @param int|null $excludeUserId ID of the user being updated (to permit self-updates)
     * @return array|null Returns ['conflict_id' => ..., 'name' => ..., 'role' => ...] or null if available
     */
    public static function findAadhaarConflict(?string $aadhaar, ?int $excludeUserId = null): ?array
    {
        if (empty($aadhaar)) {
            return null;
        }

        $trimmed = trim($aadhaar);
        if (in_array(strtolower($trimmed), self::$ignorePlaceholders, true)) {
            return null;
        }

        $clean = preg_replace('/\D+/', '', $trimmed);
        if (empty($clean) || strlen($clean) < 12) {
            return null;
        }

        // 1. Search users table
        $userQuery = User::whereNotNull('aadhaar_card')
            ->where(function ($q) use ($trimmed, $clean) {
                $q->where('aadhaar_card', $trimmed)
                  ->orWhere('aadhaar_card', $clean)
                  ->orWhereRaw("REPLACE(REPLACE(aadhaar_card, ' ', ''), '-', '') = ?", [$clean]);
            });

        if ($excludeUserId) {
            $userQuery->where('id', '!=', $excludeUserId);
        }

        $conflictUser = $userQuery->first();
        if ($conflictUser) {
            return [
                'conflict_id' => $conflictUser->id,
                'name' => $conflictUser->name,
                'role' => ucfirst($conflictUser->role ?? 'User'),
            ];
        }

        // 2. Search member_profiles table (in case a member record's KYC doc has not yet synced to users table)
        $profileQuery = MemberProfile::whereNotNull('kyc_doc_number')
            ->whereIn('kyc_doc_type', ['Aadhaar Card', 'Aadhaar', 'aadhaar'])
            ->where(function ($q) use ($trimmed, $clean) {
                $q->where('kyc_doc_number', $trimmed)
                  ->orWhere('kyc_doc_number', $clean)
                  ->orWhereRaw("REPLACE(REPLACE(kyc_doc_number, ' ', ''), '-', '') = ?", [$clean]);
            });

        if ($excludeUserId) {
            $profileQuery->where('user_id', '!=', $excludeUserId);
        }

        $conflictProfile = $profileQuery->with('user')->first();
        if ($conflictProfile) {
            $user = $conflictProfile->user;
            return [
                'conflict_id' => $user?->id ?? $conflictProfile->user_id,
                'name' => $user?->name ?? 'Existing Member',
                'role' => ucfirst($user?->role ?? 'Member'),
            ];
        }

        return null;
    }

    /**
     * Check if a PAN number is already registered to another user (member, staff, trainer, etc.)
     *
     * @param string|null $pan
     * @param int|null $excludeUserId ID of the user being updated (to permit self-updates)
     * @return array|null Returns ['conflict_id' => ..., 'name' => ..., 'role' => ...] or null if available
     */
    public static function findPanConflict(?string $pan, ?int $excludeUserId = null): ?array
    {
        if (empty($pan)) {
            return null;
        }

        $trimmed = trim($pan);
        if (in_array(strtolower($trimmed), self::$ignorePlaceholders, true)) {
            return null;
        }

        $clean = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $trimmed));
        if (empty($clean) || strlen($clean) < 10) {
            return null;
        }

        // 1. Search users table
        $userQuery = User::whereNotNull('pan_card')
            ->where(function ($q) use ($trimmed, $clean) {
                $q->where('pan_card', $trimmed)
                  ->orWhere('pan_card', $clean)
                  ->orWhereRaw("UPPER(REPLACE(REPLACE(pan_card, ' ', ''), '-', '')) = ?", [$clean]);
            });

        if ($excludeUserId) {
            $userQuery->where('id', '!=', $excludeUserId);
        }

        $conflictUser = $userQuery->first();
        if ($conflictUser) {
            return [
                'conflict_id' => $conflictUser->id,
                'name' => $conflictUser->name,
                'role' => ucfirst($conflictUser->role ?? 'User'),
            ];
        }

        // 2. Search member_profiles table
        $profileQuery = MemberProfile::whereNotNull('kyc_doc_number')
            ->whereIn('kyc_doc_type', ['PAN Card', 'PAN', 'pan'])
            ->where(function ($q) use ($trimmed, $clean) {
                $q->where('kyc_doc_number', $trimmed)
                  ->orWhere('kyc_doc_number', $clean)
                  ->orWhereRaw("UPPER(REPLACE(REPLACE(kyc_doc_number, ' ', ''), '-', '')) = ?", [$clean]);
            });

        if ($excludeUserId) {
            $profileQuery->where('user_id', '!=', $excludeUserId);
        }

        $conflictProfile = $profileQuery->with('user')->first();
        if ($conflictProfile) {
            $user = $conflictProfile->user;
            return [
                'conflict_id' => $user?->id ?? $conflictProfile->user_id,
                'name' => $user?->name ?? 'Existing Member',
                'role' => ucfirst($user?->role ?? 'Member'),
            ];
        }

        return null;
    }
}
