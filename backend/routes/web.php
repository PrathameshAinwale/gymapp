<?php

use Illuminate\Support\Facades\Route;

// Catch-all route to serve the built React frontend from public/index.html
Route::get('/{any}', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return view('welcome');
})->where('any', '^(?!api|sanctum|_debugbar).*$');

Route::get('/', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return view('welcome');
});
