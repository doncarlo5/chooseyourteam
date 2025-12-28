# AGENTS.md

## Coding rules

- For styling, use the `cn` utility from `@heroui`.
- For UI, use components from the `components` folder.
- Define props types inside the component when possible; move them outside only if reused.
- Always name the function parameter `props` to make prop usage obvious in the file.
- Never destructure `props`; access via `props.*` explicitly.
- Prefer early returns so logic stays inside the component and it remains fully independent.
- Expo Router route files must use a default export, not a named export.
- When using functions and useEffect, always put the function outside from the useEffect.
