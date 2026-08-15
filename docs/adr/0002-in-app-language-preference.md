# Persist an explicit in-app language preference

Choose Your Team offers System, English, and French in its About sheet, applies the choice immediately, and persists it locally. A manual language remains authoritative until the user returns to System; the development-only locale override remains higher priority so pseudolocalization and deterministic device testing continue to work without changing stored user state.

System remains the default because it respects platform expectations and native per-app language settings. Keeping it as an explicit option also lets users undo a manual choice, while storing only the preference—not the resolved locale—allows future system-language changes to take effect whenever System is selected.

## Consequences

The app must hydrate the preference before revealing localized UI, ignore Android foreground locale refreshes while English or French is selected, and treat missing, invalid, or unreadable stored values as System. A failed write does not undo the current session’s language, but the next launch uses the last successfully persisted value.
