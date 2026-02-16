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

- `data/items.json`

Each item follows this schema:

```json
[
  {
    "id": "PTG-0001",
    "title": "Carhartt Work Jacket",
    "category": "Outerwear",
    "price": 45,
    "size": "L",
    "fitsLike": "L",
    "condition": "Good",
    "status": "available",
    "notes": "Light fading on cuffs",
    "images": ["./assets/items/ptg-0001-1.jpg", "./assets/items/ptg-0001-2.jpg"],
    "createdAt": "2026-02-15T00:00:00Z"
  }
]
```

### Status values
Use one of:
- `available`
- `reserved`
- `sold`

Changing status to `sold` updates card badge and catalog filtering automatically.

## Pages
- `index.html` – Home + hero + newest non-sold arrivals
- `catalog.html` – full catalog with filters and sorting
- `about.html` – brand story
- `info.html` – drops, payment options, reserve/policy details

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
- Copy new listing structure from `data/item-template.json`.
- Keep category naming consistent with `data/categories.json`.
