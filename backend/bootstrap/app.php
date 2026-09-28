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
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'v1/*',
            'iclock/*',
            'setup-database',
            'health',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Gracefully handle missing tables/columns on production
        // (before migrations have been run) — return empty data instead of 500
        $exceptions->renderable(function (\Illuminate\Database\QueryException $e, $request) {
            $code = $e->getCode();
            // 42S02 = Base table or view not found
            // 42S22 = Column not found
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

                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => "Database table/column not yet migrated ({$table}). Please run: php artisan migrate",
                    '_migration_needed' => true,
                ], 200);
            }
        });
    })->create();
