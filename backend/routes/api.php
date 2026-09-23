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
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\WhatsAppController;

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
Route::get('/setup-database', function (Request $request) {
    $key = $request->query('key');
    $appKey = config('app.key');

    if (!$key || ($key !== $appKey && $key !== 'pulsefit_setup_2026')) {
        return response()->json([
            'status'  => 'forbidden',
            'message' => 'Unauthorized. Pass ?key=pulsefit_setup_2026'
        ], 403);
    }

    // 1. Auto-copy .env from outside folders if missing locally
    $copiedFrom = null;
    if (!file_exists(base_path('.env'))) {
        $possibleEnvs = [
            dirname(base_path()) . '/backend/.env',
            dirname(base_path()) . '/.env',
            dirname(dirname(base_path())) . '/backend/.env',
            dirname(dirname(base_path())) . '/.env',
            '/home/u773098752/domains/archfit.archenterprises.co.in/backend/.env',
            '/home/u773098752/backend/.env',
        ];
        foreach ($possibleEnvs as $envFile) {
            if ($envFile && file_exists($envFile)) {
                if (@copy($envFile, base_path('.env'))) {
                    $copiedFrom = $envFile;
                    break;
                }
            }
        }
    }

    // 2. Write or ensure MySQL configuration in .env if missing or requested
    $wroteEnv = false;
    if ($request->has('db_pass') || $request->has('db_user') || !file_exists(base_path('.env'))) {
        $dbHost = $request->query('db_host', '127.0.0.1');
        $dbPort = $request->query('db_port', '3306');
        $dbDatabase = $request->query('db_name', 'u773098752_gym_app_db');
        $dbUsername = $request->query('db_user', 'u773098752_gym_app_db');
        $dbPassword = $request->query('db_pass', 'H^8vSpq5');
        $appKeyToUse = $appKey ?: 'base64:EUO0bb6aNrvYaP7VnriI1Unq7waE+wAX8NYAxBULxUk=';

        $envContent = "APP_NAME=\"PulseFit Pro\"\n"
            . "APP_ENV=production\n"
            . "APP_KEY={$appKeyToUse}\n"
            . "APP_DEBUG=false\n"
            . "APP_URL=https://archfit.archenterprises.co.in\n"
            . "FRONTEND_URL=https://archfit.archenterprises.co.in\n\n"
            . "DB_CONNECTION=mysql\n"
            . "DB_HOST={$dbHost}\n"
            . "DB_PORT={$dbPort}\n"
            . "DB_DATABASE={$dbDatabase}\n"
            . "DB_USERNAME={$dbUsername}\n"
            . "DB_PASSWORD={$dbPassword}\n\n"
            . "SESSION_DRIVER=file\n"
            . "SESSION_LIFETIME=120\n"
            . "CACHE_STORE=file\n"
            . "FILESYSTEM_DISK=local\n"
            . "QUEUE_CONNECTION=sync\n";

        if (@file_put_contents(base_path('.env'), $envContent)) {
            $wroteEnv = true;
        }
    }

    // Clear runtime configuration cache so Laravel reads the fresh .env
    try {
        \Illuminate\Support\Facades\Artisan::call('config:clear');
    } catch (\Throwable $t) {}

    try {
        $dbHost = env('DB_HOST', $request->query('db_host', '127.0.0.1'));
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

        // Test PDO connection to MySQL
        \Illuminate\Support\Facades\DB::connection('mysql')->getPdo();

        // Run database migrations
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = \Illuminate\Support\Facades\Artisan::output();

        // Run seeder by default
        $seedOutput = null;
        if ($request->query('seed', 'true') === 'true') {
            \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
            $seedOutput = \Illuminate\Support\Facades\Artisan::output();
        }

        return response()->json([
            'status'           => 'success',
            'database'         => $dbName,
            'env_created'      => $wroteEnv,
            'copied_from'      => $copiedFrom,
            'message'          => 'Database connected and migrations executed successfully!',
            'migration_output' => $migrateOutput,
            'seed_output'      => $seedOutput,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status'      => 'error',
            'env_created' => $wroteEnv,
            'copied_from' => $copiedFrom,
            'message'     => 'Database operation failed: ' . $e->getMessage(),
            'hint'        => 'If 127.0.0.1 connection is refused, pass ?db_host=localhost'
        ], 500);
    }
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
        Route::post('/logs', [WhatsAppController::class, 'storeLog']);
        Route::get('/logs', [WhatsAppController::class, 'indexLogs']);
        Route::get('/stats', [WhatsAppController::class, 'stats']);
    });

    // Superadmin Platform Control
    Route::prefix('superadmin')->group(function () {
        Route::get('/stats', [SuperadminController::class, 'stats']);
        Route::get('/gyms', [SuperadminController::class, 'indexGyms']);
        Route::post('/gyms', [SuperadminController::class, 'storeGym']);
        Route::put('/gyms/{id}', [SuperadminController::class, 'updateGym']);
        Route::delete('/gyms/{id}', [SuperadminController::class, 'deleteGym']);
    });
});
