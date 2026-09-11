<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ExpenseController extends Controller
{
    /**
     * Display a listing of expenses.
     */
    public function index(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Expense::query();

        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) {
                    $q->orWhereNull('gym_id');
                }
            });
        }

        // Category filter
        if ($request->filled('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        // Search filter (title, vendor, ref_no)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('vendor', 'like', "%{$search}%")
                  ->orWhere('ref_no', 'like', "%{$search}%");
            });
        }

        // Date range
        if ($request->filled('start_date')) {
            $query->whereDate('date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('date', '<=', $request->end_date);
        }

        $expenses = $query->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($exp) {
                return $this->formatExpense($exp);
            });

        $totalAmount = $expenses->sum('amount');

        return response()->json([
            'success' => true,
            'data' => $expenses,
            'totalAmount' => $totalAmount,
            'count' => $expenses->count(),
        ]);
    }

    /**
     * Store a newly created expense.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'vendor' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'date' => 'required|date',
            'paymentMode' => 'nullable|string',
            'payment_mode' => 'nullable|string',
            'refNo' => 'nullable|string|max:100',
            'ref_no' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $gymId = $this->resolveGymId($request) ?? 1;
        $userId = auth('sanctum')->id();

        $expense = Expense::create([
            'gym_id' => $gymId,
            'title' => $request->title,
            'category' => $request->category,
            'vendor' => $request->vendor,
            'amount' => (float)$request->amount,
            'date' => $request->date,
            'payment_mode' => $request->paymentMode ?? $request->payment_mode ?? 'UPI',
            'ref_no' => $request->refNo ?? $request->ref_no ?? ('EXP-' . strtoupper(substr(uniqid(), -6))),
            'notes' => $request->notes,
            'created_by' => $userId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Operating expense recorded successfully in database.',
            'data' => $this->formatExpense($expense),
        ], 201);
    }

    /**
     * Display the specified expense.
     */
    public function show($id)
    {
        $numericId = (int)str_replace('exp-', '', $id);
        $expense = Expense::findOrFail($numericId);

        return response()->json([
            'success' => true,
            'data' => $this->formatExpense($expense),
        ]);
    }

    /**
     * Update the specified expense.
     */
    public function update(Request $request, $id)
    {
        $numericId = (int)str_replace('exp-', '', $id);
        $expense = Expense::findOrFail($numericId);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:100',
            'vendor' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:1',
            'date' => 'sometimes|required|date',
            'paymentMode' => 'nullable|string',
            'payment_mode' => 'nullable|string',
            'refNo' => 'nullable|string|max:100',
            'ref_no' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $expense->update([
            'title' => $request->input('title', $expense->title),
            'category' => $request->input('category', $expense->category),
            'vendor' => $request->input('vendor', $expense->vendor),
            'amount' => $request->has('amount') ? (float)$request->amount : $expense->amount,
            'date' => $request->input('date', $expense->date),
            'payment_mode' => $request->input('paymentMode', $request->input('payment_mode', $expense->payment_mode)),
            'ref_no' => $request->input('refNo', $request->input('ref_no', $expense->ref_no)),
            'notes' => $request->input('notes', $expense->notes),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Expense updated successfully.',
            'data' => $this->formatExpense($expense),
        ]);
    }

    /**
     * Remove the specified expense from storage.
     */
    public function destroy($id)
    {
        $numericId = (int)str_replace('exp-', '', $id);
        $expense = Expense::findOrFail($numericId);
        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'Expense entry deleted successfully from database.',
        ]);
    }

    /**
     * Compute comprehensive Cash Inflow vs Cash Outflow analysis.
     */
    public function cashflowSummary(Request $request)
    {
        $gymId = $this->resolveGymId($request);

        // 1. Cash Inflow (Paid fee invoices)
        $invoicesQuery = Invoice::where('status', 'Paid');
        if ($gymId) {
            $invoicesQuery->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) $q->orWhereNull('gym_id');
            });
        }
        $dbInflow = (float)$invoicesQuery->sum('amount');
        $totalInflow = $dbInflow;

        // 2. Cash Outflow (Operating expenses)
        $expensesQuery = Expense::query();
        if ($gymId) {
            $expensesQuery->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) $q->orWhereNull('gym_id');
            });
        }
        $totalOutflow = (float)$expensesQuery->sum('amount');

        // 3. Net Cash Flow & Metrics
        $netCashFlow = max(0, $totalInflow - $totalOutflow);
        $marginPercent = $totalInflow > 0 ? round(($netCashFlow / $totalInflow) * 100) : 0;
        $inflowRatio = ($totalInflow + $totalOutflow) > 0 ? round(($totalInflow / ($totalInflow + $totalOutflow)) * 100, 1) : 100;
        $outflowRatio = round(100 - $inflowRatio, 1);

        // 4. Category breakdown
        $categories = $expensesQuery->selectRaw('category, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('category')
            ->orderByDesc('total')
            ->get()
            ->map(function ($cat) use ($totalOutflow) {
                $pct = $totalOutflow > 0 ? round(($cat->total / $totalOutflow) * 100, 1) : 0;
                return [
                    'category' => $cat->category,
                    'total' => (float)$cat->total,
                    'count' => (int)$cat->count,
                    'percentage' => $pct,
                ];
            });

        return response()->json([
            'success' => true,
            'summary' => [
                'totalInflow' => $totalInflow,
                'totalOutflow' => $totalOutflow,
                'netCashFlow' => $netCashFlow,
                'marginPercent' => $marginPercent,
                'inflowRatio' => $inflowRatio,
                'outflowRatio' => $outflowRatio,
                'categories' => $categories,
            ]
        ]);
    }

    /**
     * Helper to format expense object for frontend.
     */
    protected function formatExpense(Expense $exp): array
    {
        return [
            'id' => 'exp-' . $exp->id,
            'numericId' => $exp->id,
            'gymId' => $exp->gym_id,
            'title' => $exp->title,
            'category' => $exp->category,
            'vendor' => $exp->vendor,
            'amount' => (float)$exp->amount,
            'date' => $exp->date instanceof \DateTimeInterface ? $exp->date->format('Y-m-d') : (string)$exp->date,
            'paymentMode' => $exp->payment_mode,
            'refNo' => $exp->ref_no,
            'notes' => $exp->notes,
            'createdAt' => $exp->created_at?->toIso8601String(),
        ];
    }
}
