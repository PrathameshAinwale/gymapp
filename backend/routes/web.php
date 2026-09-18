<?php

use Illuminate\Support\Facades\Route;

// Register API routes for environments where web server rewrites strip /api prefix
require __DIR__.'/api.php';

// SPA fallback: serve React's index.html for non-API routes in production
Route::get('/{any}', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return view('welcome');
})->where('any', '^(?!api|v1|sanctum|_debugbar).*$');

Route::get('/', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return view('welcome');
});
