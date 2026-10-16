# Project guide for coding agents

## Project

- This repository is Austen Wallis's personal website, intended for GitHub Pages at `AustenWallis.github.io`.
- The public homepage is `https://austenwallis.github.io/`. Keep the canonical link, structured data, sitemap, and robots sitemap URL in sync if the domain changes.
- Austen is a Research Assistant in Exoplanetary Remote Sensing and Data Science at the University of Cambridge (from September 2026), working on M-dwarf spectra, stellar variability, and exoplanet-atmosphere inference. His Southampton PhD is still in progress; do not describe it as awarded without confirmation. His current public contact email is `a.wallis@ast.cam.ac.uk`.
- The site presents an academic profile, CV, places and events, publications, and contact details.
- It is a static site: plain HTML, CSS, and JavaScript, with no package manager or build step. Optional animation regression checks use Node's built-in test runner.
- The current design, SEO, and some biographical details are due for review. Treat existing claims as copy to verify with Austen, not as authoritative facts to repeat or expand.

## File map

- `index.html`: page content, metadata, navigation, and links.
- `assets/css/style.css`: all layout and visual styling, including responsive rules.
- `assets/js/script.js`: section fades, URL hashes, browser history, live ORCID publications and year filters, CV shortcuts, and the Places photo dialog.
- `assets/js/systems.js`: Canvas astrophysical systems, HPC opening, pause/replay/skip controls, and reduced-motion handling.
- `assets/js/systems-physics.js`: shared projection, eclipse photometry, Roche geometry, ballistic stream and disc-wind trajectories; keep drawings and measurements consistent.
- `assets/js/pet.js`, `assets/js/pet-physics.js`, `assets/css/pet.css`: optional draggable star pet, ember particles and spring-driven squash; `tests/pet-*.test.cjs` cover movement and controls. Generated sprites and prompts are in `assets/images/pet/`.
- `tests/systems-*.test.cjs`: physical invariants, finite rendering geometry and animation-control regression checks (`node --test tests/systems-*.test.cjs`).
- `assets/images/`: portrait, favicon, and Places gallery photos.
- `assets/icons/`: local Lucide SVG sprite and its license notices; preserve accessible names on icon controls.
- `Academic_CV.pdf`: downloadable CV linked from the CV tab. Maintain the website CV directly in `index.html` and keep the PDF consistent; check whether the PDF is current before relying on it for new copy.
- `index.txt`: plain-text summary of site content; keep it consistent with substantial content edits if it remains in use.
- `README.md`: human-facing repository overview and preview instructions.
- `sitemap.xml` and `robots.txt`: search crawler discovery for the public homepage.

## Local workflow

1. Open this repository folder in VS Code.
2. In its integrated terminal run `python3 -m http.server 8000` from the repository root.
3. Open `http://localhost:8000/` in a browser. Stop the server with Ctrl+C.

Opening `index.html` directly also works for basic layout inspection. A local server gives the site a normal HTTP origin for testing JavaScript and external requests.

## Current behavior and dependencies

- The About, Publications, Places, and CV sections live in `index.html`. JavaScript shows one section at a time with short fades and URL hashes such as `#cv`; Back/Forward restores the selected section. Without JavaScript, all sections and the publication fallback remain readable.
- The Publications list and counts refresh in the browser from the public ORCID API. Software is excluded from the publication count but included in the separately labelled total ORCID work count. Keep the dated HTML fallback and `data-work-data` JSON consistent when updating them.
- The HPC intro runs once per browser session on the About page. Six animated systems cycle every 15 seconds and have arrow, swipe, pause, replay, and skip controls. Manual selection and Resume restart the interval; Pause stops both motion and cycling. Both stop when hidden/offscreen, and reduced-motion preferences disable automatic cycling.
- The animations are illustrative physical models with adjusted scales. README documents model assumptions and primary references. Do not present the spectral templates or emulator illustration as real observations, SPECULATE outputs or measured benchmarks.
- Email, LinkedIn, GitHub, and Hugging Face links live in the sidebar. Contact uses direct `mailto:` links.
- The Pet switch is at the bottom of the sidebar, level with the contact footer. The star can be placed, thrown, clicked or moved by keyboard; on/off and position persist locally. Motion is disabled for reduced-motion preferences and suspended when hidden or during the photo dialog. Keep the overlay transparent to input outside the pet and reserve space between the sticky sidebar links and the switch.
- Pet throws use timestamped raw pointer movement, including the final release position and coalesced samples where available. Keep these samples separate from the pet's bounded position, preserve stationary placement and cancellation, and restrict touch-scroll/callout suppression to the pet itself.
- The sidebar uses responsive `assets/images/portrait-160.webp` and `portrait-400.webp` copies; `portrait.jpg` remains the social-preview image and generation source. Places uses lazy-loaded WebP previews in `assets/images/places/thumbnails/`, loading the selected larger JPEG from `assets/images/places/web/` only when its dialog is opened. Keep the preview visible until the full image decodes, and invalidate pending loads on navigation or close.
- `scripts/prepare_photos.py` regenerates previews with Pillow (maintenance only, no site build step). Preserve the owner's originals and larger web copies. Thumbnail filenames specify their long edge; HTML `srcset` descriptors must use each image's actual width. `tests/gallery-loading.test.cjs` covers on-demand loading, cancellation, failures and ordinary-link fallback.
- Fonts load from Google Fonts. Other page assets are local except external profile and publication links.

## Editing guidance

- Keep the site usable on mobile and desktop, with semantic HTML, keyboard-accessible controls, visible focus states, and meaningful image alt text.
- Use the owner's confirmed name, titles, dates, publication counts, awards, and contact details. Flag uncertain or time-sensitive claims for review; do not invent replacements.
- When improving search visibility, inspect the page title, description, canonical URL, crawlable content, structured data, sitemap, and robots handling as appropriate. Verify the public URL and GitHub Pages settings before hard-coding them.
- Keep local asset URLs relative so the local preview and GitHub Pages both work.
- After edits, preview the page, exercise every navigation section and interactive control, and check desktop and narrow layouts. Check the browser console for errors.
- Do not publish or deploy changes without the owner's direction.
