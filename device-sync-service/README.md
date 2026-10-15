# eSSL X2008 Real-Time Biometric Attendance Collector (Windows Service)

This robust Windows background service bridges your local office LAN eSSL X2008 fingerprint terminal (`192.168.1.201:4370`) with your authenticated Laravel REST API (`/api/attendance/sync`).

## Architecture & Data Flow

```
[ eSSL X2008 Terminal ]
   (192.168.1.201:4370)
          â”‚  TCP / pyzk Standalone Protocol (Preserves all on-device logs)
          â–¼
[ Windows Collector Service ] (Python 3.14 on Office PC)
   â”œâ”€â”€ Local SQLite Buffer (collector_buffer.db) -> Offline & Power Outage Safety
   â””â”€â”€ Excel Workbook Backup (C:\Users\ARCH\essl_attendance.xlsx)
          â”‚  Bearer Token Authenticated HTTPS / HTTP
          â–¼
[ Authenticated Laravel API ] (/api/attendance/sync)
   â”œâ”€â”€ SHA-256 Deduplication & Idempotent Ingestion
   â””â”€â”€ Database Transaction (attendance_transactions + daily_summaries)
          â”‚  REST JSON & Real-Time Polling (5s / 10s)
          â–¼
[ Vue 3 Admin Dashboard ]
   â”œâ”€â”€ Summary KPI Cards & Device Status Indicator
   â”œâ”€â”€ Live Biometric Punch Stream (Raw Terminal Events)
   â””â”€â”€ Quick Biometric User ID Mapping Drawer
```

## Key Capabilities

1. **ACID Local SQLite Buffer (`collector_buffer.db`)**: Every punch retrieved from the machine is immediately fingerprinted and saved locally before transmitting over the network. If the office internet drops or the PC reboots, unsynchronized records remain safely buffered and will be pushed upon reconnect.
2. **Device Memory Safety**: The collector **never clears device logs** (`clear_attendance()` is never called). All physical logs remain stored on the eSSL hardware.
3. **Decoupled Excel Workbook Sync (`C:\Users\ARCH\essl_attendance.xlsx`)**: Concurrently appends new punches to your existing Excel file without blocking HTTP API synchronization if Excel is open or locked.
4. **Idempotent Deduplication**: Calculates a stable SHA-256 fingerprint from `(device_id, user_id, timestamp, status, punch)`. Retrying batches never generates duplicate database entries.
5. **Configurable Polling & Backoff**: Polls every 10 seconds by default. In case of network errors or hardware timeout, applies exponential backoff up to 60 seconds.

## Configuration (`config.json`)

```json
{
  "device_id": 1,
  "device_name": "Main Office Attendance Machine",
  "device_ip": "192.168.1.201",
  "device_port": 4370,
  "comm_key": 0,
  "connection_timeout": 5,
  "sync_interval_seconds": 10,
  "api_base_url": "http://127.0.0.1:8000/api",
  "api_token": "essl_sec_token_98f4a13c9e624b7a950e82c1b489d701",
  "excel_file_path": "C:\\Users\\ARCH\\essl_attendance.xlsx",
  "enable_excel_sync": true,
  "sqlite_db_path": "collector_buffer.db",
  "batch_size": 100,
  "log_level": "INFO"
}
```

## CLI Usage

- **Run continuously as background daemon:**
  ```bash
  python sync_service.py
  ```
  *(Or double click `run_service.bat`)*

- **Run one sync cycle and exit:**
  ```bash
  python sync_service.py --once
  ```

- **Test hardware connection to eSSL terminal:**
  ```bash
  python sync_service.py --test-connection
  ```

- **Inspect local SQLite buffer stats:**
  ```bash
  python sync_service.py --status
  ```

- **Re-sync all buffered records to Laravel:**
  ```bash
  python sync_service.py --re-sync
  ```

## Windows Startup Service Installation

To run automatically in the background whenever Windows boots:

1. Right-click `install_service.bat` and select **Run as Administrator**.
2. It registers a task named `eSSL_Attendance_Sync_Service` into Windows Task Scheduler.
3. To remove the startup task at any time, run `uninstall_service.bat`.

## Troubleshooting & Logs

- Operational logs are saved to `device-sync-service/logs/sync_service.log`.
- To check active logs in real-time, run:
  ```powershell
  Get-Content .\logs\sync_service.log -Wait -Tail 20
  ```
