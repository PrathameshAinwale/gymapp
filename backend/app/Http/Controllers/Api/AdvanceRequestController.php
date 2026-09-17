<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdvanceRequest;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdvanceRequestController extends Controller
{
    /**
     * List all advance pay requests
     */
    public function index(Request $request)
    {
        $status    = $request->query('status');
        $trainerId = $request->query('trainer_id');

        $query = AdvanceRequest::orderBy('created_at', 'desc');

        $gymId = $request->query('gym_id') ?: $this->resolveGymId($request);
        if ($gymId) {
            $query->where('gym_id', $gymId);
        }

        if ($status && $status !== 'ALL')    $query->where('status', $status);
        if ($trainerId) $query->where('trainer_id', $trainerId);

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    /**
     * Trainer submits a salary advance request
     */
    public function store(Request $request)
    {
        $input = $request->json()->all() ?: $request->all();
        if (empty($input)) {
            $raw = $request->getContent();
            if (!empty($raw)) {
                $input = json_decode($raw, true) ?: [];
            }
        }

        $trainerName = !empty($input['trainer_name']) ? (string)$input['trainer_name'] : (!empty($input['trainerName']) ? (string)$input['trainerName'] : (!empty($input['staffName']) ? (string)$input['staffName'] : 'Coach Alex Rivers'));
        $amount = isset($input['amount']) && is_numeric($input['amount']) ? (float)$input['amount'] : 15000;
        $reason = !empty($input['reason']) ? (string)$input['reason'] : 'Advance Salary Request';
        $repaymentMonth = !empty($input['repayment_month']) ? (string)$input['repayment_month'] : (!empty($input['repaymentMonth']) ? (string)$input['repaymentMonth'] : 'Next Cycle');

        $rawTrainerId = $input['trainer_id'] ?? $input['trainerId'] ?? $input['staffId'] ?? null;
        $trainerId = 2;
        if ($rawTrainerId !== null) {
            $digits = preg_replace('/[^0-9]/', '', (string)$rawTrainerId);
            if (!empty($digits)) {
                $trainerId = (int)$digits;
            }
        }

        $advance = AdvanceRequest::create([
            'gym_id'          => $input['gym_id'] ?? $this->resolveGymId($request),
            'trainer_id'      => $trainerId,
            'trainer_name'    => $trainerName,
            'trainer_avatar'  => $input['trainer_avatar'] ?? $input['trainerAvatar'] ?? $input['avatar'] ?? null,
            'amount'          => $amount,
            'reason'          => $reason,
            'status'          => 'Pending',
            'request_date'    => now()->toDateString(),
            'repayment_month' => $repaymentMonth,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Advance pay request of ₹{$amount} submitted by {$trainerName}.",
            'data'    => $advance,
        ], 201);
    }

    /**
     * Superadmin/Accounts updates advance request status (Approved, Disbursed, Rejected)
     * When Disbursed: auto-creates Expense outflow entry
     */
    public function updateStatus(Request $request, $id)
    {
        $cleanId = (int) preg_replace('/[^0-9]/', '', (string) $id);
        $advance = AdvanceRequest::findOrFail($cleanId);

        $input = $request->json()->all() ?: $request->all();
        if (empty($input)) {
            $raw = $request->getContent();
            if (!empty($raw)) {
                $input = json_decode($raw, true) ?: [];
            }
        }

        $status = $input['status'] ?? $request->input('status');
        $notes = $input['notes'] ?? $request->input('notes');

        if (!in_array($status, ['Approved', 'Disbursed', 'Rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Status must be one of: Approved, Disbursed, Rejected',
            ], 422);
        }

        $advance->status = $status;
        if ($notes) {
            $advance->notes = $notes;
        }

        if ($status === 'Disbursed') {
            $advance->disbursed_at = now();

            // Automatically log the outflow in the expenses table
            try {
                Expense::create([
                    'gym_id'       => $advance->gym_id ?? $this->resolveGymId($request),
                    'title'        => "Salary Advance – {$advance->trainer_name}",
                    'category'     => 'Salaries',
                    'vendor'       => $advance->trainer_name,
                    'amount'       => $advance->amount,
                    'date'         => now()->toDateString(),
                    'payment_mode' => 'Bank Transfer',
                    'ref_no'       => "ADV-{$advance->id}",
                    'notes'        => $advance->reason,
                    'created_by'   => $request->user()?->id,
                ]);
            } catch (\Throwable $e) {
                // Log but don't fail if expense logging fails
                \Log::warning("Failed to create expense outflow for advance #{$advance->id}: " . $e->getMessage());
            }

            // Also log as financial outflow transaction
            try {
                \App\Models\FinancialTransaction::create([
                    'gym_id'         => $advance->gym_id ?? $this->resolveGymId($request),
                    'type'           => 'Outflow',
                    'category'       => 'Salary Advance',
                    'description'    => "Advance Pay Disbursed – {$advance->trainer_name}",
                    'amount'         => $advance->amount,
                    'date'           => now()->toDateString(),
                    'reference_id'   => (string) $advance->id,
                    'reference_type' => 'advance_request',
                    'created_by'     => $request->user()?->id,
                ]);
            } catch (\Throwable $e) {}
        }

        $advance->save();

        return response()->json([
            'success' => true,
            'message' => "Advance request #{$advance->id} marked as {$advance->status}.",
            'data'    => $advance,
        ]);
    }
}
