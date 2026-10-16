#!/usr/bin/env python3
"""
eSSL X2008 Biometric User Synchronization Utility
Automatically pushes, updates, and deletes users on the biometric terminal over LAN.
"""

import sys
import os
import json
import argparse
from typing import Dict, Any, List

# Ensure pyzk from user site-packages is always importable even in isolated sub-process environments
user_site = os.path.expanduser(r"~\AppData\Roaming\Python\Python314\site-packages")
if os.path.exists(user_site) and user_site not in sys.path:
    sys.path.insert(0, user_site)

roaming_site = r"C:\Users\ARCH\AppData\Roaming\Python\Python314\site-packages"
if os.path.exists(roaming_site) and roaming_site not in sys.path:
    sys.path.insert(0, roaming_site)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_device_config(config_path: str = "config.json") -> Dict[str, Any]:
    full_path = os.path.join(BASE_DIR, config_path)
    if os.path.exists(full_path):
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"device_ip": "192.168.1.201", "device_port": 4370, "comm_key": 0}

def get_connection(ip: str, port: int = 4370, timeout: int = 5, comm_key: int = 0):
    from zk import ZK
    zk = ZK(ip, port=port, timeout=timeout, password=comm_key, force_udp=False, ommit_ping=True)
    return zk.connect()

def push_single_user(user_id: str, name: str, card: int = 0, privilege: int = 0, ip: str = None, port: int = None, comm_key: int = 0) -> Dict[str, Any]:
    cfg = get_device_config()
    target_ip = ip or cfg.get("device_ip", "192.168.1.201")
    target_port = port or int(cfg.get("device_port", 4370))

    try:
        uid_val = int(user_id) if str(user_id).isdigit() and int(user_id) < 65535 else None
    except Exception:
        uid_val = None

    clean_name = str(name).strip()[:24]

    conn = None
    try:
        conn = get_connection(target_ip, target_port, timeout=5, comm_key=comm_key)
        conn.disable_device()

        # If uid_val is None, find next available or existing uid from machine
        if uid_val is None:
            existing_users = conn.get_users()
            match = [u for u in existing_users if str(u.user_id) == str(user_id)]
            if match:
                uid_val = match[0].uid
            else:
                max_uid = max([u.uid for u in existing_users], default=0)
                uid_val = max_uid + 1

        conn.set_user(
            uid=uid_val,
            name=clean_name,
            privilege=privilege,
            password='',
            group_id='',
            user_id=str(user_id),
            card=card or 0
        )

        conn.enable_device()
        conn.disconnect()

        return {
            "success": True,
            "message": f"Successfully registered {clean_name} (ID: {user_id}) in biometric machine at {target_ip}:{target_port}",
            "device_ip": target_ip,
            "user_id": str(user_id),
            "uid": uid_val,
            "name": clean_name
        }

    except Exception as e:
        if conn:
            try:
                conn.enable_device()
                conn.disconnect()
            except Exception:
                pass
        return {
            "success": False,
            "message": f"Hardware error pushing to machine {target_ip}:{target_port}: {str(e)}",
            "device_ip": target_ip,
            "user_id": str(user_id),
            "error": str(e)
        }

def delete_single_user(user_id: str, name: str = None, ip: str = None, port: int = None, comm_key: int = 0) -> Dict[str, Any]:
    cfg = get_device_config()
    target_ip = ip or cfg.get("device_ip", "192.168.1.201")
    target_port = port or int(cfg.get("device_port", 4370))

    conn = None
    try:
        conn = get_connection(target_ip, target_port, timeout=5, comm_key=comm_key)
        conn.disable_device()

        existing_users = conn.get_users()
        match = [u for u in existing_users if str(u.user_id) == str(user_id) or str(u.uid) == str(user_id)]
        if not match and name:
            clean_name = str(name).strip().lower()
            match = [u for u in existing_users if u.name and u.name.strip().lower() == clean_name]

        if not match:
            conn.enable_device()
            conn.disconnect()
            return {
                "success": True,
                "message": f"User {user_id} was not present on biometric machine (already cleared)",
                "device_ip": target_ip,
                "user_id": str(user_id)
            }

        deleted_slots = []
        for m in match:
            try:
                conn.delete_user(uid=m.uid, user_id=m.user_id)
                deleted_slots.append({"uid": m.uid, "user_id": m.user_id, "name": m.name})
            except Exception as del_err:
                pass

        conn.enable_device()
        conn.disconnect()

        return {
            "success": True,
            "message": f"Deleted user ID: {user_id} from biometric machine at {target_ip}:{target_port}",
            "device_ip": target_ip,
            "user_id": str(user_id),
            "deleted_slots": deleted_slots
        }

    except Exception as e:
        if conn:
            try:
                conn.enable_device()
                conn.disconnect()
            except Exception:
                pass
        return {
            "success": False,
            "message": f"Error deleting user from machine: {str(e)}",
            "device_ip": target_ip,
            "user_id": str(user_id),
            "error": str(e)
        }

def sync_batch_users(users: List[Dict[str, Any]], ip: str = None, port: int = None, comm_key: int = 0) -> Dict[str, Any]:
    cfg = get_device_config()
    target_ip = ip or cfg.get("device_ip", "192.168.1.201")
    target_port = port or int(cfg.get("device_port", 4370))

    conn = None
    synced_count = 0
    failed_count = 0
    errors = []

    try:
        conn = get_connection(target_ip, target_port, timeout=8, comm_key=comm_key)
        conn.disable_device()

        existing_users = conn.get_users()
        user_uid_map = {str(u.user_id): u.uid for u in existing_users}
        max_uid = max([u.uid for u in existing_users], default=0)

        for u in users:
            uid_str = str(u.get("biometric_user_id") or u.get("user_id") or "").strip()
            name_str = str(u.get("full_name") or u.get("name") or "").strip()[:24]

            if not uid_str:
                failed_count += 1
                continue

            try:
                if uid_str in user_uid_map:
                    slot_uid = user_uid_map[uid_str]
                elif uid_str.isdigit() and int(uid_str) < 65535:
                    slot_uid = int(uid_str)
                else:
                    max_uid += 1
                    slot_uid = max_uid

                conn.set_user(
                    uid=slot_uid,
                    name=name_str,
                    privilege=int(u.get("privilege", 0)),
                    password='',
                    group_id='',
                    user_id=uid_str,
                    card=int(u.get("card", 0))
                )
                user_uid_map[uid_str] = slot_uid
                synced_count += 1
            except Exception as item_err:
                failed_count += 1
                errors.append(f"User {uid_str}: {str(item_err)}")

        conn.enable_device()
        conn.disconnect()

        return {
            "success": True,
            "message": f"Successfully synchronized {synced_count} user(s) to biometric machine at {target_ip}:{target_port}",
            "device_ip": target_ip,
            "synced_count": synced_count,
            "failed_count": failed_count,
            "errors": errors[:5]
        }

    except Exception as e:
        if conn:
            try:
                conn.enable_device()
                conn.disconnect()
            except Exception:
                pass
        return {
            "success": False,
            "message": f"Connection failed while synchronizing users to {target_ip}:{target_port}: {str(e)}",
            "device_ip": target_ip,
            "synced_count": synced_count,
            "failed_count": len(users) - synced_count,
            "error": str(e)
        }

def list_users(ip: str = None, port: int = None, comm_key: int = 0) -> Dict[str, Any]:
    cfg = get_device_config()
    target_ip = ip or cfg.get("device_ip", "192.168.1.201")
    target_port = port or int(cfg.get("device_port", 4370))

    try:
        conn = get_connection(target_ip, target_port, timeout=5, comm_key=comm_key)
        users = conn.get_users()
        conn.disconnect()

        user_list = []
        for u in users:
            user_list.append({
                "uid": u.uid,
                "user_id": str(u.user_id),
                "name": u.name,
                "privilege": u.privilege,
                "card": getattr(u, 'card', 0)
            })

        return {
            "success": True,
            "device_ip": target_ip,
            "total_users": len(user_list),
            "users": user_list
        }
    except Exception as e:
        return {
            "success": False,
            "device_ip": target_ip,
            "error": str(e)
        }

def reconcile_with_laravel(ip: str = None, port: int = None, api_base: str = None, api_token: str = None) -> Dict[str, Any]:
    """
    Two-Way Reconciliation: Fetches active users from biometric terminal and notifies Laravel.
    Any user who was synced to device but was removed directly from the machine keypad
    will be deleted/deactivated from Laravel.
    """
    cfg = get_device_config()
    target_ip = ip or cfg.get("device_ip", "192.168.1.201")
    target_port = port or int(cfg.get("device_port", 4370))
    url_base = (api_base or cfg.get("api_base_url", "http://127.0.0.1:8000/api")).rstrip("/")
    token = api_token or cfg.get("api_token", "")

    listed = list_users(ip=target_ip, port=target_port)
    if not listed.get("success"):
        return {"success": False, "error": f"Failed to list machine users: {listed.get('error')}"}

    reconcile_url = f"{url_base}/attendance/reconcile-machine-users"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Collector-Token": token,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        import requests
        res = requests.post(reconcile_url, json={"machine_users": listed.get("users", [])}, headers=headers, timeout=15)
        if res.status_code in (200, 201):
            return res.json()
        return {"success": False, "error": f"HTTP {res.status_code}: {res.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="eSSL X2008 Biometric User Synchronization")
    parser.add_argument("--push", action="store_true", help="Push/register user into machine")
    parser.add_argument("--delete", action="store_true", help="Delete user from machine")
    parser.add_argument("--sync-all", action="store_true", help="Batch sync users to machine")
    parser.add_argument("--list", action="store_true", help="List users currently on machine")
    parser.add_argument("--reconcile", action="store_true", help="Two-way sync: reconcile machine deletions with system")
    parser.add_argument("--user-id", type=str, help="Biometric User ID")
    parser.add_argument("--name", type=str, help="User Full Name")
    parser.add_argument("--card", type=int, default=0, help="RFID Card number")
    parser.add_argument("--users-json", type=str, help="JSON string or file path containing users array")
    parser.add_argument("--privilege", type=int, default=0, help="User privilege: 0=Member/User, 14=Admin/Manager")
    parser.add_argument("--role", type=str, default="member", help="User gym role (member, trainer, manager, accounts)")
    parser.add_argument("--ip", type=str, help="Override machine IP")
    parser.add_argument("--port", type=int, help="Override machine port")

    args = parser.parse_args()

    # Determine privilege based on role if privilege is default 0
    privilege_val = args.privilege
    if privilege_val == 0 and args.role:
        role_lower = str(args.role).lower()
        if role_lower in ["manager", "admin", "superadmin", "owner"]:
            privilege_val = 14  # Device administrator

    if args.list:
        res = list_users(ip=args.ip, port=args.port)
        print(json.dumps(res, indent=2))
        sys.exit(0 if res.get("success") else 1)

    elif args.reconcile:
        res = reconcile_with_laravel(ip=args.ip, port=args.port)
        print(json.dumps(res, indent=2))
        sys.exit(0 if res.get("success") else 1)

    elif args.push:
        if not args.user_id or not args.name:
            print(json.dumps({"success": False, "message": "--user-id and --name are required for push"}))
            sys.exit(1)
        res = push_single_user(args.user_id, args.name, card=args.card, privilege=privilege_val, ip=args.ip, port=args.port)
        print(json.dumps(res, indent=2))
        sys.exit(0 if res.get("success") else 1)

    elif args.delete:
        if not args.user_id:
            print(json.dumps({"success": False, "message": "--user-id is required for delete"}))
            sys.exit(1)
        res = delete_single_user(args.user_id, name=args.name, ip=args.ip, port=args.port)
        print(json.dumps(res, indent=2))
        sys.exit(0 if res.get("success") else 1)

    elif args.sync_all:
        users = []
        if args.users_json:
            if os.path.exists(args.users_json):
                with open(args.users_json, "r", encoding="utf-8") as f:
                    users = json.load(f)
            else:
                users = json.loads(args.users_json)
        else:
            # Read from stdin
            input_text = sys.stdin.read().strip()
            if input_text:
                users = json.loads(input_text)

        res = sync_batch_users(users, ip=args.ip, port=args.port)
        print(json.dumps(res, indent=2))
        sys.exit(0 if res.get("success") else 1)

    else:
        parser.print_help()
        sys.exit(0)

if __name__ == "__main__":
    main()
