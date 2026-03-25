### ROLE
Expert Data Engineer & API Architect.

### OBJECTIVE
Refactor `plan.json` into a high-quality, consistent, and data-driven API schema. Move from unstructured "notes" to typed objects.

### IMPROVEMENT RULES
1. **Typed Details**: Replace `type: "note"` with specific types: `exercise`, `target_pace`, `nutrition`, `recovery`.
2. **Data Extraction**: Extract metrics (sets, reps, minutes, km/h, min/km) into numeric fields.
3. **Consistency**: Ensure all `duration` are integers. Add `intensityScore` (1-10) based on `intensityLabel`.
4. **Logic**: Use a Python or Node script to process the 19 weeks to ensure the logic is identical everywhere.

### TOKEN SAVING COMMANDS (MANDATORY)
- **DO NOT** print the full JSON in the chat.
- **DO NOT** summarize every single change.
- **WORKFLOW**: 
  1. Use `read_file` only on the first 2 weeks to understand the patterns.
  2. Propose the TypeScript interface.
  3. Once I validate, write and run a local script to transform `plan.json` directly on disk.
  4. Only show me a 5-line sample of the result to confirm.

Analyze the patterns in the first 2 weeks now.