<?php
/**
 * PulseFit Pro - Laravel API Entrypoint (Hostinger Web Root Bridge)
 * 
 * Bridges requests from public_html/api to the Laravel backend folder located
 * outside public_html for enhanced security.
 */

define('LARAVEL_START', microtime(true));

// 1. Locate the backend directory outside public_html (prioritize sibling to public_html)
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$possiblePaths = [
    dirname(dirname(__DIR__)) . '/backend',
    $docRoot ? dirname($docRoot) . '/backend' : null,
    $docRoot ? dirname(dirname($docRoot)) . '/backend' : null,
    '/home/u773098752/domains/archfit.archenterprises.co.in/backend',
    '/home/u773098752/backend',
    // Fallback: Legacy path inside public_html
    dirname(__DIR__) . '/backend',
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
        'searched_paths' => array_values(array_filter($possiblePaths)),
        'document_root' => $docRoot ?: 'unknown'
    ], JSON_PRETTY_PRINT);
    exit;
}

// 1.1 Recover .env from legacy locations if missing in backend
if (!file_exists($backendPath . '/.env')) {
    $legacyEnvs = [
        dirname(__DIR__) . '/backend/.env',
        dirname(__DIR__) . '/.env',
        $docRoot . '/backend/.env',
        $docRoot . '/.env',
    ];
    foreach ($legacyEnvs as $envCandidate) {
        if (file_exists($envCandidate)) {
            @copy($envCandidate, $backendPath . '/.env');
            break;
        }
    }
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

// 4.1 Serve public storage assets if requested via /storage/ or /api/storage/
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$pathOnly = parse_url($requestUri, PHP_URL_PATH) ?: '';
if (preg_match('#^/(?:api/)?storage/(.+)$#', $pathOnly, $storageMatches)) {
    $storageFile = $backendPath . '/storage/app/public/' . ltrim($storageMatches[1], '/');
    if (file_exists($storageFile) && is_file($storageFile)) {
        $mime = mime_content_type($storageFile) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($storageFile));
        header('Cache-Control: public, max-age=86400');
        readfile($storageFile);
        exit;
    }
}

// 5. Bootstrap Laravel & Handle Request
/** @var \Illuminate\Foundation\Application $app */
$app = require_once $backendPath . '/bootstrap/app.php';

// Prevent Symfony prepared base URL from stripping /api
$_SERVER['SCRIPT_NAME'] = '/index.php';

$app->handleRequest(\Illuminate\Http\Request::capture());
