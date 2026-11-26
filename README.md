# The Daily Brew

A phone-friendly recipe app for the Nespresso Vertuo (built around the Vertuo Pop+).
Pick the pod you have and see drinks that suit it, or pick a drink and see which pods
make it best. Each recipe scales to the pod's brew size and updates when you change
hot/iced, sweetness or milk. Favorites and your pod collection are saved on your phone.

- No AI, no API keys, no accounts, no outside services.
- Installable on iPhone (Add to Home Screen) and works offline after the first visit.

## What's new in version 3: custom pods

For new seasonal or limited-edition pods that aren't in the built-in list.

- **Adding a pod:** tap **＋ Add a Pod** on the Pods screen. It's also in "Pod not listed?",
  and a search with no results offers "Add '…' as a custom pod".
- **The form:**
  - **Name** (required, up to 40 characters).
  - **Size** (required): Espresso, Double Espresso, Gran Lungo, Coffee or XL.
  - **Flavor notes** (pick any).
  - **Optional switches:** "Flavored coffee", "Made for ice", and "Add to My Pods" (on by default).
  - **Live preview:** shows which drinks the pod would be recommended for.
- **Duplicate names are blocked:** capitals, accents and extra spaces are ignored, and the check covers built-in and custom pods.
- **Same rules as built-in pods:** custom pods use the same recommendation rules. Flavor
  notes become the same flavor tags the built-in pods use:

  | You pick | Counts as |
  |---|---|
  | Vanilla, Caramel, Chocolate, Maple, Nutty, Spice, Pumpkin, Cinnamon, Brown sugar, Peppermint, White chocolate, Gingerbread | that flavor |
  | Mild | milk-friendly (like Arondio) |
  | Bold | classic + chocolate (like Fortado and Scuro) |
  | Fruity | shown on the pod, but no recipe uses it, so it adds no points |

  "Flavored coffee" turns on the same rule as Maple Pecan and other flavored pods: a flavored
  pod is never recommended for a drink whose flavors don't match. "Made for ice" works like
  Ice Leggero (a bonus point for iced-only drinks).
- **Where custom pods appear:** everywhere built-in pods do (pod lists, search, My Pods,
  drink pages, the recipe's pod picker, favorites), marked **Custom**.
- **Edit or delete** from the pod's page:
  - **Deleting** asks first. It also removes the pod from My Pods.
  - Favorites that used the pod switch to the generic pod of the same size (e.g. "Any Coffee pod"), so the recipe still works.
- **Storage:** custom pods are saved only on this device (browser storage key `dailybrew.custompods.v1`).

## What's new in version 2

- **My Pods:** tap ＋ next to a pod (or "Add to My Pods" on its page) to mark the pods you own.
  Tap ✓ to remove one. Your collection is saved on the device.
- **Your pods come first** (the recommendation rules themselves don't change):
  - On a drink's page, your pods are listed first in each group and marked "In My Pods".
  - A recipe opens with your best pod for it (Recommended, else Works well). If none of
    yours suits it, it uses the best pod overall.
  - The recipe's pod picker has a "My Pods" group at the top.
  - If you pick a pod you don't own and one of yours is Recommended, a hint offers to switch.
  - Drinks has a "Fits my pods" filter, and each drink card shows your best pod for it.
  - Home shows your pods as shortcuts.
- **Search on Pods and Drinks**, updating as you type. Fixed rules:
  - Capitals and accents are ignored ("caffe" finds Caffè Mocha).
  - Every word you type must match the start of a word ("cinn" finds cinnamon,
    but "ice" doesn't find "spice"; "iced vanilla" needs both).
  - Pods match on name, tasting notes, size and labels (e.g. "mug", "double", "seasonal").
    Pods that only *pair* with your word are listed separately under "Pairs well with…".
  - Drinks match on name, description, flavors, ingredients, "iced" and "seasonal",
    and work together with the filter buttons.

## Files

| File | What it does |
|---|---|
| `index.html` | The main page |
| `styles.css` | Look and feel (cream, espresso, caramel, sage; automatic dark mode) |
| `app.js` | Screens, recommendation rules, recipe math, favorites |
| `data/pods.js` | The pod list: names, sizes, tasting notes, flavor pairings |
| `data/recipes.js` | The 12 recipes and the fixed rules for scaling them |
| `manifest.webmanifest` | Lets the app install to a home screen |
| `sw.js` | Service worker: saves the app for offline use |
| `icons/` | App icons (`icon.svg` is the editable source) |

## How the rules work (all fixed and checkable)

**Recipe amounts** (see the top of `data/recipes.js`):
1. Each drink style (latte, shaken espresso, iced coffee) has a table of how much milk
   or water goes with each pod size.
2. Drink size = pod volume + milk + water.
3. Scale = drink size ÷ the size of the Double Espresso version, rounded to the nearest ¼.
4. Sweet ingredients × scale × sweetness (None 0, Light ½, Regular 1, Extra 1½).
   Flavor ingredients (spices, extracts) × scale. Toppings never change.
5. Amounts round to measurable sizes: ½ tsp, ½ tbsp, ⅛/¼/½ tsp for spices, ½ fl oz for milk.
   Metric uses 1 tsp = 5 ml, 1 tbsp = 15 ml, 1 fl oz = 29.57 ml.

**Milk choice** changes the ingredient, the frothing steps (almond milk is heated
more gently and added after the coffee rests), the tips, and the pumpkin cold foam
(coconut cream replaces heavy cream for oat/almond). It does not change the
milk amount. The same volume of any milk is the right amount.

**Iced drinks** brew into a separate cup, then cool before they meet the ice:
2 melted ice cubes for espresso-size pods, or a 5-minute rest for bigger pods.
This keeps the drink from getting watery. Brown Sugar Shaken Espresso, Iced White
Chocolate Mocha and Pumpkin Cream Iced Coffee are iced-only, with no hot option.

**Recommendations** (`classify` in `app.js`):
- Size fit: each style rates each pod size 0–3 (Double Espresso is ideal for lattes,
  mug-size and XL pods for iced coffee).
- Flavor points: the drink's main flavor matching the pod = 2, any other shared flavor = 1,
  and a pod Nespresso designs for ice with an iced-only drink = 1.
- **Recommended**: size fit ≥ 1 and flavor points ≥ 2.
- **Works well**: no flavor clash, and either a good size fit or at least one shared flavor.
- **Other**: everything else. Still allowed, with a note on what to expect. A flavored pod
  with no shared flavor (e.g. Peppermint Pinwheel in a pumpkin drink) is never recommended.

## Try it on your computer

The offline feature only runs from a web address, not by double-clicking the file.
In Terminal:

```bash
cd ~/Documents/the-daily-brew
```

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765 in your browser. Press Ctrl+C in Terminal to stop.

## Publish on GitHub Pages

1. Create a repository named `the-daily-brew` and upload everything in this folder.
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch**,
   choose `main` and `/ (root)`, then Save.
3. After a minute it's live at `https://YOUR-USERNAME.github.io/the-daily-brew/`.

All paths in the app are relative, so it works in that sub-folder without changes.

## Install on your iPhone

1. Open the GitHub Pages address in **Safari** (it must be Safari).
2. Tap the **Share** button (square with an arrow).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open The Daily Brew from your home screen once while online. After that it works offline.

Favorites, My Pods and custom pods live on the phone in that app's storage. They don't sync to other
devices, and deleting the app from your home screen erases them. The Home Screen app and
Safari keep separate storage, so pods added in one won't appear in the other.

## Updating the app later

The app saves its files for offline use, so phones keep the old version until you
tell them there's a new one. **Whenever you change any file, open `sw.js` and change
`VERSION`**. It's currently `daily-brew-v3`; use `daily-brew-v4` next time.

On the iPhone, the first launch after you republish still shows the old version while
the new one downloads in the background. Fully close the app (swipe it away) and open it
again to get the new version. Your favorites, My Pods and custom pods are kept.

## Where the pod data comes from

Pod names, cup sizes, tasting notes and intensities were checked against Nespresso
USA's Vertuo pod page (nespresso.com/us/en/vertuo-coffee-pods) on **Nov 25, 2026**.
Limited editions (Gingerbread, Peppermint Pinwheel, Pumpkin Spice Cake, Cinnamon
Apple Crisp) come and go, so check them against your sleeves.

Things to know:
- **Ice Forte** is a 7.77 fl oz Coffee-size pod; **Ice Leggero** and **Active** are 2.7 fl oz Double Espresso pods.
- Nespresso lists XL pods as 12–14 fl oz; the app plans XL recipes for 12 fl oz.
- Nespresso's US site says the Vertuo Pop+ brews "5 sizes" and lists Pop machines as
  XL-compatible, but doesn't name the five. The app includes Espresso, Double Espresso,
  Gran Lungo, Coffee and XL. If your machine won't brew an XL pod, skip those.
- Nespresso doesn't publish an intensity for Bianco Doppio, Ice Leggero or the flavored pods.
- The flavor pairings (`pairs` in `data/pods.js`) are the app's own judgment based on
  Nespresso's tasting notes. Nespresso doesn't publish them.
