@echo off
title eSSL X2008 Background Attendance Sync Service
echo ====================================================
echo Starting eSSL X2008 Attendance Sync Service...
echo Logs are saved to logs/sync_service.log
echo Press Ctrl+C to terminate.
echo ====================================================
cd /d "%~dp0"
python sync_service.py
pause
