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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
            'gym_id' => $this->resolveGymId($request) ?? 1,
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
            'gym_id' => $product->gym_id ?? 1,
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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
        $c = Commission::create([
            'gym_id' => $this->resolveGymId($request) ?? 1,
            'trainer_id' => $request->trainerId ? (int)str_replace('tr-', '', $request->trainerId) : null,
            'trainer_name' => $request->trainerName,
            'member_name' => $request->memberName,
            'plan_name' => $request->planName,
            'session_type' => $request->sessionType ?? 'Personal Training (PT)',
            'rate_percent' => (float)($request->ratePercent ?? 20),
            'amount' => (float)$request->amount,
            'date' => $request->date ?? now()->toDateString(),
            'status' => 'Pending',
        ]);

        return response()->json(['success' => true, 'data' => $c], 201);
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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
        $memberId = $request->memberId ? (int)str_replace('mem-', '', $request->memberId) : null;
        $freeze = MembershipFreeze::create([
            'gym_id' => $this->resolveGymId($request) ?? 1,
            'member_id' => $memberId,
            'member_name' => $request->memberName,
            'plan_name' => $request->planName,
            'freeze_start_date' => $request->freezeStartDate,
            'freeze_end_date' => $request->freezeEndDate,
            'days_frozen' => (int)($request->daysFrozen ?? 15),
            'reason' => $request->reason,
            'status' => 'Active Freeze',
            'approved_by' => 'Vikramaditya Singhania (Owner)',
        ]);

        // Update member expiry date
        if ($memberId) {
            $profile = MemberProfile::where('user_id', $memberId)->first();
            if ($profile && $profile->expiry_date) {
                $profile->expiry_date = \Carbon\Carbon::parse($profile->expiry_date)->addDays((int)$request->daysFrozen)->toDateString();
                $profile->status = 'Frozen (Paused)';
                $profile->save();
            }
        }

        return response()->json(['success' => true, 'data' => $freeze], 201);
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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
        $memberId = $request->memberId ? (int)str_replace('mem-', '', $request->memberId) : null;
        $cf = ConsentForm::create([
            'gym_id' => $this->resolveGymId($request) ?? 1,
            'member_id' => $memberId,
            'member_name' => $request->memberName,
            'phone' => $request->phone ?? '',
            'plan_name' => $request->planName ?? 'General Membership',
            'emergency_contact' => $request->emergencyContact ?? '',
            'emergency_phone' => $request->emergencyPhone ?? '',
            'medical_conditions' => $request->medicalNotes ?? $request->medicalConditions ?? 'None recorded',
            'status' => $request->status ?? 'Pending',
            'signed_date' => $request->status === 'Signed' ? now()->toDateString() : null,
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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
                'commissions' => (float)($p->commissions ?? 0),
                'deductions' => (float)$p->deductions,
                'netPay' => (float)$p->net_pay,
                'status' => $p->status,
                'payDate' => $p->pay_date?->format('Y-m-d') ?? (string)$p->pay_date,
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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
            'gym_id' => $this->resolveGymId($request) ?? 1,
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
            'gym_id' => $dev?->gym_id ?? 1,
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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
            'gym_id' => $approval->gym_id ?? 1,
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
                if ($gymId == 1) $q->orWhereNull('gym_id');
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
            'gym_id' => $this->resolveGymId($request) ?? 1,
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

    public function getRecoveryPlans(Request $request)
    {
        $gymId = $this->resolveGymId($request);
        $query = RecoveryPlan::query();
        if ($gymId) {
            $query->where(function ($q) use ($gymId) {
                $q->where('gym_id', $gymId);
                if ($gymId == 1) $q->orWhereNull('gym_id');
            });
        }
        $plans = $query->get()->map(function ($r) {
            return [
                'id' => 'rec-' . $r->id,
                'name' => $r->name,
                'price' => (float)$r->price,
                'duration' => $r->duration,
                'sessions' => (int)$r->sessions,
                'popular' => (bool)$r->popular,
                'color' => $r->color,
                'features' => $r->features ?? [],
            ];
        });

        return response()->json(['success' => true, 'data' => $plans]);
    }

    public function storeRecoveryPlan(Request $request)
    {
        $plan = RecoveryPlan::create([
            'gym_id' => $this->resolveGymId($request) ?? 1,
            'name' => $request->name,
            'price' => (float)$request->price,
            'duration' => $request->duration ?? '45 Mins',
            'sessions' => (int)($request->sessions ?? 1),
            'popular' => (bool)($request->popular ?? false),
            'color' => $request->color ?? 'from-blue-500/20 to-teal-500/20 border-blue-500/40',
            'features' => $request->features ?? [],
        ]);

        return response()->json(['success' => true, 'data' => $plan], 201);
    }
}
