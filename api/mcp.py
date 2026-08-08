import os
import sys
import anyio

# Add the 'mcp/' subdirectory to sys.path
mcp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mcp")
if mcp_dir not in sys.path:
    sys.path.insert(0, mcp_dir)

# Import the local server script directly as a top-level module
import mcp_shopro_server

# Disable DNS Rebinding Protection for public Vercel production deployment.
# This prevents "Invalid Host header" (421) and Origin mismatch (403) errors
# when accessed via custom domains or external AI client integrations (e.g. Cursor, Cherry Studio).
mcp_shopro_server.mcp.settings.transport_security.enable_dns_rebinding_protection = False

# Expose Starlette app & session manager
mcp_app = mcp_shopro_server.mcp.streamable_http_app()
session_manager = mcp_shopro_server.mcp.session_manager

_global_tg = None

async def app(scope, receive, send):
    global _global_tg
    if scope["type"] == "http":
        # Force path to be "/mcp" to guarantee matching FastMCP's internal route
        scope["path"] = "/mcp"
    
    # Auto-initialize StreamableHTTP session manager task group for serverless environments (Vercel)
    if session_manager._task_group is None:
        if _global_tg is None:
            tg_ctx = anyio.create_task_group()
            _global_tg = await tg_ctx.__aenter__()
        session_manager._task_group = _global_tg

    await mcp_app(scope, receive, send)
