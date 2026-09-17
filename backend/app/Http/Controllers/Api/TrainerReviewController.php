<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainerReview;
use App\Models\TrainerProfile;
use Illuminate\Http\Request;

class TrainerReviewController extends Controller
{
    /**
     * List reviews — optionally filter by trainer_id
     */
    public function index(Request $request)
    {
        $gymId     = $this->resolveGymId($request);
        $trainerId = $request->query('trainer_id');

        $query = TrainerReview::query();
        if ($gymId) {
            $query->where('gym_id', $gymId);
        }
        $query->orderBy('created_at', 'desc');

        if ($trainerId) {
            $query->where('trainer_id', $trainerId);
        }

        $reviews = $query->get();

        return response()->json(['success' => true, 'data' => $reviews]);
    }

    /**
     * Member submits a review for a trainer
     */
    public function store(Request $request)
    {
        $input = $request->all();
        if (isset($input['trainer_id']) && is_string($input['trainer_id'])) {
            $input['trainer_id'] = (int)str_replace(['tr-', 'trn-', 'usr-trainer-'], '', $input['trainer_id']);
        }
        if (isset($input['member_id']) && is_string($input['member_id'])) {
            $input['member_id'] = (int)str_replace(['mem-', 'usr-member-'], '', $input['member_id']);
        }
        $request->merge($input);

        $validated = $request->validate([
            'gym_id'        => 'nullable|integer',
            'trainer_id'    => 'required|integer',
            'trainer_name'  => 'required|string|max:100',
            'member_id'     => 'nullable|integer',
            'member_name'   => 'required|string|max:100',
            'member_avatar' => 'nullable|string',
            'rating'        => 'required|integer|min:1|max:5',
            'comment'       => 'nullable|string|max:1000',
            'date'          => 'nullable|date',
        ]);

        $review = TrainerReview::create([
            ...$validated,
            'gym_id' => $validated['gym_id'] ?? $this->resolveGymId($request),
            'date'   => $validated['date'] ?? now()->toDateString(),
        ]);

        // Recalculate average rating for trainer profile
        $avgRating = TrainerReview::recalculateAverageForTrainer($validated['trainer_id']);

        // Try to update the trainer_profiles table if exists
        try {
            TrainerProfile::where('user_id', $validated['trainer_id'])
                ->update(['rating' => $avgRating]);
        } catch (\Throwable $e) {
            // Silently skip if trainer_profiles doesn't have rating column yet
        }

        return response()->json([
            'success'    => true,
            'message'    => "Review submitted for {$validated['trainer_name']}.",
            'data'       => $review,
            'avg_rating' => $avgRating,
        ], 201);
    }

    /**
     * Delete a review (superadmin or accounts only)
     */
    public function destroy(int $id)
    {
        $review = TrainerReview::findOrFail($id);
        $review->delete();

        return response()->json(['success' => true, 'message' => 'Review removed.']);
    }
}
