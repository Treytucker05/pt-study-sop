@echo off
setlocal
cd /d "%~dp0"

set OBSIDIAN_VAULT=C:\Users\treyt\OneDrive\Desktop\pt-study-sop\PT School Semester 2
set OBSIDIAN_TOKEN=KcABtz0TxZeKs/AzUuWlVXO4Z4jKpbmEUfe2WPxb7BKNwJf6u+k7ZcGwf5nJB6OV

call npm install
node server.js

