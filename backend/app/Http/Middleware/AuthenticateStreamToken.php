<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateStreamToken
{
    /**
     * If request has a ?token= query parameter but no Authorization header (e.g. Browser EventSource),
     * set the Bearer token header so Sanctum authenticates it seamlessly.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->bearerToken() && $request->filled('token')) {
            $request->headers->set('Authorization', 'Bearer ' . $request->query('token'));
        }

        return $next($request);
    }
}

