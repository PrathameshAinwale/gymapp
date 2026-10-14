<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Global API Rate Limiter: 120 requests/min per user or IP
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip())->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many requests. Please slow down.',
                    'retry_after' => $headers['Retry-After'] ?? 60
                ], 429, $headers);
            });
        });

        // Sensitive Auth Limiter: 15 requests/min per IP
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(15)->by($request->ip())->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many login attempts. Please wait a minute and try again.',
                    'retry_after' => $headers['Retry-After'] ?? 60
                ], 429, $headers);
            });
        });

        // Local Environment Database Safety Guard:
        // Refuse to connect if local dev environment points to an external/hosted database
        if ($this->app->environment('local')) {
            $defaultConn = config('database.default');
            if (in_array($defaultConn, ['mysql', 'mariadb', 'pgsql'], true)) {
                $dbHost = config("database.connections.{$defaultConn}.host");
                $allowedLocalHosts = ['127.0.0.1', 'localhost', '::1'];
                if ($dbHost && !in_array(strtolower($dbHost), $allowedLocalHosts, true)) {
                    throw new \RuntimeException(
                        "SECURITY GUARD TRIGGERED: Local environment (APP_ENV=local) is configured with remote DB_HOST '{$dbHost}'. " .
                        "To protect live production data, local development is strictly restricted to localhost (127.0.0.1)."
                    );
                }
            }
        }
    }
}
