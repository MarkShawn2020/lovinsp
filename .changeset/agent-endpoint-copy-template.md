---
"@lovinsp/core": minor
---

feat: agent endpoint and configurable copy template

- Add agent endpoint: trigger a local coding agent (e.g. Codex) from the inspector panel with the selected element's source context. Includes token auth, project-root path validation, request body limits, and configurable command/prompt template.
- Copy behavior: default copy result is now `file:line:column` only (no ancestor chain suffix). Use the `{ancestorChain}` placeholder in the `behavior.copy` template to include the component chain, e.g. `'{file}:{line}:{column}({ancestorChain})'`.
