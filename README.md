# EZBill

Bon's bill splitting app: a minimalist calculator for splitting a restaurant bill with friends. Add who ordered what, type in the total on the receipt, and it shares out the service charge by how much each person ordered, then shows Bon's GCash QR so everyone can pay.

## How the split works

The receipt total is always more than the menu prices because of the service charge. The app adds up the food, takes whatever is left over on the receipt (service charge, other taxes) and gives each person a share of it at the same rate:

```
your share = your food × receipt total ÷ food total
```

Everyone's shares add up exactly to the receipt total, so you never need to know the service charge rate.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The app's page |
| `styles.css` | The minimalist look: black and white, thin lines, light and dark mode |
| `app.js` | People, items, sheets and sharing |
| `calc.js` | The split math |
| `gcash-qr.svg` | Bon's GCash QR, redrawn from the GCash app's QR so it stays sharp at any size |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and the Home Screen icon |

## Using it on iPhone

Open https://vzq1.github.io/ezbill/ in Safari, tap **Share → Add to Home Screen**, and name it **EZBill**. It works offline after the first visit.

Tap the half-circle at the top right for dark mode. The GCash QR always stays black on white so it scans.

## Running it locally

There's no build step. Serve the folder and open http://localhost:8000:

```
python3 -m http.server
```

## Credits

- GCash and InstaPay are trademarks of their respective owners.
