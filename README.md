# Perle Thrifted Goods (Catalog Website)

Static, mobile-friendly catalog site for **Perle Thrifted Goods**.
Built with plain HTML, CSS, and JavaScript so it can be hosted free on GitHub Pages.

## Run locally
Because this site loads inventory with `fetch`, run it with a local server (not by opening `index.html` directly).

### Python
```bash
python3 -m http.server 8080
```
Then open: `http://localhost:8080`

## Inventory editing (single file)
All inventory is managed in one file:

- `data/items.csv`

Each row in `data/items.csv` must follow this exact header:

```csv
id,title,category,price,size,fitsLike,condition,status,notes,images,createdAt,featured
PTG-0001,Carhartt Work Jacket,Outerwear,45,L,L,Good,available,Light fading on cuffs,assets/items/ptg-0001-1.jpg|assets/items/ptg-0001-2.jpg,2026-02-15T00:00:00Z,false
```

- Use `|` between multiple image paths in the `images` column.
- Multi-image example:

```csv
PTG-0011,Carpenter Denim,Bottoms,42,34,34,Very Good,available,Light fading on knee,assets/items/ptg-0011-1.jpg|assets/items/ptg-0011-2.jpg|assets/items/ptg-0011-3.jpg,2026-02-21T12:00:00Z,true
```
- The first image is used as the card cover image; all images appear in the modal gallery.

- `featured` accepts `true` or `false` (blank is treated as `false`).
- Set `featured=true` to show the **🔥 Perle Pick** badge on cards and in the modal.

### Status values
Use one of:
- `available`
- `reserved`
- `sold`

Changing status to `sold` updates card badge and catalog filtering automatically. CSV format errors are reported in the browser console.

## Pages
- `index.html` – Home + hero + newest non-sold arrivals
- `catalog.html` – full catalog with filters and sorting
- `about.html` – brand story
- `info.html` – reservation policy + payment details

## GitHub Pages deployment
1. Push this repo to GitHub.
2. In GitHub: **Settings → Pages**.
3. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: `main` (or your default branch), folder: `/root`
4. Save and wait for deployment.
5. Your site will be live at your GitHub Pages URL.

## Notes
- Catalog-only: no checkout integration.
- Instagram reserve CTA appears on item details modal.


## Admin-lite updates (phone friendly)
- Follow `ADMIN.md` for a quick step-by-step checklist to update inventory directly from your phone in GitHub.
- Copy new listing row structure from `data/item-template.csv` (or `data/item-template.json` if you prefer JSON drafting).
- Keep category naming consistent with `data/categories.json`.
