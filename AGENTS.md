# Project guide for coding agents

## Project

- This repository is Austen Wallis's personal website, intended for GitHub Pages at `AustenWallis.github.io`.
- The public homepage is `https://austenwallis.github.io/`. Keep the canonical link, structured data, sitemap, and robots sitemap URL in sync if the domain changes.
- Austen is a Research Assistant in Exoplanetary Remote Sensing and Data Science at the University of Cambridge (from September 2026), working on M-dwarf spectra, stellar variability, and exoplanet-atmosphere inference. His Southampton PhD is still in progress; do not describe it as awarded without confirmation. His current public contact email is `agww2@cam.ac.uk`.
- The site presents an academic profile, CV, places and events, publications, and contact details.
- It is a static site: plain HTML, CSS, and JavaScript, with no package manager, build step, or test suite.
- The current design, SEO, and some biographical details are due for review. Treat existing claims as copy to verify with Austen, not as authoritative facts to repeat or expand.

## File map

- `index.html`: page content, metadata, navigation, and links.
- `assets/css/style.css`: all layout and visual styling, including responsive rules.
- `assets/js/script.js`: section navigation, sidebar, cards, ORCID publication fetch, and contact form behavior.
- `assets/images/`: portrait, favicon, and Places gallery photos.
- `Academic_CV.pdf`: downloadable CV; check whether it is current before relying on it for new copy.
- `index.txt`: plain-text summary of site content; keep it consistent with substantial content edits if it remains in use.
- `README.md`: human-facing repository overview and preview instructions.
- `sitemap.xml` and `robots.txt`: search crawler discovery for the public homepage.

## Local workflow

1. Open this repository folder in VS Code.
2. In its integrated terminal run `python3 -m http.server 8000` from the repository root.
3. Open `http://localhost:8000/` in a browser. Stop the server with Ctrl+C.

Opening `index.html` directly also works for basic layout inspection. A local server gives the site a normal HTTP origin for testing JavaScript and external requests.

## Current behavior and dependencies

- The About, CV, Places, and Contact sections live in `index.html`. JavaScript shows one section at a time and uses URL hashes such as `#cv`.
- Recent publication cards and the publication count are fetched in the browser from the public ORCID API. The page has fallback content if that request fails.
- The contact form opens a prefilled email draft through `mailto:`; it does not submit to a server.
- Fonts load from Google Fonts. Other page assets are local except external profile and publication links.

## Editing guidance

- Keep the site usable on mobile and desktop, with semantic HTML, keyboard-accessible controls, visible focus states, and meaningful image alt text.
- Use the owner's confirmed name, titles, dates, publication counts, awards, and contact details. Flag uncertain or time-sensitive claims for review; do not invent replacements.
- When improving search visibility, inspect the page title, description, canonical URL, crawlable content, structured data, sitemap, and robots handling as appropriate. Verify the public URL and GitHub Pages settings before hard-coding them.
- Keep local asset URLs relative so the local preview and GitHub Pages both work.
- After edits, preview the page, exercise every navigation section and interactive control, and check desktop and narrow layouts. Check the browser console for errors.
- Do not publish or deploy changes without the owner's direction.
