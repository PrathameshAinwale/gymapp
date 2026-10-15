"""
eSSL X2008 Connection Tester CLI
Verifies physical LAN reachability, TCP socket port 4370 status,
and ZK protocol handshake to the eSSL machine.
"""

import sys
import json
import os
from essl_adapter import EsslDeviceAdapter
from mock_simulator import MockEsslSimulator

def main():
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
    ip = "192.168.1.201"
    port = 4370
    timeout = 5
    comm_key = 0

    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                ip = cfg.get("device_ip", ip)
                port = int(cfg.get("device_port", port))
                timeout = int(cfg.get("connection_timeout", timeout))
                comm_key = int(cfg.get("comm_key", comm_key))
        except Exception:
            pass

    print("==================================================")
    print("      eSSL X2008 BIOMETRIC CONNECTION TEST        ")
    print("==================================================")
    print(f"Target Device IP   : {ip}")
    print(f"Communication Port : {port} (TCP)")
    print(f"Timeout            : {timeout} seconds")
    print(f"Comm Key           : {comm_key}")
    print("--------------------------------------------------")
    print("1. Probing network socket...")

    adapter = EsslDeviceAdapter(ip=ip, port=port, timeout=timeout, comm_key=comm_key)
    socket_res = adapter.probe_socket()

    if socket_res["reachable"]:
        print(f"   [SUCCESS] TCP socket is OPEN! Latency: {socket_res['latency_ms']} ms")
        print("2. Performing ZK Protocol handshake & querying device info...")
        conn_res = adapter.test_connection()
        if conn_res["success"]:
            print("   [SUCCESS] Handshake completed successfully!")
            info = conn_res.get("device_info", {})
            for k, v in info.items():
                print(f"   - {k.replace('_', ' ').title()}: {v}")
        else:
            print(f"   [WARNING] {conn_res['message']}")
    else:
        print(f"   [FAILED] Socket unreachable: {socket_res['error']}")
        print("\nTroubleshooting Checklist:")
        print("1. Verify the eSSL machine is powered ON and ethernet cable is connected.")
        print(f"2. Ensure your computer is on the same subnet (e.g. 192.168.1.X).")
        print(f"3. Ping the device in command prompt: ping {ip}")
        print("4. On the machine menu: Options -> Comm. -> TCP/IP, verify IP and Port 4370.")

        print("\nTesting Simulator mode for verification:")
        sim = MockEsslSimulator(ip=ip, port=port)
        sim_res = sim.test_connection()
        print(f"   Simulator status: {sim_res['message']}")

    print("==================================================")

if __name__ == "__main__":
    main()
