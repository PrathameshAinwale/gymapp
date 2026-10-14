<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get notification summary and grouped items for top navbar bell.
     */
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        if (!$gymId) {
            return response()->json([
                'success' => true,
                'unread_count' => 0,
                'payment_due' => ['total' => 0, 'unread' => 0, 'items' => []],
                'plan_expiring' => ['total' => 0, 'unread' => 0, 'items' => []],
            ]);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        // Restrict to staff/owner roles
        if ($user->role === 'member') {
            return response()->json([
                'success' => true,
                'unread_count' => 0,
                'payment_due' => ['total' => 0, 'unread' => 0, 'items' => []],
                'plan_expiring' => ['total' => 0, 'unread' => 0, 'items' => []],
            ]);
        }

        $data = $this->notificationService->getNotificationsForUser($gymId, $user->id);

        return response()->json($data);
    }

    /**
     * Mark a single notification item as read.
     */
    public function markRead(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $user = $request->user();
        if (!$gymId || !$user) {
            return response()->json(['error' => 'Unauthenticated or invalid gym.'], 401);
        }

        $request->validate([
            'type' => 'required|string',
            'reference_id' => 'required|string',
        ]);

        $this->notificationService->markAsRead(
            $gymId,
            $user->id,
            $request->input('type'),
            $request->input('reference_id')
        );

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
        ]);
    }

    /**
     * Mark all active notifications as read today for this user.
     */
    public function markAllRead(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $user = $request->user();
        if (!$gymId || !$user) {
            return response()->json(['error' => 'Unauthenticated or invalid gym.'], 401);
        }

        $count = $this->notificationService->markAllAsRead($gymId, $user->id);

        return response()->json([
            'success' => true,
            'marked_count' => $count,
            'message' => "All {$count} notifications marked as read.",
        ]);
    }

    /**
     * Return matching member IDs for directory filtering.
     */
    public function memberIds(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        if (!$gymId) {
            return response()->json(['success' => true, 'member_ids' => []]);
        }

        $type = $request->query('type', 'payment_due');
        $memberIds = $this->notificationService->getMemberIdsForFilter($gymId, $type);

        return response()->json([
            'success' => true,
            'type' => $type,
            'member_ids' => $memberIds,
            'count' => count($memberIds),
        ]);
    }
}
