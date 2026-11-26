/* The Daily Brew: app logic. Data lives in data/pods.js and data/recipes.js. */
(function () {
  "use strict";

  var FAV_KEY = "dailybrew.favorites.v1";
  var PREF_KEY = "dailybrew.prefs.v1";
  var COLL_KEY = "dailybrew.collection.v1";
  var ALL_PODS = window.PODS.concat(window.GENERIC_PODS);
  var view = document.getElementById("view");
  var topbar = document.getElementById("topbar");
  var navStack = [location.hash || "#/"];

  /* ───────────── helpers ───────────── */
  function podById(id) { return ALL_PODS.find(function (p) { return p.id === id; }); }
  function recipeById(id) { return window.RECIPES.find(function (r) { return r.id === id; }); }
  function milkByKey(k) { return window.MILKS.find(function (m) { return m.key === k; }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function load(key, fallback) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  function joinList(arr) {
    if (arr.length <= 1) return arr.join("");
    return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
  }
  function sizeLine(key) { var s = window.SIZES[key]; return s.label + " · " + s.floz + " fl oz (" + s.ml + " ml)"; }

  /* ───────────── measurements ───────────── */
  var FRAC = { 0: "", 0.125: "⅛", 0.25: "¼", 0.375: "⅜", 0.5: "½", 0.625: "⅝", 0.75: "¾", 0.875: "⅞" };
  function frac(x) {
    var w = Math.floor(x + 1e-9);
    var f = Math.round((x - w) * 8) / 8;
    if (f >= 1) { w += 1; f = 0; }
    var s = (w ? String(w) : "") + (FRAC[f] || "");
    return s || "0";
  }
  // Metric uses standard kitchen equivalents: 1 tsp = 5 ml, 1 tbsp = 15 ml.
  function mlStr(ml) { return ml < 5 ? (Math.round(ml * 10) / 10) + " ml" : Math.round(ml) + " ml"; }
  // Teaspoon amounts → measurable kitchen units, US first then metric.
  function fmtSpoons(tsp, spice) {
    if (spice) {
      // Only sizes found in a standard measuring-spoon set: ⅛, ¼, ½, ¾, 1…
      if (tsp < 0.1) return "1 pinch";
      var n = tsp < 0.1875 ? 0.125 : Math.ceil(tsp * 4 - 0.5) / 4;
      return frac(n) + " tsp (" + mlStr(n * 5) + ")";
    }
    if (tsp >= 2.75) {
      var tb = Math.round((tsp / 3) * 2) / 2;
      return frac(tb) + " tbsp (" + mlStr(tb * 15) + ")";
    }
    var t = Math.max(0.5, Math.round(tsp * 2) / 2);
    return frac(t) + " tsp (" + mlStr(t * 5) + ")";
  }
  function fmtOz(oz) {
    var n = Math.round(oz * 2) / 2;
    return frac(n) + " fl oz (" + Math.round((n * 29.57) / 5) * 5 + " ml)";
  }

  /* ───────────── recommendation rules ───────────── */
  function classify(recipe, pod) {
    var style = window.STYLES[recipe.style];
    var fit = style.fit[pod.size];
    var matches = recipe.tags.filter(function (t) { return pod.pairs.indexOf(t) !== -1; });
    var iceMatch = !!(pod.iceReady && recipe.icedOnly);
    // Flavor points: the drink's main flavor (its first tag) = 2, any other shared tag = 1,
    // a pod Nespresso designs for ice + an iced-only drink = 1.
    var points = matches.reduce(function (sum, t) { return sum + (t === recipe.tags[0] ? 2 : 1); }, 0) + (iceMatch ? 1 : 0);
    var clash = !!(pod.flavored && matches.length === 0);
    var group = "other";
    if (!pod.generic && !clash && fit >= 1 && points >= 2) group = "rec";
    else if (!clash && (fit >= 2 || (fit >= 1 && points >= 1))) group = "good";
    var count = points;

    var reason;
    if (group !== "other" && matches.length) {
      var parts = [];
      if (matches.length) parts.push("“" + pod.notes.split(" · ")[0] + "” pairs with the " + joinList(matches.map(function (t) { return window.TAG_LABELS[t]; })) + ".");
      if (iceMatch) parts.push("Nespresso designs this pod for iced drinks.");
      reason = parts.join(" ");
    } else if (clash) {
      reason = "Its " + pod.notes.split(" · ")[0].toLowerCase() + " flavor may compete with this drink.";
    } else {
      reason = style.fitNotes[pod.size];
    }
    return { group: group, fit: fit, matches: matches, clash: clash, reason: reason, fitNote: style.fitNotes[pod.size],
             score: fit + count - (clash ? 3 : 0) };
  }
  // ownedFirst: within each group, pods in My Pods come before the rest (then by score).
  function groupBy(list, fn, ownedFirst) {
    var out = { rec: [], good: [], other: [] };
    var mine = ownedFirst ? myPods() : [];
    list.forEach(function (item) { var c = fn(item); out[c.group].push({ item: item, c: c, owned: mine.indexOf(item.id) !== -1 }); });
    ["rec", "good", "other"].forEach(function (g) {
      out[g].sort(function (a, b) { return (b.owned - a.owned) || (b.c.score - a.c.score); });
    });
    return out;
  }
  // Best of *your* pods for a drink (Recommended first, then Works well), or null.
  function bestOwnedFor(recipe) {
    var owned = myPods().map(podById);
    if (!owned.length) return null;
    var g = groupBy(owned, function (p) { return classify(recipe, p); });
    var hit = g.rec[0] || g.good[0];
    return hit ? { pod: hit.item, group: hit.c.group } : null;
  }
  // Default pod for a recipe: your best suitable pod, otherwise the best pod overall.
  function bestPodFor(recipe) {
    var mine = bestOwnedFor(recipe);
    if (mine) return mine.pod;
    var g = groupBy(window.PODS, function (p) { return classify(recipe, p); });
    return (g.rec[0] || g.good[0] || { item: podById("any-double") }).item;
  }

  /* ───────────── my pod collection ───────────── */
  function myPods() {
    var ids = load(COLL_KEY, []);
    if (!Array.isArray(ids)) return [];
    return ids.filter(function (id) { return window.PODS.some(function (p) { return p.id === id; }); });
  }
  function owns(id) { return myPods().indexOf(id) !== -1; }
  function toggleOwn(id) {
    var list = myPods(), p = podById(id), i = list.indexOf(id);
    if (!p || p.generic) return;
    if (i >= 0) list.splice(i, 1); else list.push(id);
    if (!store(COLL_KEY, list)) { toast("Couldn’t save. Your browser is blocking storage."); return; }
    toast(i >= 0 ? "Removed " + p.name + " from My Pods" : "Added " + p.name + " to My Pods");
  }

  /* ───────────── search (fixed rules) ───────────── */
  // Rules: ignore capitals and accents; every typed word must match the START of a word
  // (so "cinn" finds cinnamon, but "ice" doesn't find "spice").
  function fold(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function words(s) { return fold(s).split(/[^a-z0-9%]+/).filter(Boolean); }
  function matchesAll(haystack, term) {
    var hay = words(haystack);
    return words(term).every(function (w) { return hay.some(function (h) { return h.indexOf(w) === 0; }); });
  }
  // Pod search looks at the pod itself first; flavor pairings are a second tier.
  function podText(p, withPairs) {
    var s = window.SIZES[p.size];
    return [p.name, p.notes, s.label, s.floz + " oz", s.ml + " ml",
            p.seasonal ? "seasonal limited" : "", p.iceReady ? "iced ice" : "", p.flavored ? "flavored" : "",
            p.size === "coffee" ? "mug" : "", p.size === "xl" ? "alto" : "",
            withPairs ? p.pairs.map(function (t) { return t + " " + window.TAG_LABELS[t]; }).join(" ") : ""].join(" ");
  }
  function drinkText(r) {
    return [r.name, r.blurb, r.tags.map(function (t) { return t + " " + window.TAG_LABELS[t]; }).join(" "),
            r.ingredients.map(function (i) { return i.name + (i.alt ? " " + i.alt.name : ""); }).join(" "),
            r.icedOnly ? "iced cold" : "hot iced", r.seasonal ? "seasonal" : "", r.style === "latte" ? "latte" : ""].join(" ");
  }

  /* ───────────── recipe calculation ───────────── */
  function sweetIndex(k) { return window.SWEETNESS.findIndex(function (s) { return s.key === k; }); }
  function normalize(recipe, q) {
    var prefs = load(PREF_KEY, {});
    var temp = q.temp && recipe.temps.indexOf(q.temp) !== -1 ? q.temp : (recipe.defaultTemp || recipe.temps[0]);
    var min = sweetIndex(recipe.minSweet || "none");
    var sweet = q.sweet && sweetIndex(q.sweet) !== -1 ? q.sweet : (recipe.defaultSweet || "regular");
    if (sweetIndex(sweet) < min) sweet = window.SWEETNESS[min].key;
    var milk = q.milk && milkByKey(q.milk) ? q.milk : (recipe.defaultMilk || prefs.milk || "2pct");
    var pod = (q.pod && podById(q.pod)) || bestPodFor(recipe);
    return { recipe: recipe, pod: pod, temp: temp, sweet: sweet, milk: milk };
  }

  function compute(s) {
    var recipe = s.recipe, pod = s.pod, temp = s.temp;
    var style = window.STYLES[recipe.style];
    var size = window.SIZES[pod.size];
    var plan = style[temp][pod.size] || {};
    var milkOz = plan.milk || 0, waterOz = plan.water || 0;
    var total = size.floz + milkOz + waterOz;
    var scale = Math.max(0.5, Math.round((total / style.ref[temp]) * 4) / 4);
    var sf = window.SWEETNESS[sweetIndex(s.sweet)].factor;
    var milk = milkByKey(s.milk);
    var names = {};
    var items = [];
    var podLabel = pod.generic ? size.label + " pod" : pod.name + " pod";

    items.push({ role: "coffee", text: "1 " + podLabel, sub: "brews " + size.floz + " fl oz (" + size.ml + " ml)" });

    recipe.ingredients.forEach(function (ing) {
      var name = ing.name, amt = ing.amt, spice = ing.spice;
      var k = ing.scale === false ? 1 : scale;
      if (ing.kind === "sweet") {
        if (sf === 0) {
          if (!ing.alt) return;
          name = ing.alt.name; amt = ing.alt.amt * k; spice = ing.alt.spice;
        } else amt = amt * sf * k;
      } else if (ing.kind === "flavor") {
        amt = amt * k;
      }
      if (milk.plant && ing.plantAlt) name = ing.plantAlt.name;
      name = name.replace("{milk}", milk.name);
      names[ing.id] = name;
      items.push({ role: ing.kind, text: name, amount: amt != null ? fmtSpoons(amt, spice) : "", optional: ing.optional });
    });
    if (milkOz) items.push({ role: "milk", text: milk.name + (temp === "iced" ? ", cold" : ""), amount: fmtOz(milkOz) });
    if (waterOz) items.push({ role: "water", text: "cold water", amount: fmtOz(waterOz) });

    var big = pod.size === "coffee" || pod.size === "xl";
    var glass = { espresso: "16 oz glass", double: "16 oz glass", granlungo: "16 oz glass", coffee: "20 oz glass", xl: "24 oz glass" }[pod.size];
    var cup = total <= 7 ? "8 oz cup" : total <= 10 ? "12 oz mug" : total <= 13 ? "14–16 oz mug" : "16 oz (or larger) mug";
    var iceAmt;
    if (temp === "iced") {
      if (recipe.style === "shaken") iceAmt = "about 1½ cups (360 ml)";
      else iceAmt = { espresso: "1 cup (240 ml)", double: "1 cup (240 ml)", granlungo: "1 cup (240 ml)", coffee: "1½ cups (360 ml)", xl: "2 cups (475 ml)" }[pod.size];
      items.push({ role: "ice", text: "ice", amount: iceAmt, sub: big ? null : "plus 2 cubes to cool the coffee" });
    }

    /* steps */
    function nm(id) { return (names[id] || "").replace(/\s*\(.*?\)/g, "").replace(/,.*$/, ""); }
    function fill(str) {
      var gate = /^\?(\w+)\|/.exec(str);
      if (gate) { if (!names[gate[1]]) return null; str = str.slice(gate[0].length); }
      str = str.replace(/\{n\??:(\w+)\}/g, function (_, id) { return nm(id); });
      return str.replace(/,\s*(?=,)/g, "").replace(/\bthe\s*,\s*/g, "the ").replace(/\s+,/g, ",").replace(/\s{2,}/g, " ");
    }
    var brewName = pod.generic ? "your " + size.label + " pod" : "your " + pod.name + " pod";
    var T = {
      "@brew": function () {
        if (temp === "hot") return "Brew " + brewName + " straight into a " + cup + ". Your machine reads the pod and brews " + size.floz + " fl oz (" + size.ml + " ml) automatically.";
        var t = "Brew " + brewName + " into a heatproof cup or glass measuring cup, not over the ice yet. It brews " + size.floz + " fl oz (" + size.ml + " ml).";
        if (pod.iceReady) t += " Nespresso designs this pod to be served over ice, so it keeps its flavor when chilled.";
        return t;
      },
      "@add": function () { return recipe.add || []; },
      "@froth": function () {
        var amt = fmtOz(milkOz);
        if (milk.key === "almond") return "Gently heat " + amt + " almond milk to no hotter than 140°F (60°C), then froth it. Almond milk can separate if it gets too hot.";
        return "Heat and froth " + amt + " " + milk.name + " until steaming, about 140–150°F (60–65°C): hot to the touch but not boiling. Use a frother like the Aeroccino, or microwave it in a large jar for 45–60 seconds and whisk or shake until foamy." + (milk.key === "oat" ? " A barista-style oat milk foams best." : "");
      },
      "@combine": function () {
        if (milk.key === "almond") return "Let the coffee rest 1 minute, then pour in the almond milk slowly and spoon the foam on top. The short rest helps keep it from separating.";
        return "Pour the milk into the coffee, holding back the foam with a spoon, then spoon the foam on top.";
      },
      "@cool": function () {
        if (!big) return "Cool it first: stir 2 ice cubes into the hot coffee until they melt (about 30 seconds). Hot coffee poured straight over ice melts it fast and waters the drink down.";
        return "Cool it first: let the coffee sit about 5 minutes, or 10 minutes in the fridge, until it’s just warm. Hot coffee poured straight over ice melts it fast and waters the drink down.";
      },
      "@glass": function () { return "Fill a " + glass + " with " + iceAmt.replace(/ \(.*\)/, "") + " of ice."; },
      "@pourMilkCoffee": function () { return "Pour in the cold " + milk.name + ", then the cooled coffee. Stir, taste, and add a splash more milk if you want it creamier."; },
      "@shake": function () {
        return ["Add 1 cup of ice and the cooled coffee to a cocktail shaker or a jar with a tight lid. Shake hard for 10–15 seconds until frothy.",
                "Pour everything, ice included, into a " + glass + ". Add a little more ice if it isn’t full.",
                "Top with the " + milk.name + " and watch it swirl down through the espresso."];
      },
      "@glassCoffee": function () {
        return "Fill a " + glass + " with ice and pour in the cooled coffee" + (waterOz ? ", then the cold water" : "") + ".";
      },
      "@finish": function () { return recipe.finish || []; }
    };
    var steps = [];
    style.steps[temp].forEach(function (tok) {
      var out = T[tok] ? T[tok]() : tok;
      [].concat(out).forEach(function (st) { var f = fill(st); if (f) steps.push(f); });
    });

    /* tips */
    var c = classify(recipe, pod);
    var tips = [];
    if (size.note) tips.push(size.note);
    tips.push(milk.tip);
    tips = tips.concat(recipe.tips || []);

    return {
      items: items, steps: steps, tips: tips, cls: c, scale: scale,
      summary: [ "Makes about " + fmtOz(total), temp === "iced" ? glass : cup ]
    };
  }

  /* ───────────── illustrations ───────────── */
  var uid = 0;
  function cupSVG(r, temp, px) {
    var c = r.colors; var id = "c" + (++uid); px = px || 64;
    var halo = '<circle cx="32" cy="34" r="29" fill="' + (c.garnish || c.coffee) + '" opacity=".14"/>';
    if (temp === "iced") {
      return '<svg class="cup" width="' + px + '" height="' + px + '" viewBox="0 0 64 64" aria-hidden="true">' + halo +
        '<defs><clipPath id="' + id + '"><path d="M17 12h30l-3.6 44a4 4 0 0 1-4 3.6H24.6a4 4 0 0 1-4-3.6z"/></clipPath></defs>' +
        '<line x1="38" y1="3" x2="34" y2="30" stroke="var(--caramel)" stroke-width="2.6" stroke-linecap="round"/>' +
        '<g clip-path="url(#' + id + ')">' +
          '<rect x="10" y="12" width="44" height="50" fill="var(--glass)"/>' +
          '<rect x="10" y="20" width="44" height="42" fill="' + c.milk + '"/>' +
          '<rect x="10" y="38" width="44" height="24" fill="' + c.coffee + '"/>' +
          '<rect x="10" y="17" width="44" height="7" fill="' + c.top + '"/>' +
          '<rect x="21" y="25" width="10" height="10" rx="2.5" fill="#fff" opacity=".55" transform="rotate(-12 26 30)"/>' +
          '<rect x="33" y="31" width="9" height="9" rx="2.5" fill="#fff" opacity=".45" transform="rotate(10 37 35)"/>' +
          '<rect x="24" y="42" width="9" height="9" rx="2.5" fill="#fff" opacity=".35" transform="rotate(6 28 46)"/>' +
        '</g>' +
        '<path d="M17 12h30l-3.6 44a4 4 0 0 1-4 3.6H24.6a4 4 0 0 1-4-3.6z" fill="none" stroke="var(--ink)" stroke-opacity=".7" stroke-width="2"/>' +
        '</svg>';
    }
    return '<svg class="cup" width="' + px + '" height="' + px + '" viewBox="0 0 64 64" aria-hidden="true">' + halo +
      '<path d="M24 6c-2 3 2 5 0 8M32 4c-2 3 2 5 0 8M40 6c-2 3 2 5 0 8" fill="none" stroke="var(--steam)" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M48 26h3a7 7 0 0 1 0 14h-4" fill="none" stroke="var(--ink)" stroke-opacity=".7" stroke-width="3"/>' +
      '<path d="M12 20h38v22a14 14 0 0 1-14 14h-10a14 14 0 0 1-14-14z" fill="' + c.coffee + '"/>' +
      '<ellipse cx="31" cy="21" rx="18" ry="4.5" fill="' + c.top + '"/>' +
      '<path d="M31 24c-3-2.6-6-1.2-5 0.6 1 1.6 5 2.6 5 2.6s4-1 5-2.6c1-1.8-2-3.2-5-0.6z" fill="' + c.milk + '" opacity=".9"/>' +
      (c.garnish ? '<circle cx="23" cy="20.5" r="1.1" fill="' + c.garnish + '"/><circle cx="38" cy="21.5" r="1" fill="' + c.garnish + '"/><circle cx="34" cy="19.6" r=".9" fill="' + c.garnish + '"/>' : '') +
      '<path d="M12 20h38v22a14 14 0 0 1-14 14h-10a14 14 0 0 1-14-14z" fill="none" stroke="var(--ink)" stroke-opacity=".7" stroke-width="2"/>' +
      '<path d="M8 58h46" stroke="var(--ink)" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>' +
      '</svg>';
  }
  function podDot(p, px) {
    px = px || 40;
    return '<svg class="pod-dot" width="' + px + '" height="' + px + '" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="18" fill="' + p.color + '"/>' +
      '<circle cx="20" cy="20" r="12.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2"/>' +
      '<ellipse cx="14" cy="13" rx="5" ry="3" fill="#fff" opacity=".25" transform="rotate(-30 14 13)"/></svg>';
  }
  var ICONS = {
    back: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" fill="currentColor"/></svg>',
    starO: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ───────────── favorites ───────────── */
  function favs() { return load(FAV_KEY, []); }
  function favKey(s) { return [s.recipe.id, s.pod.id, s.temp, s.sweet, s.milk].join("|"); }
  function isFav(s) { var k = favKey(s); return favs().some(function (f) { return f.key === k; }); }
  function toggleFav(s) {
    var list = favs(), k = favKey(s);
    var i = list.findIndex(function (f) { return f.key === k; });
    if (i >= 0) { list.splice(i, 1); store(FAV_KEY, list); toast("Removed from favorites"); return false; }
    list.unshift({ key: k, recipe: s.recipe.id, pod: s.pod.id, temp: s.temp, sweet: s.sweet, milk: s.milk, saved: Date.now() });
    if (!store(FAV_KEY, list)) { toast("Couldn’t save. Your browser is blocking storage."); return false; }
    toast("Saved to favorites ★");
    return true;
  }
  function makeLink(s) {
    return "#/make/" + s.recipe + "?pod=" + s.pod + "&temp=" + s.temp + "&sweet=" + s.sweet + "&milk=" + s.milk;
  }
  function favSummary(f) {
    var p = podById(f.pod), m = milkByKey(f.milk), sw = window.SWEETNESS[sweetIndex(f.sweet)];
    return [p ? p.name : "Pod", f.temp === "iced" ? "Iced" : "Hot", sw ? sw.label + " sweet" : "", m ? m.label + " milk" : ""].filter(Boolean).join(" · ");
  }

  var toastTimer;
  function toast(msg, action) {
    var el = document.getElementById("toast");
    el.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button">' + esc(action.label) + '</button>' : "");
    el.classList.add("show");
    if (action) el.querySelector("button").onclick = function () { action.fn(); el.classList.remove("show"); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, action ? 5000 : 2200);
  }

  /* ───────────── shared bits ───────────── */
  function badges(list) {
    return list.filter(Boolean).map(function (b) { return '<span class="badge badge-' + b[0] + '">' + esc(b[1]) + '</span>'; }).join("");
  }
  function podBadges(p) {
    return badges([p.seasonal && ["season", "Seasonal"], p.iceReady && ["ice", "Made for ice"], /made for milk/.test(p.notes) && ["milk", "Made for milk"], p.flavored && ["flavor", "Flavored"]]);
  }
  function drinkBadges(r) {
    return badges([r.icedOnly && ["ice", "Iced only"], r.seasonal && ["season", "Seasonal"]]);
  }
  function drinkRow(r, href, note, kind) {
    return '<a class="row ' + (kind || "") + '" href="' + href + '">' + cupSVG(r, r.icedOnly ? "iced" : (r.defaultTemp || "hot"), 52) +
      '<span class="row-main"><span class="row-title">' + esc(r.name) + '</span>' +
      (note ? '<span class="row-sub">' + esc(note) + '</span>' : "") + '</span>' + ICONS.chev + '</a>';
  }
  function podRow(p, href, note, kind, owned) {
    return '<a class="row ' + (kind || "") + '" href="' + href + '">' + podDot(p, 40) +
      '<span class="row-main"><span class="row-title">' + esc(p.name) + (owned ? ' <span class="badge badge-own">In My Pods</span>' : "") + '</span>' +
      '<span class="row-sub">' + esc(note || (window.SIZES[p.size].label + " · " + p.notes)) + '</span></span>' + ICONS.chev + '</a>';
  }
  // A pod row with an add/remove button for My Pods (the row itself opens the pod).
  function podPickRow(p) {
    var on = owns(p.id);
    return '<div class="row pod-row' + (on ? " mine" : "") + '"><a class="row-link" href="#/pod/' + p.id + '">' + podDot(p, 40) +
      '<span class="row-main"><span class="row-title">' + esc(p.name) + '</span><span class="row-sub">' + esc(p.notes.split(" · ")[0]) +
      (p.intensity ? " · Intensity " + p.intensity : "") + '</span><span class="row-badges">' + podBadges(p) + '</span></span></a>' +
      '<button type="button" class="own-btn' + (on ? " on" : "") + '" data-act="own" data-pod="' + p.id + '" aria-pressed="' + on + '" aria-label="' +
      (on ? "Remove " + esc(p.name) + " from My Pods" : "Add " + esc(p.name) + " to My Pods") + '">' + (on ? ICONS.check : ICONS.plus) + '</button></div>';
  }
  function searchBox(kind, term, placeholder) {
    return '<div class="search"><label><span class="sr">' + placeholder + '</span>' +
      '<input type="search" data-search="' + kind + '" placeholder="' + placeholder + '" value="' + esc(term) + '" ' +
      'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>' +
      '<button type="button" class="search-clear' + (term ? "" : " hidden") + '" data-act="clear-search" aria-label="Clear search">' + ICONS.x + '</button></div>';
  }
  function noResults(what, term) {
    return '<div class="empty no-results"><p>No ' + what + ' match “' + esc(term) + '”.</p>' +
      '<button type="button" class="link-btn" data-act="clear-search">Clear search</button></div>';
  }
  function section(title, cls, body, sub) {
    return '<section class="sec ' + (cls || "") + '"><h2 class="sec-title">' + title + '</h2>' + (sub ? '<p class="sec-sub">' + sub + '</p>' : "") + body + '</section>';
  }
  function sizeChips(hrefFn) {
    return '<div class="chips wrap">' + window.SIZE_ORDER.map(function (k) {
      var s = window.SIZES[k];
      return '<a class="chip" href="' + hrefFn("any-" + k) + '">' + esc(s.label) + ' <small>' + s.floz + ' oz</small></a>';
    }).join("") + '</div>';
  }

  /* ───────────── views ───────────── */
  function greeting() {
    var h = new Date().getHours();
    return h < 5 ? "Late-night brew?" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }
  function isIOS() {
    var ua = navigator.userAgent;
    if (/Android/.test(ua)) return false;
    return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function isStandalone() { return window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches); }

  function viewHome() {
    var prefs = load(PREF_KEY, {});
    var showInstall = isIOS() && !isStandalone() && !prefs.hideInstall;
    var seasonal = window.RECIPES.filter(function (r) { return r.seasonal; });
    var fl = favs().slice(0, 3);
    var mine = myPods().map(podById);
    var podSub = mine.length ? "You have " + mine.length + " pod" + (mine.length === 1 ? "" : "s") + " in My Pods" : "See the drinks that suit the pod you have";
    var mineRow = mine.length ? section("My Pods", "", '<div class="chips mine-chips">' + mine.map(function (p) {
      return '<a class="chip pod-chip" href="#/pod/' + p.id + '">' + podDot(p, 22) + esc(p.name) + '</a>';
    }).join("") + '<a class="chip chip-edit" href="#/pods">Edit</a></div>') : "";
    return '<div class="hero">' +
        '<p class="eyebrow">' + greeting() + '</p>' +
        '<h1 class="display">What are we<br>brewing today?</h1>' +
        '<p class="lede">Recipes sized to your Vertuo pod. Pick where you want to start.</p>' +
      '</div>' +
      (showInstall ? '<div class="install card"><div>' + '<strong>Add The Daily Brew to your Home Screen</strong><br>' +
        'In Safari, tap <span class="inline-ico">' + ICONS.share + '</span> Share, then <b>Add to Home Screen</b>. It works offline after that.</div>' +
        '<button class="icon-btn" data-act="hide-install" aria-label="Dismiss">' + ICONS.x + '</button></div>' : "") +
      '<div class="choices">' +
        '<a class="choice choice-pod" href="#/pods"><span class="choice-art">' + podDot({ color: "#A0612E" }, 56) + '</span>' +
          '<span class="choice-text"><span class="choice-title">Start with my pod</span><span class="choice-sub">' + esc(podSub) + '</span></span>' + ICONS.chev + '</a>' +
        '<a class="choice choice-drink" href="#/drinks"><span class="choice-art">' + cupSVG(recipeById("vanilla-latte"), "hot", 56) + '</span>' +
          '<span class="choice-text"><span class="choice-title">Start with a drink</span><span class="choice-sub">Find the best pods for what you’re craving</span></span>' + ICONS.chev + '</a>' +
      '</div>' + mineRow +
      section("In season", "", '<div class="carousel">' + seasonal.map(function (r) {
        var temp = r.icedOnly ? "iced" : "hot";
        return '<a class="tile" href="#/drink/' + r.id + '">' + cupSVG(r, temp, 72) + '<span class="tile-title">' + esc(r.name) + '</span>' + drinkBadges(r) + '</a>';
      }).join("") + '</div>') +
      section("Your favorites", "", fl.length ? '<div class="list">' + fl.map(function (f) {
        var r = recipeById(f.recipe); if (!r) return "";
        return '<a class="row" href="' + makeLink(f) + '">' + cupSVG(r, f.temp, 52) + '<span class="row-main"><span class="row-title">' + esc(r.name) + '</span><span class="row-sub">' + esc(favSummary(f)) + '</span></span>' + ICONS.chev + '</a>';
      }).join("") + (favs().length > 3 ? '<a class="more" href="#/favorites">See all favorites</a>' : "") + '</div>'
        : '<p class="empty">Tap ☆ on any recipe to save it here, with your pod, milk and sweetness.</p>');
  }

  function podsResults(term) {
    var hits = window.PODS.filter(function (p) { return !term || matchesAll(podText(p), term); });
    var pairHits = term ? window.PODS.filter(function (p) { return hits.indexOf(p) === -1 && matchesAll(podText(p, true), term); }) : [];
    if (!hits.length && !pairHits.length) return noResults("pods", term);
    var pairSec = pairHits.length ? section("Pairs well with “" + esc(term) + "”", "", '<div class="list">' + pairHits.map(podPickRow).join("") + '</div>') : "";
    if (!hits.length) return pairSec;
    var mineIds = myPods();
    var mine = hits.filter(function (p) { return mineIds.indexOf(p.id) !== -1; });
    // Not searching: My Pods on top, and the size lists show the rest. Searching: one list, yours marked ✓.
    var mineSec = term ? "" : mine.length
      ? section("My Pods", "sec-mine", '<div class="list">' + mine.map(podPickRow).join("") + '</div>', "Your pods come first in recipes and recommendations.")
      : section("My Pods", "sec-mine", '<p class="empty">Tap <span class="inline-plus">' + ICONS.plus + '</span> next to the pods you own. They’ll come first in recommendations and recipes, and stay saved on this device.</p>');
    var groups = window.SIZE_ORDER.map(function (k) {
      var pods = hits.filter(function (p) { return p.size === k && (term || mineIds.indexOf(p.id) === -1); });
      if (!pods.length) return "";
      return section(sizeLine(k), "", '<div class="list">' + pods.map(podPickRow).join("") + '</div>');
    }).join("");
    return (term ? '<p class="result-count">' + hits.length + ' pod' + (hits.length === 1 ? "" : "s") + ' found</p>' : "") + mineSec + groups + pairSec;
  }

  function viewPods(q) {
    var term = q.get("q") || "";
    return '<div class="page-head"><h1 class="title">Choose your pod</h1><p class="lede">Tap a pod to see drinks that suit it. Tap ＋ to add it to My Pods.</p>' +
      searchBox("pods", term, "Search pods, flavors or sizes") + '</div>' +
      '<div id="results" aria-live="polite">' + podsResults(term) + '</div>' +
      section("Pod not listed?", "", sizeChips(function (id) { return "#/pod/" + id; }), "Choose its size instead. It’s printed on the sleeve.");
  }

  function viewPod(id) {
    var p = podById(id);
    if (!p) return notFound();
    var g = groupBy(window.RECIPES, function (r) { return classify(r, p); });
    function list(arr, kind, useReason) {
      return '<div class="list">' + arr.map(function (x) { return drinkRow(x.item, "#/make/" + x.item.id + "?pod=" + p.id, useReason ? x.c.reason : x.item.blurb, kind); }).join("") + '</div>';
    }
    var intensity = p.intensity ? '<div class="intensity" aria-label="Intensity ' + p.intensity + ' of 13">' + Array.from({ length: 13 }, function (_, i) { return '<i class="' + (i < p.intensity ? "on" : "") + '"></i>'; }).join("") + '<span>Intensity ' + p.intensity + '</span></div>' : "";
    var on = owns(p.id);
    var ownBtn = p.generic ? "" : '<button type="button" class="btn-own' + (on ? " on" : "") + '" data-act="own" data-pod="' + p.id + '" aria-pressed="' + on + '">' +
      (on ? ICONS.check + " In My Pods" : ICONS.plus + " Add to My Pods") + '</button>';
    return '<div class="pod-hero card">' + podDot(p, 64) + '<div><h1 class="title">' + esc(p.name) + '</h1>' +
        '<p class="meta">' + esc(sizeLine(p.size)) + '</p><p class="notes">' + esc(p.notes) + '</p>' + intensity +
        '<div class="row-badges">' + podBadges(p) + '</div></div></div>' + ownBtn +
      (g.rec.length ? section("Recommended for this pod", "sec-rec", list(g.rec, "rec", true), "Chosen for its size and flavor notes.") : "") +
      (g.good.length ? section("Also works well", "", list(g.good, "", true)) : "") +
      (g.other.length ? section("Other drinks", "sec-other", list(g.other, "other", true), "You can still make any of these with this pod. Here’s what to expect.") : "");
  }

  function drinksResults(term, f) {
    var hasMine = myPods().length > 0;
    var list = window.RECIPES.filter(function (r) {
      var keep = f === "all" || (f === "iced" && r.icedOnly) || (f === "hoticed" && !r.icedOnly) || (f === "season" && r.seasonal) ||
        (f === "mine" && !!bestOwnedFor(r));
      return keep && (!term || matchesAll(drinkText(r), term));
    });
    if (f === "mine" && !hasMine) return '<div class="empty"><p>Add the pods you own to My Pods and this filter will show the drinks they suit.</p><a class="link-btn" href="#/pods">Go to Pods</a></div>';
    if (!list.length) return term ? noResults("drinks", term) : '<p class="empty">No drinks in this filter yet.</p>';
    return (term ? '<p class="result-count">' + list.length + ' drink' + (list.length === 1 ? "" : "s") + ' found</p>' : "") +
      '<div class="grid">' + list.map(function (r) {
        var mine = hasMine ? bestOwnedFor(r) : null;
        return '<a class="tile tile-grid" href="#/drink/' + r.id + '">' + cupSVG(r, r.icedOnly ? "iced" : "hot", 76) +
          '<span class="tile-title">' + esc(r.name) + '</span><span class="tile-sub">' + esc(r.blurb) + '</span>' +
          (mine ? '<span class="tile-mine">' + podDot(mine.pod, 16) + '<span>' + (mine.group === "rec" ? "Best with your " : "Works with your ") + esc(mine.pod.name) + '</span></span>' : "") +
          '<span class="row-badges">' + drinkBadges(r) + '</span></a>';
      }).join("") + '</div>';
  }

  function viewDrinks(q) {
    var f = q.get("f") || "all", term = q.get("q") || "";
    var filters = [["all", "All"]].concat(myPods().length ? [["mine", "Fits my pods"]] : [], [["hoticed", "Hot or iced"], ["iced", "Iced only"], ["season", "Seasonal"]]);
    return '<div class="page-head"><h1 class="title">Choose a drink</h1><p class="lede">We’ll show which pods make it best.</p>' +
      searchBox("drinks", term, "Search drinks or ingredients") +
      '<div class="chips" role="tablist">' + filters.map(function (x) {
        return '<a class="chip' + (x[0] === f ? " on" : "") + '" role="tab" aria-selected="' + (x[0] === f) + '" href="#/drinks?f=' + x[0] + (term ? "&q=" + encodeURIComponent(term) : "") + '">' + x[1] + '</a>';
      }).join("") + '</div></div>' +
      '<div id="results" aria-live="polite">' + drinksResults(term, f) + '</div>';
  }

  function viewDrink(id) {
    var r = recipeById(id);
    if (!r) return notFound();
    var g = groupBy(window.PODS, function (p) { return classify(r, p); }, true);
    function list(arr, kind) {
      return '<div class="list">' + arr.map(function (x) { return podRow(x.item, "#/make/" + r.id + "?pod=" + x.item.id, x.c.reason, kind, x.owned); }).join("") + '</div>';
    }
    return '<div class="drink-hero card">' + cupSVG(r, r.icedOnly ? "iced" : "hot", 92) +
        '<div><h1 class="title">' + esc(r.name) + '</h1><p class="notes">' + esc(r.blurb) + '</p><div class="row-badges">' + drinkBadges(r) + '</div></div></div>' +
      (g.rec.length ? section("Best pods for this drink", "sec-rec", list(g.rec, "rec"), "Chosen for size and flavor match.") : "") +
      (g.good.length ? section("Also works well", "", list(g.good, "")) : "") +
      section("Pod not listed?", "", sizeChips(function (pid) { return "#/make/" + r.id + "?pod=" + pid; }), "Pick its size and we’ll scale the recipe.") +
      (g.other.length ? '<details class="sec sec-other"><summary class="sec-title">Other pods <span class="count">' + g.other.length + '</span></summary><p class="sec-sub">Not the usual pick, but you can still use any of these.</p>' + list(g.other, "other") + '</details>' : "");
  }

  function seg(name, options, current) {
    return '<div class="seg" role="radiogroup" aria-label="' + esc(name) + '">' + options.map(function (o) {
      return '<button type="button" role="radio" aria-checked="' + (o[0] === current) + '" class="' + (o[0] === current ? "on" : "") + '" data-set="' + name + '" data-val="' + o[0] + '">' + esc(o[1]) + '</button>';
    }).join("") + '</div>';
  }

  // If the chosen pod isn't yours but one of yours is Recommended for this drink, offer a one-tap switch.
  function switchHint(r, pod) {
    if (owns(pod.id)) return "";
    var best = bestOwnedFor(r);
    if (!best || best.group !== "rec") return "";
    return '<button type="button" class="hint" data-set="pod" data-val="' + best.pod.id + '">' + podDot(best.pod, 24) +
      '<span>You have <b>' + esc(best.pod.name) + '</b>, which is recommended for this drink. <u>Switch to it</u></span></button>';
  }

  function viewMake(id, q) {
    var r = recipeById(id);
    if (!r) return notFound();
    var s = normalize(r, { pod: q.get("pod"), temp: q.get("temp"), sweet: q.get("sweet"), milk: q.get("milk") });
    var out = compute(s);
    var c = out.cls;
    var fav = isFav(s);
    var minI = sweetIndex(r.minSweet || "none");
    var label = { rec: "Recommended pod", good: "Works well", other: "Not the usual pick" }[c.group];

    var mineIds = myPods();
    function opt(p) {
      var g = classify(r, p).group;
      return '<option value="' + p.id + '"' + (p.id === s.pod.id ? " selected" : "") + '>' + esc(p.name) + (g === "rec" ? "  ★" : "") + '</option>';
    }
    var mineGroup = mineIds.length ? '<optgroup label="My Pods">' + mineIds.map(podById).map(opt).join("") + '</optgroup>' : "";
    var podOptions = mineGroup + window.SIZE_ORDER.map(function (k) {
      var pods = window.PODS.filter(function (p) { return p.size === k && mineIds.indexOf(p.id) === -1; });
      if (!pods.length) return "";
      return '<optgroup label="' + esc(sizeLine(k)) + '">' + pods.map(opt).join("") + '</optgroup>';
    }).join("") + '<optgroup label="Pod not listed: choose a size">' + window.GENERIC_PODS.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === s.pod.id ? " selected" : "") + '>' + esc(p.name) + ' (' + window.SIZES[p.size].floz + ' fl oz)</option>';
    }).join("") + '</optgroup>';

    var tempCtl = r.icedOnly
      ? '<div class="iced-only">' + badges([["ice", "Iced only"]]) + '<span>This drink is made to be served cold.</span></div>'
      : seg("temp", [["hot", "☕ Hot"], ["iced", "🧊 Iced"]], s.temp);

    return '<div class="make-hero">' + cupSVG(r, s.temp, 96) +
        '<div class="make-hero-text"><h1 class="title">' + esc(r.name) + '</h1><p class="notes">' + esc(r.blurb) + '</p></div>' +
        '<button class="fav-btn' + (fav ? " on" : "") + '" data-act="fav" aria-pressed="' + fav + '" aria-label="' + (fav ? "Remove from favorites" : "Save to favorites") + '">' + (fav ? ICONS.star : ICONS.starO) + '</button>' +
      '</div>' +
      '<div class="card controls">' +
        '<label class="ctl"><span class="ctl-label">Your pod</span>' +
          '<span class="select-wrap">' + podDot(s.pod, 28) + '<select id="pod-select" aria-label="Pod">' + podOptions + '</select></span></label>' +
        '<div class="fit fit-' + c.group + '"><strong>' + label + (owns(s.pod.id) ? ' <span class="badge badge-own">In My Pods</span>' : "") + '</strong><span>' + esc(c.group === "rec" ? c.reason + " " + c.fitNote : c.reason) + '</span></div>' +
        switchHint(r, s.pod) +
        '<div class="ctl"><span class="ctl-label">Temperature</span>' + tempCtl + '</div>' +
        '<div class="ctl"><span class="ctl-label">Sweetness</span>' + seg("sweet", window.SWEETNESS.filter(function (x, i) { return i >= minI; }).map(function (x) { return [x.key, x.label]; }), s.sweet) + '</div>' +
        '<div class="ctl"><span class="ctl-label">Milk</span>' + seg("milk", window.MILKS.map(function (m) { return [m.key, m.label]; }), s.milk) + '</div>' +
      '</div>' +
      '<div class="summary">' + out.summary.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join("") + '</div>' +
      '<section class="card recipe"><h2 class="card-title">Ingredients</h2><ul class="ingredients">' + out.items.map(function (it) {
        return '<li class="ing ing-' + it.role + (it.optional ? " opt" : "") + '"><span class="ing-name">' + esc(it.text) + (it.sub ? '<small>' + esc(it.sub) + '</small>' : "") + '</span>' +
          (it.amount ? '<span class="ing-amt">' + esc(it.amount) + '</span>' : "") + '</li>';
      }).join("") + '</ul></section>' +
      '<section class="card recipe"><h2 class="card-title">Steps</h2><ol class="steps">' + out.steps.map(function (st) { return '<li>' + esc(st) + '</li>'; }).join("") + '</ol></section>' +
      '<section class="card tips"><h2 class="card-title">Good to know</h2><ul>' + out.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul></section>' +
      '<button class="btn-primary' + (fav ? " saved" : "") + '" data-act="fav">' + (fav ? ICONS.star + " Saved to favorites" : ICONS.starO + " Save to favorites") + '</button>';
  }

  function viewFavorites() {
    var list = favs();
    if (!list.length) return '<div class="page-head"><h1 class="title">Favorites</h1></div><div class="empty-state card">' + cupSVG(recipeById("latte"), "hot", 80) +
      '<p><strong>No favorites yet</strong></p><p>Open any recipe, set it up the way you like it, and tap ☆ to save it here with your pod, milk and sweetness.</p><a class="btn-primary" href="#/drinks">Browse drinks</a></div>';
    return '<div class="page-head"><h1 class="title">Favorites</h1><p class="lede">Saved on this device. Tap one to make it again.</p></div><div class="list">' + list.map(function (f) {
      var r = recipeById(f.recipe); if (!r) return "";
      return '<div class="row fav-row"><a class="row-link" href="' + makeLink(f) + '">' + cupSVG(r, f.temp, 52) + '<span class="row-main"><span class="row-title">' + esc(r.name) + '</span><span class="row-sub">' + esc(favSummary(f)) + '</span></span></a>' +
        '<button class="icon-btn" data-act="unfav" data-key="' + esc(f.key) + '" aria-label="Remove ' + esc(r.name) + ' from favorites">' + ICONS.x + '</button></div>';
    }).join("") + '</div>';
  }

  function notFound() { return '<div class="empty-state card"><p><strong>That page isn’t here.</strong></p><a class="btn-primary" href="#/">Go home</a></div>'; }

  /* ───────────── router ───────────── */
  function parse() {
    var h = location.hash.replace(/^#/, "") || "/";
    var i = h.indexOf("?");
    var path = i >= 0 ? h.slice(0, i) : h;
    return { parts: path.split("/").filter(Boolean), q: new URLSearchParams(i >= 0 ? h.slice(i + 1) : "") };
  }
  var TITLES = { "": "The Daily Brew", pods: "Pods", pod: "Pod", drinks: "Drinks", drink: "Drink", make: "Recipe", favorites: "Favorites" };
  var PARENT = { pod: "#/pods", drink: "#/drinks", make: "#/drinks" };

  function render(keepScroll) {
    var r = parse(), a = r.parts[0] || "";
    var y = window.scrollY;
    var html;
    if (a === "") html = viewHome();
    else if (a === "pods") html = viewPods(r.q);
    else if (a === "pod") html = viewPod(r.parts[1]);
    else if (a === "drinks") html = viewDrinks(r.q);
    else if (a === "drink") html = viewDrink(r.parts[1]);
    else if (a === "make") html = viewMake(r.parts[1], r.q);
    else if (a === "favorites") html = viewFavorites();
    else html = notFound();
    view.innerHTML = html;

    var isTab = ["", "pods", "drinks", "favorites"].indexOf(a) !== -1;
    topbar.innerHTML = (isTab ? '<span class="brand">' + podDot({ color: "#A0612E" }, 22) + 'The Daily Brew</span>'
      : '<button class="back" data-act="back" aria-label="Back">' + ICONS.back + '<span>Back</span></button><span class="topbar-title">' + TITLES[a] + '</span>');
    document.title = (a === "" ? "" : (TITLES[a] || "") + " · ") + "The Daily Brew";
    var tab = { "": "home", pods: "pods", pod: "pods", drinks: "drinks", drink: "drinks", make: "drinks", favorites: "favorites" }[a];
    document.querySelectorAll(".tabbar a").forEach(function (el) {
      var on = el.dataset.tab === tab;
      el.classList.toggle("on", on);
      if (on) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
    });
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);

    var search = view.querySelector("input[data-search]");
    if (search) {
      // Live search: only the results area is redrawn, so the iPhone keyboard stays open.
      search.addEventListener("input", function () { runSearch(search.value); });
      search.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); search.blur(); } });
    }
    var sel = document.getElementById("pod-select");
    if (sel) sel.addEventListener("change", function () { updateMake({ pod: sel.value }); });
  }

  function runSearch(value) {
    var r = parse(), a = r.parts[0];
    var results = document.getElementById("results");
    if (!results) return;
    var f = r.q.get("f");
    var params = [];
    if (f) params.push("f=" + encodeURIComponent(f));
    if (value) params.push("q=" + encodeURIComponent(value));
    history.replaceState(null, "", "#/" + a + (params.length ? "?" + params.join("&") : ""));
    results.innerHTML = a === "pods" ? podsResults(value) : drinksResults(value, f || "all");
    var clear = view.querySelector(".search-clear");
    if (clear) clear.classList.toggle("hidden", !value);
    // Keep filter chips carrying the current search.
    view.querySelectorAll(".chips[role=tablist] .chip").forEach(function (chip) {
      var key = (chip.getAttribute("href").match(/f=(\w+)/) || [])[1];
      chip.setAttribute("href", "#/drinks?f=" + key + (value ? "&q=" + encodeURIComponent(value) : ""));
    });
  }

  function updateMake(change) {
    var r = parse();
    var recipe = recipeById(r.parts[1]);
    var cur = normalize(recipe, { pod: r.q.get("pod"), temp: r.q.get("temp"), sweet: r.q.get("sweet"), milk: r.q.get("milk") });
    var next = { recipe: recipe.id, pod: change.pod || cur.pod.id, temp: change.temp || cur.temp, sweet: change.sweet || cur.sweet, milk: change.milk || cur.milk };
    if (change.milk) { var p = load(PREF_KEY, {}); p.milk = change.milk; store(PREF_KEY, p); }
    history.replaceState(null, "", makeLink(next));
    render(true);
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-set],[data-act]");
    if (!t) return;
    if (t.dataset.set) { var ch = {}; ch[t.dataset.set] = t.dataset.val; updateMake(ch); return; }
    var act = t.dataset.act;
    if (act === "back") {
      if (navStack.length > 1) history.back();
      else location.hash = PARENT[parse().parts[0]] || "#/";
    } else if (act === "fav") {
      var r = parse(), recipe = recipeById(r.parts[1]);
      toggleFav(normalize(recipe, { pod: r.q.get("pod"), temp: r.q.get("temp"), sweet: r.q.get("sweet"), milk: r.q.get("milk") }));
      render(true);
    } else if (act === "unfav") {
      var list = favs(), i = list.findIndex(function (f) { return f.key === t.dataset.key; });
      if (i < 0) return;
      var removed = list.splice(i, 1)[0];
      store(FAV_KEY, list); render(true);
      toast("Removed from favorites", { label: "Undo", fn: function () { var l = favs(); l.splice(i, 0, removed); store(FAV_KEY, l); render(true); } });
    } else if (act === "own") {
      toggleOwn(t.dataset.pod);
      var input = view.querySelector("input[data-search]");
      if (document.getElementById("results") && input) runSearch(input.value); else render(true);
    } else if (act === "clear-search") {
      var box = view.querySelector("input[data-search]");
      if (box) { box.value = ""; runSearch(""); box.focus(); }
    } else if (act === "hide-install") {
      var p = load(PREF_KEY, {}); p.hideInstall = true; store(PREF_KEY, p); render(true);
    }
  });

  window.addEventListener("hashchange", function () {
    var route = location.hash || "#/";
    if (navStack.length > 1 && navStack[navStack.length - 2] === route) navStack.pop();
    else navStack.push(route);
    render(false);
  });

  render(false);

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function () {}); });
  }

  // Exposed for testing in the browser console.
  window.DailyBrew = { compute: compute, classify: classify, normalize: normalize, fmtSpoons: fmtSpoons, fmtOz: fmtOz,
                       matchesAll: matchesAll, podText: podText, drinkText: drinkText, myPods: myPods, bestOwnedFor: bestOwnedFor, bestPodFor: bestPodFor };
})();
