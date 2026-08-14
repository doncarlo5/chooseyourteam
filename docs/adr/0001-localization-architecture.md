# Use Expo Localization with Lingui catalogs

Choose Your Team uses `expo-localization` to read the ordered locale preferences exposed consistently by iOS, Android, and web, and to declare English and French to the native operating systems. This avoids maintaining platform-specific locale bridges and enables native per-app language settings.

Lingui 6 owns message extraction, runtime formatting, plurals, and rich-text placeholders. It was selected over a hand-written translation dictionary because ICU messages keep complete grammatical units together, while its React bindings preserve styled content without sentence concatenation.

PO files are the translation source because they retain translator comments, contexts, plural forms, and compatibility with standard translation tooling. Lingui-generated IDs avoid coupling application code to a second, manually maintained key taxonomy; message context distinguishes identical English wording when its meaning differs.

Catalogs compile to committed TypeScript instead of being transformed by Lingui's Metro integration. The project already uses the Uniwind Metro transformer, so checked-in compiled catalogs avoid composing another transformer and make catalog freshness and completeness independently verifiable in CI.

## Considered options

- Hand-written JSON dictionaries were rejected because they provide weaker ICU, extraction, and translator-context workflows.
- Explicit semantic message keys were rejected because they duplicate naming work and can drift from source copy.
- Runtime PO or Metro compilation was rejected because it complicates the existing Metro pipeline and makes generated output less visible during review.

## Consequences

English remains the source and fallback locale. French PO entries must be complete, generated TypeScript catalogs must remain current, and adding native supported locales requires a new native build rather than only an over-the-air update.
