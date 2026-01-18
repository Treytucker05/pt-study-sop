@echo off
setlocal
cd /d "%~dp0"

ngrok http 8787 --domain=treymcp.ngrok.app
