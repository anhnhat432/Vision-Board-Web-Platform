# Kilo Tool Call Safety

- When Kilo provides tool names, use only the exact tool names in that active session.
- Never call or emit a tool named `invalid`.
- For normal Kilo coding sessions in this repository, valid tools commonly include `read`, `glob`, `grep`, `edit`, `write`, `bash`, `webfetch`, `question`, `skill`, `suggest`, and `plan_exit`.
- If no valid tool applies, answer in plain text, ask a concise question with `question`, or finish with `plan_exit`.
- Do not print raw XML, JSON, or pseudo tool-call fragments in chat. Let Kilo invoke tools through its runtime.
