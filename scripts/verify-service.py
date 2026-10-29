"""Check the running loopback service using only the Python standard library."""

import json
import sys
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

expected = {
    "status": "ok",
    "service": "local-voice-form-assistant",
    "version": "0.1.0",
    "inference": "not_integrated",
}

try:
    # A local health check must bypass any machine-wide HTTP proxy.
    with build_opener(ProxyHandler({})).open(
        "http://127.0.0.1:8765/v1/health", timeout=5
    ) as response:
        payload = json.load(response)
        if response.status != 200 or payload != expected:
            sys.exit("Unexpected health response")
except (URLError, ValueError):
    sys.exit("Health check failed. Start the local service on 127.0.0.1:8765.")

print(json.dumps(payload, indent=2))
print("Health response verified. Check the listener separately to confirm loopback binding.")
