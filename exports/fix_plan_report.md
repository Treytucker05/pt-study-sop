# Fix Plan Report

## Chain Validation Failures (2 items)

1. `chains_with_issues` is currently `0` (not reproducible as a live failure).
   - Evidence:
     - `python tools/validate_chains.py` output: `chains_with_issues: 0`.
     - `exports/chain_validation_report.md:5-9` shows all summary counts at `0`.
   - Minimal fix location: none required right now.

2. Prior "2 chains with issues" appears stale relative to the current workspace state.
   - Evidence:
     - `exports/chain_validation_report.md:14-28` marks all listed chains as `ok`.
   - Minimal fix location if this reappears: chain YAMLs in `sop/library/chains/` first; validator logic only if chain data is valid but flagged incorrectly.

## call_llm Patch Failures (root cause + correct patch targets)

- Root cause:
  - Failing tests patch `chain_runner.call_llm`, but `chain_runner` no longer exposes/uses `call_llm`.
  - `brain/chain_runner.py:19` imports `model_call` and `brain/chain_runner.py:100` calls `model_call(...)`.
  - Test decorators still target old symbol at:
    - `brain/tests/test_chain_runner.py:183`
    - `brain/tests/test_chain_runner.py:210`
    - `brain/tests/test_chain_runner.py:233`
    - `brain/tests/test_chain_runner.py:260`
  - Runtime failure from pytest:
    - `AttributeError: module 'chain_runner' ... does not have the attribute 'call_llm'`.

- Correct patch target:
  - Patch the name used by the system under test: `chain_runner.model_call`.

- Minimal fix:
  - Update those 4 decorators from `@patch("chain_runner.call_llm", ...)` to `@patch("chain_runner.model_call", ...)`.

## Obsidian Regex Failure (exact regex + minimal fix)

- Failing location:
  - `brain/obsidian_merge.py:235`

- Exact regex currently used:
  - `rf"(?<!\\[)\\b{re.escape(term)}\\b"`

- Failure:
  - `re.PatternError: unterminated character set at position 6` in `brain/tests/test_obsidian_patch.py`.

- Root cause:
  - The lookbehind token is over-escaped (`\\[`) in a raw regex string, producing an invalid pattern form at compile time in this runtime.

- Minimal fix:
  - Use single escaping for literal `[` in the regex:
    - `rf"(?<!\[)\b{re.escape(term)}\b"`
  - Keep behavior otherwise unchanged.

## Artifact Dispatch Failure (dispatch table mismatch + fix)

- Failing test:
  - `brain/tests/test_artifact_validators.py::TestValidateStepOutput::test_dispatches_cards`

- Relevant code:
  - Dispatch map includes cards:
    - `brain/artifact_validators.py:341-347` has `"cards": validate_anki_cards`.
  - But `validate_step_output` short-circuits for cards unless method is `M-OVR-002`:
    - `brain/artifact_validators.py:359-362`.

- Root cause:
  - A method-specific normalization guard was implemented as a hard return, which blocks generic card validation for other `artifact_type="cards"` blocks (including tests with no `method_id`).

- Minimal fix:
  - Keep method-specific normalization for `M-OVR-002`, but do not return early.
  - Change logic to:
    - if cards + method is `M-OVR-002` -> normalize
    - always dispatch cards validator afterward.
