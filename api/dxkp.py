import json
import urllib.request
import urllib.error
import os

API_KEY = os.getenv("API_KEY") or os.getenv("VITE_CDANCE_API_KEY") or "sk-96rY4z4vJeBIP7SMbDIedu1yuq0KqQl4"
DXKP_BASE = "https://ai.dxkp.com"

async def app(scope, receive, send):
    if scope["type"] != "http":
        return

    method = scope.get("method", "GET")
    path = scope.get("path", "")

    # Handle CORS preflight OPTIONS request
    if method == "OPTIONS":
        headers = [
            (b"access-control-allow-origin", b"*"),
            (b"access-control-allow-headers", b"*"),
            (b"access-control-allow-methods", b"GET, POST, OPTIONS"),
            (b"content-type", b"application/json"),
        ]
        await send({"type": "http.response.start", "status": 200, "headers": headers})
        await send({"type": "http.response.body", "body": b""})
        return

    # Extract target path relative to /v1
    target_path = path.replace("/api/dxkp", "").replace("/dxkp-api", "")
    if not target_path.startswith("/"):
        target_path = "/" + target_path

    target_url = f"{DXKP_BASE}{target_path}"

    body_bytes = b""
    if method in ["POST", "PUT", "PATCH"]:
        more_body = True
        while more_body:
            message = await receive()
            body_bytes += message.get("body", b"")
            more_body = message.get("more_body", False)

    req_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShoproAI/1.0"
    }

    try:
        req = urllib.request.Request(target_url, data=body_bytes if body_bytes else None, headers=req_headers, method=method)
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read()
            status_code = resp.status
    except urllib.error.HTTPError as e:
        status_code = e.code
        resp_body = e.read()
    except Exception as e:
        status_code = 500
        resp_body = json.dumps({"error": str(e)}).encode("utf-8")

    headers = [
        (b"access-control-allow-origin", b"*"),
        (b"content-type", b"application/json"),
    ]
    await send({"type": "http.response.start", "status": status_code, "headers": headers})
    await send({"type": "http.response.body", "body": resp_body})
