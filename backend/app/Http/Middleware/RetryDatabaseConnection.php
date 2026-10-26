<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RetryDatabaseConnection
{
    /**
     * Handle an incoming request.
     * Retries once on transient database connection errors (e.g. 2002) for safe HTTP methods.
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } catch (\Throwable $e) {
            $prev = $e->getPrevious();
            $isInitialConnectFailure = ($prev instanceof \PDOException && ($prev->getCode() == 2002 || str_contains($prev->getMessage(), '2002')));

            if ($this->isConnectionError($e) && ($request->isMethodSafe() || $isInitialConnectFailure)) {
                Log::warning('Transient DB connection error (2002) detected. Attempting host fallback/purge and retrying once...');
                try {
                    $currentHost = (string) config('database.connections.mysql.host');
                    if ($currentHost === 'localhost') {
                        config(['database.connections.mysql.host' => '127.0.0.1']);
                    } elseif ($currentHost === '127.0.0.1') {
                        config(['database.connections.mysql.host' => 'localhost']);
                    }

                    DB::purge('mysql');
                    usleep(250000); // 250ms backoff before retry
                    return $next($request);
                } catch (\Throwable $retryException) {
                    throw $retryException;
                }
            }

            throw $e;
        }
    }

    /**
     * Determine if the exception is a connection error (such as 2002).
     */
    protected function isConnectionError(\Throwable $e): bool
    {
        $code = $e->getCode();
        $message = $e->getMessage();
        $prev = $e->getPrevious();

        if ($code == 2002 || ($prev instanceof \PDOException && ($prev->getCode() == 2002 || str_contains($prev->getMessage(), '2002')))) {
            return true;
        }

        return str_contains($message, '2002')
            || str_contains($message, 'Operation not permitted')
            || str_contains($message, 'Connection refused');
    }
}
