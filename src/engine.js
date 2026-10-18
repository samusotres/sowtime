/* Planting engine: decides what can be sown or planted in a given month, for a given climate and garden.
   Climate input: monthly arrays (Jan..Dec) of mean daily max/min temperature (°C), precipitation (mm/month)
   and sunshine fraction (share of daylight hours that are sunny). */
(function (root) {
  "use strict";
  var DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var MID = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];

  /* Garden light options: hours of direct sun on a clear midsummer day. */
  var SUN_OPTIONS = {
    full: { hours: 8, label: "Full sun", hint: "6+ hours of direct sun" },
    part: { hours: 5, label: "Part sun", hint: "4–6 hours" },
    partshade: { hours: 3, label: "Part shade", hint: "2–4 hours" },
    shade: { hours: 1, label: "Shade", hint: "Under 2 hours" }
  };
  var NEED_HOURS = { full: 6, partial: 3, shade: 1 };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function dayLength(lat, doy) {
    var p = Math.asin(0.39795 * Math.cos(0.2163108 + 2 * Math.atan(0.9671396 * Math.tan(0.0086 * (doy - 186)))));
    var phi = lat * Math.PI / 180;
    var x = (Math.sin(0.8333 * Math.PI / 180) + Math.sin(phi) * Math.sin(p)) / (Math.cos(phi) * Math.cos(p));
    return 24 - (24 / Math.PI) * Math.acos(clamp(x, -1, 1));
  }

  /* Build the garden-specific monthly climate. */
  function gardenClimate(climate, sunKey) {
    var opt = SUN_OPTIONS[sunKey] || SUN_OPTIONS.full;
    var H = opt.hours;
    var dl = MID.map(function (d) { return dayLength(climate.lat, d); });
    var dlMax = Math.max.apply(null, dl);
    var shiftMax = clamp((H - 6) * 0.5, -2.5, 1.5);      // shaded beds stay cooler by day
    var soilShift = H >= 6 ? 1 : H >= 3 ? 0 : -1;        // sunny soil warms faster
    var g = { lat: climate.lat, sunKey: sunKey, sunHours: H, shiftMax: shiftMax, dl: dl,
              tmax: [], tmin: [], tmean: [], soil: [], prcp: climate.prcp.slice(), sunFrac: climate.sunFrac.slice(),
              gardenSun: [], openSun: [] };
    for (var m = 0; m < 12; m++) {
      var tmax = climate.tmax[m] + shiftMax, tmin = climate.tmin[m];
      g.tmax.push(tmax); g.tmin.push(tmin);
      g.tmean.push((tmax + tmin) / 2);
      g.soil.push((tmax + tmin) / 2 + soilShift);
      var clearHours = Math.min(H * dl[m] / dlMax, dl[m]);
      g.gardenSun.push(clearHours * climate.sunFrac[m]);
      g.openSun.push(dl[m] * climate.sunFrac[m]);
    }
    g.coldest = Math.min.apply(null, g.tmean);
    g.hottest = Math.max.apply(null, g.tmean);
    g.minTmin = Math.min.apply(null, g.tmin);
    return g;
  }

  function frostRisk(tmin) {
    if (tmin <= -2) return { level: 3, label: "Hard frost" };
    if (tmin <= 2) return { level: 2, label: "Frost likely" };
    if (tmin <= 5) return { level: 1, label: "Light frost possible" };
    return { level: 0, label: "Frost-free" };
  }

  /* ---------- per-plant rules ---------- */
  function survives(p, g, m) {
    if (p.frost === "tender") return g.tmin[m] >= 5;
    return g.tmin[m] - 5 >= p.minSurvive;
  }
  function plantOutOK(p, g, m) {
    var need = { tender: 9, half_hardy: 1, hardy: -3, very_hardy: -6 }[p.frost];
    return g.tmin[m] >= need && g.tmean[m] >= p.grow[0] && g.tmean[m] <= p.grow[3];
  }
  function germOK(p, g, m) {
    if (!p.germ) return false;
    var s = g.soil[m];
    if (s < p.germ[0] || s > p.germ[2] + 8) return false;
    if (p.frost === "tender" && g.tmin[m] < 7) return false;
    return g.tmin[m] - 5 >= p.minSurvive || p.frost === "tender";
  }
  function factor(p, g, m) {
    var t = g.tmean[m], gr = p.grow, f;
    if (t > gr[3]) return { f: -1, why: "hot" };
    if (t < gr[0]) return { f: 0, why: "cold" };
    if (t < gr[1]) f = 0.35 + 0.65 * (t - gr[0]) / (gr[1] - gr[0]);
    else if (t <= gr[2]) f = 1;
    else f = 1 - 0.6 * (t - gr[2]) / (gr[3] - gr[2]);
    var heat = false, bolt = false;
    if (g.tmax[m] > gr[3] + 5) { f *= 0.6; heat = true; }
    else if (g.tmax[m] > gr[2] + 6) { f *= 0.75; heat = true; }
    if (p.daylength === "long" && g.dl[m] > 14 && t > gr[1]) { f *= 0.65; bolt = true; }
    return { f: f, heat: heat, bolt: bolt };
  }

  /* Walk the calendar from month s until `days` of effective growth have accumulated. */
  function walk(p, g, s, days) {
    var grown = 0, sumF = 0, n = 0, flags = {};
    var canPause = p.frost === "hardy" || p.frost === "very_hardy";
    for (var i = 0; i < 13; i++) {
      var m = (s + i) % 12;
      if (!survives(p, g, m)) return { ok: false, why: "frost" };
      var r = factor(p, g, m);
      if (r.f < 0) return { ok: false, why: "hot" };
      if (r.f === 0) {
        if (!canPause || grown < 25) return { ok: false, why: "cold" };
        flags.overwinter = true;
        continue;
      }
      if (r.heat) flags.heat = true;
      if (r.bolt) flags.bolt = true;
      if (g.prcp[m] < 25) flags.dry = true;
      var monthDays = i === 0 ? DAYS[m] / 2 : DAYS[m];   // sown or planted mid-month
      if (grown + monthDays * r.f >= days) {
        var frac = (days - grown) / (monthDays * r.f);
        sumF += r.f * frac; n += frac;
        return { ok: true, end: m, months: i + frac, q: sumF / n, flags: flags };
      }
      grown += monthDays * r.f; sumF += r.f; n += 1;
    }
    return { ok: false, why: "cold" };
  }

  function harvestWindow(p, g, s, extraFromSeed) {
    var a = walk(p, g, s, Math.max(10, p.dtm[0] - extraFromSeed));
    if (!a.ok) return a;
    var b = walk(p, g, s, Math.max(10, p.dtm[1] - extraFromSeed));
    var res = { ok: true, q: a.q, flags: a.flags, from: a.end, to: b.ok ? b.end : a.end };
    if (b.ok) { res.q = (a.q + b.q) / 2; for (var k in b.flags) res.flags[k] = true; }
    return res;
  }

  function sunFactor(p, g) {
    var need = NEED_HOURS[p.sun] || 6, H = g.sunHours;
    if (H >= need) return (p.sun === "shade" && H >= 7 && g.hottest > 18) ? 0.8 : 1;
    if (H >= need * 0.6) return 0.75;
    return 0;
  }

  function isPerennialMode(p) { return p.dtm[0] >= 300 || (p.cycle === "perennial" && p.dtm[1] > 300); }
  function isAutumnBulb(p) { return p.chill && p.methods.indexOf("P") >= 0 && p.cycle === "perennial" && p.dtm[0] >= 150 && p.dtm[1] <= 300; }

  function perennialSite(p, g) {
    if (g.hottest > p.grow[3]) return { ok: false, why: "hot" };
    if (g.minTmin - 6 < p.minSurvive) return { ok: false, why: "winter_cold" };
    var lowChill = false;
    if (p.chill) {
      if (g.coldest > 14) return { ok: false, why: "winter_warm" };
      if (g.coldest > 10) lowChill = true;
    }
    var good = 0;
    for (var m = 0; m < 12; m++) { var r = factor(p, g, m); if (r.f >= 0.5) good++; }
    if (good < 3) return { ok: false, why: "cold" };
    return { ok: true, q: Math.min(1, 0.45 + good / 12), lowChill: lowChill };
  }

  /* Evaluate one plant for one start month. Returns {actions:[...], q, notes, why} */
  function evaluate(p, g, m) {
    var sf = sunFactor(p, g);
    var res = { actions: [], q: 0, notes: [], why: null, sun: sf };
    var M = p.methods;
    var k = p.indoorWeeks ? Math.max(1, Math.round(p.indoorWeeks / 4.35)) : 0;

    if (isAutumnBulb(p)) {
      var cold = g.coldest, lowChill = false, okMonth = false;
      if (g.minTmin - 5 < p.minSurvive) { res.why = "winter_cold"; return res; }
      if (cold <= 10) {
        okMonth = g.tmean[m] <= 14 && g.tmean[(m + 1) % 12] < g.tmean[m] && g.tmin[m] >= -3;
      } else if (cold <= 16) {
        lowChill = true;
        okMonth = g.tmean[m] <= Math.min(20, cold + 3) && g.tmean[(m + 1) % 12] <= g.tmean[m] + 0.5;
      } else { res.why = "winter_warm"; return res; }
      if (okMonth) {
        var avg = (p.dtm[0] + p.dtm[1]) / 2;
        var h = Math.round((m + avg / 30.4)) % 12;
        res.actions.push({ type: "plant", from: h, to: (h + 1) % 12, q: lowChill ? 0.5 : 0.9 });
        if (lowChill) res.notes.push("n_chillbulb");
      } else res.why = "season";
    } else if (isPerennialMode(p)) {
      var site = perennialSite(p, g);
      if (!site.ok) { res.why = site.why; return res; }
      var mild = g.tmean[m] >= Math.max(p.grow[0], 4) && g.tmean[m] <= p.grow[2] + 2 && g.tmin[m] >= -2;
      var first = { from: null, to: null, firstDays: p.dtm[0] };
      if (mild) {
        if (M.indexOf("P") >= 0) res.actions.push(Object.assign({ type: "plant", q: site.q }, first));
        if (M.indexOf("T") >= 0 && M.indexOf("P") < 0) res.actions.push(Object.assign({ type: "seedling", q: site.q }, first));
      }
      if (M.indexOf("D") >= 0 && germOK(p, g, m) && mild) res.actions.push(Object.assign({ type: "sow", q: site.q * 0.9 }, first));
      if (M.indexOf("I") >= 0) {
        var t = (m + k) % 12;
        if (g.tmean[t] >= Math.max(p.grow[0], 4) && g.tmean[t] <= p.grow[2] + 2 && plantOutOK(p, g, t))
          res.actions.push(Object.assign({ type: "indoor", q: site.q * 0.9, plantOut: t }, first));
      }
      if (site.lowChill) res.notes.push("n_lowchill");
      if (!res.actions.length) res.why = "season";
    } else {
      var seedDays = p.dtmFrom === "transplant" ? 0 : (p.indoorWeeks || 4) * 7;
      if (M.indexOf("D") >= 0 && germOK(p, g, m)) {
        var extra = p.dtmFrom === "transplant" ? -20 : 0; // direct-sown transplant crops need longer
        var w = harvestWindow(p, g, m, extra);
        if (w.ok) res.actions.push({ type: "sow", from: w.from, to: w.to, q: w.q, flags: w.flags });
      }
      if (M.indexOf("I") >= 0) {
        var t2 = (m + k) % 12;
        if (plantOutOK(p, g, t2)) {
          var w2 = harvestWindow(p, g, t2, p.dtmFrom === "transplant" ? 0 : p.indoorWeeks * 7);
          if (w2.ok) res.actions.push({ type: "indoor", plantOut: t2, from: w2.from, to: w2.to, q: w2.q * 0.97, flags: w2.flags });
        }
      }
      if ((M.indexOf("T") >= 0 || M.indexOf("I") >= 0) && plantOutOK(p, g, m)) {
        var w3 = harvestWindow(p, g, m, seedDays);
        if (w3.ok) res.actions.push({ type: "seedling", from: w3.from, to: w3.to, q: w3.q, flags: w3.flags });
      }
      if (M.indexOf("P") >= 0) {
        var soilMin = p.soilMin != null ? p.soilMin : p.grow[0];
        if (g.soil[m] >= soilMin && plantOutOK(p, g, m)) {
          var w4 = harvestWindow(p, g, m, 0);
          if (w4.ok) res.actions.push({ type: "plant", from: w4.from, to: w4.to, q: w4.q, flags: w4.flags });
        }
      }
      if (!res.actions.length) res.why = "season";
    }

    if (res.actions.length) {
      res.q = Math.max.apply(null, res.actions.map(function (a) { return a.q; })) * sf;
      var fl = {};
      res.actions.forEach(function (a) { for (var x in (a.flags || {})) fl[x] = true; });
      if (fl.heat) res.notes.push("n_heat");
      if (fl.bolt) res.notes.push("n_bolt");
      if (fl.dry) res.notes.push("n_dry");
      if (fl.overwinter) res.notes.push("n_overwinter");
      if (sf === 0) { res.why = "sun"; }
      else if (sf < 1 && p.sun === "shade") res.notes.push("n_shade");
      else if (sf < 1) res.notes.push("n_lesssun");
      if (res.q < 0.3 && sf > 0) { res.why = "marginal"; }
    }
    return res;
  }

  function rating(q) { return q >= 0.85 ? "ideal" : q >= 0.6 ? "good" : "possible"; }

  function yearPlan(p, g) {
    var months = [];
    for (var m = 0; m < 12; m++) months.push(evaluate(p, g, m));
    return months;
  }

  /* Explain why a plant isn't plantable this month: next good month, or a site-level reason. */
  function explain(p, g, m, plan) {
    plan = plan || yearPlan(p, g);
    for (var i = 1; i < 12; i++) {
      var mm = (m + i) % 12, e = plan[mm];
      if (e.actions.length && !e.why) return { next: mm, action: e.actions[0].type };
    }
    var e0 = plan[m];
    var why = e0.why;
    if (why === "season" || why === "marginal") {
      why = g.hottest > p.grow[3] && g.coldest > p.grow[1] ? "hot" : "cold";
    }
    return { why: why };
  }

  function prepare(p) {
    // Accept the compact plant record used in the page.
    return p;
  }

  var api = { SUN_OPTIONS: SUN_OPTIONS, NEED_HOURS: NEED_HOURS, dayLength: dayLength, gardenClimate: gardenClimate,
              frostRisk: frostRisk, evaluate: evaluate, yearPlan: yearPlan, explain: explain, rating: rating,
              isPerennialMode: isPerennialMode, prepare: prepare, DAYS: DAYS, MID: MID };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(this);
