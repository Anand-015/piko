"""Step 3 health-only API. No inference or extension integration yet."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="Local Voice Form Assistant Service",
    version="0.1.0",
    # The default interactive documentation loads assets from a public CDN.
    docs_url=None,
    redoc_url=None,
)


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["local-voice-form-assistant"]
    version: Literal["0.1.0"]
    inference: Literal["not_integrated"]


@app.get("/v1/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="local-voice-form-assistant",
        version="0.1.0",
        inference="not_integrated",
    )
