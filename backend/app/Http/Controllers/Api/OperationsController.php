<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Commission;
use App\Models\MembershipFreeze;
use App\Models\ConsentForm;
use App\Models\Payroll;
use App\Models\BiometricDevice;
use App\Models\BiometricLog;
use App\Models\EntryApproval;
use App\Models\PtPlan;
use App\Models\RecoveryPlan;
use App\Models\Invoice;
use App\Models\User;
use App\Models\MemberProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OperationsController extends Controller
{
    // ==========================================
    // 1. PRODUCTS & PRO SHOP INVENTORY
    // ==========================================
    public function getProducts(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Product::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $products = $query->get()->map(function ($p) {
            return [
                'id' => 'prod-' . $p->id,
                'numericId' => $p->id,
                'name' => $p->name,
                'category' => $p->category,
                'price' => (float)$p->price,
                'stock' => (int)$p->stock,
                'minStockAlert' => (int)$p->min_stock_alert,
                'status' => $p->stock <= 0 ? 'Out of Stock' : ($p->stock <= $p->min_stock_alert ? 'Low Stock' : 'In Stock'),
                'image' => $p->image,
            ];
        });

        return response()->json(['success' => true, 'data' => $products]);
    }

    public function storeProduct(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'minStockAlert' => 'nullable|integer|min:1',
            'image' => 'nullable|string',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $stock = (int)$request->stock;
        $minStock = (int)($request->minStockAlert ?? 5);
        $status = $stock <= 0 ? 'Out of Stock' : ($stock <= $minStock ? 'Low Stock' : 'In Stock');

        $product = Product::create([
            'gym_id' => $this->resolveGymId($request),
            'name' => $request->name,
            'category' => $request->category,
            'price' => (float)$request->price,
            'stock' => $stock,
            'min_stock_alert' => $minStock,
            'status' => $status,
            'image' => $request->image ?? 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product saved to inventory database',
            'data' => [
                'id' => 'prod-' . $product->id,
                'numericId' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'price' => (float)$product->price,
                'stock' => (int)$product->stock,
                'minStockAlert' => (int)$product->min_stock_alert,
                'status' => $product->status,
                'image' => $product->image,
            ]
        ], 201);
    }

    public function updateProduct(Request $request, $id)
    {
        $numericId = (int)str_replace('prod-', '', $id);
        $product = Product::findOrFail($numericId);

        $stock = $request->has('stock') ? (int)$request->stock : $product->stock;
        $minStock = $request->has('minStockAlert') ? (int)$request->minStockAlert : $product->min_stock_alert;
        $status = $stock <= 0 ? 'Out of Stock' : ($stock <= $minStock ? 'Low Stock' : 'In Stock');

        $product->update([
            'name' => $request->input('name', $product->name),
            'category' => $request->input('category', $product->category),
            'price' => $request->has('price') ? (float)$request->price : $product->price,
            'stock' => $stock,
            'min_stock_alert' => $minStock,
            'status' => $status,
            'image' => $request->input('image', $product->image),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product updated in database',
            'data' => [
                'id' => 'prod-' . $product->id,
                'numericId' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'price' => (float)$product->price,
                'stock' => (int)$product->stock,
                'minStockAlert' => (int)$product->min_stock_alert,
                'status' => $product->status,
                'image' => $product->image,
            ]
        ]);
    }

    public function deleteProduct($id)
    {
        $numericId = (int)str_replace('prod-', '', $id);
        Product::findOrFail($numericId)->delete();
        return response()->json(['success' => true, 'message' => 'Product deleted from database']);
    }

    public function sellProduct(Request $request)
    {
        $numericId = (int)str_replace('prod-', '', $request->productId);
        $product = Product::findOrFail($numericId);
        $qty = (int)($request->quantity ?? 1);

        if ($product->stock < $qty) {
            return response()->json(['success' => false, 'message' => 'Insufficient stock'], 400);
        }

        $newStock = $product->stock - $qty;
        $status = $newStock <= 0 ? 'Out of Stock' : ($newStock <= $product->min_stock_alert ? 'Low Stock' : 'In Stock');
        $product->update(['stock' => $newStock, 'status' => $status]);

        $totalAmount = (float)$product->price * $qty;
        $inv = Invoice::create([
            'gym_id' => $product->gym_id ?? $this->resolveGymId($request),
            'invoice_number' => 'INV-PROD-' . strtoupper(substr(uniqid(), -6)),
            'user_id' => 1,
            'amount' => $totalAmount,
            'issue_date' => now()->toDateString(),
            'due_date' => now()->toDateString(),
            'status' => 'Paid',
            'items' => [['description' => "{$product->name} (Qty: {$qty})", 'amount' => $totalAmount]],
        ]);

        return response()->json([
            'success' => true,
            'message' => "Sold {$qty}x {$product->name}!",
            'newStock' => $newStock,
            'invoice' => $inv,
        ]);
    }

    // ==========================================
    // 2. TRAINER COMMISSIONS
    // ==========================================
    public function getCommissions(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Commission::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $records = $query->orderBy('date', 'desc')->get()->map(function ($c) {
            $amt = (float)$c->amount;
            $rate = (float)$c->rate_percent;
            $packageAmt = $rate > 0 ? round($amt / ($rate / 100)) : $amt;
            return [
                'id' => 'com-' . $c->id,
                'numericId' => $c->id,
                'trainerId' => 'tr-' . $c->trainer_id,
                'trainerName' => $c->trainer_name,
                'memberName' => $c->member_name,
                'planName' => $c->plan_name,
                'sessionType' => $c->session_type,
                'serviceType' => $c->session_type ?? $c->plan_name,
                'ratePercent' => $rate,
                'commissionPct' => $rate,
                'amount' => $packageAmt,
                'packageAmount' => $packageAmt,
                'commissionEarned' => $amt,
                'date' => $c->date?->format('Y-m-d') ?? (string)$c->date,
                'status' => $c->status,
            ];
        });

        return response()->json(['success' => true, 'data' => $records]);
    }

    public function storeCommission(Request $request)
    {
        $trainerIdRaw = $request->trainerId ?? $request->trainer_id;
        $trainerId = $trainerIdRaw ? (int)str_replace(['trn-', 'tr-'], '', $trainerIdRaw) : null;
        $amount = (float)($request->amount ?? $request->packageAmount ?? 0);
        $ratePercent = (float)($request->ratePercent ?? $request->rate_percent ?? $request->commissionPct ?? 20);

        $c = Commission::create([
            'gym_id' => $this->resolveGymId($request),
            'trainer_id' => $trainerId,
            'trainer_name' => $request->trainerName ?? $request->trainer_name ?? 'Trainer',
            'member_name' => $request->memberName ?? $request->member_name ?? 'Member',
            'plan_name' => $request->planName ?? $request->plan_name ?? $request->serviceType ?? 'Personal Training (PT)',
            'session_type' => $request->sessionType ?? $request->session_type ?? $request->serviceType ?? 'Personal Training (PT)',
            'rate_percent' => $ratePercent,
            'amount' => $amount,
            'date' => $request->date ?? now()->toDateString(),
            'status' => $request->status ?? 'Pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Commission recorded in database',
            'data' => [
                'id' => 'com-' . $c->id,
                'numericId' => $c->id,
                'trainerId' => 'trn-' . $c->trainer_id,
                'trainerName' => $c->trainer_name,
                'memberName' => $c->member_name,
                'planName' => $c->plan_name,
                'sessionType' => $c->session_type,
                'ratePercent' => (float)$c->rate_percent,
                'amount' => (float)$c->amount,
                'date' => $c->date?->format('Y-m-d') ?? (string)$c->date,
                'status' => $c->status,
            ]
        ], 201);
    }

    public function updateCommissionStatus(Request $request, $id)
    {
        $numericId = (int)str_replace('com-', '', $id);
        $c = Commission::findOrFail($numericId);
        $c->update(['status' => $request->status ?? 'Paid']);
        return response()->json(['success' => true, 'message' => 'Commission updated in database']);
    }

    // ==========================================
    // 3. MEMBERSHIP FREEZES & EXTENSIONS
    // ==========================================
    public function getFreezes(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = MembershipFreeze::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $freezes = $query->orderBy('id', 'desc')->get()->map(function ($f) {
            return [
                'id' => 'frz-' . $f->id,
                'numericId' => $f->id,
                'memberId' => 'mem-' . $f->member_id,
                'memberName' => $f->member_name,
                'planName' => $f->plan_name,
                'freezeStartDate' => $f->freeze_start_date?->format('Y-m-d') ?? (string)$f->freeze_start_date,
                'freezeEndDate' => $f->freeze_end_date?->format('Y-m-d') ?? (string)$f->freeze_end_date,
                'daysFrozen' => (int)$f->days_frozen,
                'reason' => $f->reason,
                'status' => $f->status,
                'approvedBy' => $f->approved_by,
            ];
        });

        return response()->json(['success' => true, 'data' => $freezes]);
    }

    public function storeFreeze(Request $request)
    {
        $memberIdRaw = $request->memberId ?? $request->member_id;
        $memberId = $memberIdRaw ? (int)str_replace('mem-', '', $memberIdRaw) : null;
        $daysFrozen = (int)($request->daysFrozen ?? $request->days_frozen ?? 15);
        $freezeStartDate = $request->freezeStartDate ?? $request->freeze_start_date ?? now()->toDateString();
        $freezeEndDate = $request->freezeEndDate ?? $request->freeze_end_date ?? now()->addDays($daysFrozen)->toDateString();

        $freeze = MembershipFreeze::create([
            'gym_id' => $this->resolveGymId($request),
            'member_id' => $memberId,
            'member_name' => $request->memberName ?? $request->member_name ?? 'Member',
            'plan_name' => $request->planName ?? $request->plan_name ?? 'Membership Plan',
            'freeze_start_date' => $freezeStartDate,
            'freeze_end_date' => $freezeEndDate,
            'days_frozen' => $daysFrozen,
            'reason' => $request->reason ?? 'Temporary Leave',
            'status' => 'Active Freeze',
            'approved_by' => $request->approvedBy ?? 'Vikramaditya Singhania (Owner)',
        ]);

        // Update member expiry date
        if ($memberId) {
            $profile = MemberProfile::where('user_id', $memberId)->first();
            if ($profile && $profile->expiry_date) {
                $profile->expiry_date = \Carbon\Carbon::parse($profile->expiry_date)->addDays($daysFrozen)->toDateString();
                $profile->status = 'Frozen (Paused)';
                $profile->save();
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Freeze record saved in database',
            'data' => [
                'id' => 'frz-' . $freeze->id,
                'numericId' => $freeze->id,
                'memberId' => 'mem-' . $freeze->member_id,
                'memberName' => $freeze->member_name,
                'planName' => $freeze->plan_name,
                'freezeStartDate' => (string)$freeze->freeze_start_date,
                'freezeEndDate' => (string)$freeze->freeze_end_date,
                'daysFrozen' => (int)$freeze->days_frozen,
                'reason' => $freeze->reason,
                'status' => $freeze->status,
                'approvedBy' => $freeze->approved_by,
            ]
        ], 201);
    }

    public function unfreeze($id)
    {
        $numericId = (int)str_replace('frz-', '', $id);
        $freeze = MembershipFreeze::findOrFail($numericId);
        $freeze->update(['status' => 'Completed']);

        if ($freeze->member_id) {
            $profile = MemberProfile::where('user_id', $freeze->member_id)->first();
            if ($profile) {
                $profile->status = 'Active';
                $profile->save();
            }
        }

        return response()->json(['success' => true, 'message' => 'Membership un-frozen in database']);
    }

    // ==========================================
    // 4. DIGITAL CONSENT & WAIVERS
    // ==========================================
    public function getConsentForms(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = ConsentForm::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $forms = $query->get()->map(function ($cf) {
            return [
                'id' => 'cform-' . $cf->id,
                'numericId' => $cf->id,
                'memberId' => 'mem-' . $cf->member_id,
                'memberName' => $cf->member_name,
                'phone' => $cf->phone,
                'planName' => $cf->plan_name,
                'formType' => 'General Fitness & Liability Waiver',
                'emergencyContact' => $cf->emergency_contact,
                'emergencyPhone' => $cf->emergency_phone,
                'medicalConditions' => $cf->medical_conditions,
                'signedDate' => $cf->signed_date?->format('Y-m-d') ?? (string)$cf->signed_date,
                'status' => $cf->status,
            ];
        });

        return response()->json(['success' => true, 'data' => $forms]);
    }

    public function storeConsentForm(Request $request)
    {
        $memberIdRaw = $request->memberId ?? $request->member_id;
        $memberId = $memberIdRaw ? (int)str_replace('mem-', '', $memberIdRaw) : null;
        $status = $request->status ?? 'Pending';

        $cf = ConsentForm::create([
            'gym_id' => $this->resolveGymId($request),
            'member_id' => $memberId,
            'member_name' => $request->memberName ?? $request->member_name ?? 'Member',
            'phone' => $request->phone ?? '',
            'plan_name' => $request->planName ?? $request->plan_name ?? 'General Membership',
            'emergency_contact' => $request->emergencyContact ?? $request->emergency_contact ?? '',
            'emergency_phone' => $request->emergencyPhone ?? $request->emergency_phone ?? '',
            'medical_conditions' => $request->medicalNotes ?? $request->medical_conditions ?? $request->medicalConditions ?? 'None recorded',
            'status' => $status,
            'signed_date' => $status === 'Signed' ? now()->toDateString() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Consent form created in database',
            'data' => [
                'id' => 'cform-' . $cf->id,
                'numericId' => $cf->id,
                'memberId' => 'mem-' . $cf->member_id,
                'memberName' => $cf->member_name,
                'phone' => $cf->phone,
                'planName' => $cf->plan_name,
                'formType' => $request->formType ?? 'General Fitness & Liability Waiver',
                'emergencyContact' => $cf->emergency_contact,
                'medicalNotes' => $cf->medical_conditions,
                'signedDate' => $cf->signed_date?->format('Y-m-d') ?? (string)$cf->signed_date,
                'status' => $cf->status,
            ]
        ], 201);
    }

    public function updateConsentStatus(Request $request, $id)
    {
        $numericId = (int)str_replace('cform-', '', $id);
        $cf = ConsentForm::findOrFail($numericId);
        $status = $request->status ?? 'Signed';
        $cf->update([
            'status' => $status,
            'signed_date' => $status === 'Signed' ? now()->toDateString() : null,
        ]);

        return response()->json(['success' => true, 'message' => 'Consent status updated in database']);
    }

    // ==========================================
    // 5. EMPLOYEE PAYROLL
    // ==========================================
    public function getPayroll(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = Payroll::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $payrolls = $query->orderBy('id', 'desc')->get()->map(function ($p) {
            return [
                'id' => 'pay-' . $p->id,
                'numericId' => $p->id,
                'employeeId' => 'tr-' . $p->employee_id,
                'employeeName' => $p->employee_name,
                'trainerName' => $p->employee_name,
                'name' => $p->employee_name,
                'role' => $p->role,
                'month' => $p->month,
                'period' => $p->month ?? 'Current Cycle',
                'baseSalary' => (float)$p->base_salary,
                'bonus' => (float)$p->bonus,
                'commissions' => (float)($p->commission_earned ?? $p->commissions ?? 0),
                'deductions' => (float)$p->deductions,
                'netPay' => (float)$p->net_pay,
                'status' => $p->status,
                'payDate' => $p->pay_date?->format('Y-m-d') ?? (string)$p->pay_date,
                'notes' => $p->notes,
                'adjustedBy' => $p->adjusted_by,
            ];
        });

        return response()->json(['success' => true, 'data' => $payrolls]);
    }

    public function markPayrollPaid($id)
    {
        $numericId = (int)str_replace('pay-', '', $id);
        $p = Payroll::findOrFail($numericId);
        $p->update(['status' => 'Paid', 'pay_date' => now()->toDateString()]);
        return response()->json(['success' => true, 'message' => 'Payroll disbursed in database']);
    }

    public function adjustPayroll(Request $request, $id)
    {
        $numericId = (int)str_replace('pay-', '', $id);
        $p = Payroll::findOrFail($numericId);

        $baseSalary = $request->has('baseSalary') || $request->has('base_salary')
            ? (float)($request->baseSalary ?? $request->base_salary)
            : (float)$p->base_salary;

        $bonus = $request->has('bonus') || $request->has('incentives')
            ? (float)($request->bonus ?? $request->incentives)
            : (float)$p->bonus;

        $commission = $request->has('commissions') || $request->has('commission_earned')
            ? (float)($request->commissions ?? $request->commission_earned)
            : (float)($p->commission_earned ?? 0);

        $deductions = $request->has('deductions')
            ? (float)$request->deductions
            : (float)$p->deductions;

        $netPay = $request->has('netPay') || $request->has('net_pay')
            ? (float)($request->netPay ?? $request->net_pay)
            : ($baseSalary + $bonus + $commission - $deductions);

        $updates = [
            'base_salary' => $baseSalary,
            'bonus' => $bonus,
            'commission_earned' => $commission,
            'deductions' => $deductions,
            'net_pay' => max(0, $netPay),
        ];

        if ($request->has('notes')) {
            $updates['notes'] = $request->notes;
        }
        if ($request->has('adjustedBy') || $request->has('adjusted_by')) {
            $updates['adjusted_by'] = $request->adjustedBy ?? $request->adjusted_by;
        }
        if ($request->has('status')) {
            $updates['status'] = $request->status;
        }

        $p->update($updates);

        return response()->json([
            'success' => true,
            'message' => 'Payroll adjustments updated in database',
            'data' => [
                'id' => 'pay-' . $p->id,
                'numericId' => $p->id,
                'employeeId' => 'tr-' . $p->employee_id,
                'employeeName' => $p->employee_name,
                'role' => $p->role,
                'month' => $p->month,
                'baseSalary' => (float)$p->base_salary,
                'bonus' => (float)$p->bonus,
                'commissions' => (float)($p->commission_earned ?? 0),
                'deductions' => (float)$p->deductions,
                'netPay' => (float)$p->net_pay,
                'status' => $p->status,
                'payDate' => $p->pay_date?->format('Y-m-d') ?? (string)$p->pay_date,
                'notes' => $p->notes,
                'adjustedBy' => $p->adjusted_by,
            ]
        ]);
    }

    // ==========================================
    // 6. BIOMETRIC DEVICES & TURNSTILES
    // ==========================================
    public function getBiometricDevices(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = BiometricDevice::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $devices = $query->get()->map(function ($d) {
            return [
                'id' => 'bio-dev-' . $d->id,
                'numericId' => $d->id,
                'name' => $d->name,
                'ipAddress' => $d->ip_address,
                'serialNo' => $d->serial_no,
                'location' => $d->location,
                'status' => $d->status,
                'totalPunchesToday' => (int)$d->total_punches_today,
                'pulseDurationSec' => (int)$d->pulse_duration_sec,
                'lastSync' => $d->last_sync,
            ];
        });

        return response()->json(['success' => true, 'data' => $devices]);
    }

    public function storeBiometricDevice(Request $request)
    {
        $dev = BiometricDevice::create([
            'gym_id' => $this->resolveGymId($request),
            'name' => $request->name,
            'ip_address' => $request->ipAddress ?? '192.168.1.10' . rand(1, 9),
            'serial_no' => $request->serialNo ?? ('PF-TURN-' . rand(1000, 9999)),
            'location' => $request->location ?? 'Main Entrance Turnstile',
            'status' => 'Connected & Online',
            'total_punches_today' => 0,
            'pulse_duration_sec' => 5,
            'last_sync' => 'Just now',
        ]);

        return response()->json(['success' => true, 'data' => $dev], 201);
    }

    public function triggerTurnstilePulse(Request $request, $id)
    {
        $numericId = (int)str_replace('bio-dev-', '', $id);
        $dev = BiometricDevice::find($numericId) ?? BiometricDevice::first();

        $log = BiometricLog::create([
            'gym_id' => $dev?->gym_id ?? $this->resolveGymId($request),
            'device_id' => 'bio-dev-' . ($dev?->id ?? 1),
            'device_name' => $dev?->name ?? 'Main Entrance Turnstile #1',
            'person_name' => 'Owner Remote Command',
            'person_type' => 'Staff Office',
            'verification_mode' => 'Manual Relay Test',
            'result' => 'Relay Triggered',
            'gate_trigger' => "Relay Pulse ({$dev->pulse_duration_sec}s)",
            'event_time' => now()->format('h:i:s A'),
        ]);

        if ($dev) {
            $dev->update(['last_sync' => 'Just now (Pulse Verified)']);
        }

        return response()->json([
            'success' => true,
            'message' => "Remote relay pulse sent to {$dev->name}!",
            'log' => $log,
        ]);
    }

    public function getBiometricLogs(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = BiometricLog::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $logs = $query->orderBy('id', 'desc')->limit(30)->get()->map(function ($l) {
            return [
                'id' => 'blog-' . $l->id,
                'time' => $l->event_time,
                'deviceId' => $l->device_id,
                'deviceName' => $l->device_name,
                'personName' => $l->person_name,
                'personType' => $l->person_type,
                'verificationMode' => $l->verification_mode,
                'result' => $l->result,
                'gateTrigger' => $l->gate_trigger,
            ];
        });

        return response()->json(['success' => true, 'data' => $logs]);
    }

    public function getEntryApprovals(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = EntryApproval::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $approvals = $query->get()->map(function ($a) {
            return [
                'id' => 'apr-' . $a->id,
                'numericId' => $a->id,
                'memberId' => 'mem-' . $a->member_id,
                'memberName' => $a->member_name,
                'avatar' => $a->avatar,
                'issue' => $a->issue,
                'gate' => $a->gate,
                'reason' => $a->reason,
                'requestedTime' => $a->requested_time,
                'status' => $a->status,
            ];
        });

        return response()->json(['success' => true, 'data' => $approvals]);
    }

    public function approveGateEntry($id)
    {
        $numericId = (int)str_replace('apr-', '', $id);
        $approval = EntryApproval::findOrFail($numericId);
        $approval->update(['status' => 'Approved']);

        BiometricLog::create([
            'gym_id' => $approval->gym_id ?? $this->resolveGymId($request),
            'device_id' => 'bio-dev-1',
            'device_name' => $approval->gate ?? 'Main Entrance Turnstile',
            'person_name' => $approval->member_name,
            'person_type' => 'Member (Override)',
            'verification_mode' => 'Owner Remote Bypass',
            'result' => 'Access Granted (Approved)',
            'gate_trigger' => 'Gate Unlocked (5s)',
            'event_time' => now()->format('h:i:s A'),
        ]);

        return response()->json(['success' => true, 'message' => "Gate unlocked for {$approval->member_name}."]);
    }

    public function denyGateEntry($id)
    {
        $numericId = (int)str_replace('apr-', '', $id);
        $approval = EntryApproval::findOrFail($numericId);
        $approval->update(['status' => 'Denied']);
        return response()->json(['success' => true, 'message' => 'Gate access denied.']);
    }

    // ==========================================
    // 7. PT & RECOVERY PACKAGES
    // ==========================================
    public function getPtPlans(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = PtPlan::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $plans = $query->get()->map(function ($p) {
            return [
                'id' => 'pt-' . $p->id,
                'name' => $p->name,
                'price' => (float)$p->price,
                'sessions' => (int)$p->sessions,
                'durationWeeks' => (int)$p->duration_weeks,
                'popular' => (bool)$p->popular,
                'color' => $p->color,
                'features' => $p->features ?? [],
            ];
        });

        return response()->json(['success' => true, 'data' => $plans]);
    }

    public function storePtPlan(Request $request)
    {
        $plan = PtPlan::create([
            'gym_id' => $this->resolveGymId($request),
            'name' => $request->name,
            'price' => (float)$request->price,
            'sessions' => (int)$request->sessions,
            'duration_weeks' => (int)($request->durationWeeks ?? 4),
            'popular' => (bool)($request->popular ?? false),
            'color' => $request->color ?? 'from-purple-500/20 to-pink-500/20 border-purple-500/40',
            'features' => $request->features ?? [],
        ]);

        return response()->json(['success' => true, 'data' => $plan], 201);
    }

    public function deletePtPlan(Request $request, $id)
    {
        $cleanId = str_replace('pt-', '', $id);
        PtPlan::where('id', $cleanId)->delete();
        return response()->json(['success' => true, 'message' => 'PT plan deleted']);
    }

    public function getRecoveryPlans(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = RecoveryPlan::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
            });
        }
        $plans = $query->get()->map(function ($r) {
            $features = $r->features ?? [];
            return [
                'id' => 'rec-' . $r->id,
                'name' => $r->name,
                'price' => (float)$r->price,
                'duration' => $r->duration ?? '45 Mins',
                'sessions' => (int)($r->sessions ?? 1),
                'popular' => (bool)$r->popular,
                'color' => $r->color,
                'type' => 'Therapy',
                'description' => !empty($features) ? (is_array($features) ? implode('. ', $features) : $features) : 'Full recovery & wellness therapy session.',
                'features' => is_array($features) ? $features : [],
            ];
        });

        return response()->json(['success' => true, 'data' => $plans]);
    }

    public function storeRecoveryPlan(Request $request)
    {
        $features = $request->features;
        if (empty($features) && !empty($request->description)) {
            $features = array_values(array_filter(array_map('trim', explode('.', $request->description))));
            if (empty($features)) {
                $features = [$request->description];
            }
        }

        $plan = RecoveryPlan::create([
            'gym_id' => $this->resolveGymId($request),
            'name' => $request->name,
            'price' => (float)$request->price,
            'duration' => $request->duration ?? '45 Mins',
            'sessions' => (int)($request->sessions ?? 1),
            'popular' => (bool)($request->popular ?? false),
            'color' => $request->color ?? 'from-blue-500/20 to-teal-500/20 border-blue-500/40',
            'features' => $features ?? [],
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'rec-' . $plan->id,
                'name' => $plan->name,
                'price' => (float)$plan->price,
                'duration' => $plan->duration ?? '45 Mins',
                'sessions' => (int)($plan->sessions ?? 1),
                'popular' => (bool)$plan->popular,
                'color' => $plan->color,
                'type' => $request->type ?? 'Therapy',
                'description' => $request->description ?? (!empty($plan->features) ? implode('. ', $plan->features) : 'Recovery therapy session.'),
                'features' => $plan->features ?? [],
            ]
        ], 201);
    }

    public function deleteRecoveryPlan(Request $request, $id)
    {
        $cleanId = str_replace('rec-', '', $id);
        RecoveryPlan::where('id', $cleanId)->delete();
        return response()->json(['success' => true, 'message' => 'Recovery plan deleted']);
    }
}

