import os
import sys

# Add project root to sys.path so we can import from mcp/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.mcp_shopro_server import mcp

# Expose Starlette app
mcp_app = mcp.streamable_http_app()

async def app(scope, receive, send):
    if scope["type"] == "http":
        # Force path to be "/mcp" to guarantee matching FastMCP's internal route
        scope["path"] = "/mcp"
    await mcp_app(scope, receive, send)
