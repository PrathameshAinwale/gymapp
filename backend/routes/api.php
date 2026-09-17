<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\TrainerController;
use App\Http\Controllers\Api\PlanController;
use App\Http\Controllers\Api\GymClassController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\WorkoutController;
use App\Http\Controllers\Api\DietController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\GymSettingController;
use App\Http\Controllers\Api\SuperadminController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\EnquiryController;
use App\Http\Controllers\Api\OperationsController;
// New Feature Controllers
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\PtSessionController;
use App\Http\Controllers\Api\TrainerReviewController;
use App\Http\Controllers\Api\AdvanceRequestController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RevenueBillingController;

// API Health Check
Route::get('/health', function () {
    return response()->json([
        'status'    => 'online',
        'app'       => 'PulseFit Pro API',
        'timestamp' => now()->toIso8601String(),
        'database'  => config('database.default') . ' connected (' . config('database.connections.' . config('database.default') . '.database') . ')',
    ]);
});

Route::prefix('v1')->group(function () {

    Route::get('/health', function () {
        return response()->json([
            'status'    => 'online',
            'version'   => 'v1',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // ── Auth ──────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/register', [AuthController::class, 'register']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
            Route::post('/first-login-change-password', [AuthController::class, 'firstLoginSetPassword']);
        });
    });

    // Gym Business Information
    Route::get('/gym-info', [GymSettingController::class, 'show']);
    Route::put('/gym-info', [GymSettingController::class, 'update']);

    // Dashboard & Analytics
    Route::get('/dashboard/owner-stats', [DashboardController::class, 'getOwnerStats']);

    // Plans
    Route::apiResource('plans', PlanController::class);

    // Members CRM & Profiles
    Route::apiResource('members', MemberController::class);

    // Trainers
    Route::apiResource('trainers', TrainerController::class);

    // Classes & Scheduling
    Route::get('/classes', [GymClassController::class, 'index']);
    Route::post('/classes', [GymClassController::class, 'store']);
    Route::put('/classes/{id}', [GymClassController::class, 'update']);
    Route::delete('/classes/{id}', [GymClassController::class, 'destroy']);
    Route::post('/classes/{id}/book', [GymClassController::class, 'book']);
    Route::post('/classes/{id}/cancel', [GymClassController::class, 'cancel']);

    // Attendance & QR Scanner (with punch-out + duration)
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut']);
    Route::post('/attendance/{id}/check-out', [AttendanceController::class, 'checkOut']);

    // Workout Routines
    Route::get('/workouts/member/{memberId}', [WorkoutController::class, 'getMemberRoutine']);
    Route::post('/workouts/member/{memberId}', [WorkoutController::class, 'updateMemberRoutine']);

    // Diet & Nutrition Charts
    Route::get('/diets/member/{memberId}', [DietController::class, 'getMemberDiet']);
    Route::post('/diets/member/{memberId}', [DietController::class, 'updateMemberDiet']);

    // Invoices & Billing
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);

    // Operating Expenses & Cash Flow
    Route::apiResource('expenses', ExpenseController::class);
    Route::get('/financials/cashflow-summary', [ExpenseController::class, 'cashflowSummary']);

    // Dedicated Revenue & Billing (Inflows & Outflows)
    Route::get('/revenue-billing/inflow', [RevenueBillingController::class, 'inflowIndex']);
    Route::get('/revenue-billing/outflow', [RevenueBillingController::class, 'outflowIndex']);
    Route::get('/revenue-billing/summary', [RevenueBillingController::class, 'summary']);
    Route::post('/revenue-billing/inflow', [RevenueBillingController::class, 'storeInflow']);
    Route::post('/revenue-billing/outflow', [RevenueBillingController::class, 'storeOutflow']);
    Route::delete('/revenue-billing/{id}', [RevenueBillingController::class, 'destroy']);

    // Enquiries & Leads CRM
    Route::apiResource('enquiries', EnquiryController::class);
    Route::patch('/enquiries/{id}/priority', [EnquiryController::class, 'updatePriority']);
    Route::patch('/enquiries/{id}/follow-up', [EnquiryController::class, 'updateFollowUp']);
    Route::post('/enquiries/{id}/comments', [EnquiryController::class, 'addComment']);
    Route::post('/enquiries/{id}/convert', [EnquiryController::class, 'convertToMember']);
    Route::get('/enquiries-stats', [EnquiryController::class, 'pipelineStats']);

    // Equipment & Maintenance
    Route::apiResource('equipment', EquipmentController::class);

    // Pro Shop Products
    Route::get('/products', [OperationsController::class, 'getProducts']);
    Route::post('/products', [OperationsController::class, 'storeProduct']);
    Route::put('/products/{id}', [OperationsController::class, 'updateProduct']);
    Route::delete('/products/{id}', [OperationsController::class, 'deleteProduct']);
    Route::post('/products/sell', [OperationsController::class, 'sellProduct']);

    // Trainer Commissions
    Route::get('/commissions', [OperationsController::class, 'getCommissions']);
    Route::post('/commissions', [OperationsController::class, 'storeCommission']);
    Route::patch('/commissions/{id}/status', [OperationsController::class, 'updateCommissionStatus']);

    // Membership Freezes & Extensions
    Route::get('/freezes', [OperationsController::class, 'getFreezes']);
    Route::post('/freezes', [OperationsController::class, 'storeFreeze']);
    Route::patch('/freezes/{id}/unfreeze', [OperationsController::class, 'unfreeze']);

    // Consent & Medical Waivers
    Route::get('/consent-forms', [OperationsController::class, 'getConsentForms']);
    Route::post('/consent-forms', [OperationsController::class, 'storeConsentForm']);
    Route::patch('/consent-forms/{id}/status', [OperationsController::class, 'updateConsentStatus']);

    // Payroll & Salaries (with manual adjustment endpoint)
    Route::get('/payroll', [OperationsController::class, 'getPayroll']);
    Route::patch('/payroll/{id}/pay', [OperationsController::class, 'markPayrollPaid']);
    Route::patch('/payroll/{id}/adjust', [OperationsController::class, 'adjustPayroll']);

    // Biometrics & Gate Overrides
    Route::get('/biometrics/devices', [OperationsController::class, 'getBiometricDevices']);
    Route::post('/biometrics/devices', [OperationsController::class, 'storeBiometricDevice']);
    Route::post('/biometrics/pulse/{id}', [OperationsController::class, 'triggerTurnstilePulse']);
    Route::get('/biometrics/logs', [OperationsController::class, 'getBiometricLogs']);
    Route::get('/gate-overrides', [OperationsController::class, 'getEntryApprovals']);
    Route::post('/gate-overrides/{id}/approve', [OperationsController::class, 'approveGateEntry']);
    Route::post('/gate-overrides/{id}/deny', [OperationsController::class, 'denyGateEntry']);

    // PT & Recovery Packages (catalog)
    Route::get('/pt-plans', [OperationsController::class, 'getPtPlans']);
    Route::post('/pt-plans', [OperationsController::class, 'storePtPlan']);
    Route::delete('/pt-plans/{id}', [OperationsController::class, 'deletePtPlan']);
    Route::get('/recovery-plans', [OperationsController::class, 'getRecoveryPlans']);
    Route::post('/recovery-plans', [OperationsController::class, 'storeRecoveryPlan']);
    Route::delete('/recovery-plans/{id}', [OperationsController::class, 'deleteRecoveryPlan']);

    // ─────────────────────────────────────────────────────────────
    // NEW FEATURE ROUTES
    // ─────────────────────────────────────────────────────────────

    // Staff Account Provisioning
    Route::get('/staff', [StaffController::class, 'index']);
    Route::post('/staff', [StaffController::class, 'store']);
    Route::put('/staff/{id}', [StaffController::class, 'update']);
    Route::delete('/staff/{id}', [StaffController::class, 'destroy']);

    // PT Sessions (active packages + OTP-verified session logging)
    Route::get('/pt-sessions', [PtSessionController::class, 'index']);
    Route::post('/pt-sessions', [PtSessionController::class, 'store']);
    Route::post('/pt-sessions/{id}/log-session', [PtSessionController::class, 'logSession']);
    Route::post('/pt-sessions/{id}/regenerate-otp', [PtSessionController::class, 'regenerateOtp']);
    Route::get('/pt-sessions/{id}/logs', [PtSessionController::class, 'getLogs']);

    // Trainer Reviews & Star Ratings
    Route::get('/trainer-reviews', [TrainerReviewController::class, 'index']);
    Route::post('/trainer-reviews', [TrainerReviewController::class, 'store']);
    Route::delete('/trainer-reviews/{id}', [TrainerReviewController::class, 'destroy']);

    // Advance Pay Requests
    Route::get('/advance-requests', [AdvanceRequestController::class, 'index']);
    Route::post('/advance-requests', [AdvanceRequestController::class, 'store']);
    Route::match(['patch', 'post', 'put'], '/advance-requests/{id}/status', [AdvanceRequestController::class, 'updateStatus']);

    // Reports & Analytics
    Route::get('/reports/summary', [ReportController::class, 'summary']);

    // Superadmin Platform Control
    Route::prefix('superadmin')->group(function () {
        Route::get('/stats', [SuperadminController::class, 'stats']);
        Route::get('/gyms', [SuperadminController::class, 'indexGyms']);
        Route::post('/gyms', [SuperadminController::class, 'storeGym']);
        Route::put('/gyms/{id}', [SuperadminController::class, 'updateGym']);
        Route::delete('/gyms/{id}', [SuperadminController::class, 'deleteGym']);
    });
});
