# Workflow — Promotion Pipeline

- Role: The Scholar
- Objective: Convert findings into bounded system improvements.

## Procedure

1. **Discovery**: Identify an improvement candidate in a Report or Dossier.
2. **Draft RFC**: Use `scholar/TEMPLATES/change_proposal.md`.
   - Rule: Exactly ONE change only.
   - Requirement: Cite Brain logs + Pedagogy literature.
3. **Design Experiment**: Use `scholar/TEMPLATES/experiment_design.md`.
   - Rule: Exactly ONE variable only.
4. **Staging**: Place both files into `scholar/outputs/promotion_queue/`.
5. **Review**: Notify user via `walkthrough.md`.
6. **Promotion**: Once approved, (outside this workflow) changes may be manually applied to `sop/`.
