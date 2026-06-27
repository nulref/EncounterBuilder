# Encounter Builder

A lightweight, browser-based D&D encounter builder using creatures from the 2024 *Monster Manual*. Assemble a party, choose monster groups, compare the encounter against the 2024 XP budgets, and roll individual treasure.

## Features

- Four party-member rows by default, with add and remove controls
- Party level inputs for levels 1–20
- Monster rows filtered by challenge rating
- 503 monster stat-block names grouped across 30 CR values
- Quantity controls for each monster group
- Dynamic Low, Moderate, and High XP thresholds for mixed-level parties
- Total and per-character XP awards
- Individual treasure rolls that respect each monster's listed treasure tag
- Responsive three-column layout
- No framework, package manager, database, or build step required

## Run locally

You can open `index.html` directly, but running a tiny local server is more consistent across browsers:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Publish with GitHub Pages

This project is ready to publish from the repository root. All asset URLs are relative, so it works both at a custom domain and at a project URL such as `https://username.github.io/encounter-builder/`.

1. Create an empty repository on GitHub.
2. Connect and push this local repository:

   ```powershell
   git add .
   git commit -m "Initial encounter builder"
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin main
   ```

3. In the GitHub repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/(root)` folder, then save.

GitHub will display the public Pages URL after the first deployment completes. The included `.nojekyll` file tells Pages to serve the project as a plain static site.

## Project structure

```text
.
├── index.html       # Page structure and row templates
├── styles.css       # Layout, theme, and responsive styling
├── app.js           # Party and monster row interactions
├── monsters.js      # Monster names grouped by challenge rating
├── .nojekyll        # Disables Jekyll processing on GitHub Pages
└── README.md
```

## Monster data

`monsters.js` contains monster names and challenge ratings transcribed from the 2024 *Monster Manual* listing on Demiplane. It does not include stat-block rules text, artwork, or other book content.

## Roadmap

- Saved or shareable encounter state
- Additional filtering and monster details

## Disclaimer

This is an unofficial fan-made tool and is not affiliated with or endorsed by Wizards of the Coast, D&D Beyond, Roll20, or Demiplane. Dungeons & Dragons and related names are trademarks of their respective owners.
