# SCENARIO summary (Illustrative data for demonstration)

Trip: Tue 10 Nov → Tue 24 Nov · 15 days / 14 nights
Gateways: Open-jaw Tokyo (HND) → Osaka (KIX) — Open-jaw avoids ~2.5 h backtracking + half a day for ~₹6,500 more (est.).

## Route & nights
- Tokyo     4N  Tue 10 Nov → Sat 14 Nov  | out: Romancecar ~1h40 (est.)
- Hakone    1N  Sat 14 Nov → Sun 15 Nov  (splurge ryokan)  | out: Train via Tokyo ~4h45 (est.)
- Kanazawa  2N  Sun 15 Nov → Tue 17 Nov  | out: Highway bus ~2h15 (est.)
- Takayama  2N  Tue 17 Nov → Thu 19 Nov  | out: Hida Ltd Exp + Shinkansen ~3h45 (est.)
- Kyoto     4N  Thu 19 Nov → Mon 23 Nov  | out: JR Special Rapid ~30 min (est.)
- Osaka     1N  Mon 23 Nov → Tue 24 Nov  | out: Nankai to KIX ~45 min (est.) → Flight KIX→BOM
Total nights: 14 ✔

## 15 day cards
- D 1 Tue 10 Nov  Tokyo     arrival   Land softly in Omotesando — Arrive HND ~14:30 (est.) · Omotesando architecture walk · Vegetarian izakaya dinner
- D 2 Wed 11 Nov  Tokyo     full      Ginkgo & gardens — Jingu Gaien ginkgo avenue · Nezu Museum garden · Aoyama design shops
- D 3 Thu 12 Nov  Tokyo     full      Old Tokyo, quiet lanes — Yanaka backstreets · Ueno museums · Kiyosumi coffee
- D 4 Fri 13 Nov  Tokyo     full      Design & gardens after dark — Shimokitazawa design/vintage · Museum of Contemporary Art Tokyo · Rikugien illumination
- D 5 Sat 14 Nov  Hakone    travel    Into the mountains — Romancecar to Hakone · Owakudani ropeway · Ryokan private onsen + kaiseki
- D 6 Sun 15 Nov  Kanazawa  travel    Fuji if clear, then the coast — Fuji viewpoint, Lake Ashi (weather-dependent) · Backup: Hakone Open-Air Museum · 21st Century Museum (late afternoon)
- D 7 Mon 16 Nov  Kanazawa  full      Gardens & teahouses — Kenroku-en (yukitsuri + maples) · Higashi Chaya district · Nagamachi samurai lanes
- D 8 Tue 17 Nov  Takayama  travel    Over the mountains — Bus to Takayama · Sanmachi old town · Miyagawa riverside
- D 9 Wed 18 Nov  Takayama  daytrip   Shirakawa-go day trip — Ogimachi gassho houses · Shiroyama viewpoint · Hida vegetarian set
- D10 Thu 19 Nov  Kyoto     travel    Arrive in Kyoto — Hida Ltd Exp to Nagoya → Kyoto · Nishiki Market · Pontocho evening walk
- D11 Fri 20 Nov  Kyoto     full      Zen, design & golden-hour Fushimi — Kennin-ji · D&Department Kyoto · Fushimi Inari at 16:00
- D12 Sat 21 Nov  Kyoto     daytrip   Nara day trip — Todai-ji · Isui-en Garden · Naramachi coffee
- D13 Sun 22 Nov  Kyoto     full      Arashiyama & maple evenings — Tenryu-ji + shojin lunch · Okochi Sanso · Eikan-do illumination + kaiseki
- D14 Mon 23 Nov  Osaka     travel    Maples, then Osaka flavours — Daitoku-ji sub-temples (quiet) · Train to Osaka · Dotonbori veg-friendly food walk
- D15 Tue 24 Nov  Osaka     departure Coffee & fly home — Nakazakicho café · Nankai to KIX · Depart KIX

## Trip Dials (default → final, moved by)
- ⏰ Day Start            09:00 → 10:00   ← set by 'not morning people'
- ⏰ Day End              21:00 → 21:00
- ⏰ Meal Windows         L 12:00–13:30 · D 18:30–20:00 → L 12:30–14:00 · D 19:00–20:30   ← shifted +30 min with later start
- ⏰ Return By            22:00 → 22:00
- 🎒 Activities per Day   4 → 4
- 🎒 Free Time            60 → 60
- 🎒 Buffer               15 → 15
- 🚶 Walking Limit        10 → 16   ← raised by 'happy to walk a lot'
- 🚶 Max Continuous Walk  25 → 40   ← raised by 'happy to walk a lot'
- 🚶 Transit per Day      2 → 2
- 🚶 Taxi Threshold       20 → 30   ← taxis suggested only for walks > 30 min
- 🏨 Min Nights per Base  1 → 2   ← set by 'don't change hotels every day' (splurge ryokan exempt)
- 🏨 Max Hotel Changes    7 → 5   ← capped by 'don't change hotels every day'
- 🍽 Dietary              none → vegetarian (1 traveller)   ← hard filter on every meal
- 🍽 Accessibility        none → none
- 🍽 Budget               mid → mid + 1 splurge night   ← one splurge night reserved for ryokan
- 🍽 Avoid Tags           [] → [crowded]   ← set by 'quiet spots away from crowds'
- ❤️ Interest Weights     food:0.5 photography:0.5 design:0.5 onsen:0.5 hiking:0.5 foliage:0.2 coffee:0.2 history:0.5 nightlife:0.2 → food:0.5 photography:0.5 design:0.5 onsen:0.5 hiking:0.5 foliage:0.8 coffee:0.5 history:0.5 nightlife:0.2   ← foliage → 0.8; coffee → 0.5

## Constraints
- [soft/high] Nothing before 10 ← "nothing before 10 please"  {"type":"time_window","field":"day_start","op":">=","value":"10:00"}
- [hard/hard] Vegetarian ← "One of us is vegetarian"  {"type":"dietary","diet":"vegetarian","travellers":["T2"],"applies_to":"all_meals"}
- [hard/hard] Ryokan + private onsen ← "one really special ryokan night with a private onsen"  {"type":"stay_requirement","kind":"ryokan","feature":"private_onsen","nights":1,"budget":"splurge"}
- [soft/high] Autumn colours ← "great autumn colours"  {"type":"interest","tag":"foliage","level":"high"}
- [soft/medium] Quiet spots ← "a few quiet spots away from crowds"  {"type":"avoid","tag":"crowded","freeform":"quiet spots","level":"medium"}
- [soft/medium] Coffee + design ← "We love coffee and design shops"  {"type":"interest","tags":["coffee","design_shops"],"level":"medium"}
- [soft/medium] Walks a lot ← "Happy to walk a lot"  {"type":"movement","field":"walking_limit","direction":"raise"}
- [soft/high] Don't change hotels every day ← "we don't want to change hotels every day"  {"type":"stay_stability","field":"min_nights_per_base","op":">=","value":2,"except":["c_ryokan"]}
Clarifying Q (Route optimiser (Step ③): top two routes score within 3.8% and differ mainly on where the ryokan night goes.) "How important is seeing Mt Fuji?" → Nice if the weather is clear
Rejected: Hiroshima (Adds ~4h of travel for 1 day; with 'don't change hotels every day', we kept longer stays. Add 2 days to include it.); Nikko (Backtracking: out-and-back from Tokyo against the westward route.); Kawaguchiko (Overlaps with Hakone for Fuji views.)

## Route leaderboard
- R1 86.4 [TIE] Tokyo → Hakone → Kanazawa → Takayama → Kyoto → Osaka
- R2 83.2 [TIE] Tokyo → Kanazawa → Yamanaka Onsen → Takayama → Kyoto → Osaka
- R3 74.9 Tokyo → Hakone → Kyoto → Takayama → Kanazawa → Osaka
- R4 68.3 ✘ Max Hotel Changes ≤ 5 Tokyo → Nikko → Hakone → Kanazawa → Kyoto → Osaka
- R5 66.0 ✘ Min Nights per Base ≥ 2 (Hiroshima 1N) + Max Hotel Changes Tokyo → Hakone → Kanazawa → Takayama → Kyoto → Hiroshima → Osaka
- R6 70.1 ✘ Min Nights per Base ≥ 2 (two 1-night stays) Tokyo → Kawaguchiko → Hakone → Kanazawa → Kyoto → Osaka

## Validation failures & repairs
- Day 7 (Mon): 21st Century Museum of Contemporary Art placed on its closed day (Mondays)  →  Moved to Day 6 afternoon (Sun, open until 18:00)
- Day 3: dinner venue without vegetarian options  →  Swapped for a vegetarian-friendly izakaya 6 min away

## Edit-loop requests
- 1. [direct_edit] "Drag: move Nara day trip from Day 12 to Day 13" → re-run steps 8,9,10 · 40 ms, 0 AI calls
- 2. [scoped_constraint] "Day 11 feels too packed, make it relaxed" → re-run steps 2,7,8,9,10 · 180 ms, 1 AI call
- 3. [swap] "Swap the Kyoto kaiseki dinner for something more casual" → re-run steps 8,9,10 · 60 ms, 1 AI call (classify only)
- 4. [structural] "Can we add Hiroshima? We'll add 2 days." → re-run steps 3,4,5,6,7,8,9,10 · 1.9 s, 3 AI calls
- 5. [conflict] "Put the ryokan night in Kyoto instead" → re-run steps 4,5,9 · 120 ms, 1 AI call
- 6. [question] "How long is the train from Kanazawa to Takayama?" → re-run steps none · 20 ms, 1 AI call

Consistency checks: ✔ all pass
