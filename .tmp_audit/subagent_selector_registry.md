## Findings (ordered by severity)

1. **P0 — Registry integrity audit blocker / mismatch risk**
   - Evidence: [`selector_bridge.py:22`](/C:/pt-study-sop/brain/selector_bridge.py:22)
   - `brain/tutor_method_registry.py` is not present at the provided path, and bridge logic uses local `_CHAIN_CATALOG`.
   - **Risk impact:** selector output cannot be validated against the requested registry source, so selector→registry integrity checks are currently impossible in this scope.

2. **P1 — `time_available` can hard-fail routing on non-numeric input**
   - Evidence: [`selector.py:32`](/C:/pt-study-sop/brain/selector.py:32), [`selector.py:83`](/C:/pt-study-sop/brain/selector.py:83), [`selector_bridge.py:110`](/C:/pt-study-sop/brain/selector_bridge.py:110)
   - Numeric comparison is done without type normalization.
   - **Risk impact:** runtime `TypeError` can abort chain selection.

3. **P1 — `recent_errors` shape is assumed, can crash or misroute**
   - Evidence: [`selector_bridge.py:104`](/C:/pt-study-sop/brain/selector_bridge.py:104), [`selector_bridge.py:105`](/C:/pt-study-sop/brain/selector_bridge.py:105), [`selector.py:85`](/C:/pt-study-sop/brain/selector.py:85)
   - First element extraction assumes list-like, string-compatible payload.
   - **Risk impact:** bridge can throw (for some non-list payloads) or derive incorrect `dominant_error`.

4. **P1 — Policy hardening overrides are dropped by bridge**
   - Evidence: [`selector.py:68`](/C:/pt-study-sop/brain/selector.py:68), [`selector_bridge.py:108`](/C:/pt-study-sop/brain/selector_bridge.py:108), [`selector_bridge.py:168`](/C:/pt-study-sop/brain/selector_bridge.py:168)
   - Selector returns knob overrides, but bridge stores as `_knob_overrides` and does not return/apply them.
   - **Risk impact:** runtime method-policy hardening knobs are silently lost.

5. **P1 — Fallback safety issue: unknown `chain_id` keeps id but uses STD metadata**
   - Evidence: [`selector_bridge.py:81`](/C:/pt-study-sop/brain/selector_bridge.py:81), [`selector_bridge.py:169`](/C:/pt-study-sop/brain/selector_bridge.py:169), [`selector_bridge.py:170`](/C:/pt-study-sop/brain/selector_bridge.py:170)
   - Unknown chain falls back to STD metadata but preserves original `chain_id`.
   - **Risk impact:** identity/metadata divergence can hide configuration drift and break downstream assumptions.

6. **P2 — Numeric coercion in scoring path lacks defensive parsing**
   - Evidence: [`selector_bridge.py:153`](/C:/pt-study-sop/brain/selector_bridge.py:153), [`selector_bridge.py:156`](/C:/pt-study-sop/brain/selector_bridge.py:156), [`selector_bridge.py:159`](/C:/pt-study-sop/brain/selector_bridge.py:159)
   - Direct `int()` / `float()` coercions on external knob values.
   - **Risk impact:** malformed values can raise before score normalization/fallback.

7. **P2 — Error-policy matching is case-sensitive**
   - Evidence: [`selector.py:52`](/C:/pt-study-sop/brain/selector.py:52), [`selector.py:56`](/C:/pt-study-sop/brain/selector.py:56), [`selector.py:60`](/C:/pt-study-sop/brain/selector.py:60), [`selector.py:64`](/C:/pt-study-sop/brain/selector.py:64), [`selector_bridge.py:105`](/C:/pt-study-sop/brain/selector_bridge.py:105)
   - Branches match exact strings (e.g., `Speed` vs `speed`).
   - **Risk impact:** semantically valid inputs may skip intended policy corrections.

8. **P2 — Selector contract mismatch (“7 knobs” vs routing inputs actually used)**
   - Evidence: [`selector.py:7`](/C:/pt-study-sop/brain/selector.py:7), [`selector.py:12`](/C:/pt-study-sop/brain/selector.py:12), [`selector_bridge.py:87`](/C:/pt-study-sop/brain/selector_bridge.py:87), [`selector_bridge.py:108`](/C:/pt-study-sop/brain/selector_bridge.py:108)
   - Bridge accepts broader knob set, but selector routing uses a narrower subset.
   - **Risk impact:** callers may assume knobs affect routing when they do not.

## Missing checks/tests

1. Add type/range tests for `time_available` at selector entry (`None`, numeric string, non-numeric string).
2. Add payload-shape tests for `recent_errors` (`[]`, `["Speed"]`, `"Speed"`, `{"x":1}`, non-string first element).
3. Add an integration test proving selector knob overrides are surfaced/applied through bridge output.
4. Add unknown-`chain_id` fallback tests asserting **consistent** `chain_id`↔`chain_name` behavior.
5. Add malformed numeric knob tests for score path (`time_available`, `prior_rsr`, `prior_calibration_gap`) to verify non-crashing behavior.
6. Add case-normalization tests for `dominant_error` (`Speed/speed`, `Procedure/procedure`, etc.).
7. Add precedence tests for low-energy short-session branch vs error-based overrides.
8. Add `_CHAIN_CATALOG` schema tests (missing `chain_name` or `selected_blocks`) and reload-path tests.
9. Add dependency-order flag matrix tests for `dependency_fix_applied` (ordered, reversed, missing values).
10. Add selector→method-registry alignment tests once `brain/tutor_method_registry.py` path is confirmed.

## Quick confidence notes for uncertain items

- **High confidence:** findings on type crashes, dropped knob overrides, and fallback chain metadata mismatch (directly evidenced by the cited lines).
- **Medium confidence:** contract-mismatch severity (could be intentional design, but still a runtime expectation risk).
- **Constrained confidence on registry alignment:** requested `brain/tutor_method_registry.py` file was not present at that path, so registry-side integrity could not be audited.

## Next steps

1. Confirm the correct location/name of `tutor_method_registry.py` so the selector→registry mismatch audit can be completed.
2. Prioritize P1 protections first: input guards (`time_available`, `recent_errors`) and knob-override propagation through bridge output.
3. Add the 10 tests above as a focused runtime-hardening test suite for selector/bridge behavior.