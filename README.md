# Architect Builder

A drag-and-drop AWS architecture practice tool. Take a brief, build the design on a canvas, and flip the settings that matter (On-Demand vs Spot, Multi-AZ, storage class, load balancer type, and so on).

No build step, no dependencies, no network calls. It is plain HTML, CSS and JavaScript.

## Run it

Open `index.html` in any modern browser. That is all.

## How to use it

1. Paste your brief into the **Brief** box at the top. It stays visible while you build.
2. Drag containers from **Network structure**: Region, then VPC, then Availability Zones, then subnets. Each one nests inside the right parent.
3. Drag services into subnets (or anywhere that fits). Search the palette to find one fast.
4. Click a placed service to open its settings in the right panel. Toggles and dropdowns show as small tags on the service.
5. Press **Connect** (or `C`), click one service and then another to draw an arrow. Click an arrow to label it (HTTPS, SQL, async) or make it dashed.
6. **Export PNG** downloads a clean image. **Save** downloads a `.json` file you can reopen later with **Open**.

7. Open the **Review** tab and tick each Well-Architected question once your diagram answers it. Each question lists the services to look for. Nothing is graded for you, and your ticks are saved in the `.json` file.
8. **Starter templates** (top right) add a ready design below what you already have: three-tier web app, serverless API, static site, event-driven processing.

Keys:

| Key | Action |
| --- | --- |
| `Delete` | remove the selection |
| `Esc` | deselect, or leave Connect mode |
| `V` / `C` | Select tool / Connect tool |
| Shift-click | add or remove one item from the selection |
| Shift-drag | draw a box to select several items |
| `Ctrl/Cmd` + `A` | select everything |
| `Ctrl/Cmd` + `C`, `V`, `D` | copy, paste, duplicate |
| `Ctrl/Cmd` + `Z`, `Shift+Z` | undo, redo |

## What is in the palette

About 120 services from the Solutions Architect exam scope list, grouped by category, plus Users and On-premises blocks. Services without a rich settings list still work as plain blocks.

## Project layout

```
index.html          page shell
styles.css          all styling (light and dark)
data/core.js        categories, containers, option helpers
data/services-*.js  the service catalogue and each service's settings
data/review.js      Well-Architected questions for the Review tab
data/templates.js   starter designs
data/icons.js       generated list of imported icons (empty until you import)
icons/              official icons, filled by the import script
tools/import-icons.py  matches the AWS icon pack to your services
js/state.js         model: nodes, arrows, nesting rules
js/render.js        palette, nodes and arrow drawing
js/interact.js      drag, resize, connect, zoom, keyboard
js/panel.js         properties panel
js/export.js        PNG export and JSON save
js/main.js          startup and toolbar wiring
```

## Add or change a service

Open one of the `data/services-*.js` files and add a line:

```js
d('mylogic', 'AWS Example', 'EXM', 'compute', [
  O.toggle('multiAz', 'Multi-AZ', false),
  O.select('mode', 'Mode', ['Standard', 'Fast'], 'Standard')
], 'Optional one-line tip shown in the panel.');
```

Arguments: id, display name, 2 to 4 letter badge, category id (see `data/core.js`), settings list, tip.

## Put it on GitHub

```bash
cd aws-architect-builder
git init
git add .
git commit -m "Add Architect Builder"
git branch -M main
git remote add origin https://github.com/<your-username>/aws-architect-builder.git
git push -u origin main
```

To use it from any device, turn on **GitHub Pages**: repository **Settings > Pages > Deploy from a branch > main / (root)**. It will be served at `https://<your-username>.github.io/aws-architect-builder/`.

## Use the real AWS icons

The tool ships with coloured tiles. To switch to the official icons:

1. Download the **Asset Package** from https://aws.amazon.com/architecture/icons/ and read the terms on that page.
2. From the project folder run (use the folder or the zip, either works):

   ```bash
   python3 tools/import-icons.py ~/Downloads/Asset-Package_xxxxxxxx.zip
   ```

3. It copies the matching 64px icons into `icons/` and updates `data/icons.js`. Anything without a match keeps its tile, and the script lists what it missed.
4. Reload `index.html`. To fix a miss, save the SVG as `icons/<service-id>.svg` and run `python3 tools/import-icons.py --rebuild`.

Check AWS's icon terms before publishing the icons in a public repository. If you only want them for yourself, add `icons/` to `.gitignore` and the icons stay on your machine while the tool still works for everyone else.

PNG export includes the icons. If you open the page straight from disk and a browser blocks the export with icons, it falls back to coloured tiles. Opening it from GitHub Pages or a local web server (`python3 -m http.server`) avoids that.

## Notes

The default badges are plain coloured tiles with short codes, not AWS's official icons.
