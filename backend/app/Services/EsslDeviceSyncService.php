<?php

namespace App\Services;

use App\Models\User;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EsslDeviceSyncService
{
    /**
     * Resolve candidate filesystem paths to device_user_sync.py
     */
    public function resolveScriptPath(): ?string
    {
        $candidatePaths = [
            base_path('../device-sync-service/device_user_sync.py'),
            base_path('device-sync-service/device_user_sync.py'),
            'C:\\Users\\ARCH\\Desktop\\gymapp\\device-sync-service\\device_user_sync.py',
            'C:\\Users\\ARCH\\Desktop\\essl\\device-sync-service\\device_user_sync.py',
        ];

        foreach ($candidatePaths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Resolve active biometric device endpoint (IP and Port)
     */
    public function resolveDeviceEndpoint(?int $gymId = null): array
    {
        $query = DB::table('biometric_devices');
        if ($gymId && $gymId > 0) {
            $query->where('gym_id', $gymId);
        }

        $device = (clone $query)->where('status', 'online')->first()
            ?: (clone $query)->where('is_active', 1)->first()
            ?: DB::table('biometric_devices')->where('is_active', 1)->first()
            ?: DB::table('biometric_devices')->first();

        return [
            'ip'   => $device?->ip_address ?: '192.168.1.201',
            'port' => (int)($device?->port ?: 4370),
            'id'   => $device?->id ?: 1,
            'name' => $device?->name ?: 'eSSL Terminal',
        ];
    }

    /**
     * Synchronize user registration or update with eSSL Biometric Terminal over LAN.
     */
    public function pushUser(User $user, ?string $oldBioId = null, int $card = 0): ?array
    {
        try {
            $scriptPath = $this->resolveScriptPath();
            if (!$scriptPath) {
                Log::warning("EsslDeviceSyncService: script device_user_sync.py not found.");
                return null;
            }

            // Determine Biometric User ID (defaults to User ID if not set)
            $bioUserId = (string)($user->biometric_user_id ?: $user->id);
            if (empty($user->biometric_user_id)) {
                $user->update(['biometric_user_id' => $bioUserId]);
            }

            // If user has a member profile, align biometric_user_id
            $memberProfile = $user->memberProfile ?? MemberProfile::where('user_id', $user->id)->first();
            if ($memberProfile && empty($memberProfile->biometric_user_id)) {
                $memberProfile->update(['biometric_user_id' => $bioUserId]);
            }

            $endpoint = $this->resolveDeviceEndpoint($user->gym_id);
            $deviceIp = $endpoint['ip'];
            $devicePort = $endpoint['port'];

            // If biometric user ID changed, delete the old slot on machine first
            if ($oldBioId && $oldBioId !== $bioUserId) {
                $oldTargetId = escapeshellarg($oldBioId);
                shell_exec("python \"{$scriptPath}\" --delete --user-id {$oldTargetId} --ip {$deviceIp} --port {$devicePort}");
            }

            // Privilege: 14 for manager/owner/superadmin, 0 for trainer/accounts/member
            $roleLower = strtolower($user->role ?? 'member');
            $privilege = in_array($roleLower, ['manager', 'admin', 'superadmin', 'owner']) ? 14 : 0;

            $cleanName = escapeshellarg(substr($user->name, 0, 24));
            $targetId = escapeshellarg($bioUserId);
            $cardArg = (int)$card;

            $cmd = "python \"{$scriptPath}\" --push --user-id {$targetId} --name {$cleanName} --privilege {$privilege} --role {$roleLower} --card {$cardArg} --ip {$deviceIp} --port {$devicePort}";
            $output = shell_exec($cmd);
            $result = json_decode($output, true);

            if (!empty($result['success'])) {
                $user->update([
                    'synced_to_device' => 1,
                    'device_synced_at' => now(),
                    'biometric_user_id' => $bioUserId,
                ]);

                if ($memberProfile) {
                    $memberProfile->update([
                        'synced_to_device' => 1,
                        'device_synced_at' => now(),
                        'biometric_user_id' => $bioUserId,
                    ]);
                }
            }

            return $result;
        } catch (\Throwable $e) {
            Log::warning("eSSL pushUser failed for user {$user->id} ({$user->name}): " . $e->getMessage());
            return null;
        }
    }

    /**
     * Remove a user from the eSSL Biometric Terminal over LAN.
     */
    public function deleteUser(User $user, ?string $bioIdOverride = null): ?array
    {
        try {
            $scriptPath = $this->resolveScriptPath();
            if (!$scriptPath) {
                return null;
            }

            $bioUserId = (string)($bioIdOverride ?: $user->biometric_user_id ?: $user->id);
            $endpoint = $this->resolveDeviceEndpoint($user->gym_id);
            $deviceIp = $endpoint['ip'];
            $devicePort = $endpoint['port'];

            $targetId = escapeshellarg($bioUserId);
            $cleanName = escapeshellarg(substr($user->name, 0, 24));

            $cmd = "python \"{$scriptPath}\" --delete --user-id {$targetId} --name {$cleanName} --ip {$deviceIp} --port {$devicePort}";
            $output = shell_exec($cmd);
            $result = json_decode($output, true);

            $user->update(['synced_to_device' => 0]);

            $memberProfile = $user->memberProfile ?? MemberProfile::where('user_id', $user->id)->first();
            if ($memberProfile) {
                $memberProfile->update(['synced_to_device' => 0]);
            }

            return $result;
        } catch (\Throwable $e) {
            Log::warning("eSSL deleteUser failed for user {$user->id} ({$user->name}): " . $e->getMessage());
            return null;
        }
    }

    /**
     * Reconcile users from the physical eSSL machine into Laravel.
     * If a user was previously synced to the device (synced_to_device = 1),
     * but no longer exists on the physical machine, it was deleted directly on the eSSL hardware.
     * We synchronize this by deleting/deactivating that user in Laravel.
     *
     * @param array $machineUsers List of users currently present on the machine (with user_id, uid, name)
     * @param int|null $gymId
     * @return array
     */
    public function reconcileWithMachineUsers(array $machineUsers, ?int $gymId = null): array
    {
        $machineUserIds = [];
        $machineNames = [];

        foreach ($machineUsers as $m) {
            if (isset($m['user_id'])) {
                $machineUserIds[] = (string)$m['user_id'];
            }
            if (isset($m['uid'])) {
                $machineUserIds[] = (string)$m['uid'];
            }
            if (!empty($m['name'])) {
                $machineNames[] = strtolower(trim((string)$m['name']));
            }
        }

        $machineUserIds = array_unique(array_filter($machineUserIds));
        $machineNames = array_unique(array_filter($machineNames));

        // Find all synced users in the database
        $query = User::where('synced_to_device', 1);
        if ($gymId && $gymId > 0) {
            $query->where('gym_id', $gymId);
        }

        $syncedUsers = $query->get();
        $deletedFromSystem = [];

        foreach ($syncedUsers as $user) {
            // Never auto-delete superadmin or owner accounts
            if (in_array($user->role, ['superadmin', 'owner'])) {
                continue;
            }

            $userBioId = (string)($user->biometric_user_id ?: $user->id);
            $userIdStr = (string)$user->id;
            $userNameLower = strtolower(trim($user->name));

            $presentOnMachine = in_array($userBioId, $machineUserIds, true)
                || in_array($userIdStr, $machineUserIds, true)
                || in_array($userNameLower, $machineNames, true);

            if (!$presentOnMachine) {
                // User was deleted directly on the eSSL biometric machine keypad!
                Log::info("eSSL Two-Way Reconciliation: User {$user->id} ({$user->name}, role: {$user->role}) was deleted from biometric terminal. Deleting from system.");

                if ($user->role === 'member') {
                    MemberProfile::where('user_id', $user->id)->delete();
                } elseif ($user->role === 'trainer') {
                    TrainerProfile::where('user_id', $user->id)->delete();
                }

                $deletedInfo = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'biometric_user_id' => $userBioId,
                ];

                $user->delete();
                $deletedFromSystem[] = $deletedInfo;
            }
        }

        return [
            'success' => true,
            'machine_users_count' => count($machineUsers),
            'deleted_from_system_count' => count($deletedFromSystem),
            'deleted_users' => $deletedFromSystem,
        ];
    }
}
