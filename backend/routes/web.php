<?php

use Illuminate\Support\Facades\Route;

// Register API routes with api middleware for environments where web server rewrites strip /api prefix
Route::middleware('api')->group(function () {
    require __DIR__.'/api.php';
});

use App\Http\Controllers\Api\AdmsController;

// eSSL / ZKTeco ADMS Cloud Server Hardware Routes
Route::any('/iclock/cdata', [AdmsController::class, 'cdata']);
Route::any('/iclock/getrequest', [AdmsController::class, 'getrequest']);
Route::any('/iclock/devicecmd', [AdmsController::class, 'devicecmd']);

// SPA fallback: serve React's index.html for non-API routes in production
Route::get('/{any}', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return view('welcome');
})->where('any', '^(?!api|v1|iclock|sanctum|_debugbar).*$');

Route::get('/', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return view('welcome');
});
