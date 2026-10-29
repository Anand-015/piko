"""Health contract and current service boundaries; run with the service venv."""

import sys
import runpy
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/local-service"))

from httpx import ASGITransport, AsyncClient

from app.main import app


class LauncherTests(unittest.TestCase):
    def test_default_launcher_is_loopback_only_without_access_logs(self):
        with patch("uvicorn.run") as run:
            runpy.run_module("app", run_name="__main__")
        run.assert_called_once_with(
            "app.main:app", host="127.0.0.1", port=8765, reload=True, access_log=False
        )


class ServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")
        self.addAsyncCleanup(self.client.aclose)

    async def test_health_contract(self):
        response = await self.client.get("/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "status": "ok",
            "service": "local-voice-form-assistant",
            "version": "0.1.0",
            "inference": "not_integrated",
        })

    async def test_no_cors_bridge(self):
        response = await self.client.options("/v1/health", headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET",
        })
        self.assertEqual(response.status_code, 405)
        self.assertNotIn("access-control-allow-origin", response.headers)
        health = await self.client.get("/v1/health", headers={"Origin": "https://example.com"})
        self.assertNotIn("access-control-allow-origin", health.headers)

    async def test_no_inference_or_remote_docs_routes(self):
        self.assertEqual(set(app.openapi()["paths"]), {"/v1/health"})
        for route in ("/interpret", "/v1/interpret", "/api/v1/interpret", "/transcribe", "/synthesize", "/docs", "/redoc"):
            with self.subTest(route=route):
                response = await self.client.get(route)
                self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
