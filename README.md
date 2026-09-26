# Austen Wallis Personal Website

This repository contains the source for Austen Wallis's personal GitHub Pages website.

## Structure

- `index.html` contains the page structure and section content.
- `assets/css/style.css` contains the site styling.
- `assets/js/script.js` handles section switching, mobile contact expansion, and the mailto contact form.
- `Academic_CV.pdf` is linked directly from the site.
- `assets/images/places/` contains the photos used by the Places gallery.

## Sections

- About
- CV
- Places
- Contact

## Updating the Places gallery

The Places section uses local images stored in `assets/images/places/`.

To update it:

1. Add or replace the relevant photo files in `assets/images/places/`.
2. Update the corresponding `<img>` paths and captions in `index.html`.

## Local preview

Open this folder in VS Code (`File` > `Open Folder…`). Select the `AustenWallis.github.io` folder, then open `index.html` in the Explorer.

In the VS Code terminal (`Terminal` > `New Terminal`), run:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000/` in a browser. Changes to HTML, CSS, or JavaScript appear after a browser refresh. Press Ctrl+C in the terminal to stop the server.

## Search visibility

The canonical public URL is `https://austenwallis.github.io/`. The root `sitemap.xml` lists that page, and `robots.txt` points crawlers to the sitemap.

After publishing changes, verify the `https://austenwallis.github.io/` URL-prefix property in Google Search Console, submit `https://austenwallis.github.io/sitemap.xml`, and use URL Inspection to check the homepage and request indexing. An HTML verification tag from Search Console can be placed in the `<head>` of `index.html`; keep it there after verification.
