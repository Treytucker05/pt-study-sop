# SOP Method Library

YAML-based study method library. YAML specs are the **single source of truth** — markdown docs, DB seeds, and runtime bundles all derive from YAML.
Canonical stage model is CP-MSS v1.0: `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`.

## Folder Structure

```
sop/
  library/
    methods/          # M-XXX-NNN.yaml — 50 method block specs
    chains/           # C-XX(X)-NNN.yaml — 19 chain specs
    meta/
      taxonomy.yaml   # Categories, mechanisms, stages, class types
      version.yaml    # Library version (semver)
    templates/
      session_log_template.yaml
    research/
      prompts/        # Scholar research prompt templates
      tickets/        # ET-NNN.yaml evidence tickets
    15-method-library.md  # AUTO-GENERATED from YAML — do not edit
  runtime/
    knowledge_upload/ # AUTO-GENERATED runtime bundles — do not edit
  tools/
    build_runtime_bundle.py  # Build pipeline: YAML -> markdown -> runtime
    validate_library.py      # Schema + referential integrity checks
    gap_radar.py             # Coverage gap analysis
    new_ticket.py            # Evidence ticket scaffolder
    bump_version.py          # Semver version bumping
    convert_seed_to_yaml.py  # One-time conversion (already run)
    models.py                # Pydantic v2 models (tools only)
  tests/
    golden/           # Golden baseline files for output comparison
  RELEASELOG.md       # Version history
```

## Quick Reference

### Validate the library
```bash
python sop/tools/validate_library.py           # exit 0=pass, 1=errors
python sop/tools/validate_library.py --strict   # warnings become errors
python sop/tools/validate_library.py --json     # structured output
```

### Build runtime bundles
```bash
python sop/tools/build_runtime_bundle.py        # auto-detects YAML
python sop/tools/build_runtime_bundle.py --update-golden  # refresh baselines
```

### Run gap analysis
```bash
python sop/tools/gap_radar.py                   # markdown report
python sop/tools/gap_radar.py --json            # structured JSON
python sop/tools/gap_radar.py --top 5           # limit items per category
```

### Create an evidence ticket
```bash
python sop/tools/new_ticket.py --target-type METHOD --target-id M-PRE-001
python sop/tools/new_ticket.py --target-type CHAIN --target-id C-FE-001 --question "Does this chain work for low-energy students?"
```

### Bump version
```bash
python sop/tools/bump_version.py patch -m "Fix evidence citations"
python sop/tools/bump_version.py minor -m "Add 5 new method blocks"
```

### Run tests
```bash
pytest sop/tests/ -v                            # all SOP tests
pytest sop/tests/test_build_golden.py -v        # golden output tests
pytest sop/tests/test_validate_library.py -v    # validator tests
```

## How to Add a Method

1. Create `sop/library/methods/M-{CAT}-{NNN}.yaml`:
   ```yaml
   id: M-CAT-NNN
   name: Method Name
   control_stage: PRIME # one of: PRIME, CALIBRATE, ENCODE, REFERENCE, RETRIEVE, OVERLEARN
   category: prime      # one of: prime, calibrate, encode, reference, retrieve, overlearn
   description: What this method does.
   default_duration_min: 5
   energy_cost: medium   # low, medium, high
   best_stage: first_exposure  # first_exposure, review, exam_prep, consolidation
   status: draft
   tags: [retrieval, active]
   evidence:
     citation: "Author (Year)"
     finding: "Brief finding"
     source: "source document"
   evidence_raw: "Author (Year); brief finding"
   ```
2. Run `python sop/tools/validate_library.py`
3. Run `python sop/tools/build_runtime_bundle.py`
4. Run `python sop/tools/build_runtime_bundle.py --update-golden`
5. Run `pytest sop/tests/ -v`

## How to Add a Chain

1. Create `sop/library/chains/C-{XX}-{NNN}.yaml`:
   ```yaml
   id: C-XX-NNN
   name: Chain Name
   description: When to use this chain.
   blocks:
     - M-PRE-001
     - M-ENC-001
     - M-RET-001
   context_tags:
     stage: first_exposure
     energy: high
     time_available: 30
   is_template: true
   status: draft
   ```
2. Validate, build, update golden, test (same as method workflow).

## Generator Contract

`build_methods_from_yaml()` produces `15-method-library.md` with these exact headings (required by the runtime build parser):

| Heading | Source |
|---------|--------|
| `## §1 Purpose` | Hardcoded |
| `## §2 Method Block Schema` | taxonomy.yaml |
| `## §2.1 Block Catalog ({N} blocks)` | methods/*.yaml |
| `## §4 Template Chains ({N} chains)` | chains/*.yaml |
| `## §6 Context Dimensions` | taxonomy.yaml |

The `build_methods()` parser uses `startswith` prefix matching for dynamic headings.

## Chore Loop

Regular library maintenance cycle:

1. **Inventory**: `python sop/tools/gap_radar.py`
2. **Gap scan**: Review report for missing evidence, orphan methods, uncovered mechanisms
3. **Research ticket**: `python sop/tools/new_ticket.py --target-type METHOD --target-id M-XXX-NNN`
4. **Research**: Use Scholar passover prompt (`sop/library/research/prompts/scholar_research_passover.md`)
5. **Patch**: Edit YAML files based on research findings
6. **Validate**: `python sop/tools/validate_library.py --strict`
7. **Build**: `python sop/tools/build_runtime_bundle.py --update-golden`
8. **Test**: `pytest sop/tests/ -v`
9. **Release**: `python sop/tools/bump_version.py patch -m "description"`

## Dependencies

| File | Dependencies | Scope |
|------|-------------|-------|
| `requirements.txt` | PyYAML | Runtime (seed_methods.py YAML loading) |
| `requirements-tools.txt` | PyYAML + Pydantic v2 | Tools only (sop/tools/) |

Pydantic is **never** imported by `brain/`, `scholar/`, or `seed_methods.py`.
