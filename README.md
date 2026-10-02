# Bill Split

A small web app for splitting a restaurant bill with friends.

Menu prices in the Philippines already include 12% VAT, but the service charge is computed on the price **before** VAT. So multiplying each person's food by 10% gives the wrong amount. This app works out each person's share correctly:

```
service charge = price ÷ 1.12 × 10%
other tax      = price ÷ 1.12 × rate   (optional, e.g. F&W tax)
you pay        = food + service charge + other tax
```

## Features

- Add the people at the table and the items on the receipt
- Assign each item to one person, or split it evenly or by custom amounts
- See what each person pays, plus a receipt-style breakdown to check against the bill
- Share the split to a group chat
- Works offline and can be added to your phone's home screen

## Use it on your phone

Open the site, then:

- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** ⋮ menu → Add to Home screen

## Run it locally

No build step. Serve the folder with any static server:

```
python3 -m http.server
```

Then open http://localhost:8000.
