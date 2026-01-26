# Problems - PT Study OS M1-M9

## [2026-01-25T23:50] M1 Blocker - Flask Server Not Running

### Problem
Cannot verify M1 Brain ingestion functionality because Flask server is not running.

### Evidence
- User ran `bash scripts/test_brain_ingest.sh` from PowerShell
- All 3 tests returned empty responses (curl gets nothing)
- jq errors are cosmetic (no JSON to parse)
- Confirmed in WSL: no process listening on port 5000

### Impact
- Cannot verify Task 1 diagnosis
- Cannot test Tasks 2-5 (date/semester filters)
- Cannot run pytest tests (require Flask app context)
- Cannot verify frontend changes in browser

### Required Action
**User must start Flask server before we can proceed:**

```powershell
# In PowerShell (keep this running)
cd C:\pt-study-sop
python brain/dashboard_web.py
```

Then in a **new terminal**:
```powershell
cd C:\pt-study-sop
bash scripts/test_brain_ingest_no_jq.sh
```

### Alternative: Proceed Without Verification
If user cannot start Flask now, we can:
1. Implement M1 tasks 2-5 (date/semester filters) based on code analysis
2. User verifies later when Flask is running
3. Fix any issues in a follow-up session

**Waiting for user decision on how to proceed.**
