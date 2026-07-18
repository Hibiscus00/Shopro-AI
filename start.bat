@echo off
title Shopro AI Project Starter
chcp 65001 > nul
cls

echo ===================================================
echo 🛒 Shopro AI - 自动启动控制台
echo ===================================================
echo.
echo 请选择启动模式:
echo [1] 启动前端开发服务器 (Vite)
echo [2] 启动 MCP 服务 (Python Streamable-HTTP)
echo [3] 启动完整服务 (前端开发服务器 + MCP 服务)
echo [4] 安装/更新依赖 (npm install + pip install)
echo [5] 退出
echo.
set /p opt="请输入选项 (1-5): "

if "%opt%"=="1" goto start_front
if "%opt%"=="2" goto start_mcp
if "%opt%"=="3" goto start_all
if "%opt%"=="4" goto install_deps
if "%opt%"=="5" goto end
goto start_all

:start_front
echo.
echo 🚀 正在启动前端开发服务器...
start cmd /k "npm run dev"
goto end

:start_mcp
echo.
echo 🐍 正在启动 MCP 服务...
start cmd /k "cd mcp && python mcp_shopro_server.py"
goto end

:start_all
echo.
echo 🚀 正在同时启动前端开发服务器与 MCP 服务...
start "Shopro Frontend" cmd /k "npm run dev"
start "Shopro MCP Server" cmd /k "cd mcp && python mcp_shopro_server.py"
goto end

:install_deps
echo.
echo 📦 正在安装前端依赖 (npm install)...
call npm install
echo.
echo 🐍 正在安装 Python MCP 依赖 (pip install)...
cd mcp
pip install -r requirements_mcp.txt
cd ..
echo.
echo ✅ 依赖安装完成！
pause
goto start_all

:end
echo.
echo 💡 服务启动窗口已在新控制台打开。
echo ➜ 前端访问地址: http://localhost:5173/
echo ➜ MCP 服务地址: http://localhost:8080/mcp
echo.
pause
