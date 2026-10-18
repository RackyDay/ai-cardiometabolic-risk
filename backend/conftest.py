"""Offline defaults for pytest only; application startup is unchanged."""
import ipaddress
import os
import socket

import pytest

# Override inherited credentials before test collection imports main/auth.
# python-dotenv must not read developers' real .env files in this process.
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
os.environ["SUPABASE_URL"] = "http://127.0.0.1:9"
os.environ["SUPABASE_KEY"] = "qa-anon-key-not-a-real-secret"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "qa-service-key-not-a-real-secret"


@pytest.fixture(autouse=True)
def block_external_connections(monkeypatch):
    """Require mocked transports; permit loopback for Windows event loops."""
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex

    def check_address(sock, address):
        if sock.family not in (socket.AF_INET, socket.AF_INET6):
            return
        host = address[0]
        try:
            local = ipaddress.ip_address(host).is_loopback
        except ValueError:
            local = host == "localhost"
        if not local:
            raise AssertionError("External network access is disabled in tests; mock the service.")

    def connect(sock, address):
        check_address(sock, address)
        return original_connect(sock, address)

    def connect_ex(sock, address):
        check_address(sock, address)
        return original_connect_ex(sock, address)

    monkeypatch.setattr(socket.socket, "connect", connect)
    monkeypatch.setattr(socket.socket, "connect_ex", connect_ex)
