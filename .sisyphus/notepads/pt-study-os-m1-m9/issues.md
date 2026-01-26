# Issues - PT Study OS M1-M9

## [2026-01-25T23:40] M1 Brain Ingestion Diagnosis

### Test Execution Results
- Test script: `bash scripts/test_brain_ingest.sh`
- Result: **Empty responses from all 3 tests**
- Root cause: **Flask server not running** (no response from localhost:5000)

### Environment Issue
- Python 3.12.3 available in WSL environment
- Flask module NOT installed (ModuleNotFoundError: No module named 'flask')
- pip3 NOT available in WSL environment
- No requirements.txt or setup.py in repo to install dependencies

### Code Analysis (Static)
- Route `/api/brain/ingest` **EXISTS** at `brain/dashboard/api_adapter.py:4680`
- Blueprint `adapter_bp` with prefix `/api` registered in `brain/dashboard/app.py:30`
- Route decorator: `@adapter_bp.route("/brain/ingest", methods=["POST"])`
- Full URL path: `/api/brain/ingest` ✓ (matches test script)
- No syntax errors in api_adapter.py or app.py (verified with py_compile)

### Route Function Logic (Verified)
1. **Empty content check** (line 4688-4695):
   - Returns: `{"message": "No content provided", "sessionSaved": false, "errors": ["content field is required"]}`
   
2. **WRAP format validation** (line 4706-4713):
   - Uses `is_wrap_format()` scoring system (needs score >= 2)
   - Returns: `{"message": "Content is not valid WRAP format", "sessionSaved": false, "errors": [...]}`
   
3. **Valid WRAP processing** (line 4715-4855):
   - Parses WRAP sections A/B/C/D
   - Validates session data
   - Inserts into database
   - Returns: `{"message": "...", "sessionSaved": true, "sessionId": N, "cardsCreated": N}`

### WRAP Format Scoring (from wrap_parser.py:12-37)
Patterns that add points:
- "Section A/B/C/D" headers: +2
- "A: " style markers: +2
- "### A)" style headers: +2
- "front:" + "back:" markers: +2
- "WRAP" keyword: +1
- "R1/R2/R3/R4" schedule: +1
- "```json" code block: +1
- **Minimum score: 2 to pass**

### Test Script Expectations
1. **Test 1 (empty)**: Should return error message
2. **Test 2 (plain text)**: Should return "not valid WRAP format" error
3. **Test 3 (valid WRAP)**: Should return `sessionSaved: true`

### Actual Issue
**The route is correctly defined and would work IF Flask were running.**
The problem is NOT a code issue - it's an **environment/deployment issue**:
- Flask dependencies not installed in WSL
- No pip available to install them
- Test script cannot connect to Flask server

### Next Steps (For M2)
1. Install Flask and dependencies (requires pip or venv setup)
2. Start Flask server: `python3 brain/dashboard_web.py`
3. Run test script: `bash scripts/test_brain_ingest.sh`
4. Verify all 3 tests return expected responses
5. Check Flask console for registered routes (app.py:38-42 prints them)

### Conclusion
**No code bug found.** The `/api/brain/ingest` route is properly defined and registered.
The test failures are due to Flask not running in the test environment.
