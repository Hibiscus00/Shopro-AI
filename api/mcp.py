import os
import sys
import anyio
from starlette.responses import HTMLResponse

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

HTML_STATUS_PAGE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopro AI - MCP Server Status</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0b0f17; color: #e2e8f0; margin: 0; padding: 2rem; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
        .card { background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; backdrop-filter: blur(12px); border-radius: 1rem; padding: 2.5rem; max-width: 650px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .badge { display: inline-block; background: #064e3b; color: #34d399; font-size: 0.85rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem; border: 1px solid #059669; }
        h1 { font-size: 1.75rem; margin: 0 0 0.5rem 0; color: #f8fafc; }
        p { color: #94a3b8; line-height: 1.6; margin: 0.5rem 0; }
        code { background: #0f172a; color: #38bdf8; padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-family: monospace; font-size: 0.9rem; }
        .tools-list { margin-top: 1.5rem; background: #0f172a; padding: 1rem 1.5rem; border-radius: 0.75rem; border: 1px solid #1e293b; }
        .tools-list ul { margin: 0.5rem 0 0 0; padding-left: 1.2rem; color: #cbd5e1; }
        .tools-list li { margin-bottom: 0.3rem; }
        .footer { margin-top: 2rem; font-size: 0.85rem; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 1rem; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">🟢 MCP Server Running Online</div>
        <h1>🛒 Shopro AI - MCP 服务可访问</h1>
        <p>本项目已成功部署并暴露标准 <strong>Model Context Protocol (MCP) Streamable HTTP</strong> 端点。</p>
        
        <p><strong>服务 URL 地址：</strong> <code>https://f.playe.top/mcp</code></p>
        <p><strong>传输协议：</strong> <code>streamable-http</code> (官方最新标准)</p>
        <p><strong>鉴权要求：</strong> 无需 Headers 验证 (符合赛事评估规范)</p>

        <div class="tools-list">
            <strong>🛠️ 已集成 7 大核心多模态工具：</strong>
            <ul>
                <li><code>extract_product_highlights</code> - 商品卖点与 Pain Point 提取</li>
                <li><code>generate_marketing_script</code> - CoT AIDA 营销带货脚本生成</li>
                <li><code>translate_marketing_script</code> - 多语种本地化脚本翻译</li>
                <li><code>synthesize_voice_tts</code> - StepAudio 2.5 情感化 TTS 语音</li>
                <li><code>enhance_prompt</code> - StepFun 画面分镜提示词增强</li>
                <li><code>submit_video_generation</code> - Seedance 2.0 异步视频生成</li>
                <li><code>query_video_status</code> - 视频合成进度与成品 URL 查询</li>
            </ul>
        </div>

        <p style="margin-top: 1.5rem; font-size: 0.9rem; color: #fbbf24;">
            💡 <strong>说明：</strong> 直接在浏览器打开本页面时会显示此状态面板；当 AI 客户端（如 Cursor、Cherry Studio、MCP Inspector 或赛事评测机）发起 JSON-RPC / SSE 握手时，将自动执行 MCP 初始化与工具调用。
        </p>

        <div class="footer">
            Shopro AI E-Commerce AIGC Video System MCP Server v1.28.1
        </div>
    </div>
</body>
</html>
"""

async def app(scope, receive, send):
    global _global_tg
    if scope["type"] == "http":
        scope["path"] = "/mcp"
        
        # Check Accept header for direct browser visits (human vs MCP client)
        accept = ""
        for k, v in scope.get("headers", []):
            if k.lower() == b"accept":
                accept = v.decode("utf-8", errors="ignore")
                break
        
        # If it's a GET request from a regular Web browser (accepting HTML), return status page
        if scope["method"] == "GET" and "text/event-stream" not in accept and "application/json" not in accept:
            response = HTMLResponse(HTML_STATUS_PAGE)
            await response(scope, receive, send)
            return

    # Auto-initialize StreamableHTTP session manager task group for serverless environments (Vercel)
    if session_manager._task_group is None:
        if _global_tg is None:
            tg_ctx = anyio.create_task_group()
            _global_tg = await tg_ctx.__aenter__()
        session_manager._task_group = _global_tg

    await mcp_app(scope, receive, send)
