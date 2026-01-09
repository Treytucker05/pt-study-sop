# PT Study Brain - Troubleshooting Guide

## 🔧 **DASHBOARD NOT SHOWING CHANGES?**

### **Root Cause: Browser Cache**

Your browser caches HTML, CSS, and JavaScript files to load pages faster. When we update the dashboard, your browser may still show the old cached version.

---

## ✅ **SOLUTION: Force Refresh**

### **Method 1: Keyboard Shortcut (Easiest)**

1. Stop any running dashboard servers
2. Run: `RESTART_DASHBOARD.bat`
3. When browser opens, press: **Ctrl + Shift + R**
4. You should see "PT Study Brain v2.0" in the browser tab title

### **Method 2: Developer Tools**

1. Open browser
2. Press **F12** to open Developer Tools
3. Right-click the **refresh button** (⟳)
4. Select **"Empty Cache and Hard Reload"**

### **Method 3: Clear All Cache**

**Chrome/Edge:**
1. Press **Ctrl + Shift + Delete**
2. Select "Cached images and files"
3. Click "Clear data"

**Firefox:**
1. Press **Ctrl + Shift + Delete**
2. Select "Cache"
3. Click "Clear Now"

---

## 🗂️ **REPO FILE STRUCTURE**

### **Dashboard Files (brain/)**

| File | Purpose | Status |
|------|---------|--------|
| `dashboard_web.py` | ✅ **MAIN DASHBOARD** - Flask web server with embedded HTML | **USE THIS** |
| `dashboard.py` | ✅ Utility functions for analytics (no web server) | Helper only |
| `dashboard/` | ✅ Empty folder with README | Can be deleted |

**IMPORTANT:** Only `dashboard_web.py` runs the web server!

### **Launcher Scripts**

| File | Purpose |
|------|---------|
| `Run_Brain_All.bat` | ✅ **Main launcher** - Syncs logs + starts dashboard + opens browser |
| `Run_Brain_Sync.bat` | ✅ Sync logs only (no browser) |
| `test_dashboard.bat` | ✅ Quick test - just dashboard (no sync) |
| `RESTART_DASHBOARD.bat` | ✅ **Force restart** - Kills old servers + fresh start |

---

## 🧹 **CLEANUP RECOMMENDATIONS**

### **Safe to Delete:**

1. **Old test files:**
   ```
   test_dashboard.bat  (if you don't use it)
   ```

2. **Empty dashboard folder:**
   ```
   brain/dashboard/  (just has a README)
   ```

3. **Old batch files** (if any duplicates exist)

### **Keep These:**
- ✅ `Run_Brain_All.bat` - Primary launcher
- ✅ `Run_Brain_Sync.bat` - Useful for log syncing
- ✅ `RESTART_DASHBOARD.bat` - Troubleshooting tool
- ✅ `brain/dashboard_web.py` - Main dashboard server
- ✅ `brain/dashboard.py` - Analytics utilities

---

## 🐛 **COMMON ISSUES**

### **Issue 1: Tabs Still Not Working**

**Symptoms:**
- Clicking tabs does nothing
- Multiple tab panels visible at once
- Browser console shows no [Tab System] messages

**Solutions:**
1. Hard refresh browser (Ctrl + Shift + R)
2. Check browser console for JavaScript errors (F12 → Console)
3. Verify you're running the correct file:
   ```bash
   cd brain
   python dashboard_web.py
   ```
4. Check if `setupTabs()` is being called:
   - Open console (F12)
   - Look for: `[Tab System] Initializing with 5 tabs`

### **Issue 2: Old Colors/Emojis Still Showing**

**Symptoms:**
- Still seeing 📊, 📝, 📅 emoji icons
- Dark blue background (#0a0e27) instead of lighter (#1a1d2e)
- Browser tab says "PT Study Brain" not "PT Study Brain v2.0"

**Solutions:**
1. Browser is serving cached HTML
2. Force refresh: **Ctrl + Shift + R**
3. If still not working:
   ```bash
   # Stop all Python
   taskkill /F /IM python.exe

   # Restart fresh
   RESTART_DASHBOARD.bat

   # Force refresh browser
   Ctrl + Shift + R
   ```

### **Issue 3: Multiple Python Processes Running**

**Symptoms:**
- Dashboard won't start (port 5000 already in use)
- Changes not appearing
- Multiple CMD windows open

**Solutions:**
1. Kill all Python processes:
   ```bash
   taskkill /F /IM python.exe
   ```
2. Close all CMD windows titled "PT Study Brain Dashboard"
3. Run: `RESTART_DASHBOARD.bat`

### **Issue 4: Wrong Python File Running**

**Check which file is running:**
```bash
cd brain
python -c "import dashboard_web; print(len(dashboard_web._INDEX_HTML))"
```

**Expected output:** Around 103000+ characters

**If you get error or much smaller number:**
- Wrong file is being imported
- Old .pyc cache file exists

**Solution:**
```bash
# Delete Python cache
cd brain
del __pycache__\*.pyc /F /Q 2>nul
rmdir __pycache__ /Q 2>nul

# Restart dashboard
cd ..
RESTART_DASHBOARD.bat
```

---

## 📊 **VERIFY CHANGES WORKED**

### **Checklist:**

Open browser to http://127.0.0.1:5000 and verify:

- [ ] Browser tab title shows: **"PT Study Brain v2.0"**
- [ ] Navigation bar has tabs IN the navbar (not below)
- [ ] No "Dashboard" button (removed)
- [ ] Tab labels are text: "Overview", "Sessions", etc. (NO emojis)
- [ ] Active tab has **BLUE background** with **WHITE text**
- [ ] Background color is lighter dark blue (not super dark)
- [ ] Text is **WHITE** (#ffffff) and easy to read
- [ ] All tabs are **CLICKABLE** (Overview, Sessions, Syllabus, Scholar, Tutor)

### **Browser Console Check:**

Press **F12** → **Console** tab, you should see:

```
[Tab System] Initializing with 5 tabs
[Tab System] Showing default tab: overview
```

When you click a tab:
```
[Tab System] Switching to tab: sessions
[Tab System] Activated button: sessions
[Tab System] Showing panel: tab-sessions
```

---

## 🔍 **DEBUGGING STEPS**

If problems persist:

1. **Verify file contents:**
   ```bash
   cd brain
   python -c "import dashboard_web; print('Has Overview:', 'Overview' in dashboard_web._INDEX_HTML); print('Has emojis:', '📊' in dashboard_web._INDEX_HTML)"
   ```
   **Expected:** `Has Overview: True` and `Has emojis: False`

2. **Check running processes:**
   ```bash
   powershell -Command "Get-Process python | Select-Object Id, Path"
   ```

3. **Kill all and restart:**
   ```bash
   taskkill /F /IM python.exe
   RESTART_DASHBOARD.bat
   ```

4. **Check port 5000:**
   ```bash
   netstat -ano | findstr :5000
   ```
   If something is using port 5000, kill it or change Flask port

5. **View HTML source in browser:**
   - Open http://127.0.0.1:5000
   - Right-click → "View Page Source"
   - Look for: `<!-- PT Study Brain Dashboard v2.0`
   - If you see old version comment or none, browser is caching

---

## 📝 **REPO CLEANUP PLAN**

### **Optional Cleanup (Won't Break Anything):**

```bash
# Delete empty dashboard folder
rmdir brain\dashboard /S /Q

# Delete old test script (if not using)
del test_dashboard.bat

# Delete Python cache files
del brain\__pycache__\*.pyc /F /Q
rmdir brain\__pycache__ /Q

# Delete old .log files (if any)
del brain\*.log
```

### **DO NOT DELETE:**
- `brain/dashboard_web.py` - Main dashboard
- `brain/dashboard.py` - Analytics helper
- `Run_Brain_All.bat` - Main launcher
- `brain/config.py` - Configuration
- `brain/db_setup.py` - Database setup
- Any `.db` files in `brain/data/`

---

## 🆘 **STILL NOT WORKING?**

If you've tried everything above and it's still not working:

1. **Take a screenshot** of the dashboard
2. **Copy browser console logs** (F12 → Console → right-click → Save as...)
3. **Run this diagnostic:**
   ```bash
   cd brain
   python -c "import dashboard_web; print('File loaded'); print('HTML size:', len(dashboard_web._INDEX_HTML)); print('Has v2.0:', 'v2.0' in dashboard_web._INDEX_HTML)"
   ```
4. **Check view source** in browser - does it show v2.0?
5. **Try a different browser** (if using Chrome, try Firefox or Edge)

---

## ✅ **SUCCESS INDICATORS**

You'll know it worked when:

- ✅ Browser tab says "PT Study Brain v2.0"
- ✅ Tabs are IN the navbar, no separate row
- ✅ No emoji icons, just clean text
- ✅ Active tab is BRIGHT BLUE with WHITE text
- ✅ Text is highly readable (pure white on dark background)
- ✅ All tabs are clickable and switch content
- ✅ Console shows `[Tab System]` messages

**If you see ALL of these, it's working correctly!**
