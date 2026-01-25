# Workflow — Build System Map

- Role: The Scholar
- Objective: Inventory and map the Tutor v9.2 architecture.

## Procedure

1. **Inventory**: Read `scholar/inputs/audit_manifest.json` for all allowlisted `tutor_paths`.
2. **Scan**: For each path, identify:
   - Purpose (commented objective)
   - Inputs (required markdown files or metadata)
   - Outputs (logs, csv, or state updates)
   - Dependencies (other M-series or engine files called)
3. **Draft Map**: Use `scholar/TEMPLATES/system_map.md`.
4. **Update Glossary**: Add any new internal terms to `scholar/outputs/system_map/glossary.md`.
5. **Human Review**: Submit for review via `walkthrough.md`.
