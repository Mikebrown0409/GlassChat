# Mermaid Components (Archived)

All files in this folder have been **archived** as part of Phase 2 – the project no longer ships with the heavy `mermaid` runtime dependency by default.

If you need the original, fully-featured implementation of `MermaidDiagram` or the ERD editor:

1. Check the Git history prior to commit `<INSERT_COMMIT_SHA_AFTER_MERGE>`.
2. Or restore them by copying the files back over the lightweight stubs located in:
   - `src/components/chat/MermaidDiagram.tsx`
   - `src/components/diagram/ErdEditor.tsx`

This keeps the primary bundle lean while preserving the option to re-enable diagram rendering in future if required.
