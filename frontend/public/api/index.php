<?php
/**
 * PulseFit Pro - Laravel API Entrypoint (Hostinger Web Root Bridge)
 * 
 * Bridges requests from public_html/api to the Laravel backend folder located
 * outside public_html for enhanced security.
 */

define('LARAVEL_START', microtime(true));

// 1. Locate the backend directory outside public_html
$possiblePaths = [
    dirname(__DIR__) . '/backend',
    dirname(dirname(__DIR__)) . '/backend',
    isset($_SERVER['DOCUMENT_ROOT']) ? dirname($_SERVER['DOCUMENT_ROOT']) . '/backend' : null,
];

$backendPath = null;
foreach ($possiblePaths as $path) {
    if ($path && file_exists($path . '/bootstrap/app.php')) {
        $backendPath = realpath($path) ?: $path;
        break;
    }
}

if (!$backendPath) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Backend directory not found outside public_html.',
        'searched_paths' => array_filter($possiblePaths),
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown'
    ], JSON_PRETTY_PRINT);
    exit;
}

// 2. Maintenance mode check
if (file_exists($maintenance = $backendPath . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

// 3. Auto-extract vendor.zip if vendor/autoload.php is missing (FTP deployment fallback)
if (!file_exists($backendPath . '/vendor/autoload.php') && file_exists($backendPath . '/vendor.zip')) {
    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive;
        if ($zip->open($backendPath . '/vendor.zip') === true) {
            $zip->extractTo($backendPath);
            $zip->close();
            @unlink($backendPath . '/vendor.zip');
        }
    }
}

// 4. Composer Autoloader
if (!file_exists($backendPath . '/vendor/autoload.php')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Laravel vendor autoloader not found in backend/vendor/autoload.php. Please ensure dependencies are installed.',
        'backend_path' => $backendPath
    ], JSON_PRETTY_PRINT);
    exit;
}

require $backendPath . '/vendor/autoload.php';

// 5. Bootstrap Laravel & Handle Request
/** @var \Illuminate\Foundation\Application $app */
$app = require_once $backendPath . '/bootstrap/app.php';

// Prevent Symfony prepared base URL from stripping /api
$_SERVER['SCRIPT_NAME'] = '/index.php';

$app->handleRequest(\Illuminate\Http\Request::capture());
