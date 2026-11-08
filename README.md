# NexaBuild UI

NexaBuild is a mobile-first PWA for configuring Android builds through GitHub Actions.

## Project structure

- `index.html` — application shell and semantic layout.
- `styles.css` — responsive Neobrutalism design system and component styles.
- `app.js` — GitHub connection, project analysis, build orchestration, logs, and history.
- `sw.js` — versioned offline cache and stale-asset cleanup.
- `manifest.json` — installable PWA metadata.
- `tools/validate_ui.py` — static UI validation used by CI.
- `.github/workflows/validate.yml` — syntax and asset validation on pushes and pull requests.

## Local validation

```bash
python tools/validate_ui.py
```

The validator checks duplicate HTML IDs, missing local assets, the NexaBuild PWA identity, JavaScript syntax, and CSS block balance.

## Deployment

Publish the repository root with GitHub Pages. Keep `index.html`, `app.js`, `styles.css`, `sw.js`, and `manifest.json` at the same root path so the service worker and local asset references resolve correctly.
