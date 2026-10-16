"""
eSSL X2008 Windows Background Synchronization Service
Fetches attendance transactions from eSSL X2008 biometric terminal over office LAN (192.168.1.201:4370)
Stores punches locally in an ACID SQLite buffer for resilience across PC restarts or network outages,
and securely uploads pending records to the authenticated Laravel Attendance REST API (/api/attendance/sync).
Also updates the local Excel workbook (C:\\Users\\ARCH\\essl_attendance.xlsx) in the background.
"""

import os
import sys
import json
import time
import sqlite3
import hashlib
import logging
import argparse
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional

from essl_adapter import EsslDeviceAdapter
from mock_simulator import MockEsslSimulator

# Set up logging with rotating file handler
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "sync_service.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("EsslCollector")


class CollectorDatabase:
    """Manages local SQLite database for event persistence and offline buffering."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS buffered_punches (
                    fingerprint TEXT PRIMARY KEY,
                    device_id TEXT,
                    user_id TEXT,
                    punched_at TEXT,
                    status INTEGER,
                    punch INTEGER,
                    uid TEXT,
                    is_synced INTEGER DEFAULT 0,
                    synced_at TEXT,
                    created_at TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_punches_sync ON buffered_punches(is_synced)")
            conn.commit()

    def compute_fingerprint(self, device_id: Any, user_id: Any, punched_at: str, status: Any, punch: Any) -> str:
        """Generates deterministic SHA-256 fingerprint for deduplication."""
        raw_key = f"{device_id}_{user_id}_{punched_at}_{status}_{punch}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def buffer_raw_punches(self, punches: List[Dict[str, Any]], device_id: Any) -> int:
        """
        Inserts new raw punches into local SQLite buffer.
        Existing records with matching fingerprint are ignored safely.
        Returns the count of newly buffered records.
        """
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        inserted_count = 0
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for p in punches:
                u_id = str(p.get("user_id") or p.get("biometric_user_id"))
                p_at = str(p.get("timestamp") or p.get("punched_at"))
                stat = p.get("status")
                pnch = p.get("punch")
                uid = str(p.get("uid") or p.get("device_transaction_id") or "")

                fp = self.compute_fingerprint(device_id, u_id, p_at, stat, pnch)
                cursor.execute("""
                    INSERT OR IGNORE INTO buffered_punches
                    (fingerprint, device_id, user_id, punched_at, status, punch, uid, is_synced, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                """, (fp, str(device_id), u_id, p_at, stat, pnch, uid, now_str))
                if cursor.rowcount > 0:
                    inserted_count += 1
            conn.commit()
        return inserted_count

    def get_pending_punches(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieves unacknowledged records awaiting Laravel synchronization."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM buffered_punches
                WHERE is_synced = 0
                ORDER BY punched_at ASC
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def mark_punches_synced(self, fingerprints: List[str]):
        """Marks successfully ingested records as synchronized."""
        if not fingerprints:
            return
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            placeholders = ",".join("?" for _ in fingerprints)
            cursor.execute(f"""
                UPDATE buffered_punches
                SET is_synced = 1, synced_at = ?
                WHERE fingerprint IN ({placeholders})
            """, [now_str] + fingerprints)
            conn.commit()

    def reset_all_to_pending(self):
        """Marks all buffered records as pending so they can be re-synced if needed."""
        with self._get_connection() as conn:
            conn.execute("UPDATE buffered_punches SET is_synced = 0, synced_at = NULL")
            conn.commit()

    def get_counts(self) -> Dict[str, int]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM buffered_punches")
            total = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM buffered_punches WHERE is_synced = 0")
            pending = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM buffered_punches WHERE is_synced = 1")
            synced = cursor.fetchone()[0]
            return {"total": total, "pending": pending, "synced": synced}


class ExcelSyncHelper:
    """Safely updates the local Excel workbook without blocking network sync."""

    @staticmethod
    def append_punches(excel_path: str, punches: List[Dict[str, Any]]):
        if not punches:
            return
        try:
            import openpyxl
            wb = None
            if os.path.exists(excel_path):
                try:
                    wb = openpyxl.load_workbook(excel_path)
                    ws = wb.active
                except Exception as e:
                    logger.warning(f"Could not load existing Excel file ({e}). Will attempt rewrite.")
                    wb = None

            if wb is None:
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = "Attendance Punches"
                ws.append(["User ID", "Punched At", "Status", "Punch Type", "Fingerprint", "Recorded At"])

            for p in punches:
                ws.append([
                    str(p.get("user_id")),
                    str(p.get("punched_at") or p.get("timestamp")),
                    str(p.get("status")),
                    str(p.get("punch")),
                    str(p.get("fingerprint", "")),
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                ])

            wb.save(excel_path)
            logger.info(f"Excel workbook updated with {len(punches)} punch(es) at {excel_path}")
        except Exception as e:
            # Excel might be open/locked by user. Non-fatal.
            logger.warning(f"Excel workbook update skipped (file may be locked): {e}")


class DeviceSyncManager:
    """Coordinates hardware polling, local SQLite buffering, Excel sync, and Laravel REST ingestion."""

    def __init__(self, config_path: str = "config.json", force_simulate: bool = False):
        self.config_path = config_path
        self.force_simulate = force_simulate
        self.config = self.load_config()

        db_path = os.path.join(BASE_DIR, self.config.get("sqlite_db_path", "collector_buffer.db"))
        self.db = CollectorDatabase(db_path)

        ip = self.config.get("device_ip", "192.168.1.201")
        port = int(self.config.get("device_port", 4370))
        timeout = int(self.config.get("connection_timeout", 5))
        comm_key = int(self.config.get("comm_key", 0))

        self.adapter = EsslDeviceAdapter(ip=ip, port=port, timeout=timeout, comm_key=comm_key)
        self.simulator = MockEsslSimulator(ip=ip, port=port)

        self.backoff_delay = 5
        self.max_backoff = 60
        self.sync_cycle_count = 0

    def load_config(self) -> Dict[str, Any]:
        full_path = os.path.join(BASE_DIR, self.config_path)
        if not os.path.exists(full_path):
            logger.warning(f"Config file not found at {full_path}. Creating default config.")
            default_config = {
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
                "enable_excel_sync": True,
                "sqlite_db_path": "collector_buffer.db",
                "batch_size": 100,
                "log_level": "INFO"
            }
            with open(full_path, "w", encoding="utf-8") as f:
                json.dump(default_config, f, indent=2)
            return default_config

        with open(full_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def fetch_records_from_hardware(self) -> List[Dict[str, Any]]:
        """Polls the eSSL X2008 device for attendance records."""
        use_sim = self.force_simulate or self.config.get("enable_simulator", False)
        if use_sim:
            return self.simulator.generate_punches(count=1)

        try:
            from zk import ZK
            zk = ZK(self.adapter.ip, port=self.adapter.port, timeout=self.adapter.timeout,
                    password=self.adapter.comm_key, force_udp=False, ommit_ping=True)
            conn = zk.connect()
            conn.disable_device()

            # Fetch all attendance records from device memory
            # NEVER call conn.clear_attendance() - all records must remain intact on device!
            raw_logs = conn.get_attendance()

            conn.enable_device()
            conn.disconnect()

            normalized = []
            for log in raw_logs:
                direction = "auto"
                # Standard ZK punch mapping: 0=CheckIn, 1=CheckOut
                if getattr(log, 'punch', None) == 0:
                    direction = "check_in"
                elif getattr(log, 'punch', None) == 1:
                    direction = "check_out"
                elif getattr(log, 'status', None) == 0:
                    direction = "check_in"
                elif getattr(log, 'status', None) == 1:
                    direction = "check_out"

                normalized.append({
                    "user_id": str(log.user_id),
                    "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    "status": getattr(log, 'status', None),
                    "punch": getattr(log, 'punch', None),
                    "uid": getattr(log, 'uid', None),
                    "punch_direction": direction
                })
            return normalized
        except Exception as e:
            logger.error(f"Hardware polling failed from {self.adapter.ip}:{self.adapter.port} - {e}")
            raise e

    def push_pending_to_laravel(self) -> bool:
        """Pushes buffered unacknowledged records to authenticated Laravel API."""
        batch_size = int(self.config.get("batch_size", 100))
        pending_rows = self.db.get_pending_punches(limit=batch_size)

        if not pending_rows:
            return True

        api_base = self.config.get("api_base_url", "http://127.0.0.1:8000/api").rstrip("/")
        sync_url = f"{api_base}/attendance/sync"
        api_token = self.config.get("api_token", "")

        headers = {
            "Authorization": f"Bearer {api_token}",
            "X-Collector-Token": api_token,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        # Format records according to Laravel API specification
        payload_records = []
        for r in pending_rows:
            direction = "auto"
            if r["punch"] == 0:
                direction = "check_in"
            elif r["punch"] == 1:
                direction = "check_out"

            payload_records.append({
                "biometric_user_id": str(r["user_id"]),
                "punched_at": r["punched_at"],
                "punch_direction": direction,
                "punch_type": str(r["punch"] if r["punch"] is not None else ""),
                "device_transaction_id": str(r["uid"] or ""),
                "raw_metadata": {
                    "user_id": r["user_id"],
                    "status": r["status"],
                    "punch": r["punch"],
                    "fingerprint": r["fingerprint"]
                }
            })

        logger.info(f"Uploading {len(payload_records)} pending punch(es) to {sync_url}...")

        try:
            res = requests.post(sync_url, json={"records": payload_records}, headers=headers, timeout=20)
            if res.status_code in (200, 201):
                data = res.json()
                logger.info(f"Sync successful: inserted={data.get('inserted')}, duplicates={data.get('duplicates')}, unmatched={data.get('unmatched')}")

                # Mark batch as acknowledged in SQLite buffer
                fps = [r["fingerprint"] for r in pending_rows]
                self.db.mark_punches_synced(fps)

                # Send heartbeat
                self.send_heartbeat(status="online")
                return True
            else:
                logger.error(f"Laravel API rejected sync batch (HTTP {res.status_code}): {res.text}")
                self.send_heartbeat(status="error", error_msg=f"HTTP {res.status_code}: {res.text}")
                return False
        except Exception as e:
            logger.error(f"Network error pushing punches to {sync_url}: {e}")
            self.send_heartbeat(status="error", error_msg=str(e))
            return False

    def send_heartbeat(self, status: str = "online", error_msg: Optional[str] = None):
        """Transmits collector heartbeat to device-sync/heartbeat endpoint."""
        api_base = self.config.get("api_base_url", "http://127.0.0.1:8000/api").rstrip("/")
        api_url = f"{api_base}/device-sync/heartbeat"
        api_token = self.config.get("api_token", "")

        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload = {
            "status": status,
            "error_message": error_msg,
            "device_ip": self.config.get("device_ip"),
            "sync_interval_seconds": self.config.get("sync_interval_seconds", 10),
        }
        try:
            requests.post(api_url, json=payload, headers=headers, timeout=8)
        except Exception:
            pass

    def reconcile_users_with_laravel(self):
        """Periodically reconciles machine users with Laravel to delete users removed on machine."""
        try:
            from device_user_sync import list_users
            ip = self.config.get("device_ip", "192.168.1.201")
            port = int(self.config.get("device_port", 4370))
            listed = list_users(ip=ip, port=port)
            if not listed.get("success"):
                return

            api_base = self.config.get("api_base_url", "http://127.0.0.1:8000/api").rstrip("/")
            reconcile_url = f"{api_base}/attendance/reconcile-machine-users"
            api_token = self.config.get("api_token", "")
            headers = {
                "Authorization": f"Bearer {api_token}",
                "X-Collector-Token": api_token,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            res = requests.post(reconcile_url, json={"machine_users": listed.get("users", [])}, headers=headers, timeout=10)
            if res.status_code in (200, 201):
                data = res.json()
                if data.get("deleted_from_system_count", 0) > 0:
                    logger.info(f"Two-Way Sync: Reconciled machine users. Deleted {data.get('deleted_from_system_count')} user(s) from system that were removed on hardware.")
        except Exception as e:
            logger.debug(f"User reconciliation check error: {e}")

    def sync_pending_users_to_machine(self):
        """Fetches pending users and deletions from Laravel and syncs them to the physical eSSL machine."""
        try:
            from device_user_sync import push_single_user, delete_single_user
            api_base = self.config.get("api_base_url", "http://127.0.0.1:8000/api").rstrip("/")
            pending_url = f"{api_base}/attendance/pending-users"
            api_token = self.config.get("api_token", "")
            headers = {
                "Authorization": f"Bearer {api_token}",
                "X-Collector-Token": api_token,
                "Accept": "application/json"
            }
            res = requests.get(pending_url, headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                users = data.get("users", [])
                deletions = data.get("deletions", [])
                if not users and not deletions:
                    return

                ip = self.config.get("device_ip", "192.168.1.201")
                port = int(self.config.get("device_port", 4370))
                synced_ids = []
                processed_del_ids = []

                # 1. Process deletions first to clear slots if needed
                for d in deletions:
                    bio_id = str(d.get("biometric_user_id", "")).strip()
                    del_name = str(d.get("user_name", "") or "").strip()
                    rec_id = d.get("id")
                    if not bio_id:
                        continue
                    try:
                        del_res = delete_single_user(user_id=bio_id, name=del_name, ip=ip, port=port)
                        if del_res.get("success"):
                            processed_del_ids.append(rec_id or bio_id)
                            logger.info(f"Two-Way Sync: Removed user {del_name} (ID: {bio_id}) from machine {ip}:{port}.")
                        else:
                            logger.warning(f"Failed to remove user {bio_id} from machine: {del_res.get('message')}")
                    except Exception as de:
                        logger.warning(f"Error deleting user {bio_id} on machine: {de}")

                # 2. Process user enrollments and updates
                for u in users:
                    uid_str = str(u.get("user_id", ""))
                    name_str = str(u.get("name", ""))
                    priv = int(u.get("privilege", 0))
                    card_val = int(u.get("card", 0))

                    if not uid_str:
                        continue

                    push_res = push_single_user(
                        user_id=uid_str,
                        name=name_str,
                        card=card_val,
                        privilege=priv,
                        ip=ip,
                        port=port
                    )

                    if push_res.get("success"):
                        synced_ids.append(u.get("id", uid_str))
                        logger.info(f"Two-Way Sync: Enrolled/Updated {name_str} (ID: {uid_str}) on biometric terminal {ip}:{port}.")
                    else:
                        logger.warning(f"Failed to enroll user {name_str} on machine: {push_res.get('message')}")

                if synced_ids or processed_del_ids:
                    ack_url = f"{api_base}/attendance/mark-users-synced"
                    requests.post(ack_url, json={"user_ids": synced_ids, "deletion_ids": processed_del_ids}, headers=headers, timeout=10)
        except Exception as e:
            logger.debug(f"User enrollment sync error: {e}")

    def check_config_updates(self):
        """Dynamically reloads config.json and switches hardware adapter target IP/port on the fly."""
        try:
            full_path = os.path.join(BASE_DIR, self.config_path)
            if os.path.exists(full_path):
                with open(full_path, "r", encoding="utf-8") as f:
                    new_conf = json.load(f)

                self.config = new_conf
                new_ip = str(new_conf.get("device_ip", "")).strip()
                new_port = int(new_conf.get("device_port", 4370))

                if new_ip and (new_ip != self.adapter.ip or new_port != self.adapter.port):
                    logger.info(f"Target Machine IP updated dynamically: {self.adapter.ip}:{self.adapter.port} -> {new_ip}:{new_port}")
                    self.adapter.ip = new_ip
                    self.adapter.port = new_port
                    self.simulator.ip = new_ip
                    self.simulator.port = new_port
                    self.backoff_delay = 5  # Immediately reset backoff to connect to new IP without delay
        except Exception as e:
            logger.debug(f"Error checking config updates: {e}")

    def perform_sync_cycle(self) -> bool:
        """Executes a single end-to-end sync cycle."""
        # 0. Check for dynamic Machine IP / Port configuration changes
        self.check_config_updates()

        self.sync_cycle_count += 1

        # Check and enroll pending members/staff onto the eSSL hardware (every 3 cycles = ~30 seconds, or first cycle)
        if self.sync_cycle_count % 3 == 0 or self.sync_cycle_count == 1:
            try:
                self.sync_pending_users_to_machine()
            except Exception as user_err:
                logger.debug(f"Pending user sync skipped: {user_err}")

        # Periodically reconcile machine users with Laravel (every 6 cycles = ~60 seconds)
        if self.sync_cycle_count % 6 == 0:
            try:
                self.reconcile_users_with_laravel()
            except Exception as rec_err:
                logger.debug(f"Periodic reconciliation check skipped: {rec_err}")

        device_id = self.config.get("device_id", 1)
        excel_path = self.config.get("excel_file_path", r"C:\Users\ARCH\essl_attendance.xlsx")
        enable_excel = self.config.get("enable_excel_sync", True)

        try:
            # 1. Hardware Poll
            punches = self.fetch_records_from_hardware()

            # 2. Local SQLite Buffer (Deduplicated via fingerprint)
            new_buffered_count = self.db.buffer_raw_punches(punches, device_id)
            if new_buffered_count > 0:
                logger.info(f"Buffered {new_buffered_count} new punch(es) into local SQLite buffer.")

            # 3. Excel Update (if enabled and new punches found)
            if enable_excel and new_buffered_count > 0:
                ExcelSyncHelper.append_punches(excel_path, punches[:new_buffered_count])

            # 4. Push Pending Punches to Laravel API
            success = self.push_pending_to_laravel()

            if success:
                self.backoff_delay = 5
                return True
            else:
                return False

        except Exception as e:
            logger.error(f"Sync cycle error: {e}")
            self.send_heartbeat(status="error", error_msg=str(e))
            # Even if device poll fails, attempt pushing any earlier pending buffer records to Laravel
            try:
                self.push_pending_to_laravel()
            except Exception:
                pass
            return False

    def run_daemon(self):
        """Continuous execution loop with configurable polling and exponential backoff."""
        interval = int(self.config.get("sync_interval_seconds", 10))
        logger.info(f"=======================================================")
        logger.info(f"eSSL X2008 Real-Time Attendance Collector Daemon Active")
        logger.info(f"Device Target:  {self.config.get('device_ip')}:{self.config.get('device_port')}")
        logger.info(f"Laravel Target: {self.config.get('api_base_url')}/attendance/sync")
        logger.info(f"Local Buffer:   {self.db.db_path}")
        logger.info(f"Poll Interval:  {interval}s")
        logger.info(f"=======================================================")

        while True:
            cycle_success = self.perform_sync_cycle()
            wait_time = interval if cycle_success else self.backoff_delay
            if not cycle_success:
                logger.warning(f"Connection issue encountered. Backing off for {self.backoff_delay}s...")
                self.backoff_delay = min(self.backoff_delay * 2, self.max_backoff)

            # Sleep in 1-second slices so dynamic IP changes trigger immediate reconnection!
            for _ in range(wait_time):
                time.sleep(1)
                old_ip = self.adapter.ip
                self.check_config_updates()
                if self.adapter.ip != old_ip:
                    logger.info(f"New Machine IP detected during standby ({self.adapter.ip}). Reconnecting immediately!")
                    break


def main():
    parser = argparse.ArgumentParser(description="eSSL X2008 Real-Time Collector Daemon")
    parser.add_argument("--once", action="store_true", help="Run a single sync cycle and exit")
    parser.add_argument("--simulate", action="store_true", help="Force simulator mode for testing")
    parser.add_argument("--test-connection", action="store_true", help="Test connectivity to eSSL hardware")
    parser.add_argument("--status", action="store_true", help="Display local buffer statistics")
    parser.add_argument("--re-sync", action="store_true", help="Reset all buffered records to pending and sync to Laravel")
    parser.add_argument("--config", type=str, default="config.json", help="Path to config.json")
    parser.add_argument("--interval", type=int, default=None, help="Override sync interval in seconds")

    args = parser.parse_args()
    manager = DeviceSyncManager(config_path=args.config, force_simulate=args.simulate)

    if args.re_sync:
        logger.info("Resetting all local buffer records to pending...")
        manager.db.reset_all_to_pending()
        success = manager.push_pending_to_laravel()
        sys.exit(0 if success else 1)

    if args.interval:
        manager.config["sync_interval_seconds"] = args.interval

    if args.test_connection:
        result = manager.adapter.test_connection()
        print(json.dumps(result, indent=2))
        sys.exit(0 if result.get("success") else 1)

    if args.status:
        counts = manager.db.get_counts()
        print(f"Local Buffer Stats: Total={counts['total']}, Pending={counts['pending']}, Synced={counts['synced']}")
        sys.exit(0)

    if args.once:
        success = manager.perform_sync_cycle()
        sys.exit(0 if success else 1)

    manager.run_daemon()


if __name__ == "__main__":
    main()
