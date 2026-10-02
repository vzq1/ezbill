# Bill Split

A small web app for splitting a restaurant bill with friends.

You don't need to know the service charge rate. Enter what everyone ordered and the total on the receipt, and the app divides that total among everyone in proportion to their food:

```
your share = your food ÷ items total × receipt total
```

Whatever the receipt adds on top of the menu prices (service charge, F&W tax, and so on) is shared out automatically, and everyone's shares add up exactly to the receipt total.

## Features

- Add the people at the table and the items on the receipt
- Assign each item to one person, or split it evenly or by custom amounts
- Enter the receipt total and see what each person pays, including their share of the service charge
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
