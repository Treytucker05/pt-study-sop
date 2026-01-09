@echo off
echo ============================================
echo VERIFYING DASHBOARD CHANGES
echo ============================================
echo.

cd /d "%~dp0brain"

echo Checking dashboard_web.py for changes...
echo.

python -c "import dashboard_web; html = dashboard_web._INDEX_HTML; print('File loaded successfully'); print(''); print('=== VERIFICATION RESULTS ==='); print(''); print('1. Has v2.0 version:', 'v2.0' in html); print('2. Has new colors:', '#1a1d2e' in html); print('3. Has white text:', 'text-primary: #ffffff' in html); print('4. No old emojis:', chr(128202) not in html); print('5. Tabs in navbar:', 'data-tab' in html); print('6. Blue accent:', '#4a90e2' in html); print(''); print('HTML size:', len(html), 'chars'); print(''); all_good = 'v2.0' in html and '#1a1d2e' in html and chr(128202) not in html; print('STATUS:', 'ALL CHANGES PRESENT' if all_good else 'CHANGES MISSING'); print(''); if all_good: print('If browser shows old version:'); print('  1. Run RESTART_DASHBOARD.bat'); print('  2. Press Ctrl + Shift + R'); else: print('ERROR: Changes not in file!')"

echo.
echo.
pause
