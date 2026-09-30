// SCENARIO — single source of truth for "Inside the Planner".
// Illustrative data for demonstration. Values marked est:true are estimates.
// Every visual in the page is derived from this object.

const SCENARIO = {
  meta: {
    title: "Inside the Planner",
    pitch: "How an AI-assisted trip planner turns one sentence into a validated, editable itinerary.",
    coreMessage: "Software makes it possible, AI makes it personal.",
    flowLine: "You say it → it becomes a constraint → constraints set the dials → the planner reads the dials.",
    dataLabel: "Illustrative data for demonstration",
    counters: { aiCalls: 5, codeDecisions: 142, dataTables: 11 },
    aiJobs: [
      "Turn chat into typed constraints",
      "Choose and group activities into days from a code-supplied candidate pool",
      "Break close ties / pick from a code-made shortlist (route tie-break, hotel area)",
      "Write narration grounded in a fact sheet ({{poi:ID}} tokens rendered by code)"
    ],
    codeJobs: [
      "Trip Dials", "Gateways", "City classification & order", "Nights", "Hotel-area shortlist",
      "Candidate filtering", "Scheduling", "Travel times", "Validation & repair", "Grounding checks", "Diffs"
    ]
  },

  travellers: {
    party: "Couple, early 30s", from: "Mumbai", firstTimeInJapan: true, count: 2,
    dietary: [{ traveller: "T2", diet: "vegetarian" }]
  },

  trip: {
    startDate: "2026-11-10", endDate: "2026-11-24", days: 15, nights: 14,
    season: "Autumn foliage",
    budget: { band: "mid-range", splurge: "1 night ryokan with private onsen" }
  },

  form: {
    interests: ["food", "photography", "design/architecture", "onsen", "light hiking"],
    pace: "balanced"
  },

  chatMessage:
    "We're not morning people, so nothing before 10 please. One of us is vegetarian. We'd love one really special ryokan night with a private onsen, great autumn colours, and a few quiet spots away from crowds. We love coffee and design shops. Happy to walk a lot, but we don't want to change hotels every day.",

  // ─── Step ① Understand ───────────────────────────────────────────
  weights: { low: 0.2, medium: 0.5, high: 0.8, hard: "filter" },
  constraintTypes: [
    "time_window", "dietary", "stay_requirement", "interest", "avoid", "movement", "stay_stability", "accessibility", "budget"
  ],
  askRule: "Ask only when top options are close AND differ on an unknown preference; max one question at a time.",

  constraints: [
    { id: "c_daystart", chip: "Nothing before 10", phrase: "nothing before 10 please", type: "time_window",
      json: { type: "time_window", field: "day_start", op: ">=", value: "10:00" }, strength: "soft", weight: "high",
      dials: ["dayStart"], steps: [2, 6, 8, 9, 10] },
    { id: "c_veg", chip: "Vegetarian", phrase: "One of us is vegetarian", type: "dietary",
      json: { type: "dietary", diet: "vegetarian", travellers: ["T2"], applies_to: "all_meals" }, strength: "hard", weight: "hard",
      dials: ["dietary"], steps: [2, 6, 7, 8, 9, 10] },
    { id: "c_ryokan", chip: "Ryokan + private onsen", phrase: "one really special ryokan night with a private onsen", type: "stay_requirement",
      json: { type: "stay_requirement", kind: "ryokan", feature: "private_onsen", nights: 1, budget: "splurge" }, strength: "hard", weight: "hard",
      dials: ["budget"], steps: [3, 4, 5, 9] },
    { id: "c_foliage", chip: "Autumn colours", phrase: "great autumn colours", type: "interest",
      json: { type: "interest", tag: "foliage", level: "high" }, strength: "soft", weight: "high",
      dials: ["interestWeights"], steps: [3, 6, 7, 8] },
    { id: "c_quiet", chip: "Quiet spots", phrase: "a few quiet spots away from crowds", type: "avoid",
      json: { type: "avoid", tag: "crowded", freeform: "quiet spots", level: "medium" }, strength: "soft", weight: "medium",
      dials: ["avoidTags"], steps: [2, 6, 7, 8, 9] },
    { id: "c_coffee_design", chip: "Coffee + design", phrase: "We love coffee and design shops", type: "interest",
      json: { type: "interest", tags: ["coffee", "design_shops"], level: "medium" }, strength: "soft", weight: "medium",
      dials: ["interestWeights"], steps: [5, 6, 7, 8] },
    { id: "c_walk", chip: "Walks a lot", phrase: "Happy to walk a lot", type: "movement",
      json: { type: "movement", field: "walking_limit", direction: "raise" }, strength: "soft", weight: "medium",
      dials: ["walkingLimit", "maxContinuousWalk", "taxiThreshold"], steps: [2, 5, 8, 9] },
    { id: "c_hotels", chip: "Don't change hotels every day", phrase: "we don't want to change hotels every day", type: "stay_stability",
      json: { type: "stay_stability", field: "min_nights_per_base", op: ">=", value: 2, except: ["c_ryokan"] }, strength: "soft", weight: "high",
      dials: ["minNights", "maxHotelChanges"], steps: [2, 3, 4, 9] }
  ],
  traceChips: ["c_veg", "c_daystart", "c_hotels", "c_quiet", "c_walk"],

  clarifyingQuestion: {
    trigger: "Route optimiser (Step ③): top two routes score within 3.8% and differ mainly on where the ryokan night goes.",
    question: "How important is seeing Mt Fuji?",
    options: [
      { label: "Must-see", effect: "Hakone ryokan kept; extra Fuji-view slot + a second viewpoint attempt on Day 5 afternoon." },
      { label: "Nice if the weather is clear", effect: "Hakone ryokan kept; weather-dependent Fuji viewpoint Day 6 morning, indoor backup if cloudy." },
      { label: "Skip", effect: "Ryokan moves to Yamanaka Onsen near Kanazawa; one fewer hotel change, no Fuji." }
    ],
    selected: "Nice if the weather is clear",
    notAsked: [
      { q: "Hotel star rating", default: "Mid-range, 3–4★" },
      { q: "Rail pass?", default: "Priced per leg" },
      { q: "Dinner time", default: "19:00–20:30" },
      { q: "Guided tours?", default: "Self-guided unless needed" },
      { q: "Shopping budget", default: "Not planned" },
      { q: "Luggage forwarding", default: "Suggested on long legs" }
    ]
  },

  // ─── Step ② Trip Dials ───────────────────────────────────────────
  dialPresets: {
    "Balanced": { activitiesPerDay: 4, freeTime: 60, walkingLimit: 12 },
    "Relaxed": { activitiesPerDay: 3, freeTime: 120, buffer: 20 },
    "Late Riser": { dayStart: "10:00", dayEnd: "21:30" },
    "Walks a Lot": { walkingLimit: 18, maxContinuousWalk: 45, taxiThreshold: 30 },
    "Vegetarian": { dietary: "vegetarian" },
    "Travelling with Elderly": { walkingLimit: 6, maxContinuousWalk: 15, accessibility: "step-free", activitiesPerDay: 3 }
  },
  presetsApplied: ["Balanced"],
  dialGroups: [
    { id: "time", icon: "⏰", name: "Time", dials: [
      { id: "dayStart", name: "Day Start", unit: "time", default: "09:00", preset: "09:00", chat: "10:00", final: "10:00", movedBy: [{ c: "c_daystart", note: "set by 'not morning people'" }] },
      { id: "dayEnd", name: "Day End", unit: "time", default: "21:00", preset: "21:00", chat: null, final: "21:00", movedBy: [] },
      { id: "mealWindows", name: "Meal Windows", unit: "range", default: "L 12:00–13:30 · D 18:30–20:00", preset: "same", chat: "L 12:30–14:00 · D 19:00–20:30", final: "L 12:30–14:00 · D 19:00–20:30", movedBy: [{ c: "c_daystart", note: "shifted +30 min with later start" }] },
      { id: "returnBy", name: "Return By", unit: "time", default: "22:00", preset: "22:00", chat: null, final: "22:00", movedBy: [] }
    ]},
    { id: "load", icon: "🎒", name: "Load", dials: [
      { id: "activitiesPerDay", name: "Activities per Day", unit: "count", default: 4, preset: 4, chat: null, final: 4, movedBy: [] },
      { id: "freeTime", name: "Free Time", unit: "min/day", default: 60, preset: 60, chat: null, final: 60, movedBy: [] },
      { id: "buffer", name: "Buffer", unit: "min/transfer", default: 15, preset: 15, chat: null, final: 15, movedBy: [] }
    ]},
    { id: "movement", icon: "🚶", name: "Movement", dials: [
      { id: "walkingLimit", name: "Walking Limit", unit: "km/day", default: 10, preset: 12, chat: 16, final: 16, movedBy: [{ c: "c_walk", note: "raised by 'happy to walk a lot'" }] },
      { id: "maxContinuousWalk", name: "Max Continuous Walk", unit: "min", default: 25, preset: 25, chat: 40, final: 40, movedBy: [{ c: "c_walk", note: "raised by 'happy to walk a lot'" }] },
      { id: "transitPerDay", name: "Transit per Day", unit: "h", default: 2, preset: 2, chat: null, final: 2, movedBy: [] },
      { id: "taxiThreshold", name: "Taxi Threshold", unit: "min walk", default: 20, preset: 20, chat: 30, final: 30, movedBy: [{ c: "c_walk", note: "taxis suggested only for walks > 30 min" }] }
    ]},
    { id: "stay", icon: "🏨", name: "Stay", dials: [
      { id: "minNights", name: "Min Nights per Base", unit: "nights", default: 1, preset: 1, chat: 2, final: 2, movedBy: [{ c: "c_hotels", note: "set by 'don't change hotels every day' (splurge ryokan exempt)" }] },
      { id: "maxHotelChanges", name: "Max Hotel Changes", unit: "count", default: 7, preset: 7, chat: 5, final: 5, movedBy: [{ c: "c_hotels", note: "capped by 'don't change hotels every day'" }] }
    ]},
    { id: "filters", icon: "🍽", name: "Filters", dials: [
      { id: "dietary", name: "Dietary", unit: "tag", default: "none", preset: "none", chat: "vegetarian (1 traveller)", final: "vegetarian (1 traveller)", movedBy: [{ c: "c_veg", note: "hard filter on every meal" }] },
      { id: "accessibility", name: "Accessibility", unit: "tag", default: "none", preset: "none", chat: null, final: "none", movedBy: [] },
      { id: "budget", name: "Budget", unit: "band", default: "mid", preset: "mid", chat: "mid + 1 splurge night", final: "mid + 1 splurge night", movedBy: [{ c: "c_ryokan", note: "one splurge night reserved for ryokan" }] },
      { id: "avoidTags", name: "Avoid Tags", unit: "tags", default: "[]", preset: "[]", chat: "[crowded]", final: "[crowded]", movedBy: [{ c: "c_quiet", note: "set by 'quiet spots away from crowds'" }] }
    ]},
    { id: "taste", icon: "❤️", name: "Taste", dials: [
      { id: "interestWeights", name: "Interest Weights", unit: "weights", default: { food: 0.5, photography: 0.5, design: 0.5, onsen: 0.5, hiking: 0.5, foliage: 0.2, coffee: 0.2, history: 0.5, nightlife: 0.2 },
        preset: "form interests → 0.5", chat: { foliage: 0.8, coffee: 0.5, design: 0.5 },
        final: { food: 0.5, photography: 0.5, design: 0.5, onsen: 0.5, hiking: 0.5, foliage: 0.8, coffee: 0.5, history: 0.5, nightlife: 0.2 },
        movedBy: [{ c: "c_foliage", note: "foliage → 0.8" }, { c: "c_coffee_design", note: "coffee → 0.5" }] }
    ]}
  ],
  dialRule: "Strictest or most explicit wins.",
  dialTagline: "Preferences are unlimited; dials are few. The planner only reads the dials.",

  // ─── Step ③ Gateways & Route ─────────────────────────────────────
  gateways: {
    options: [
      { id: "rt", name: "Round-trip Tokyo (HND ⇄ HND)", fareDeltaINR: 0, backtrackH: 2.5, halfDayLost: true, timeSavedH: 0, est: true },
      { id: "oj", name: "Open-jaw Tokyo (HND) → Osaka (KIX)", fareDeltaINR: 6500, backtrackH: 0, halfDayLost: false, timeSavedH: 6, est: true }
    ],
    winner: "oj",
    reason: "Open-jaw avoids ~2.5 h backtracking + half a day for ~₹6,500 more (est.)."
  },
  cities: [
    { id: "tokyo", name: "Tokyo", x: 78, y: 60, role: "base", reason: "Arrival gateway; high demand for food, design, coffee." },
    { id: "hakone", name: "Hakone", x: 70, y: 66, role: "base", reason: "Splurge ryokan w/ private onsen + Fuji views (tie resolved by user)." },
    { id: "kanazawa", name: "Kanazawa", x: 50, y: 42, role: "base", reason: "Kenroku-en foliage, design, crafts; Hokuriku Shinkansen from Tokyo." },
    { id: "takayama", name: "Takayama", x: 55, y: 50, role: "base", reason: "Old town + gateway to Shirakawa-go; en route to Kyoto." },
    { id: "shirakawago", name: "Shirakawa-go", x: 52, y: 46, role: "daytrip", reason: "~50 min from Takayama; no need to overnight." },
    { id: "kyoto", name: "Kyoto", x: 44, y: 66, role: "base", reason: "Peak foliage late Nov; highest POI demand." },
    { id: "nara", name: "Nara", x: 45, y: 72, role: "daytrip", reason: "~45 min from Kyoto; demand < 1 day." },
    { id: "osaka", name: "Osaka", x: 40, y: 72, role: "base", reason: "Exit gateway (KIX); food finale." },
    { id: "hiroshima", name: "Hiroshima", x: 18, y: 72, role: "rejected", reason: "Adds ~4h of travel for 1 day; with 'don't change hotels every day', we kept longer stays. Add 2 days to include it.", rule: "min_nights_per_base ≥ 2 + transit budget" },
    { id: "nikko", name: "Nikko", x: 80, y: 48, role: "rejected", reason: "Backtracking: out-and-back from Tokyo against the westward route.", rule: "backtracking penalty" },
    { id: "kawaguchiko", name: "Kawaguchiko", x: 68, y: 62, role: "rejected", reason: "Overlaps with Hakone for Fuji views.", rule: "duplicate-purpose" }
  ],
  edges: [
    { from: "tokyo", to: "hakone", mins: 100, mode: "Romancecar", est: true },
    { from: "hakone", to: "kanazawa", mins: 285, mode: "Train via Tokyo (Shinkansen)", est: true },
    { from: "tokyo", to: "kanazawa", mins: 180, mode: "Hokuriku Shinkansen", est: true },
    { from: "kanazawa", to: "takayama", mins: 135, mode: "Highway bus", est: true },
    { from: "takayama", to: "shirakawago", mins: 50, mode: "Bus", est: true },
    { from: "takayama", to: "kyoto", mins: 225, mode: "Hida Ltd Exp + Shinkansen", est: true },
    { from: "tokyo", to: "kyoto", mins: 135, mode: "Tokaido Shinkansen", est: false },
    { from: "kyoto", to: "nara", mins: 45, mode: "Kintetsu", est: true },
    { from: "kyoto", to: "osaka", mins: 30, mode: "JR Special Rapid", est: true },
    { from: "osaka", to: "hiroshima", mins: 90, mode: "Sanyo Shinkansen", est: true },
    { from: "tokyo", to: "nikko", mins: 120, mode: "Tobu Ltd Exp", est: true },
    { from: "kanazawa", to: "yamanaka", mins: 50, mode: "Train + bus", est: true }
  ],
  routes: [
    { id: "R1", order: ["Tokyo", "Hakone", "Kanazawa", "Takayama", "Kyoto", "Osaka"], transitH: 13.8, backtrack: 1.2, fatigue: 3.1, hotelChanges: 5, fit: 9.2, total: 86.4, valid: true, tie: true, winner: true, note: "Ryokan in Hakone — possible Fuji views, close to Tokyo" },
    { id: "R2", order: ["Tokyo", "Kanazawa", "Yamanaka Onsen", "Takayama", "Kyoto", "Osaka"], transitH: 12.9, backtrack: 0.4, fatigue: 2.8, hotelChanges: 4, fit: 8.1, total: 83.2, valid: true, tie: true, winner: false, note: "Ryokan near Kanazawa — no Fuji, one fewer hotel change" },
    { id: "R3", order: ["Tokyo", "Hakone", "Kyoto", "Takayama", "Kanazawa", "Osaka"], transitH: 15.6, backtrack: 3.4, fatigue: 4.0, hotelChanges: 5, fit: 8.6, total: 74.9, valid: true },
    { id: "R4", order: ["Tokyo", "Nikko", "Hakone", "Kanazawa", "Kyoto", "Osaka"], transitH: 16.2, backtrack: 4.5, fatigue: 4.4, hotelChanges: 6, fit: 7.9, total: 68.3, valid: false, violated: "Max Hotel Changes ≤ 5" },
    { id: "R5", order: ["Tokyo", "Hakone", "Kanazawa", "Takayama", "Kyoto", "Hiroshima", "Osaka"], transitH: 17.9, backtrack: 2.0, fatigue: 5.2, hotelChanges: 6, fit: 8.4, total: 66.0, valid: false, violated: "Min Nights per Base ≥ 2 (Hiroshima 1N) + Max Hotel Changes" },
    { id: "R6", order: ["Tokyo", "Kawaguchiko", "Hakone", "Kanazawa", "Kyoto", "Osaka"], transitH: 14.4, backtrack: 1.5, fatigue: 3.9, hotelChanges: 5, fit: 7.2, total: 70.1, valid: false, violated: "Min Nights per Base ≥ 2 (two 1-night stays)" }
  ],
  tieMarginPct: 3.8,

  // ─── Step ④ Nights ───────────────────────────────────────────────
  usableHoursPerDay: 9,
  nightsDemand: [
    { city: "Tokyo", poiHours: 31, demandDays: 3.4, minNights: 2, cap: 5, arrivalHalfDay: true, travelLoss: 0.5, fixed: null, nights: 4 },
    { city: "Hakone", poiHours: 6, demandDays: 0.7, minNights: 1, cap: 1, arrivalHalfDay: false, travelLoss: 0.5, fixed: "Ryokan 1N (hard)", nights: 1 },
    { city: "Kanazawa", poiHours: 13, demandDays: 1.4, minNights: 2, cap: 3, arrivalHalfDay: false, travelLoss: 0.5, fixed: null, nights: 2 },
    { city: "Takayama", poiHours: 12, demandDays: 1.3, minNights: 2, cap: 3, arrivalHalfDay: false, travelLoss: 0.5, fixed: "Shirakawa-go day trip", nights: 2 },
    { city: "Kyoto", poiHours: 38, demandDays: 4.2, minNights: 2, cap: 5, arrivalHalfDay: false, travelLoss: 0.5, fixed: "Nara day trip", nights: 4 },
    { city: "Osaka", poiHours: 7, demandDays: 0.8, minNights: 1, cap: 2, arrivalHalfDay: false, travelLoss: 0.5, fixed: "Exit gateway (KIX)", nights: 1 }
  ],
  nightsNote: "Osaka 1N is below Min Nights (2) — allowed as the exit gateway night; soft constraint, logged.",
  aiNudge: { proposed: "Kyoto +1 / Tokyo −1", result: "Rejected by code: Tokyo demand 3.4 days needs 4 nights with arrival half-day." },
  hiroshimaTradeoff: {
    text: "Adds ~4h of travel for 1 day; with 'don't change hotels every day', we kept longer stays. Add 2 days to include it.",
    option: "Add 2 days"
  },

  legs: [
    { city: "Tokyo", from: "2026-11-10", to: "2026-11-14", nights: 4, transferIn: "Flight BOM→HND", transferOut: "Romancecar ~1h40 (est.)" },
    { city: "Hakone", from: "2026-11-14", to: "2026-11-15", nights: 1, splurge: true, transferOut: "Train via Tokyo ~4h45 (est.)" },
    { city: "Kanazawa", from: "2026-11-15", to: "2026-11-17", nights: 2, transferOut: "Highway bus ~2h15 (est.)" },
    { city: "Takayama", from: "2026-11-17", to: "2026-11-19", nights: 2, transferOut: "Hida Ltd Exp + Shinkansen ~3h45 (est.)" },
    { city: "Kyoto", from: "2026-11-19", to: "2026-11-23", nights: 4, transferOut: "JR Special Rapid ~30 min (est.)" },
    { city: "Osaka", from: "2026-11-23", to: "2026-11-24", nights: 1, transferOut: "Nankai to KIX ~45 min (est.) → Flight KIX→BOM" }
  ],

  // ─── Step ⑤ Stay ─────────────────────────────────────────────────
  stays: [
    { city: "Tokyo", candidates: [
      { area: "Shibuya / Omotesando", travelMin: 22, walk: 9, price: "¥¥", vibe: "design, coffee, architecture" },
      { area: "Shinjuku", travelMin: 24, walk: 7, price: "¥¥", vibe: "hub, busy nights" },
      { area: "Asakusa", travelMin: 34, walk: 8, price: "¥", vibe: "traditional, far west-side" }],
      pick: "Shibuya / Omotesando", reason: "Walkable to design shops and coffee; direct lines to most picks.",
      examples: ["Hotel A (illustrative)", "Hotel B (illustrative)"], priceBand: "¥18–26k/night (est.)" },
    { city: "Hakone", fixed: true, candidates: [{ area: "Gora / Miyanoshita", travelMin: 15, walk: 5, price: "¥¥¥¥", vibe: "ryokan with private onsen" }],
      pick: "Gora / Miyanoshita", reason: "Fixed by ryokan + private onsen constraint.",
      examples: ["Ryokan A (illustrative)", "Ryokan B (illustrative)"], priceBand: "¥65–90k/night incl. kaiseki (est.)" },
    { city: "Kanazawa", candidates: [
      { area: "Korinbo / Katamachi", travelMin: 14, walk: 9, price: "¥¥", vibe: "central, walk to Kenroku-en" },
      { area: "Kanazawa Station", travelMin: 20, walk: 6, price: "¥¥", vibe: "convenient for bus out" }],
      pick: "Korinbo / Katamachi", reason: "Walk to Kenroku-en, 21st Century Museum and Higashi Chaya.",
      examples: ["Hotel C (illustrative)", "Hotel D (illustrative)"], priceBand: "¥14–20k/night (est.)" },
    { city: "Takayama", candidates: [
      { area: "Old Town (Sanmachi)", travelMin: 8, walk: 9, price: "¥¥", vibe: "quiet evenings, historic" },
      { area: "Station area", travelMin: 12, walk: 7, price: "¥", vibe: "bus terminal for Shirakawa-go" }],
      pick: "Station area", reason: "Bus terminal for Shirakawa-go at the door; old town 10 min walk.",
      examples: ["Hotel E (illustrative)", "Hotel F (illustrative)"], priceBand: "¥12–18k/night (est.)" },
    { city: "Kyoto", candidates: [
      { area: "Downtown / Karasuma", travelMin: 21, walk: 9, price: "¥¥", vibe: "coffee, design shops, buses everywhere" },
      { area: "Higashiyama", travelMin: 26, walk: 8, price: "¥¥¥", vibe: "atmospheric, crowded by day" },
      { area: "Kyoto Station", travelMin: 23, walk: 6, price: "¥¥", vibe: "transport hub, Nara trains" }],
      pick: "Downtown / Karasuma", reason: "Downtown: close to coffee and design shops, easy buses everywhere.",
      examples: ["Hotel G (illustrative)", "Hotel H (illustrative)"], priceBand: "¥20–30k/night (est.)" },
    { city: "Osaka", candidates: [
      { area: "Namba", travelMin: 15, walk: 8, price: "¥¥", vibe: "food, Nankai to KIX" },
      { area: "Umeda", travelMin: 18, walk: 7, price: "¥¥", vibe: "hub, Nakazakicho cafés nearby" }],
      pick: "Namba", reason: "Food finale and direct Nankai line to KIX.",
      examples: ["Hotel I (illustrative)", "Hotel J (illustrative)"], priceBand: "¥14–20k/night (est.)" }
  ],

  // ─── Step ⑥ Candidates (Kyoto) ───────────────────────────────────
  funnel: [
    { layer: "Catalogue (Kyoto + day-trip radius)", count: 1240, examples: [] },
    { layer: "Open on trip dates", count: 1105, examples: [{ name: "Shugakuin Imperial Villa", why: "Tours full / reservation-only on dates (est.)" }] },
    { layer: "Fits day window 10:00–21:00", count: 960, examples: [{ name: "Early-morning Zen meditation", why: "Starts 06:30 — before Day Start" }] },
    { layer: "Vegetarian meals nearby", count: 870, examples: [{ name: "Fish-market food crawl", why: "No vegetarian option on route" }] },
    { layer: "Crowd / quiet scoring", count: 610, examples: [
      { name: "Fushimi Inari", why: "Kept — flagged 'crowded after 10:00 — go late afternoon or climb higher for quiet'" },
      { name: "Kiyomizu-dera daytime", why: "Down-ranked: very crowded 10:00–17:00" }] },
    { layer: "Interest match (foliage, design, coffee, food, photo)", count: 180, examples: [{ name: "Kyoto Tower observation", why: "Low interest match" }] },
    { layer: "Top candidates", count: 50, examples: [] }
  ],
  tourVsSelf: [
    { item: "Nara guided walk", decision: "Not needed", why: "Compact, well-signed park; self-guided fits pace." },
    { item: "Shojin-ryori temple lunch (Tenryu-ji, Arashiyama)", decision: "Added", why: "Vegetarian food experience; high food + veg fit." },
    { item: "Tea ceremony (small group)", decision: "Optional", why: "Medium fit; offered as a Plan B for rain." }
  ],

  // ─── Step ⑦ Assign days (Kyoto) ──────────────────────────────────
  kyotoPool: [
    { id: "poi_kennin", name: "Kennin-ji", area: "Higashiyama", why: "Quiet Zen gardens, design" },
    { id: "poi_kodaiji", name: "Kodai-ji", area: "Higashiyama", why: "Foliage, evening illumination" },
    { id: "poi_ninenzaka", name: "Ninenzaka lanes", area: "Higashiyama", why: "Photography; go after 17:00" },
    { id: "poi_tenryuji", name: "Tenryu-ji + Shigetsu shojin lunch", area: "Arashiyama", why: "Vegetarian temple lunch" },
    { id: "poi_okochi", name: "Okochi Sanso", area: "Arashiyama", why: "Quiet foliage garden" },
    { id: "poi_gioji", name: "Gio-ji", area: "Arashiyama", why: "Moss + maples, quiet" },
    { id: "poi_eikando", name: "Eikan-do illumination", area: "Northern Kyoto", why: "Peak foliage evening event" },
    { id: "poi_philwalk", name: "Philosopher's Path", area: "Northern Kyoto", why: "Walking + foliage" },
    { id: "poi_nanzenji", name: "Nanzen-ji aqueduct", area: "Northern Kyoto", why: "Architecture + photo" },
    { id: "poi_dnd", name: "D&Department Kyoto", area: "Central", why: "Design shop" },
    { id: "poi_weekenders", name: "Weekenders Coffee", area: "Central", why: "Coffee" },
    { id: "poi_nishiki", name: "Nishiki Market", area: "Central", why: "Food, veg stalls" },
    { id: "poi_fushimi", name: "Fushimi Inari (upper trail)", area: "Fushimi", why: "Photography golden hour, hiking" },
    { id: "poi_todaiji", name: "Todai-ji", area: "Nara", why: "Architecture" },
    { id: "poi_naramachi", name: "Naramachi", area: "Nara", why: "Quiet lanes, coffee" },
    { id: "poi_isuien", name: "Isui-en Garden", area: "Nara", why: "Quiet foliage garden" }
  ],
  guardrails: ["All IDs from pool", "No duplicates", "Closures respected", "Capacity respected"],

  // ─── Day cards (Output) ──────────────────────────────────────────
  days: [
    { n: 1, date: "2026-11-10", city: "Tokyo", type: "arrival", theme: "Land softly in Omotesando", highlights: ["Arrive HND ~14:30 (est.)", "Omotesando architecture walk", "Vegetarian izakaya dinner"] },
    { n: 2, date: "2026-11-11", city: "Tokyo", type: "full", theme: "Ginkgo & gardens", highlights: ["Jingu Gaien ginkgo avenue", "Nezu Museum garden", "Aoyama design shops"] },
    { n: 3, date: "2026-11-12", city: "Tokyo", type: "full", theme: "Old Tokyo, quiet lanes", highlights: ["Yanaka backstreets", "Ueno museums", "Kiyosumi coffee"] },
    { n: 4, date: "2026-11-13", city: "Tokyo", type: "full", theme: "Design & gardens after dark", highlights: ["Shimokitazawa design/vintage", "Museum of Contemporary Art Tokyo", "Rikugien illumination"] },
    { n: 5, date: "2026-11-14", city: "Hakone", type: "travel", theme: "Into the mountains", highlights: ["Romancecar to Hakone", "Owakudani ropeway", "Ryokan private onsen + kaiseki"] },
    { n: 6, date: "2026-11-15", city: "Kanazawa", type: "travel", theme: "Fuji if clear, then the coast", highlights: ["Fuji viewpoint, Lake Ashi (weather-dependent)", "Backup: Hakone Open-Air Museum", "21st Century Museum (late afternoon)"] },
    { n: 7, date: "2026-11-16", city: "Kanazawa", type: "full", theme: "Gardens & teahouses", highlights: ["Kenroku-en (yukitsuri + maples)", "Higashi Chaya district", "Nagamachi samurai lanes"] },
    { n: 8, date: "2026-11-17", city: "Takayama", type: "travel", theme: "Over the mountains", highlights: ["Bus to Takayama", "Sanmachi old town", "Miyagawa riverside"] },
    { n: 9, date: "2026-11-18", city: "Takayama", type: "daytrip", theme: "Shirakawa-go day trip", highlights: ["Ogimachi gassho houses", "Shiroyama viewpoint", "Hida vegetarian set"] },
    { n: 10, date: "2026-11-19", city: "Kyoto", type: "travel", theme: "Arrive in Kyoto", highlights: ["Hida Ltd Exp to Nagoya → Kyoto", "Nishiki Market", "Pontocho evening walk"] },
    { n: 11, date: "2026-11-20", city: "Kyoto", type: "full", theme: "Zen, design & golden-hour Fushimi", highlights: ["Kennin-ji", "D&Department Kyoto", "Fushimi Inari at 16:00"] },
    { n: 12, date: "2026-11-21", city: "Kyoto", type: "daytrip", theme: "Nara day trip", highlights: ["Todai-ji", "Isui-en Garden", "Naramachi coffee"] },
    { n: 13, date: "2026-11-22", city: "Kyoto", type: "full", theme: "Arashiyama & maple evenings", highlights: ["Tenryu-ji + shojin lunch", "Okochi Sanso", "Eikan-do illumination + kaiseki"] },
    { n: 14, date: "2026-11-23", city: "Osaka", type: "travel", theme: "Maples, then Osaka flavours", highlights: ["Daitoku-ji sub-temples (quiet)", "Train to Osaka", "Dotonbori veg-friendly food walk"] },
    { n: 15, date: "2026-11-24", city: "Osaka", type: "departure", theme: "Coffee & fly home", highlights: ["Nakazakicho café", "Nankai to KIX", "Depart KIX"] }
  ],

  // ─── Step ⑧ Schedule — Day 11 ────────────────────────────────────
  day11Timeline: [
    { start: "10:00", end: "10:30", kind: "coffee", label: "Weekenders Coffee", poi: "poi_weekenders" },
    { start: "10:30", end: "10:45", kind: "transfer", mode: "walk", mins: 15 },
    { start: "10:45", end: "12:00", kind: "activity", label: "Kennin-ji", poi: "poi_kennin", open: "10:00–16:30", crowd: "low" },
    { start: "12:00", end: "12:15", kind: "transfer", mode: "walk", mins: 15 },
    { start: "12:30", end: "13:30", kind: "meal", label: "Vegetarian lunch (veg café, downtown)", veg: true },
    { start: "13:30", end: "13:50", kind: "transfer", mode: "bus", mins: 20 },
    { start: "13:50", end: "14:50", kind: "shop", label: "D&Department Kyoto", poi: "poi_dnd", open: "11:00–18:00" },
    { start: "14:50", end: "15:15", kind: "free", label: "Free time" },
    { start: "15:15", end: "15:40", kind: "transfer", mode: "train", mins: 25 },
    { start: "15:40", end: "15:55", kind: "buffer", label: "Buffer" },
    { start: "16:00", end: "18:00", kind: "activity", label: "Fushimi Inari (upper trail)", poi: "poi_fushimi", open: "24h", crowd: "medium→low" },
    { start: "18:00", end: "18:30", kind: "transfer", mode: "train", mins: 30 },
    { start: "19:00", end: "20:30", kind: "meal", label: "Vegetarian-friendly dinner, Pontocho", veg: true },
    { start: "20:30", end: "20:45", kind: "transfer", mode: "walk", mins: 15, label: "Return to hotel" }
  ],
  penalty: {
    item: "Fushimi Inari",
    weights: { lateStart: 0.8, crowd: 0.5, photo: 0.5 },
    options: [
      { time: "10:30", lateStart: 0, crowd: 0.9, photoBonus: 0.1, score: -0.40 },
      { time: "16:00", lateStart: 0, crowd: 0.4, photoBonus: 0.8, score: 0.20 }
    ],
    formula: "score = photo_w·photo_bonus − crowd_w·crowd − late_w·late_start",
    winner: "16:00"
  },
  day11Travel: { naiveMin: 118, optimisedMin: 85 },

  // ─── Step ⑨ Validate & Repair ────────────────────────────────────
  hardChecks: ["Open at scheduled time", "No overlaps", "Within day window", "Transit limits", "No duplicates", "Vegetarian meals present", "Ryokan night on Hakone leg", "Return By"],
  softMeters: [
    { name: "Pace per day", value: 0.72 }, { name: "Budget", value: 0.81 },
    { name: "Interest mix", value: 0.88 }, { name: "Crowd exposure", value: 0.34 }
  ],
  validationFailures: [
    { day: 7, rule: "Open at scheduled time", before: "Day 7 (Mon): 21st Century Museum of Contemporary Art placed on its closed day (Mondays)", after: "Moved to Day 6 afternoon (Sun, open until 18:00)" },
    { day: 3, rule: "Vegetarian meals present", before: "Day 3: dinner venue without vegetarian options", after: "Swapped for a vegetarian-friendly izakaya 6 min away" }
  ],
  feedbackLoop: ["Day can't fit", "Move item", "City needs a night", "Re-allocate nights", "Ask the user"],

  // ─── Step ⑩ Narrate ──────────────────────────────────────────────
  narration: {
    factSheet: { poi: "poi_fushimi", walk_from_station_min: 35, start: "16:00", sunset: "16:45", crowd_after_16: "medium→low" },
    generated: "Start {{poi:poi_fushimi}} at 16:00 and climb for about 35 minutes; the crowds thin as you go higher and sunset lands around 16:45.",
    rejected: { text: "…a 20-minute walk to the upper shrines…", reason: "Fact sheet says 35 min", action: "Rejected → template fallback" },
    tripSummary: "Fifteen days from Tokyo's design streets to Kyoto's maple evenings — one splurge night in a Hakone ryokan, longer stays elsewhere, and nothing before 10.",
    dayIntro11: "A slow Zen morning, design browsing after lunch, and Fushimi Inari at golden hour when the crowds thin."
  },

  // ─── Anatomy of a day (full detail: 1, 6, 11) ────────────────────
  anatomy: {
    1: { window: "14:30–21:00", capacity: 0.35, energy: "low (arrival)", fixed: ["Flight lands HND ~14:30 (est.)"], closures: [],
         planB: ["Flight delay > 2h → skip walk, dinner near hotel"], checks: "all pass" },
    6: { window: "10:00–21:00", capacity: 0.6, energy: "medium", fixed: ["Train Hakone → Kanazawa ~4h45 (est.)"], closures: ["21st Century Museum open Sun"],
         planB: ["Cloudy → Hakone Open-Air Museum instead of Fuji viewpoint"], checks: "repair: museum moved in from Day 7" },
    11: { window: "10:00–21:00", capacity: 0.85, energy: "high", fixed: ["Sunset ~16:45"], closures: [],
         planB: ["Rain → swap Fushimi for tea ceremony + Nishiki covered market"], checks: "all pass" }
  },

  // ─── Signature interactions ──────────────────────────────────────
  breakIt: {
    bad: [
      { error: "Invented temple 'Kinmomiji-dera'", caughtBy: "ID not in pool", fix: "Removed; slot filled by Kodai-ji" },
      { error: "Tokyo place (Nezu Museum) in a Kyoto day", caughtBy: "Area/city mismatch", fix: "Replaced by Kennin-ji" },
      { error: "Duplicate: Kennin-ji on Day 11 and Day 13", caughtBy: "No duplicates", fix: "Day 13 copy → Gio-ji" },
      { error: "Museum on its closed day", caughtBy: "Open at scheduled time", fix: "Moved to open day" },
      { error: "Day with 6 major items", caughtBy: "Capacity (Activities per Day = 4)", fix: "2 lowest-score items moved to Day 13" },
      { error: "Narration: '10-minute walk' (fact: 35)", caughtBy: "Grounding check", fix: "Template fallback" },
      { error: "Narration mentions invented café", caughtBy: "Entity not tokenised / not in fact sheet", fix: "Sentence dropped" }
    ]
  },
  naiveVsPipeline: {
    label: "Simulated example",
    naiveViolations: [
      "Day 7: museum on Monday (closed)",
      "Day 3: non-vegetarian dinner",
      "Hakone + Kawaguchiko both included (duplicate Fuji stops)",
      "Day 2: 08:30 start (before 10:00)",
      "5 hotel changes in first 6 days",
      "Travel time Takayama→Kyoto stated as 2h (actual ~3h45)",
      "Invented café in Naramachi"
    ],
    pipelineViolations: []
  },
  changePreference: {
    remove: "c_daystart",
    reRun: [2, 8, 9, 10], untouched: [3, 4, 5],
    dialChange: { dial: "dayStart", from: "10:00", to: "09:00" },
    day11After: "Kennin-ji moves to 09:15; Fushimi Inari stays 16:00 (golden-hour bonus still wins)."
  },

  // ─── Edit loop ───────────────────────────────────────────────────
  constraintStageMap: [
    { change: "Move item between days", stages: [8, 9, 10] },
    { change: "Day-scoped pace/load", stages: [2, 7, 8, 9, 10] },
    { change: "Swap one item", stages: [6, 8, 9, 10] },
    { change: "Add/remove city or days", stages: [3, 4, 5, 6, 7, 8, 9, 10] },
    { change: "Stay change", stages: [5, 8, 9, 10] },
    { change: "Question", stages: [] }
  ],
  editRequests: [
    { id: 1, source: "ui", text: "Drag: move Nara day trip from Day 12 to Day 13", intent: "direct_edit", ai: false, confidence: null,
      op: { op: "move_day_block", block: "nara_daytrip", from: 12, to: 13 }, affectedDays: [12, 13], reRun: [8, 9, 10], timing: "40 ms, 0 AI calls",
      diff: { added: 0, removed: 0, moved: 2, retimed: 4, unchanged: 13 }, explain: "Nara now on Day 13 (Sun); Arashiyama moved to Day 12." },
    { id: 2, source: "chat", text: "Day 11 feels too packed, make it relaxed", intent: "scoped_constraint", ai: true, confidence: 0.93,
      op: { op: "apply_preset", preset: "Relaxed", days: [11] }, affectedDays: [11], reRun: [2, 7, 8, 9, 10], timing: "180 ms, 1 AI call",
      scopedDial: { dial: "activitiesPerDay", from: 4, to: 3, days: [11] },
      diff: { added: 0, removed: 2, moved: 1, retimed: 3, unchanged: 14 }, explain: "Day 11 now has 3 stops; D&Department moved to Day 13, free time doubled." },
    { id: 3, source: "chat", text: "Swap the Kyoto kaiseki dinner for something more casual", intent: "swap", ai: true, confidence: 0.9,
      op: { op: "swap", target: "kaiseki_d13", criteria: ["casual", "vegetarian_friendly"] }, affectedDays: [13], reRun: [8, 9, 10], timing: "60 ms, 1 AI call (classify only)",
      diff: { added: 1, removed: 1, moved: 0, retimed: 1, unchanged: 14 }, explain: "Kaiseki replaced by a casual vegetarian-friendly udon spot near Eikan-do (next best in pool)." },
    { id: 4, source: "chat", text: "Can we add Hiroshima? We'll add 2 days.", intent: "structural", ai: true, confidence: 0.88,
      op: { op: "add_city", city: "Hiroshima", addDays: 2, position: "before_exit" }, affectedDays: [14, 15, 16, 17], reRun: [3, 4, 5, 6, 7, 8, 9, 10], timing: "1.9 s, 3 AI calls",
      locks: ["Hakone ryokan night", "One Kyoto day (viewer-locked)"],
      newLegs: [
        { city: "Tokyo", nights: 4 }, { city: "Hakone", nights: 1 }, { city: "Kanazawa", nights: 2 }, { city: "Takayama", nights: 2 },
        { city: "Kyoto", nights: 4 }, { city: "Hiroshima", nights: 2, note: "incl. Miyajima" }, { city: "Osaka", nights: 1 }],
      diff: { added: 8, removed: 2, moved: 1, retimed: 3, unchanged: 13 }, explain: "17 days: Hiroshima 2N (Peace Park, Miyajima) before the Osaka exit; locked items kept." },
    { id: 5, source: "chat", text: "Put the ryokan night in Kyoto instead", intent: "conflict", ai: true, confidence: 0.86,
      op: { op: "move_stay", stay: "ryokan", to: "Kyoto" }, affectedDays: [5, 6], reRun: [4, 5, 9], timing: "120 ms, 1 AI call",
      conflict: "No ryokan with private onsen within budget in the Kyoto pool; the Hakone night also serves the Fuji preference.",
      options: [
        { label: "Keep Hakone", recommended: true, cost: "—" },
        { label: "Kyoto machiya with private bath (no onsen)", cost: "+¥18,000 (est.)" },
        { label: "Kurama onsen day trip from Kyoto (public bath)", cost: "+¥3,000 (est.)" }],
      diff: { added: 0, removed: 0, moved: 0, retimed: 0, unchanged: 15 }, explain: "Depends on option chosen." },
    { id: 6, source: "chat", text: "How long is the train from Kanazawa to Takayama?", intent: "question", ai: true, confidence: 0.97,
      op: { op: "answer", from: "kanazawa", to: "takayama" }, affectedDays: [], reRun: [], timing: "20 ms, 1 AI call",
      answer: "No direct train — the highway bus takes ~2h15 (est.); by rail via Toyama it is ~2h45 (est.).", noPlanChange: true,
      diff: { added: 0, removed: 0, moved: 0, retimed: 0, unchanged: 15 }, explain: "No plan change." }
  ],

  // ─── Data tables (Pipeline data strip) ───────────────────────────
  tables: ["constraints", "trip_dials", "cities", "transport_edges", "travel_time_matrix", "areas", "hotels", "pois", "restaurants", "events", "itinerary_versions"]
};

if (typeof module !== "undefined") module.exports = SCENARIO;
