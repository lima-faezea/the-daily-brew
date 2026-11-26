/*
  The Daily Brew — recipes and the fixed rules behind them
  --------------------------------------------------------
  Everything the app calculates comes from the tables in this file.
  No AI, no internet: change a number here and the app follows it.

  HOW AMOUNTS ARE CALCULATED
  1. Each drink "style" has a milk/water table by pod size (STYLES below).
  2. Drink size = pod volume + milk + water.
  3. Scale = drink size ÷ the style's reference size, rounded to the nearest ¼
     (a Double Espresso drink = 1×).
  4. Each ingredient's base amount is for the reference drink at "Regular" sweetness.
     - sweet ingredients  × scale × sweetness (None 0, Light ½, Regular 1, Extra 1½)
     - flavor ingredients × scale
     - fixed ingredients  never change (toppings, a single serving of foam)
  5. Amounts are rounded to things you can measure: ½ tsp, ½ tbsp, ⅛ tsp for
     spices, and ½ oz for milk.
  Base amounts below are in teaspoons (tsp) unless the unit says "oz".
  1 tbsp = 3 tsp.
*/

window.SWEETNESS = [
  { key: "none",    label: "None",    factor: 0 },
  { key: "light",   label: "Light",   factor: 0.5 },
  { key: "regular", label: "Regular", factor: 1 },
  { key: "extra",   label: "Extra",   factor: 1.5 }
];

window.MILKS = [
  { key: "whole",  label: "Whole",  name: "whole milk",  tip: "Whole milk gives the creamiest, sweetest-tasting foam." },
  { key: "2pct",   label: "2%",     name: "2% milk",     tip: "2% froths well and keeps the drink a little lighter." },
  { key: "skim",   label: "Skim",   name: "skim milk",   tip: "Skim makes tall, stiff foam but a thinner-tasting drink." },
  { key: "oat",    label: "Oat",    name: "oat milk",    plant: true, tip: "Use a “barista” oat milk if you can. It froths best and won’t separate." },
  { key: "almond", label: "Almond", name: "almond milk", plant: true, tip: "Almond milk can separate in very hot coffee. Warm it gently and add it after the coffee has rested a minute." }
];

// Labels used when explaining why a pod pairs with a drink.
window.TAG_LABELS = {
  "vanilla": "vanilla", "caramel": "caramel", "chocolate": "chocolate",
  "white-chocolate": "white chocolate", "maple": "maple", "brown-sugar": "brown sugar",
  "pumpkin": "pumpkin", "spice": "warm spices", "cinnamon": "cinnamon",
  "gingerbread": "gingerbread spice", "peppermint": "peppermint", "nutty": "nutty notes",
  "milky": "steamed milk", "classic": "a classic latte"
};

/*
  STYLES
  milk / water: fl oz added for each pod size.
  ref:  the drink size (fl oz) that counts as 1× for each temperature.
  fit:  how well each pod size suits the style (0 poor · 1 okay · 2 good · 3 ideal).
  steps: the order of steps; "@" steps are filled in by the app.
*/
window.STYLES = {
  latte: {
    hot:  { espresso: { milk: 5 }, double: { milk: 6 }, granlungo: { milk: 5 }, coffee: { milk: 4 }, xl: { milk: 3 } },
    iced: { espresso: { milk: 5 }, double: { milk: 6 }, granlungo: { milk: 4 }, coffee: { milk: 3 }, xl: { milk: 2 } },
    ref:  { hot: 8.7, iced: 8.7 },
    fit:  { espresso: 2, double: 3, granlungo: 1, coffee: 1, xl: 0 },
    fitNotes: {
      espresso:  "A single espresso makes a small, strong latte.",
      double:    "Double Espresso is the classic latte base: bold enough to stand up to milk.",
      granlungo: "A Gran Lungo makes a longer, milder latte.",
      coffee:    "A mug-size pod makes a bigger, mellower, café-au-lait-style drink.",
      xl:        "XL pods brew so much coffee that this ends up tasting like flavored coffee, not a latte."
    },
    steps: { hot: ["@brew", "@add", "@froth", "@combine", "@finish"],
             iced: ["@brew", "@add", "@cool", "@glass", "@pourMilkCoffee", "@finish"] }
  },
  shaken: {
    iced: { espresso: { milk: 3 }, double: { milk: 4 }, granlungo: { milk: 3 }, coffee: { milk: 2 }, xl: { milk: 2 } },
    ref:  { iced: 6.7 },
    fit:  { espresso: 2, double: 3, granlungo: 1, coffee: 1, xl: 0 },
    fitNotes: {
      espresso:  "One espresso makes a small but punchy shaken drink.",
      double:    "Double Espresso is exactly what shaken espresso is built on.",
      granlungo: "Works, but it's less intense than espresso.",
      coffee:    "Mug-size coffee is thinner for shaking, so expect a milder drink.",
      xl:        "XL pods are too much liquid to shake well with ice."
    },
    steps: { iced: ["@brew", "@add", "@cool", "@shake", "@finish"] }
  },
  coffee: {
    iced: { espresso: { water: 4 }, double: { water: 4 }, granlungo: { water: 2 }, coffee: {}, xl: {} },
    ref:  { iced: 7.77 },
    fit:  { espresso: 1, double: 1, granlungo: 2, coffee: 3, xl: 3 },
    fitNotes: {
      espresso:  "Stretched with cold water into an Americano-style base.",
      double:    "Stretched with cold water into an Americano-style base.",
      granlungo: "A little short, so it's topped up with cold water.",
      coffee:    "A mug-size pod is the ideal base for iced coffee.",
      xl:        "XL pods are made for big iced coffees. Ideal."
    },
    steps: { iced: ["@brew", "@add", "@cool", "@glassCoffee", "@finish"] }
  }
};

/*
  RECIPES
  kind: "sweet" | "flavor" | "fixed"
  alt:  used instead when sweetness is "None"
  plantAlt: used instead when an oat or almond milk is chosen
  spice: true → rounded to ⅛ tsp ("pinch" when tiny)
  scale: false → amount never scales with pod size
  Steps: "{n:id}" is replaced by that ingredient's name; a step starting with
  "?id|" only appears when that ingredient is in the recipe.
*/
window.RECIPES = [
  {
    id: "vanilla-latte", name: "Vanilla Latte", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot",
    blurb: "Smooth espresso, silky milk and a touch of vanilla. The everyday favorite.",
    tags: ["vanilla", "milky"], colors: { coffee: "#6B4226", milk: "#EADBC4", top: "#F6EEDF" },
    ingredients: [
      { id: "syrup", name: "vanilla syrup", amt: 3, kind: "sweet", alt: { name: "pure vanilla extract (no sugar)", amt: 0.25, spice: true } }
    ],
    add: ["Stir the {n:syrup} into the hot coffee."],
    tips: ["No vanilla syrup? Use 2 tsp sugar plus ¼ tsp vanilla extract for every tablespoon of syrup."]
  },
  {
    id: "pumpkin-spice-latte", name: "Pumpkin Spice Latte", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot", seasonal: true,
    blurb: "Real pumpkin, warm spice and a little brown sugar. Fall in a mug.",
    tags: ["pumpkin", "spice", "cinnamon"], colors: { coffee: "#8A4B22", milk: "#E9C9A0", top: "#F4E4CC", garnish: "#C26A2B" },
    ingredients: [
      { id: "pumpkin", name: "pumpkin purée (not pie filling)", amt: 3, kind: "flavor" },
      { id: "sugar", name: "brown sugar", amt: 3, kind: "sweet" },
      { id: "spice", name: "pumpkin pie spice", amt: 0.25, kind: "flavor", spice: true },
      { id: "vanilla", name: "vanilla extract", amt: 0.25, kind: "flavor", spice: true },
      { id: "whip", name: "whipped cream & a pinch of spice, to top (optional)", kind: "fixed", optional: true }
    ],
    add: ["Whisk the {n:pumpkin}, {n?:sugar}, {n:spice} and {n:vanilla} into the hot coffee until smooth. A small whisk or frother wand works best."],
    finish: ["Top with whipped cream and a pinch of pumpkin pie spice, if you like."],
    tips: ["Leftover pumpkin purée keeps a week in the fridge or 3 months frozen in an ice cube tray: one cube is about 1 tbsp."]
  },
  {
    id: "gingerbread-latte", name: "Gingerbread Latte", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot", seasonal: true,
    blurb: "Molasses, ginger and cinnamon, like a gingerbread cookie in a cup.",
    tags: ["gingerbread", "spice", "cinnamon", "brown-sugar"], colors: { coffee: "#7A4321", milk: "#E3C7A6", top: "#F3E3CF", garnish: "#9C5A2C" },
    ingredients: [
      { id: "molasses", name: "molasses", amt: 1, kind: "flavor" },
      { id: "sugar", name: "brown sugar", amt: 2, kind: "sweet" },
      { id: "ginger", name: "ground ginger", amt: 0.25, kind: "flavor", spice: true },
      { id: "cinnamon", name: "ground cinnamon", amt: 0.125, kind: "flavor", spice: true },
      { id: "nutmeg", name: "ground nutmeg", amt: 0.03, kind: "flavor", spice: true },
      { id: "whip", name: "whipped cream, to top (optional)", kind: "fixed", optional: true }
    ],
    add: ["Whisk the {n:molasses}, {n?:sugar}, {n:ginger}, {n:cinnamon} and {n:nutmeg} into the hot coffee until dissolved."],
    finish: ["Top with whipped cream and a dusting of cinnamon, if you like."],
    tips: ["Molasses is strong. Start with the amount listed and add more next time if you want a deeper gingerbread flavor."]
  },
  {
    id: "caramel-latte", name: "Caramel Latte", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot", minSweet: "light",
    blurb: "Buttery caramel stirred into espresso and milk, with a drizzle on top.",
    tags: ["caramel", "milky"], colors: { coffee: "#7B4A22", milk: "#E8CDA6", top: "#F5E6D0", garnish: "#B8742E" },
    ingredients: [
      { id: "caramel", name: "caramel sauce", amt: 3, kind: "sweet" },
      { id: "drizzle", name: "extra caramel sauce, to drizzle (optional)", kind: "fixed", optional: true }
    ],
    add: ["Stir the {n:caramel} into the hot coffee until it melts in."],
    finish: ["Drizzle a little extra caramel over the top, if you like."],
    tips: ["Caramel is what flavors this drink, so the lowest sweetness option is Light."]
  },
  {
    id: "mocha", name: "Caffè Mocha", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot",
    blurb: "Espresso and chocolate, smoothed out with milk.",
    tags: ["chocolate"], colors: { coffee: "#4A2A1A", milk: "#C9A27E", top: "#EFE2D2", garnish: "#4A2A1A" },
    ingredients: [
      { id: "choc", name: "chocolate sauce", amt: 4, kind: "sweet", alt: { name: "unsweetened cocoa powder", amt: 2 } },
      { id: "whip", name: "whipped cream, to top (optional)", kind: "fixed", optional: true }
    ],
    add: ["Stir the {n:choc} into the hot coffee until completely smooth, with no lumps."],
    finish: ["Top with whipped cream, if you like."],
    tips: ["With cocoa powder, stir it into a little of the hot coffee first to make a paste, then add the rest."]
  },
  {
    id: "latte", name: "Classic Latte", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot", defaultSweet: "none",
    blurb: "Just coffee and milk, done well. Sweeten it if you like.",
    tags: ["milky", "classic"], colors: { coffee: "#6B4226", milk: "#EFE3D0", top: "#FAF3E8" },
    ingredients: [
      { id: "sugar", name: "simple syrup or sugar", amt: 2, kind: "sweet" }
    ],
    add: ["?sugar|Stir the {n:sugar} into the hot coffee."],
    tips: ["The pod is the flavor here, so a milk-friendly pod like Bianco Doppio or Double Espresso Chiaro shines."]
  },
  {
    id: "brown-sugar-shaken-espresso", name: "Brown Sugar Shaken Espresso", style: "shaken", temps: ["iced"], icedOnly: true, defaultMilk: "oat", minSweet: "light",
    blurb: "Espresso shaken hard with brown sugar, cinnamon and ice, topped with oat milk.",
    tags: ["brown-sugar", "cinnamon"], colors: { coffee: "#7A4A26", milk: "#E8D3B5", top: "#C99A66" },
    ingredients: [
      { id: "sugar", name: "brown sugar", amt: 3, kind: "sweet" },
      { id: "cinnamon", name: "ground cinnamon", amt: 0.125, kind: "flavor", spice: true }
    ],
    add: ["Stir the {n:sugar} and {n:cinnamon} into the hot coffee until the sugar fully dissolves (it won't dissolve once it's cold)."],
    tips: ["Shaking is the point of this drink: it chills the coffee fast and makes it light and foamy. That's why there's no hot version.",
           "No shaker? A jar with a tight lid works just as well."]
  },
  {
    id: "iced-white-chocolate-mocha", name: "Iced White Chocolate Mocha", style: "latte", temps: ["iced"], icedOnly: true, minSweet: "light",
    blurb: "Creamy white chocolate, espresso and cold milk over ice.",
    tags: ["white-chocolate", "vanilla"], colors: { coffee: "#8A5A36", milk: "#F2E6D4", top: "#FBF5EA" },
    ingredients: [
      { id: "wchoc", name: "white chocolate sauce", amt: 4, kind: "sweet" },
      { id: "whip", name: "whipped cream, to top (optional)", kind: "fixed", optional: true }
    ],
    add: ["Stir the {n:wchoc} into the hot coffee until fully melted in. It needs the heat to blend smoothly."],
    finish: ["Top with whipped cream, if you like."],
    tips: ["No white chocolate sauce? Melt 1 tbsp white chocolate chips into the hot coffee for every tablespoon of sauce.",
           "White chocolate is the flavor, so the lowest sweetness option is Light."]
  },
  {
    id: "maple-vanilla-latte", name: "Maple Vanilla Latte", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot", minSweet: "light",
    blurb: "Pure maple syrup and vanilla. Cozy without being too sweet.",
    tags: ["maple", "vanilla"], colors: { coffee: "#7A4521", milk: "#E9D0AE", top: "#F6E8D3", garnish: "#A0612E" },
    ingredients: [
      { id: "maple", name: "pure maple syrup", amt: 3, kind: "sweet" },
      { id: "vanilla", name: "vanilla extract", amt: 0.25, kind: "flavor", spice: true }
    ],
    add: ["Stir the {n:maple} and {n:vanilla} into the hot coffee."],
    tips: ["Use real maple syrup, not pancake syrup. The flavor is much cleaner.",
           "Maple is the flavor, so the lowest sweetness option is Light."]
  },
  {
    id: "pumpkin-cream-coffee", name: "Pumpkin Cream Iced Coffee", style: "coffee", temps: ["iced"], icedOnly: true, seasonal: true,
    blurb: "Lightly sweet iced coffee under a thick, spiced pumpkin cold foam.",
    tags: ["pumpkin", "spice", "vanilla"], colors: { coffee: "#4E2E1C", milk: "#4E2E1C", top: "#E9B98A", garnish: "#C26A2B" },
    ingredients: [
      { id: "coffeeSyrup", name: "vanilla syrup (for the coffee)", amt: 2, kind: "sweet" },
      { id: "cream", name: "heavy cream (for the foam)", amt: 6, kind: "fixed", scale: false, plantAlt: { name: "full-fat canned coconut cream (for the foam)" } },
      { id: "foamMilk", name: "{milk} (for the foam)", amt: 6, kind: "fixed", scale: false },
      { id: "pumpkin", name: "pumpkin purée (for the foam)", amt: 3, kind: "fixed", scale: false },
      { id: "foamSyrup", name: "vanilla syrup (for the foam)", amt: 2, kind: "sweet", scale: false },
      { id: "spice", name: "pumpkin pie spice, plus a pinch to top", amt: 0.125, kind: "fixed", spice: true, scale: false }
    ],
    add: ["?coffeeSyrup|Stir the {n:coffeeSyrup} into the hot coffee."],
    finish: [
      "Make the pumpkin cream: in a tall cup, combine the {n:cream}, {n:foamMilk}, {n:pumpkin}, {n?:foamSyrup}, and pumpkin pie spice. Froth with a handheld frother for 20–30 seconds until thick but still pourable (or shake hard in a jar for 45 seconds). Keep it cold. Don't heat it.",
      "Slowly pour the pumpkin cream over the iced coffee so it floats on top. Dust with a pinch of pumpkin pie spice."
    ],
    tips: ["The foam is one serving whatever pod you use. Only the coffee and its syrup change with pod size.",
           "Cold foam needs cold, cold ingredients. Use them straight from the fridge.",
           "This drink is iced-only: cold foam melts straight into hot coffee."]
  },
  {
    id: "peppermint-mocha", name: "Peppermint Mocha", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot", seasonal: true,
    blurb: "Chocolate and cool peppermint, the holiday classic.",
    tags: ["peppermint", "chocolate"], colors: { coffee: "#4A2A1A", milk: "#C9A27E", top: "#FBF3EC", garnish: "#C8414B" },
    ingredients: [
      { id: "choc", name: "chocolate sauce", amt: 3, kind: "sweet", alt: { name: "unsweetened cocoa powder", amt: 2 } },
      { id: "mint", name: "peppermint syrup", amt: 2, kind: "sweet", alt: { name: "peppermint extract", amt: 0.0625, spice: true } },
      { id: "whip", name: "whipped cream & crushed candy cane, to top (optional)", kind: "fixed", optional: true }
    ],
    add: ["Stir the {n:choc} and {n:mint} into the hot coffee until smooth."],
    finish: ["Top with whipped cream and crushed candy cane, if you like."],
    tips: ["Peppermint extract is very strong. A tiny pinch-sized splash is plenty."]
  },
  {
    id: "cinnamon-dolce-latte", name: "Cinnamon Dolce Latte", style: "latte", temps: ["hot", "iced"], defaultTemp: "hot",
    blurb: "Brown sugar and cinnamon melted into espresso, finished with cinnamon sugar.",
    tags: ["cinnamon", "brown-sugar", "vanilla"], colors: { coffee: "#74421F", milk: "#E7CBA8", top: "#F4E6D2", garnish: "#9B5A2E" },
    ingredients: [
      { id: "sugar", name: "brown sugar", amt: 3, kind: "sweet" },
      { id: "cinnamon", name: "ground cinnamon", amt: 0.25, kind: "flavor", spice: true },
      { id: "vanilla", name: "vanilla extract", amt: 0.125, kind: "flavor", spice: true },
      { id: "topping", name: "cinnamon sugar, to sprinkle (optional)", kind: "fixed", optional: true }
    ],
    add: ["Stir the {n?:sugar}, {n:cinnamon} and {n:vanilla} into the hot coffee until dissolved."],
    finish: ["Sprinkle with cinnamon sugar, if you like."],
    tips: ["With sweetness set to None this becomes an unsweetened cinnamon latte, which is still delicious."]
  }
];
