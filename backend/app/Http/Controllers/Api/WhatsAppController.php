<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\GymSetting;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\User;
use App\Models\WhatsAppLog;
use App\Models\WhatsAppTemplate;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WhatsAppController extends Controller
{
    /**
     * Standard Dynamic Variables Helper:
     * Replaces template tags with actual recipient / gym data.
     */
    protected function renderMessage(string $template, array $data): string
    {
        $placeholders = [
            '{{name}}'          => $data['name'] ?? '',
            '{{gym_name}}'      => $data['gym_name'] ?? 'PulseFit Pro',
            '{{role}}'          => ucfirst($data['role'] ?? 'Member'),
            '{{phone}}'         => $data['phone'] ?? '',
            '{{plan_name}}'     => $data['plan_name'] ?? 'Membership',
            '{{expiry_date}}'   => $data['expiry_date'] ?? '',
            '{{days_left}}'     => (string) ($data['days_left'] ?? ''),
            '{{dues_amount}}'   => isset($data['dues_amount']) ? '₹' . number_format((float) $data['dues_amount'], 2) : '₹0',
            '{{date}}'          => $data['date'] ?? Carbon::today()->format('d M Y'),
            '{{trainer_name}}'  => $data['trainer_name'] ?? 'Personal Coach',
            '{{age}}'           => (string) ($data['age'] ?? ''),
            '{{dob}}'           => (string) ($data['dob'] ?? ''),
            '{{portal_url}}'    => $data['portal_url'] ?? config('app.url', 'https://archfit.archenterprises.co.in'),
            '{{custom_note}}'   => $data['custom_note'] ?? '',
        ];

        $rendered = str_replace(array_keys($placeholders), array_values($placeholders), $template);
        return str_replace(['Coach Coach ', 'Coach Coach'], 'Coach ', $rendered);
    }

    /**
     * Clean phone number for WhatsApp link
     */
    protected function cleanPhone(?string $phone): string
    {
        if (!$phone) return '';
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        // If 10 digits (Indian standard), prepend 91
        if (strlen($cleaned) === 10) {
            $cleaned = '91' . $cleaned;
        }
        return $cleaned;
    }

    /**
     * 1. List all WhatsApp templates
     */
    public function indexTemplates(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $category = $request->query('category');
        $targetRole = $request->query('target_role') ?: $request->query('role');
        $status = $request->query('status');

        $query = WhatsAppTemplate::with('creator:id,name,role')
            ->orderBy('id', 'desc');

        if ($gymId) {
            $hasGymTemplates = (clone $query)->where('gym_id', $gymId)->exists();
            if ($hasGymTemplates) {
                $query->where('gym_id', $gymId);
            }
        }

        if ($category && strtoupper($category) !== 'ALL') {
            $query->where('category', $category);
        }

        if ($targetRole && strtoupper($targetRole) !== 'ALL') {
            $query->where(function ($q) use ($targetRole) {
                $q->where('target_role', $targetRole)
                  ->orWhere('target_role', 'all');
            });
        }

        if ($status !== null && $status !== '') {
            $query->where('is_active', filter_var($status, FILTER_VALIDATE_BOOLEAN));
        }

        $templates = $query->get();

        return response()->json([
            'success' => true,
            'count'   => $templates->count(),
            'data'    => $templates,
        ]);
    }

    /**
     * 2. Store new WhatsApp template
     */
    public function storeTemplate(Request $request)
    {
        $gymId = $this->resolveGymId($request) ?: 1;

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'category'        => 'required|string|max:50',
            'target_role'     => 'required|string|max:50',
            'message_body'    => 'required|string',
            'is_active'       => 'nullable|boolean',
            'is_auto_enabled' => 'nullable|boolean',
            'timing_trigger'  => 'nullable|string|max:100',
        ]);

        $template = WhatsAppTemplate::create([
            'gym_id'          => $gymId,
            'name'            => $validated['name'],
            'category'        => $validated['category'],
            'target_role'     => $validated['target_role'],
            'message_body'    => $validated['message_body'],
            'is_active'       => $validated['is_active'] ?? true,
            'is_auto_enabled' => $validated['is_auto_enabled'] ?? true,
            'timing_trigger'  => $validated['timing_trigger'] ?? 'manual',
            'created_by'      => optional($request->user())->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Template '{$template->name}' created successfully!",
            'data'    => $template,
        ], 201);
    }

    /**
     * 3. Update WhatsApp template
     */
    public function updateTemplate(Request $request, $id)
    {
        $template = WhatsAppTemplate::findOrFail($id);

        $validated = $request->validate([
            'name'            => 'sometimes|required|string|max:255',
            'category'        => 'sometimes|required|string|max:50',
            'target_role'     => 'sometimes|required|string|max:50',
            'message_body'    => 'sometimes|required|string',
            'is_active'       => 'nullable|boolean',
            'is_auto_enabled' => 'nullable|boolean',
            'timing_trigger'  => 'nullable|string|max:100',
        ]);

        $template->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Template '{$template->name}' updated successfully!",
            'data'    => $template,
        ]);
    }

    /**
     * 4. Delete WhatsApp template
     */
    public function destroyTemplate($id)
    {
        $template = WhatsAppTemplate::findOrFail($id);
        $name = $template->name;
        $template->delete();

        return response()->json([
            'success' => true,
            'message' => "Template '{$name}' deleted successfully!",
        ]);
    }

    /**
     * 5. Toggle template status
     */
    public function toggleTemplate(Request $request, $id)
    {
        $template = WhatsAppTemplate::findOrFail($id);
        $field = $request->input('field', 'is_active');

        if ($field === 'is_auto_enabled') {
            $template->is_auto_enabled = !$template->is_auto_enabled;
        } else {
            $template->is_active = !$template->is_active;
        }

        $template->save();

        return response()->json([
            'success' => true,
            'message' => "Template status updated!",
            'data'    => $template,
        ]);
    }

    /**
     * 6. Real-time Trigger Scanner:
     * Scans database for today's active triggers (Birthdays, Expiries, Dues, Inactives)
     * and compiles ready-to-dispatch messages with active templates!
     */
    public function scanTriggers(Request $request)
    {
        $gymId = $this->resolveGymId($request) ?: 1;
        $gym = Gym::find($gymId);
        $gymName = $gym ? $gym->name : (GymSetting::first()?->name ?? 'PulseFit Pro');
        $portalUrl = config('app.url', 'https://archfit.archenterprises.co.in');

        $today = Carbon::today();
        $todayMonth = (int) $today->format('m');
        $todayDay   = (int) $today->format('d');

        // Load active templates indexed by category and role
        $templatesQuery = WhatsAppTemplate::where('is_active', true);
        if ($gymId) {
            $templatesQuery->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId)
                  ->orWhereNull('gym_id')
                  ->orWhere('gym_id', 1);
            });
        }
        $templates = $templatesQuery->get();

        // Helper to find best matching template
        $getTemplate = function ($category, $role = 'member') use ($templates) {
            return $templates->first(function ($t) use ($category, $role) {
                return $t->category === $category && ($t->target_role === $role || $t->target_role === 'all');
            }) ?: $templates->firstWhere('category', $category);
        };

        // Today's sent log check
        $todayLogs = WhatsAppLog::where('gym_id', $gymId)
            ->whereDate('sent_at', $today->toDateString())
            ->pluck('recipient_phone')
            ->toArray();

        // ─────────────────────────────────────────────────────────────
        // A. BIRTHDAY CELEBRANTS TODAY (Members, Trainers, Staff)
        // ─────────────────────────────────────────────────────────────
        $birthdayList = [];

        // 1. Members having birthday today (scanned from member_profiles.dob)
        $memberBirthdaysQuery = MemberProfile::with(['user', 'plan'])
            ->whereNotNull('dob')
            ->where('dob', '!=', '')
            ->whereMonth('dob', $todayMonth)
            ->whereDay('dob', $todayDay);

        if ($gymId) {
            $memberBirthdaysQuery->whereHas('user', function ($q) use ($gymId) {
                $q->where('gym_id', $gymId)
                  ->orWhereNull('gym_id')
                  ->orWhere('gym_id', 1);
            });
        }

        $memberBirthdays = $memberBirthdaysQuery->get();

        $defaultMemberBdayTpl = $getTemplate('birthday', 'member')?->message_body
            ?? "*Happy Birthday {{name}}!*\n\nWishing you strength, health, and limitless PRs this year from all of us at *{{gym_name}}*! Drop by today for a special birthday workout perk!";

        foreach ($memberBirthdays as $mp) {
            $user = $mp->user;
            if (!$user) continue;

            $phone = $user->phone;
            $clean = $this->cleanPhone($phone);
            $dobFormatted = $mp->dob ? Carbon::parse($mp->dob)->format('d M Y') : null;
            $age = $mp->dob ? Carbon::parse($mp->dob)->age : $mp->age;

            $msg = $this->renderMessage($defaultMemberBdayTpl, [
                'name'       => $user->name,
                'gym_name'   => $gymName,
                'role'       => 'Member',
                'phone'      => $phone,
                'plan_name'  => $mp->plan?->name ?? 'Active Plan',
                'portal_url' => $portalUrl,
                'age'        => (string) $age,
                'dob'        => (string) $dobFormatted,
            ]);

            $birthdayList[] = [
                'id'         => 'member_' . $user->id,
                'user_id'    => $user->id,
                'name'       => $user->name,
                'role'       => 'member',
                'phone'      => $phone,
                'clean_phone'=> $clean,
                'avatar'     => $user->avatar,
                'dob'        => $dobFormatted,
                'age'        => $age,
                'message'    => $msg,
                'wa_link'    => $clean ? "https://wa.me/{$clean}?text=" . urlencode($msg) : null,
                'is_sent'    => in_array($clean, $todayLogs) || in_array($phone, $todayLogs),
            ];
        }

        // 2. Trainers & Staff having birthday today
        $trainerBirthdaysQuery = TrainerProfile::with('user')
            ->whereNotNull('dob')
            ->where('dob', '!=', '')
            ->whereMonth('dob', $todayMonth)
            ->whereDay('dob', $todayDay);

        if ($gymId) {
            $trainerBirthdaysQuery->whereHas('user', function ($q) use ($gymId) {
                $q->where('gym_id', $gymId)
                  ->orWhereNull('gym_id')
                  ->orWhere('gym_id', 1);
            });
        }

        $trainerBirthdays = $trainerBirthdaysQuery->get();

        $defaultTrainerBdayTpl = $getTemplate('birthday', 'trainer')?->message_body
            ?? "*Happy Birthday Coach {{name}}!*\n\nThank you for inspiring, coaching, and empowering our members every single day at *{{gym_name}}*! Have a phenomenal celebration!";

        foreach ($trainerBirthdays as $tp) {
            $user = $tp->user;
            if (!$user) continue;

            $phone = $user->phone;
            $clean = $this->cleanPhone($phone);
            $dobFormatted = $tp->dob ? Carbon::parse($tp->dob)->format('d M Y') : null;
            $age = $tp->dob ? Carbon::parse($tp->dob)->age : $tp->age;

            $msg = $this->renderMessage($defaultTrainerBdayTpl, [
                'name'       => $user->name,
                'gym_name'   => $gymName,
                'role'       => 'Trainer',
                'phone'      => $phone,
                'portal_url' => $portalUrl,
                'age'        => (string) $age,
                'dob'        => (string) $dobFormatted,
            ]);

            $birthdayList[] = [
                'id'         => 'trainer_' . $user->id,
                'user_id'    => $user->id,
                'name'       => $user->name,
                'role'       => 'trainer',
                'phone'      => $phone,
                'clean_phone'=> $clean,
                'avatar'     => $user->avatar,
                'dob'        => $dobFormatted,
                'age'        => $age,
                'message'    => $msg,
                'wa_link'    => $clean ? "https://wa.me/{$clean}?text=" . urlencode($msg) : null,
                'is_sent'    => in_array($clean, $todayLogs) || in_array($phone, $todayLogs),
            ];
        }

        // ─────────────────────────────────────────────────────────────
        // B. MEMBERSHIP EXPIRY IN 1 TO 7 DAYS
        // ─────────────────────────────────────────────────────────────
        $expiryList = [];
        $expiringProfiles = MemberProfile::with(['user', 'plan'])
            ->where('status', 'Active')
            ->whereNotNull('expiry_date')
            ->whereBetween('expiry_date', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()])
            ->orderBy('expiry_date', 'asc')
            ->get();

        $defaultExpiryTpl = $getTemplate('expiry_reminder', 'member')?->message_body
            ?? "Hi *{{name}}*, your *{{gym_name}}* membership for *{{plan_name}}* expires in *{{days_left}} days* on *{{expiry_date}}*. Renew today to keep your fitness momentum going without interruption!";

        foreach ($expiringProfiles as $mp) {
            $user = $mp->user;
            if (!$user) continue;

            $daysLeft = $today->diffInDays(Carbon::parse($mp->expiry_date), false);
            $phone = $user->phone;
            $clean = $this->cleanPhone($phone);
            $expDateFormatted = Carbon::parse($mp->expiry_date)->format('d M Y');

            $msg = $this->renderMessage($defaultExpiryTpl, [
                'name'        => $user->name,
                'gym_name'    => $gymName,
                'plan_name'   => $mp->plan?->name ?? 'Membership',
                'expiry_date' => $expDateFormatted,
                'days_left'   => max(0, $daysLeft),
                'role'        => 'Member',
                'phone'       => $phone,
                'portal_url'  => $portalUrl,
            ]);

            $expiryList[] = [
                'id'          => 'exp_' . $user->id,
                'user_id'     => $user->id,
                'name'        => $user->name,
                'role'        => 'member',
                'phone'       => $phone,
                'clean_phone' => $clean,
                'avatar'      => $user->avatar,
                'plan_name'   => $mp->plan?->name ?? 'Standard',
                'expiry_date' => $expDateFormatted,
                'days_left'   => $daysLeft,
                'message'     => $msg,
                'wa_link'     => $clean ? "https://wa.me/{$clean}?text=" . urlencode($msg) : null,
                'is_sent'     => in_array($clean, $todayLogs) || in_array($phone, $todayLogs),
            ];
        }

        // ─────────────────────────────────────────────────────────────
        // C. PENDING MEMBERSHIP DUES / FEE REMINDERS
        // ─────────────────────────────────────────────────────────────
        $duesList = [];
        $dueProfiles = MemberProfile::with(['user', 'plan'])
            ->where('dues_amount', '>', 0)
            ->orderBy('dues_amount', 'desc')
            ->limit(30)
            ->get();

        $defaultDuesTpl = $getTemplate('fee_due', 'member')?->message_body
            ?? "*Fee Payment Reminder*\n\nDear *{{name}}*, a friendly reminder from *{{gym_name}}* that an outstanding fee balance of *{{dues_amount}}* is pending on your account. Kindly clear it at the front desk or via UPI to maintain seamless workout access. Thank you!";

        foreach ($dueProfiles as $mp) {
            $user = $mp->user;
            if (!$user) continue;

            $phone = $user->phone;
            $clean = $this->cleanPhone($phone);
            $msg = $this->renderMessage($defaultDuesTpl, [
                'name'        => $user->name,
                'gym_name'    => $gymName,
                'dues_amount' => $mp->dues_amount,
                'role'        => 'Member',
                'phone'       => $phone,
                'portal_url'  => $portalUrl,
            ]);

            $duesList[] = [
                'id'          => 'due_' . $user->id,
                'user_id'     => $user->id,
                'name'        => $user->name,
                'role'        => 'member',
                'phone'       => $phone,
                'clean_phone' => $clean,
                'avatar'      => $user->avatar,
                'dues_amount' => (float) $mp->dues_amount,
                'message'     => $msg,
                'wa_link'     => $clean ? "https://wa.me/{$clean}?text=" . urlencode($msg) : null,
                'is_sent'     => in_array($clean, $todayLogs) || in_array($phone, $todayLogs),
            ];
        }

        // ─────────────────────────────────────────────────────────────
        // D. ABSENTEE MEMBERS (No check-in in 7+ days)
        // ─────────────────────────────────────────────────────────────
        $absenteeList = [];
        $sevenDaysAgo = $today->copy()->subDays(7);
        $absentProfiles = MemberProfile::with(['user', 'plan'])
            ->where('status', 'Active')
            ->where(function ($q) use ($sevenDaysAgo) {
                $q->where('last_check_in', '<', $sevenDaysAgo)
                  ->orWhere(function ($sub) use ($sevenDaysAgo) {
                      $sub->whereNull('last_check_in')
                          ->where('join_date', '<', $sevenDaysAgo);
                  });
            })
            ->limit(25)
            ->get();

        $defaultAbsenteeTpl = $getTemplate('absentee', 'member')?->message_body
            ?? "*We miss you at {{gym_name}}, {{name}}!*\n\nConsistency is where true transformations happen. Your workout space is ready — let's crush your goals this week!";

        foreach ($absentProfiles as $mp) {
            $user = $mp->user;
            if (!$user) continue;

            $phone = $user->phone;
            $clean = $this->cleanPhone($phone);
            $msg = $this->renderMessage($defaultAbsenteeTpl, [
                'name'       => $user->name,
                'gym_name'   => $gymName,
                'role'       => 'Member',
                'phone'      => $phone,
                'portal_url' => $portalUrl,
            ]);

            $absenteeList[] = [
                'id'          => 'abs_' . $user->id,
                'user_id'     => $user->id,
                'name'        => $user->name,
                'role'        => 'member',
                'phone'       => $phone,
                'clean_phone' => $clean,
                'avatar'      => $user->avatar,
                'last_seen'   => $mp->last_check_in ? Carbon::parse($mp->last_check_in)->diffForHumans() : 'Over 7 days ago',
                'message'     => $msg,
                'wa_link'     => $clean ? "https://wa.me/{$clean}?text=" . urlencode($msg) : null,
                'is_sent'     => in_array($clean, $todayLogs) || in_array($phone, $todayLogs),
            ];
        }

        return response()->json([
            'success' => true,
            'summary' => [
                'birthdays_today' => count($birthdayList),
                'expiring_soon'   => count($expiryList),
                'pending_dues'    => count($duesList),
                'absentees'       => count($absenteeList),
            ],
            'triggers' => [
                'birthdays' => $birthdayList,
                'expiring'  => $expiryList,
                'dues'      => $duesList,
                'absentees' => $absenteeList,
            ],
        ]);
    }

    /**
     * 7. Store WhatsApp message log
     */
    public function storeLog(Request $request)
    {
        $gymId = $this->resolveGymId($request) ?: 1;

        $validated = $request->validate([
            'template_id'     => 'nullable|integer',
            'recipient_id'    => 'nullable|integer',
            'recipient_name'  => 'required|string|max:255',
            'recipient_phone' => 'required|string|max:50',
            'recipient_role'  => 'nullable|string|max:50',
            'category'        => 'nullable|string|max:50',
            'message'         => 'required|string',
            'status'          => 'nullable|string|max:50',
            'trigger_type'    => 'nullable|string|max:50',
        ]);

        $log = WhatsAppLog::create([
            'gym_id'          => $gymId,
            'template_id'     => $validated['template_id'] ?? null,
            'recipient_id'    => $validated['recipient_id'] ?? null,
            'recipient_name'  => $validated['recipient_name'],
            'recipient_phone' => $validated['recipient_phone'],
            'recipient_role'  => $validated['recipient_role'] ?? 'member',
            'category'        => $validated['category'] ?? 'custom',
            'message'         => $validated['message'],
            'status'          => $validated['status'] ?? 'sent',
            'channel'         => 'whatsapp_web',
            'trigger_type'    => $validated['trigger_type'] ?? 'manual',
            'sent_at'         => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp message logged successfully!',
            'data'    => $log,
        ], 201);
    }

    /**
     * 8. List WhatsApp logs with pagination & filters
     */
    public function indexLogs(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $category = $request->query('category');
        $role = $request->query('role');
        $search = $request->query('search');

        $query = WhatsAppLog::with('template:id,name')
            ->orderBy('id', 'desc');

        if ($gymId) {
            $hasGymLogs = (clone $query)->where('gym_id', $gymId)->exists();
            if ($hasGymLogs) {
                $query->where('gym_id', $gymId);
            }
        }

        if ($category && strtoupper($category) !== 'ALL') {
            $query->where('category', $category);
        }

        if ($role && strtoupper($role) !== 'ALL') {
            $query->where('recipient_role', $role);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('recipient_name', 'like', "%{$search}%")
                  ->orWhere('recipient_phone', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $logs = $query->limit(100)->get();

        return response()->json([
            'success' => true,
            'count'   => $logs->count(),
            'data'    => $logs,
        ]);
    }

    /**
     * 9. Overall Telemetry & Stats for Header Ribbon
     */
    public function stats(Request $request)
    {
        $gymId = $this->resolveGymId($request) ?: 1;
        $today = Carbon::today();

        $activeTemplatesCount = WhatsAppTemplate::where('gym_id', $gymId)
            ->where('is_active', true)
            ->count();

        $totalSentCount = WhatsAppLog::where('gym_id', $gymId)->count();
        $sentTodayCount = WhatsAppLog::where('gym_id', $gymId)
            ->whereDate('sent_at', $today->toDateString())
            ->count();

        // Count birthdays today
        $mBdays = MemberProfile::whereNotNull('dob')
            ->whereMonth('dob', (int) $today->format('m'))
            ->whereDay('dob', (int) $today->format('d'))
            ->count();

        $tBdays = TrainerProfile::whereNotNull('dob')
            ->whereMonth('dob', (int) $today->format('m'))
            ->whereDay('dob', (int) $today->format('d'))
            ->count();

        // Expiring in next 7 days
        $expiringCount = MemberProfile::where('status', 'Active')
            ->whereNotNull('expiry_date')
            ->whereBetween('expiry_date', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()])
            ->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'active_templates' => $activeTemplatesCount,
                'total_sent'       => $totalSentCount,
                'sent_today'       => $sentTodayCount,
                'birthdays_today'  => $mBdays + $tBdays,
                'expiring_soon'    => $expiringCount,
            ],
        ]);
    }
}
