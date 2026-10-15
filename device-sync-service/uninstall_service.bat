@echo off
title Uninstall eSSL X2008 Background Service
set TASK_NAME=eSSL_Attendance_Sync_Service

echo Removing %TASK_NAME% from Windows Task Scheduler...
schtasks /delete /tn "%TASK_NAME%" /f

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Service uninstalled successfully.
) else (
    echo [INFO] Service task was not found or already removed.
)
pause
