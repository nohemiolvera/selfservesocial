# Self Serve Marketing: brand-agnostic demo

A version of the self-serve Blog Templates tool rebuilt to work with any brand,
shown here with Google and Google Cloud. A concept demo, not affiliated with Google.

Pick the brand, template (illustration, texture, customer story) and theme, type the
headline, and export PNG or MP4 in three sizes (Open Graph, featured, square).

## Run

    python3 -m http.server 3000

Then open http://localhost:3000.

## Swap the brand

Everything brand-specific is at the top of `blog/app.js`:

- `BRANDS`: the logo, where it sits in the header, its width on customer stories, and the download filename
- `THEMES`: the light and dark colors for each brand

Logos live in `blog/assets.js` under `window.LOGOS`. Add the SVG there, add an entry to
`BRANDS` and `THEMES`, and add a button to the Brand group in `index.html`.
