<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300);

// Verify token
$token = isset($_GET['token']) ? $_GET['token'] : '';
if (!$token || strlen($token) < 8) {
    http_response_code(403);
    exit('Access denied: Invalid token.');
}

// Locate backend directory outside public_html
$possiblePaths = [
    __DIR__ . '/../backend',
    __DIR__ . '/../../backend',
    isset($_SERVER['DOCUMENT_ROOT']) ? dirname($_SERVER['DOCUMENT_ROOT']) . '/backend' : null,
];

$backendPath = null;
foreach ($possiblePaths as $p) {
    if ($p && (file_exists($p . '/vendor.zip') || file_exists($p . '/artisan') || file_exists($p . '/bootstrap/app.php'))) {
        $backendPath = realpath($p) ?: $p;
        break;
    }
}

if (!$backendPath) {
    http_response_code(404);
    exit('Backend directory not found outside public_html.');
}

$zipFile = $backendPath . '/vendor.zip';
if (!file_exists($zipFile)) {
    echo "SUCCESS: vendor.zip already extracted.";
    exit;
}

if (!class_exists('ZipArchive')) {
    http_response_code(500);
    exit('ZipArchive PHP extension not enabled.');
}

$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    $zip->extractTo($backendPath);
    $zip->close();
    @unlink($zipFile);
    echo "SUCCESS: vendor.zip extracted into backend.";
} else {
    http_response_code(500);
    exit('Failed to open vendor.zip.');
}
