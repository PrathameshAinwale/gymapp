@echo off
title Install eSSL X2008 Background Service
echo =======================================================
echo Installing eSSL Attendance Sync Service to Windows Task Scheduler...
echo The service will start automatically upon Windows boot.
echo =======================================================

set TASK_NAME=eSSL_Attendance_Sync_Service
set SCRIPT_DIR=%~dp0
set PYTHON_EXE=pythonw.exe

REM Create a scheduled task that launches on system startup
schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_DIR%run_service.bat\"" /sc onstart /ru SYSTEM /f

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Service registered with Windows Task Scheduler as '%TASK_NAME%'.
    echo To start the service immediately, running schtasks /run /tn "%TASK_NAME%"
    schtasks /run /tn "%TASK_NAME%"
) else (
    echo [NOTICE] If running as standard user, registering for current user logon:
    schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_DIR%run_service.bat\"" /sc onlogon /f
    schtasks /run /tn "%TASK_NAME%"
)

pause
