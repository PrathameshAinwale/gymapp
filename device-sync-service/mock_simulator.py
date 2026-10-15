"""
eSSL X2008 Hardware Simulator
Simulates attendance punches for testing and demonstration when physical hardware
is offline or in transit. Generates realistic punch records.
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

class MockEsslSimulator:
    def __init__(self, ip: str = "192.168.1.201", port: int = 4370):
        self.ip = ip
        self.port = port
        self.user_ids = ["101", "102", "103", "104", "105"]
        self.counter = 1000

    def test_connection(self) -> Dict[str, Any]:
        return {
            "success": True,
            "reachable": True,
            "latency_ms": 1.45,
            "message": f"Connected to eSSL X2008 Simulator ({self.ip}:{self.port})",
            "device_info": {
                "firmware": "Ver 6.60 Nov 12 2021",
                "serial_number": "X2008-SIM-99214",
                "device_name": "eSSL X2008 (Simulator)",
                "mac": "00:17:61:A8:B2:C1",
                "ip": self.ip,
                "port": self.port,
            }
        }

    def generate_punches(self, count: int = 2) -> List[Dict[str, Any]]:
        """Generates realistic punch records."""
        now = datetime.now()
        records = []

        chosen_users = random.sample(self.user_ids, min(count, len(self.user_ids)))
        for uid in chosen_users:
            self.counter += 1
            direction = random.choice(["check_in", "check_out"])
            records.append({
                "biometric_user_id": uid,
                "punched_at": now.strftime("%Y-%m-%d %H:%M:%S"),
                "punch_direction": direction,
                "device_transaction_id": f"SIM-{self.counter}",
                "raw_metadata": {
                    "source": "Simulator",
                    "uid": self.counter,
                    "simulated": True,
                }
            })

        return records

    def generate_full_day_punches(self, target_date_str: str) -> List[Dict[str, Any]]:
        """Generates a complete day of realistic check-in and check-out punches for all employees."""
        records = []
        base_date = datetime.strptime(target_date_str, "%Y-%m-%d")

        # 101 - Rahul Sharma (On time: 09:20 - 18:30)
        records.append({
            "biometric_user_id": "101",
            "punched_at": (base_date + timedelta(hours=9, minutes=20)).strftime("%Y-%m-%d %H:%M:%S"),
            "punch_direction": "check_in",
            "device_transaction_id": "SIM-2001",
        })
        records.append({
            "biometric_user_id": "101",
            "punched_at": (base_date + timedelta(hours=18, minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
            "punch_direction": "check_out",
            "device_transaction_id": "SIM-2002",
        })

        # 102 - Priya Patel (Late: 10:15 - 19:00)
        records.append({
            "biometric_user_id": "102",
            "punched_at": (base_date + timedelta(hours=10, minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
            "punch_direction": "check_in",
            "device_transaction_id": "SIM-2003",
        })
        records.append({
            "biometric_user_id": "102",
            "punched_at": (base_date + timedelta(hours=19, minutes=0)).strftime("%Y-%m-%d %H:%M:%S"),
            "punch_direction": "check_out",
            "device_transaction_id": "SIM-2004",
        })

        # 103 - Amit Kumar (Half day: 09:30 - 13:00)
        records.append({
            "biometric_user_id": "103",
            "punched_at": (base_date + timedelta(hours=9, minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
            "punch_direction": "check_in",
            "device_transaction_id": "SIM-2005",
        })
        records.append({
            "biometric_user_id": "103",
            "punched_at": (base_date + timedelta(hours=13, minutes=0)).strftime("%Y-%m-%d %H:%M:%S"),
            "punch_direction": "check_out",
            "device_transaction_id": "SIM-2006",
        })

        # 104 - Sneha Reddy (On time: 09:15 - 18:15)
        records.append({
            "biometric_user_id": "104",
            "punched_at": (base_date + timedelta(hours=9, minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
            "punch_direction": "check_in",
            "device_transaction_id": "SIM-2007",
        })
        records.append({
            "biometric_user_id": "104",
            "punched_at": (base_date + timedelta(hours=18, minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
            "punch_direction": "check_out",
            "device_transaction_id": "SIM-2008",
        })

        return records
