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
use App\Http\Controllers\Api\AdmsController;
// New Feature Controllers
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\OfferController;
use App\Http\Controllers\Api\PtSessionController;
use App\Http\Controllers\Api\TrainerReviewController;
use App\Http\Controllers\Api\AdvanceRequestController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RevenueBillingController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\WhatsAppController;
use App\Http\Controllers\Api\ShiftController;

// API Health Check with live DB connectivity check
Route::get('/health', function () {
    $envExists = file_exists(base_path('.env'));
    $dbDriver = config('database.default');
    $dbName = config('database.connections.' . $dbDriver . '.database');
    $dbStatus = 'disconnected';
    $dbError = null;

    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $dbStatus = 'connected (' . \Illuminate\Support\Facades\DB::connection()->getDatabaseName() . ')';
    } catch (\Throwable $e) {
        $dbStatus = 'connection_error';
        $dbError = $e->getMessage();
    }

    return response()->json([
        'status'         => 'online',
        'app'            => 'PulseFit Pro API',
        'env_exists'     => $envExists,
        'db_driver'      => $dbDriver,
        'db_target'      => $dbName,
        'database'       => $dbStatus,
        'database_error' => $dbError,
        'timestamp'      => now()->toIso8601String(),
    ]);
});

// Secure Web-based Migration & Database Setup Runner (for shared hosting without SSH)
Route::match(['get', 'post'], '/setup-database', function (Request $request) {
    $key = $request->query('key', $request->input('key'));
    $appKey = config('app.key');

    if (!$key || ($key !== $appKey && $key !== 'pulsefit_setup_2026')) {
        return response()->json([
            'status'  => 'forbidden',
            'message' => 'Unauthorized. Pass ?key=pulsefit_setup_2026'
        ], 403);
    }

    if ($request->has('get_log')) {
        $logPath = storage_path('logs/laravel.log');
        $content = file_exists($logPath) ? substr(file_get_contents($logPath), -15000) : 'No log found';
        return response($content, 200, ['Content-Type' => 'text/plain']);
    }

    // Auto-fix DB_HOST=127.0.0.1 to localhost in existing .env (Linux shared hosts block 127.0.0.1 TCP socket)
    if (file_exists(base_path('.env'))) {
        $env = @file_get_contents(base_path('.env'));
        if ($env && (str_contains($env, 'DB_HOST=127.0.0.1') || $request->has('fix_host'))) {
            $targetHost = $request->query('db_host', 'localhost');
            $env = preg_replace('/^DB_HOST=.*$/m', "DB_HOST={$targetHost}", $env);
            @file_put_contents(base_path('.env'), $env);
        }
    }

    try {
        \Illuminate\Support\Facades\Artisan::call('config:clear');
    } catch (\Throwable $t) {}

    try {
        $dbHost = env('DB_HOST', $request->query('db_host', 'localhost'));
        if ($dbHost === '127.0.0.1' && PHP_OS_FAMILY !== 'Windows') {
            $dbHost = 'localhost';
        }
        $dbName = env('DB_DATABASE', $request->query('db_name', 'u773098752_gym_app_db'));
        $dbUser = env('DB_USERNAME', $request->query('db_user', 'u773098752_gym_app_db'));
        $dbPass = env('DB_PASSWORD', $request->query('db_pass', 'H^8vSpq5'));

        config([
            'database.default' => 'mysql',
            'database.connections.mysql.host' => $dbHost,
            'database.connections.mysql.database' => $dbName,
            'database.connections.mysql.username' => $dbUser,
            'database.connections.mysql.password' => $dbPass,
        ]);
        \Illuminate\Support\Facades\DB::purge('mysql');
        \Illuminate\Support\Facades\DB::reconnect('mysql');

        // Run database migrations
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = \Illuminate\Support\Facades\Artisan::output();

        $seedOutput = null;
        if ($request->query('seed', 'false') === 'true') {
            \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
            $seedOutput = \Illuminate\Support\Facades\Artisan::output();
        }

        $gymsSummary = \App\Models\Gym::select('id', 'name', 'owner_id', 'package_tier')->get();

        return response()->json([
            'status'           => 'success',
            'host'             => $dbHost,
            'database'         => $dbName,
            'user'             => $dbUser,
            'message'          => 'Database connected and migrations executed successfully!',
            'migration_output' => $migrateOutput,
            'seed_output'      => $seedOutput,
            'gyms'             => $gymsSummary,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status'    => 'error',
            'exception' => get_class($e),
            'message'   => $e->getMessage(),
            'file'      => $e->getFile() . ':' . $e->getLine(),
        ], 500);
    }
});

Route::prefix('v1')->middleware(['throttle:api'])->group(function () {

    Route::get('/health', function () {
        return response()->json([
            'status'    => 'online',
            'version'   => 'v1',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // ── Public Auth ───────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    });

    // ── Public Branding & Platform Catalog ─────────
    Route::get('/gym-info', [GymSettingController::class, 'show']);

    Route::prefix('platform')->group(function () {
        Route::get('/pages', [SuperadminController::class, 'indexPages']);
        Route::get('/pages/{slug}', [SuperadminController::class, 'showPage']);
        Route::get('/plans', [SuperadminController::class, 'indexPlans']);
    });

    // ── Biometric ADMS Turnstile Hardware Push (Standalone) ──
    Route::any('/iclock/cdata', [AdmsController::class, 'cdata']);
    Route::any('/iclock/getrequest', [AdmsController::class, 'getrequest']);
    Route::any('/iclock/devicecmd', [AdmsController::class, 'devicecmd']);

    // ── Protected Operations (Sanctum Authenticated) ─────────
    Route::middleware('auth:sanctum')->group(function () {
        // Authenticated Auth Endpoints
        Route::prefix('auth')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
            Route::post('/first-login-change-password', [AuthController::class, 'firstLoginSetPassword']);
        });

        // Gym Business Information & Multi-branch
        Route::put('/gym-info', [GymSettingController::class, 'update']);
        Route::get('/owner/branches', [GymSettingController::class, 'getBranches']);
        Route::post('/owner/branches', [GymSettingController::class, 'createBranch']);
        Route::post('/owner/switch-branch', [GymSettingController::class, 'switchBranch']);

        // Dashboard & Analytics
        Route::get('/dashboard/owner-stats', [DashboardController::class, 'getOwnerStats']);

        // Plans & Offers
        Route::apiResource('plans', PlanController::class);
        Route::apiResource('offers', OfferController::class);
        Route::patch('/offers/{id}/toggle', [OfferController::class, 'toggle']);

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

        // Attendance & QR Scanner
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
        Route::put('/invoices/{id}', [InvoiceController::class, 'update']);
        Route::patch('/invoices/{id}', [InvoiceController::class, 'update']);

        // Operating Expenses & Cash Flow
        Route::apiResource('expenses', ExpenseController::class);
        Route::get('/financials/cashflow-summary', [ExpenseController::class, 'cashflowSummary']);

        // Dedicated Revenue & Billing (Inflows & Outflows)
        Route::get('/revenue-billing/inflow', [RevenueBillingController::class, 'inflowIndex']);
        Route::get('/revenue-billing/outflow', [RevenueBillingController::class, 'outflowIndex']);
        Route::get('/revenue-billing/summary', [RevenueBillingController::class, 'summary']);
        Route::post('/revenue-billing/inflow', [RevenueBillingController::class, 'storeInflow']);
        Route::post('/revenue-billing/outflow', [RevenueBillingController::class, 'storeOutflow']);
        Route::put('/revenue-billing/{id}', [RevenueBillingController::class, 'update']);
        Route::patch('/revenue-billing/{id}', [RevenueBillingController::class, 'update']);
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

        // Membership Freezes & Extensions & Transfers
        Route::get('/freezes', [OperationsController::class, 'getFreezes']);
        Route::post('/freezes', [OperationsController::class, 'storeFreeze']);
        Route::patch('/freezes/{id}/unfreeze', [OperationsController::class, 'unfreeze']);
        Route::get('/transfers', [OperationsController::class, 'getTransfers']);
        Route::post('/transfers', [OperationsController::class, 'storeTransfer']);

        // Consent & Medical Waivers
        Route::get('/consent-forms', [OperationsController::class, 'getConsentForms']);
        Route::post('/consent-forms', [OperationsController::class, 'storeConsentForm']);
        Route::patch('/consent-forms/{id}/status', [OperationsController::class, 'updateConsentStatus']);

        // Payroll & Salaries
        Route::get('/payroll', [OperationsController::class, 'getPayroll']);
        Route::patch('/payroll/{id}/pay', [OperationsController::class, 'markPayrollPaid']);
        Route::patch('/payroll/{id}/adjust', [OperationsController::class, 'adjustPayroll']);

        // Biometrics & Gate Overrides
        Route::get('/biometrics/devices', [OperationsController::class, 'getBiometricDevices']);
        Route::post('/biometrics/devices', [OperationsController::class, 'storeBiometricDevice']);
        Route::post('/biometrics/pulse/{id}', [OperationsController::class, 'triggerTurnstilePulse']);
        Route::get('/biometrics/logs', [OperationsController::class, 'getBiometricLogs']);
        Route::post('/attendance/biometric-punch', [AdmsController::class, 'manualPunch']);
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

        // Staff Account Provisioning
        Route::get('/staff', [StaffController::class, 'index']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::put('/staff/{id}', [StaffController::class, 'update']);
        Route::delete('/staff/{id}', [StaffController::class, 'destroy']);

        // Staff Shift Management & Multi-Slot Configurations
        Route::apiResource('shifts', ShiftController::class);

        // PT Sessions (active packages + OTP-verified session logging)
        Route::get('/pt-sessions', [PtSessionController::class, 'index']);
        Route::post('/pt-sessions', [PtSessionController::class, 'store']);
        Route::delete('/pt-sessions/{id}', [PtSessionController::class, 'destroy']);
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

        // Staff & Trainer Leave Management & Quotas
        Route::get('/leaves/requests', [LeaveController::class, 'indexRequests']);
        Route::post('/leaves/requests', [LeaveController::class, 'storeRequest']);
        Route::match(['patch', 'post', 'put'], '/leaves/requests/{id}/status', [LeaveController::class, 'updateRequestStatus']);
        Route::get('/leaves/balances', [LeaveController::class, 'indexBalances']);
        Route::get('/leaves/balances/{userId}', [LeaveController::class, 'getUserBalance']);
        Route::post('/leaves/balances/allocate', [LeaveController::class, 'allocateLeaves']);
        Route::get('/leaves/summary', [LeaveController::class, 'summary']);

        // Reports & Analytics
        Route::get('/reports/summary', [ReportController::class, 'summary']);

        // WhatsApp Message Templates & Automation Triggers
        Route::prefix('whatsapp')->group(function () {
            Route::get('/templates', [WhatsAppController::class, 'indexTemplates']);
            Route::post('/templates', [WhatsAppController::class, 'storeTemplate']);
            Route::put('/templates/{id}', [WhatsAppController::class, 'updateTemplate']);
            Route::delete('/templates/{id}', [WhatsAppController::class, 'destroyTemplate']);
            Route::patch('/templates/{id}/toggle', [WhatsAppController::class, 'toggleTemplate']);
            Route::get('/triggers', [WhatsAppController::class, 'scanTriggers']);
            Route::get('/triggers/scan', [WhatsAppController::class, 'scanTriggers']);
            Route::post('/templates/{id}/broadcast', [WhatsAppController::class, 'broadcastTemplate']);
            Route::post('/broadcast', [WhatsAppController::class, 'broadcastDirect']);
            Route::post('/triggers/process-auto-send', [WhatsAppController::class, 'processAutoTriggers']);
            Route::get('/recipients-preview', [WhatsAppController::class, 'recipientsPreview']);
            Route::post('/logs', [WhatsAppController::class, 'storeLog']);
            Route::get('/logs', [WhatsAppController::class, 'indexLogs']);
            Route::get('/stats', [WhatsAppController::class, 'stats']);
            Route::get('/settings', [WhatsAppController::class, 'getSettings']);
            Route::put('/settings', [WhatsAppController::class, 'updateSettings']);
            Route::post('/test-message', [WhatsAppController::class, 'testMessage']);
        });

        // Superadmin Platform Control (Guarded by auth:sanctum AND role.superadmin)
        Route::prefix('superadmin')->middleware(['role.superadmin'])->group(function () {
            Route::get('/stats', [SuperadminController::class, 'stats']);
            Route::get('/gyms', [SuperadminController::class, 'indexGyms']);
            Route::post('/gyms', [SuperadminController::class, 'storeGym']);
            Route::put('/gyms/{id}', [SuperadminController::class, 'updateGym']);
            Route::delete('/gyms/{id}', [SuperadminController::class, 'deleteGym']);
            Route::post('/gyms/{id}/impersonate', [SuperadminController::class, 'impersonateGym']);
            Route::post('/gyms/{id}/stop-access', [SuperadminController::class, 'stopAccess']);
            Route::post('/gyms/{id}/restore-access', [SuperadminController::class, 'restoreAccess']);

            // Superadmin Credentials & Security Profile
            Route::post('/profile/update-password', [SuperadminController::class, 'updatePassword']);
            Route::post('/profile/update-email', [SuperadminController::class, 'updateEmail']);

            // SaaS Plans Management
            Route::get('/plans', [SuperadminController::class, 'indexPlans']);
            Route::post('/plans', [SuperadminController::class, 'storePlan']);
            Route::put('/plans/{id}', [SuperadminController::class, 'updatePlan']);
            Route::delete('/plans/{id}', [SuperadminController::class, 'deletePlan']);

            // Platform About Pages (Privacy Policy, Terms, Help & Support)
            Route::get('/pages', [SuperadminController::class, 'indexPages']);
            Route::put('/pages/{slug}', [SuperadminController::class, 'updatePage']);

            // Platform-wide WhatsApp Automation & Gateway Control
            Route::get('/whatsapp-settings', [SuperadminController::class, 'getWhatsAppSettings']);
            Route::put('/whatsapp-settings', [SuperadminController::class, 'updateWhatsAppSettings']);
            Route::post('/whatsapp-test', [SuperadminController::class, 'testWhatsAppMessage']);
        });
    });
});
