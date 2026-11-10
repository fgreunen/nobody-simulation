# Repository navigation

- Behavior: `README.md`; rationale: `docs/design.md`. Read `docs/history/` only for historical questions.
- Physics: `src/physics.ts`, `tests/physics.test.ts`; body lifecycle also touches `src/{universe,camera,main}.ts`.
- Verification: `docs/verification.md`; use focused `npm run -s` checks while iterating, then `npm run -s check` once for completion. Read failure summaries before log sections; full logs stay on disk.
- Search with `rg`, then read bounded sections. Reuse already-read guidance; load only applicable skills.
- Keep source fixed during checks; rerun affected checks after edits.
- Stay local; publish, deploy, or push only on explicit request.
