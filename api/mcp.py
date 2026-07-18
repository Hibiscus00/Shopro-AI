import os
import sys

# Add the 'mcp/' subdirectory to sys.path
mcp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mcp")
sys.path.insert(0, mcp_dir)

# Import the local server script directly as a top-level module
import mcp_shopro_server

# Expose Starlette app
mcp_app = mcp_shopro_server.mcp.streamable_http_app()

async def app(scope, receive, send):
    if scope["type"] == "http":
        # Force path to be "/mcp" to guarantee matching FastMCP's internal route
        scope["path"] = "/mcp"
    await mcp_app(scope, receive, send)
