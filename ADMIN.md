# Admin-lite inventory workflow (phone-friendly)

## 1) Open inventory on GitHub
1. Open your repo in the GitHub app/mobile browser.
2. Go to `data/items.csv`.
3. Tap **Edit**.

## 2) Update status quickly
Use only:
- `available`
- `reserved`
- `sold`

Sold items automatically leave the main catalog and appear on `recently-sold.html`.

## 3) Add a new item row
1. Open `data/item-template.csv`.
2. Copy the sample row into `data/items.csv`.
3. Fill all columns with this exact order:

`id,title,category,price,size,fitsLike,condition,status,notes,images,createdAt,featured,audience`

## 4) Keep values valid
- IDs: `PTG-0001`, `PTG-0002`, `PTG-0003`...
- category: `Tops`, `Bottoms`, `Outerwear`
- condition: `New`, `Very Good`, `Good`, `Fair`
- audience: `mens`, `womens`, `unisex`
- featured: `true` or `false`
- New Arrival badge is automatic for listings created within the last 7 days.

## 5) Multiple images format
Use `|` between image paths inside the `images` field:

`assets/items/ptg-0011-1.jpg|assets/items/ptg-0011-2.jpg|assets/items/ptg-0011-3.jpg`

- First image = cover image on catalog card
- All images = modal gallery

## 6) Publish check
After commit and Pages deploy:
- `catalog.html` (sold items removed)
- `recently-sold.html` (sold-only)
- cart still works (`cart.html`)
