<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role.superadmin' => \App\Http\Middleware\EnsureSuperadmin::class,
        ]);
        $middleware->api(prepend: [
            \App\Http\Middleware\RetryDatabaseConnection::class,
        ]);
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'v1/*',
            'iclock/*',
            'health',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Handle database connection failures (e.g. MySQL 2002 Operation not permitted / Connection refused)
        $exceptions->renderable(function (\Illuminate\Database\QueryException $e, $request) {
            $isConnectionError = false;
            $code = $e->getCode();
            $message = $e->getMessage();
            $prev = $e->getPrevious();

            if ($code == 2002 || ($prev instanceof \PDOException && ($prev->getCode() == 2002 || str_contains($prev->getMessage(), '2002')))) {
                $isConnectionError = true;
            } elseif (str_contains($message, '2002') || str_contains($message, 'Operation not permitted') || str_contains($message, 'Connection refused')) {
                $isConnectionError = true;
            }

            if ($isConnectionError) {
                \Illuminate\Support\Facades\Log::error("Database connection failure (2002): " . $message);

                if ($request->is('api/*', 'v1/*') || $request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Database connection temporarily unavailable due to server capacity limits. Please retry in a moment.',
                        'error_code' => 2002,
                    ], 503, [
                        'Retry-After' => '3',
                    ]);
                }
            }

            // Gracefully handle missing tables/columns on production
            // (before migrations have been run) — return empty data instead of 500
            if (in_array($code, ['42S02', '42S22']) && $request->is('api/*', 'v1/*')) {
                $table = '';
                if (preg_match("/Table '.*?\.(\w+)'/", $e->getMessage(), $m)) {
                    $table = $m[1];
                } elseif (preg_match("/Unknown column '(\w+)'/", $e->getMessage(), $m)) {
                    $table = $m[1];
                }

                \Illuminate\Support\Facades\Log::warning(
                    "Missing DB table/column caught gracefully: {$e->getMessage()}"
                );

                if (!$request->isMethod('safe') && !$request->isMethod('get')) {
                    return response()->json([
                        'success' => false,
                        'message' => "Database table/column not yet migrated ({$table}). Please run: php artisan migrate",
                        '_migration_needed' => true,
                    ], 500);
                }

                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => "Database table/column not yet migrated ({$table}). Please run: php artisan migrate",
                    '_migration_needed' => true,
                ], 200);
            }
        });

        // Also handle raw PDOException if thrown before query compilation
        $exceptions->renderable(function (\PDOException $e, $request) {
            $code = $e->getCode();
            $message = $e->getMessage();
            if ($code == 2002 || str_contains($message, '2002') || str_contains($message, 'Operation not permitted') || str_contains($message, 'Connection refused')) {
                \Illuminate\Support\Facades\Log::error("PDO connection failure (2002): " . $message);

                if ($request->is('api/*', 'v1/*') || $request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Database connection temporarily unavailable due to server capacity limits. Please retry in a moment.',
                        'error_code' => 2002,
                    ], 503, [
                        'Retry-After' => '3',
                    ]);
                }
            }
        });
    })->create();
