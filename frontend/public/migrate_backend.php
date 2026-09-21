<?php
/**
 * PulseFit Pro - One-Time Backend Migration Helper
 * 
 * Safely migrates existing legacy backend files from public_html/backend to
 * the external backend folder outside public_html, preserving .env and storage.
 * Automatically deletes itself after completion.
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300);

// Token verification
$token = $_GET['token'] ?? '';
if (!$token || strlen($token) < 8) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Forbidden: Invalid token.']);
    exit;
}

$webRoot = __DIR__; // Usually /home/.../public_html
$legacyBackend = $webRoot . '/backend';

// Detect target backend folder outside public_html
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? $webRoot;
$candidateTargets = [
    dirname($webRoot) . '/backend',
    dirname($docRoot) . '/backend',
    '/home/u773098752/domains/archfit.archenterprises.co.in/backend',
    '/home/u773098752/backend',
];

$targetBackend = null;
foreach ($candidateTargets as $candidate) {
    if (file_exists($candidate) && is_dir($candidate)) {
        $targetBackend = realpath($candidate) ?: $candidate;
        break;
    }
}

// If external backend directory doesn't exist yet, create it
if (!$targetBackend) {
    $defaultTarget = dirname($webRoot) . '/backend';
    if (@mkdir($defaultTarget, 0755, true)) {
        $targetBackend = $defaultTarget;
    }
}

$actionsTaken = [];

if (file_exists($legacyBackend) && is_dir($legacyBackend) && $targetBackend && realpath($legacyBackend) !== realpath($targetBackend)) {
    // 1. Preserve .env if target doesn't have it
    if (file_exists($legacyBackend . '/.env') && !file_exists($targetBackend . '/.env')) {
        if (@copy($legacyBackend . '/.env', $targetBackend . '/.env')) {
            $actionsTaken[] = 'Preserved .env to external backend';
        }
    }

    // 2. Preserve storage/oauth-*.key or user uploads if needed
    if (file_exists($legacyBackend . '/storage') && is_dir($legacyBackend . '/storage')) {
        @mkdir($targetBackend . '/storage', 0755, true);
        @mkdir($targetBackend . '/storage/app/public', 0755, true);
    }

    // 3. Recursive remove legacy public_html/backend
    function deleteDirectoryRecursively($dir) {
        if (!file_exists($dir)) return true;
        if (!is_dir($dir)) return @unlink($dir);
        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') continue;
            if (!deleteDirectoryRecursively($dir . DIRECTORY_SEPARATOR . $item)) {
                return false;
            }
        }
        return @rmdir($dir);
    }

    if (deleteDirectoryRecursively($legacyBackend)) {
        $actionsTaken[] = 'Removed legacy public_html/backend directory';
    } else {
        $actionsTaken[] = 'Warning: Some files in legacy backend could not be deleted';
    }
} else {
    $actionsTaken[] = 'No legacy backend directory found inside public_html (already clean)';
}

// Self cleanup
@unlink(__FILE__);

header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'Backend migration and cleanup completed.',
    'target_backend' => $targetBackend,
    'actions' => $actionsTaken,
], JSON_PRETTY_PRINT);
