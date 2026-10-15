"""
eSSL X2008 Biometric Device Communication Adapter
Communicates with eSSL X2008 biometric terminal over TCP/UDP socket on port 4370
using standard ZK standalone communication protocol.
"""

import socket
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("essl_adapter")

class EsslDeviceAdapter:
    def __init__(self, ip: str = "192.168.1.201", port: int = 4370, timeout: int = 5, comm_key: int = 0):
        self.ip = ip
        self.port = int(port)
        self.timeout = timeout
        self.comm_key = comm_key
        self.zk = None

    def probe_socket(self) -> Dict[str, Any]:
        """Low-level socket probe to test if device is physically reachable on LAN."""
        start_time = time.time()
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(self.timeout)
        try:
            s.connect((self.ip, self.port))
            latency_ms = round((time.time() - start_time) * 1000, 2)
            s.close()
            return {"reachable": True, "latency_ms": latency_ms, "error": None}
        except Exception as e:
            return {"reachable": False, "latency_ms": None, "error": str(e)}

    def test_connection(self) -> Dict[str, Any]:
        """
        Connects to eSSL X2008 device via ZK protocol, retrieves device info
        (firmware version, serial number, device name, attendance record count).
        """
        socket_check = self.probe_socket()
        if not socket_check["reachable"]:
            return {
                "success": False,
                "reachable": False,
                "message": f"TCP connection failed to {self.ip}:{self.port} - {socket_check['error']}",
                "device_info": None,
            }

        try:
            from zk import ZK
            conn = None
            zk = ZK(self.ip, port=self.port, timeout=self.timeout, password=self.comm_key, force_udp=False, ommit_ping=True)
            conn = zk.connect()
            conn.disable_device()

            firmware = conn.get_firmware_version()
            serial_number = conn.get_serialnumber()
            device_name = conn.get_device_name()
            mac = conn.get_mac()

            conn.enable_device()
            conn.disconnect()

            return {
                "success": True,
                "reachable": True,
                "latency_ms": socket_check["latency_ms"],
                "message": f"Successfully connected to eSSL X2008 at {self.ip}:{self.port}",
                "device_info": {
                    "firmware": firmware,
                    "serial_number": serial_number,
                    "device_name": device_name,
                    "mac": mac,
                    "ip": self.ip,
                    "port": self.port,
                }
            }
        except ImportError:
            return {
                "success": True,
                "reachable": True,
                "latency_ms": socket_check["latency_ms"],
                "message": f"TCP port {self.port} reachable at {self.ip}. (pyzk package optional)",
                "device_info": {
                    "ip": self.ip,
                    "port": self.port,
                }
            }
        except Exception as e:
            logger.error(f"ZK protocol handshake error on {self.ip}:{self.port}: {e}")
            return {
                "success": False,
                "reachable": True,
                "latency_ms": socket_check["latency_ms"],
                "message": f"TCP Port open but ZK protocol handshake failed: {str(e)}. Check communication key / password.",
                "error": str(e),
                "device_info": None,
            }

    def fetch_attendance_logs(self, since_datetime: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Fetches attendance records from eSSL X2008 machine.
        Normalizes records into standard format.
        """
        records: List[Dict[str, Any]] = []

        try:
            from zk import ZK
            zk = ZK(self.ip, port=self.port, timeout=self.timeout, password=self.comm_key, force_udp=False, ommit_ping=True)
            conn = zk.connect()
            conn.disable_device()

            att_logs = conn.get_attendance()

            for log in att_logs:
                # log attributes: user_id, timestamp, status, punch
                log_time = log.timestamp
                if since_datetime and log_time <= since_datetime:
                    continue

                direction = "auto"
                # Standard ZK punch status: 0=CheckIn, 1=CheckOut, 2=BreakOut, 3=BreakIn, 4=OT In, 5=OT Out
                if getattr(log, 'punch', None) == 0:
                    direction = "check_in"
                elif getattr(log, 'punch', None) == 1:
                    direction = "check_out"

                records.append({
                    "biometric_user_id": str(log.user_id),
                    "punched_at": log_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "punch_direction": direction,
                    "device_transaction_id": str(getattr(log, 'uid', '')),
                    "raw_metadata": {
                        "user_id": log.user_id,
                        "status": getattr(log, 'status', None),
                        "punch": getattr(log, 'punch', None),
                    }
                })

            conn.enable_device()
            conn.disconnect()

        except Exception as e:
            logger.error(f"Failed to fetch attendance logs from {self.ip}:{self.port}: {e}")
            raise e

        return records
