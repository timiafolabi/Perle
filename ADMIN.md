# Admin-lite inventory workflow (phone-friendly)

Use this checklist any time you need to update Perle inventory quickly from your phone.

## 1) Open the inventory file on GitHub
1. Open your repo in the GitHub app or mobile browser.
2. Go to `data/items.json`.
3. Tap **Edit** (pencil icon).

## 2) Mark an item as sold or reserved
1. Find the item by `id` (example: `PTG-0008`).
2. Update only the `status` value:
   - `"available"`
   - `"reserved"`
   - `"sold"`
3. Commit the change.

## 3) Add a new item (copy template block)
1. Open `data/item-template.json` in another tab.
2. Copy the full object.
3. Paste it into `data/items.json` as a new item in the array (add comma correctly).
4. Fill in all fields (`id`, `title`, `category`, `price`, `size`, etc.).
5. Add image paths under `images` using files you upload to `assets/items/`.
6. Set `createdAt` in ISO format, e.g. `2026-02-20T16:00:00Z`.
7. Commit the change.

## 4) Keep ID format consistent
- IDs must be sequential and zero-padded:
  - `PTG-0001`, `PTG-0002`, `PTG-0003`, ...
- Never reuse old IDs.
- Use one unique ID per item.

## 5) Keep category names consistent
- Use `data/categories.json` as the source of truth for category spelling.
- If you add a new category, update both:
  - `data/categories.json`
  - any catalog UI filter options if needed

## 6) Final quick check
- Open `catalog.html` after GitHub Pages deploys.
- Confirm:
  - New/updated item appears
  - Status badge is correct
  - Item ID is visible
  - Modal details look right
