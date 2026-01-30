# Tools

## build_runtime_bundle.py
Generates the Custom GPT knowledge upload files from canonical sources in `sop/src/`.

Run:
```
python sop/tools/build_runtime_bundle.py
```

Outputs:
- `sop/runtime/knowledge_upload/00_INDEX_AND_RULES.md`
- `sop/runtime/knowledge_upload/01_MODULES_M0-M6.md`
- `sop/runtime/knowledge_upload/02_FRAMEWORKS.md`
- `sop/runtime/knowledge_upload/03_ENGINES.md`
- `sop/runtime/knowledge_upload/04_LOGGING_AND_TEMPLATES.md`
- `sop/runtime/knowledge_upload/05_EXAMPLES_MINI.md`

## validate_logs.py
Validates Tracker or Enhanced JSON keys against schema v9.2.

Run:
```
python sop/tools/validate_logs.py path/to/log.json --schema tracker
python sop/tools/validate_logs.py path/to/log.json --schema enhanced
```
