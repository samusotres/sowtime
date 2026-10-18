// Node test: run the engine on the sample cities and print a planting matrix.
const E = require("./engine.js");
const plants = require("./plants.min.json");
const samples = require("./samples.json");
const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

function fromSample(s) {
  const sunFrac = s.sun.map((h, m) => {
    const dl = E.dayLength(s.lat, E.MID[m]);
    return Math.max(0.05, Math.min(0.95, h / (dl * E.DAYS[m])));
  });
  return { lat: s.lat, tmax: s.tmax, tmin: s.tmin, prcp: s.prcp, sunFrac };
}
const P = Object.fromEntries(plants.map(p => [p.id, p]));
const pick = (process.argv[2] || "tomato,lettuce,spinach,pea,carrot,garlic,potato,fava_bean,basil,okra,sweet_potato,apple,strawberry,tulip,lemon,banana,kale,onion").split(",");
const cities = (process.argv[3] || "Vienna,Melbourne,Bangkok,Delhi,Toronto,Nairobi").split(",");
const sunKey = process.argv[4] || "full";
const ab = { sow: "D", indoor: "I", seedling: "T", plant: "P" };
for (const c of cities) {
  const s = samples.find(x => x.name === c);
  const g = E.gardenClimate(fromSample(s), sunKey);
  console.log(`\n${c} (${sunKey})  garden sun h/day: ${g.gardenSun.map(x => x.toFixed(1)).join(" ")}`);
  console.log("".padEnd(14) + MON.map(m => m.padStart(5)).join(""));
  for (const id of pick) {
    const plan = E.yearPlan(P[id], g);
    const row = plan.map(e => (e.why && e.actions.length) ? "~" : (e.actions.map(a => ab[a.type]).join("") || "."));
    console.log(id.padEnd(14) + row.map(x => x.padStart(5)).join(""));
  }
  const oct = plants.map(p => [p, E.evaluate(p, g, 9)]).filter(([p, e]) => e.actions.length && !e.why);
  console.log(`October: ${oct.length} plantable`);
}
// Sanity: every plant evaluates in every city without throwing, and reasons are known.
let n = 0; const reasons = {};
for (const s of samples) for (const k of Object.keys(E.SUN_OPTIONS)) {
  const g = E.gardenClimate(fromSample(s), k);
  for (const p of plants) for (let m = 0; m < 12; m++) {
    const e = E.evaluate(p, g, m); n++;
    if (!e.actions.length || e.why) { const x = E.explain(p, g, m); reasons[x.why || "next"] = (reasons[x.why || "next"] || 0) + 1; }
  }
}
console.log(`\n${n} evaluations OK. Not-now reasons:`, reasons);
