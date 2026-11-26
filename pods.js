/*
  The Daily Brew — pod list
  -------------------------
  Pod names, cup sizes, flavor notes and intensity were checked against
  Nespresso USA's Vertuo pod page (nespresso.com/us/en/vertuo-coffee-pods)
  on Nov 25, 2026. Limited-edition pods come and go, so check this list
  against your boxes now and then.

  How to add a pod: copy one entry, give it a unique "id", and set:
    size     – one of the keys in SIZES below
    notes    – the tasting notes printed by Nespresso
    pairs    – flavor tags this pod goes well with (see TAG_LABELS in recipes.js)
    flavored – true if the pod itself is a flavored coffee
    iceReady – true if Nespresso designs it to brew over ice
*/

// Vertuo cup sizes. fl oz values are the ones Nespresso prints.
window.SIZES = {
  espresso: { label: "Espresso",        floz: 1.35, ml: 40  },
  double:   { label: "Double Espresso", floz: 2.7,  ml: 80  },
  granlungo:{ label: "Gran Lungo",      floz: 5.07, ml: 150 },
  coffee:   { label: "Coffee (Mug)",    floz: 7.77, ml: 230 },
  xl:       { label: "XL / Alto",       floz: 12,   ml: 355, note: "Nespresso lists XL pods as 12–14 fl oz; the app plans for 12 fl oz." }
};

window.SIZE_ORDER = ["espresso", "double", "granlungo", "coffee", "xl"];

window.PODS = [
  // ── Double Espresso · 2.7 fl oz (80 ml) ─────────────────────────
  { id: "de-dolce",   name: "Double Espresso Dolce",  size: "double", notes: "Caramel & malted cereal", intensity: 5,  color: "#C9893F", pairs: ["caramel", "brown-sugar", "vanilla", "milky"] },
  { id: "de-chiaro",  name: "Double Espresso Chiaro", size: "double", notes: "Woody & toasted cereal",  intensity: 8,  color: "#B4833F", pairs: ["milky", "classic"] },
  { id: "de-scuro",   name: "Double Espresso Scuro",  size: "double", notes: "Intensely roasted & cocoa", intensity: 11, color: "#3E2A22", pairs: ["chocolate", "peppermint", "spice"] },
  { id: "bianco-doppio", name: "Bianco Doppio",       size: "double", notes: "Nutty & balanced · made for milk", color: "#D9C4A0", pairs: ["milky", "classic", "maple"] },
  { id: "ice-leggero", name: "Ice Leggero",           size: "double", notes: "Fruity & light · made for ice", color: "#7FB3C8", iceReady: true, pairs: ["white-chocolate"] },
  { id: "active",     name: "Active",                 size: "double", notes: "Almond & vanilla · with vitamin B6", color: "#E07A3F", flavored: true, iceReady: true, pairs: ["vanilla", "nutty", "white-chocolate", "maple"] },

  // ── Espresso · 1.35 fl oz (40 ml) ───────────────────────────────
  { id: "altissio",   name: "Altissio",   size: "espresso", notes: "Full-bodied & creamy", intensity: 9,  color: "#5A3B7A", pairs: ["classic", "milky"] },
  { id: "voltesso",   name: "Voltesso",   size: "espresso", notes: "Light & sweet",        intensity: 4,  color: "#D7A84A", pairs: ["vanilla", "caramel", "milky"] },
  { id: "diavolitto", name: "Diavolitto", size: "espresso", notes: "Intense & powerful",   intensity: 11, color: "#8E2B2B", pairs: ["chocolate", "peppermint", "spice"] },
  { id: "orafio",     name: "Orafio",     size: "espresso", notes: "Caramel & roasted",    intensity: 6,  color: "#B8742E", pairs: ["caramel", "brown-sugar", "cinnamon"] },

  // ── Gran Lungo · 5.07 fl oz (150 ml) ────────────────────────────
  { id: "fortado",    name: "Fortado",    size: "granlungo", notes: "Intense & full-bodied", intensity: 8, color: "#6B3A2A", pairs: ["chocolate", "classic", "spice"] },
  { id: "arondio",    name: "Arondio",    size: "granlungo", notes: "Cereal & mild",         intensity: 6, color: "#A7864E", pairs: ["milky", "cinnamon"] },

  // ── Coffee (Mug) · 7.77 fl oz (230 ml) ──────────────────────────
  { id: "melozio",    name: "Melozio",    size: "coffee", notes: "Smooth & balanced", intensity: 6, color: "#B98A4E", pairs: ["classic", "caramel", "milky"] },
  { id: "odacio",     name: "Odacio",     size: "coffee", notes: "Bold & lively",     intensity: 7, color: "#3C6E8F", pairs: ["classic", "maple"] },
  { id: "stormio",    name: "Stormio",    size: "coffee", notes: "Rich & strong",     intensity: 8, color: "#2F4F3E", pairs: ["spice", "gingerbread"] },
  { id: "bianco-forte", name: "Bianco Forte", size: "coffee", notes: "Dark roasted & balanced · made for milk", color: "#C8B08A", pairs: ["milky", "classic"] },
  { id: "ice-forte",  name: "Ice Forte",  size: "coffee", notes: "Bold & dark roasted · made for ice", color: "#2E5D7A", iceReady: true, pairs: ["pumpkin", "classic"] },
  { id: "maple-pecan", name: "Maple Pecan", size: "coffee", notes: "Maple & pecan flavored", color: "#A0612E", flavored: true, pairs: ["maple", "brown-sugar", "caramel", "nutty"] },
  { id: "pumpkin-spice-cake", name: "Pumpkin Spice Cake", size: "coffee", notes: "Sweet pumpkin & cinnamon", color: "#D2732E", flavored: true, seasonal: true, pairs: ["pumpkin", "spice", "cinnamon", "vanilla"] },
  { id: "golden-caramel", name: "Golden Caramel", size: "coffee", notes: "Creamy & biscuity", color: "#D69A3C", flavored: true, pairs: ["caramel", "vanilla"] },
  { id: "sweet-vanilla",  name: "Sweet Vanilla",  size: "coffee", notes: "Creamy & sweet",   color: "#E8D29A", flavored: true, pairs: ["vanilla", "white-chocolate"] },
  { id: "rich-chocolate", name: "Rich Chocolate", size: "coffee", notes: "Creamy & chocolatey", color: "#5B3524", flavored: true, pairs: ["chocolate", "peppermint", "white-chocolate"] },
  { id: "roasted-hazelnut", name: "Roasted Hazelnut", size: "coffee", notes: "Rich & nutty", color: "#8A5A35", flavored: true, pairs: ["nutty", "chocolate"] },
  { id: "gingerbread", name: "Gingerbread", size: "coffee", notes: "Ginger & cereal · limited edition", color: "#9C5A2C", flavored: true, seasonal: true, pairs: ["gingerbread", "spice", "cinnamon"] },
  { id: "peppermint-pinwheel", name: "Peppermint Pinwheel", size: "coffee", notes: "Candied & sweet · limited edition", color: "#C8414B", flavored: true, seasonal: true, pairs: ["peppermint", "chocolate", "white-chocolate"] },
  { id: "cinnamon-apple-crisp", name: "Cinnamon Apple Crisp", size: "coffee", notes: "Cinnamon & apple", color: "#B5542F", flavored: true, seasonal: true, pairs: ["cinnamon", "spice", "brown-sugar", "maple"] },

  // ── XL · 12–14 fl oz ────────────────────────────────────────────
  { id: "cold-brew-style", name: "Cold Brew Style", size: "xl", notes: "Roasted & caramel · for iced coffee", color: "#4A3A2E", iceReady: true, pairs: ["caramel", "classic", "pumpkin"] }
];

// "My pod isn't listed" — pick a size instead.
window.GENERIC_PODS = window.SIZE_ORDER.map(function (key) {
  var s = window.SIZES[key];
  return { id: "any-" + key, name: "Any " + s.label + " pod", size: key, notes: "Generic " + s.label.toLowerCase() + " size", color: "#9A8574", generic: true, pairs: [] };
});
