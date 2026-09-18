<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Auto-extract vendor archive if needed (Hostinger shared hosting FTP deployment)
if (!file_exists(__DIR__.'/../vendor/autoload.php') && file_exists(__DIR__.'/../vendor.zip')) {
    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive;
        if ($zip->open(__DIR__.'/../vendor.zip') === true) {
            $zip->extractTo(__DIR__.'/..');
            $zip->close();
            @unlink(__DIR__.'/../vendor.zip');
        }
    }
}

// Auto-detect and copy .env from outside backend folder (Hostinger shared hosting)
if (!file_exists(__DIR__ . '/../.env')) {
    $possibleEnvs = [
        dirname(__DIR__, 2) . '/backend/.env',
        dirname(__DIR__, 3) . '/backend/.env',
        dirname(__DIR__, 2) . '/.env',
        dirname(__DIR__, 3) . '/.env',
        '/home/u773098752/domains/archfit.archenterprises.co.in/backend/.env',
        '/home/u773098752/backend/.env',
    ];
    foreach ($possibleEnvs as $envFile) {
        if ($envFile && file_exists($envFile)) {
            @copy($envFile, __DIR__ . '/../.env');
            break;
        }
    }
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
