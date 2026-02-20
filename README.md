# Perle Thrifted Goods (Catalog Website)

Static, mobile-friendly catalog site for **Perle Thrifted Goods**.
Built with plain HTML, CSS, and JavaScript so it can be hosted free on GitHub Pages.

## Run locally
Because this site loads inventory with `fetch`, run it with a local server (not by opening `index.html` directly).

```bash
python3 -m http.server 8080
```
Then open: `http://localhost:8080`

## Inventory editing (single file)
All inventory is managed in one CSV file:

- `data/items.csv`

Required CSV header:

```csv
id,title,category,price,size,fitsLike,condition,status,notes,images,createdAt,featured,audience
```

Example row:

```csv
PTG-0011,Cropped Zip Hoodie,Tops,28,S,S,Very Good,available,"No flaws, washed once",assets/items/ptg-0011-1.jpg|assets/items/ptg-0011-2.jpg,2026-02-21T12:00:00Z,true,womens
```

### Rules
- `status` must be: `available`, `reserved`, or `sold`
- `condition` must be exactly: `New`, `Very Good`, `Good`, or `Fair`
- `category` should be exactly: `Tops`, `Bottoms`, or `Outerwear`
- `audience` must be: `mens`, `womens`, or `unisex`
- Keep images pipe-delimited in one field (`img1|img2|img3`)
- `featured` accepts `true` or `false`

### New Arrival badge
An item shows **New Arrival** automatically when:
- `createdAt` is within the last 7 days, and
- `status` is not `sold`

## Pages
- `index.html` – Home + newest non-sold arrivals
- `catalog.html` – fast browse catalog (sold items excluded)
- `recently-sold.html` – sold-only archive (newest first)
- `cart.html` – localStorage cart + ID/share-copy tools
- `about.html` – brand story
- `info.html` – reservation policy + payment details

## Cart behavior
- Cart is stored in localStorage as an array of item IDs.
- Use **Share Cart** for URLs like:
  `cart.html?items=PTG-0001|PTG-0014`
- Use **Clear Cart** to empty cart items.
- Opening a shared cart link replaces existing cart IDs with the shared IDs.

## Catalog size filtering
- Letter size chips: `XS`, `S`, `M`, `L`, `XL`, `XXL`.
- Waist size chips are auto-generated from `size` + `fitsLike` values in `data/items.csv`.
- Supported numeric parsing includes values like `32`, ranges like `31-32`, and slash lists like `32/34`.

## GitHub Pages deployment
1. Push this repo to GitHub.
2. In GitHub: **Settings → Pages**.
3. Set Source to **Deploy from a branch** and select your default branch `/root`.
4. Save and wait for deployment.
