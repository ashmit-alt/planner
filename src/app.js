/* Inside the Planner — app. Every visual is derived from SCENARIO. */
(function () {
  "use strict";
  const S = SCENARIO;

  // ─── Helpers ──────────────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const fmtDur = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`;
  const dateOf = iso => new Date(iso + "T00:00:00Z");
  const wd = iso => dateOf(iso).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const dm = iso => dateOf(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const byId = (arr, id) => arr.find(x => x.id === id);
  const poi = id => byId(S.kyotoPool, id);
  const allDials = () => S.dialGroups.flatMap(g => g.dials.map(d => Object.assign({ group: g }, d)));
  const store = {
    get(k) { try { return localStorage.getItem("itp:" + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("itp:" + k, v); } catch (e) { /* ignore */ } }
  };
  const fmtVal = v => v == null ? "—" : typeof v === "object" ? Object.entries(v).map(([k, x]) => `${k} ${x}`).join(", ") : String(v);

  const ROLE_LABEL = { ai: "AI", code: "Code", user: "User" };
  function roleBadges(step) {
    const main = `<span class="badge b-${step.role}">${ROLE_LABEL[step.role]}</span>`;
    const assist = {
      user: `<span class="badge b-user">tie → User</span>`,
      ai: step.role === "code" ? `<span class="badge b-ai">${step.n === 4 ? "AI may nudge ±1" : "AI picks"}</span>` : "",
      code: `<span class="badge b-code">code-checked</span>`
    }[step.assist] || "";
    return main + assist;
  }
  const timingBadge = step => `<span class="badge b-time" title="Typical run time">⏱ ${esc(step.timing)}</span>`;

  // ─── State ────────────────────────────────────────────────────────
  const TABS = [
    { id: "pipeline", name: "Pipeline" }, { id: "edit", name: "Edit loop" }, { id: "data", name: "Data" },
    { id: "arch", name: "Architecture" }, { id: "future", name: "Future" }
  ];
  const OUTPUT = S.steps.length; // rail index of the Output panel
  const state = {
    tab: TABS.some(t => t.id === store.get("tab")) ? store.get("tab") : "pipeline",
    step: Math.min(Math.max(parseInt(store.get("step") || "0", 10) || 0, 0), OUTPUT),
    playing: false, timer: null,
    ui: { dialView: "sliders", day11Order: "optimised", narrView: "rendered" }
  };

  // ─── Header ───────────────────────────────────────────────────────
  function counters() {
    return {
      ai: S.steps.reduce((a, s) => a + s.aiCalls, 0),
      code: S.steps.reduce((a, s) => a + s.decisions, 0),
      tables: S.tables.length
    };
  }
  function renderHeader() {
    const c = counters();
    const leg0 = S.legs[0], legN = S.legs[S.legs.length - 1];
    $("#header").innerHTML = `
      <div class="top-row">
        <div>
          <h1>${esc(S.meta.title)}</h1>
          <p class="pitch">${esc(S.meta.pitch)}</p>
          <p class="core"><span class="sw">Software makes it possible,</span><span class="ai">AI makes it personal.</span></p>
        </div>
        <div class="top-meta">
          <span class="counter"><b>${c.ai}</b> AI calls · <b>${c.code}</b> code decisions · <b>${c.tables}</b> data tables</span>
          <button class="theme-btn" id="themeBtn" aria-label="Toggle colour theme">◐ Theme: <span id="themeName">auto</span></button>
        </div>
      </div>
      <details class="scenario">
        <summary>Scenario — ${esc(S.travellers.party)} from ${esc(S.travellers.from)}, ${S.trip.days} days in Japan (${wd(S.trip.startDate)} ${dm(S.trip.startDate)} – ${wd(S.trip.endDate)} ${dm(S.trip.endDate)} ${S.trip.startDate.slice(0, 4)})</summary>
        <div class="scenario-body">
          <div class="kv"><b>Travellers</b>${esc(S.travellers.party)}, ${esc(S.travellers.from)}${S.travellers.firstTimeInJapan ? ", first time in Japan" : ""}</div>
          <div class="kv"><b>Dates</b>${S.trip.days} days / ${S.trip.nights} nights · ${esc(S.trip.season)}</div>
          <div class="kv"><b>Budget</b>${esc(S.trip.budget.band)} + ${esc(S.trip.budget.splurge)}</div>
          <div class="kv"><b>Form</b>${S.form.interests.map(esc).join(", ")} · pace ${esc(S.form.pace)}</div>
          <div class="kv"><b>Gateways</b>In ${esc(leg0.city)} (HND) · out ${esc(legN.city)} (KIX)</div>
          <div class="kv"><b>Route</b>${S.legs.map(l => `${esc(l.city)} ${l.nights}N`).join(" → ")}</div>
          <div class="kv quote"><b>Chat message</b>“${esc(S.chatMessage)}”</div>
          <div class="kv quote"><b>Flow</b>${esc(S.meta.flowLine)}</div>
        </div>
      </details>
      <div class="legend" aria-label="Colour legend">
        <span><i class="dot d-user"></i>User</span><span><i class="dot d-ai"></i>AI</span><span><i class="dot d-code"></i>Code</span>
        <span><i class="dot d-data"></i>Data</span><span><i class="dot d-ext"></i>External</span><span><i class="dot d-bad"></i>Violation</span>
        <span><span class="ok">✔</span>Pass / repaired</span>
      </div>`;
    $("#illus").textContent = S.meta.dataLabel;
  }

  const THEMES = ["auto", "light", "dark"];
  function applyTheme(t) {
    if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
    const n = $("#themeName"); if (n) n.textContent = t;
  }

  // ─── Tabs ─────────────────────────────────────────────────────────
  function renderTabs() {
    $("#tabs").innerHTML = TABS.map(t =>
      `<button role="tab" id="tab-${t.id}" aria-controls="panel" aria-selected="${t.id === state.tab}" data-tab="${t.id}">${esc(t.name)}</button>`).join("");
  }
  function setTab(id) {
    stopPlay();
    state.tab = id; store.set("tab", id);
    renderTabs(); renderMain();
  }
  function renderMain() {
    const panel = $("#panel");
    panel.setAttribute("aria-labelledby", "tab-" + state.tab);
    if (state.tab === "pipeline") return renderPipeline();
    const stage = { edit: 4, data: 5, arch: 5, future: 5 }[state.tab];
    panel.innerHTML = `<div class="ph">This tab is built in Stage ${stage}.</div>`;
  }

  // ─── Pipeline shell ───────────────────────────────────────────────
  function renderPipeline() {
    $("#panel").innerHTML = `
      <div class="rail-wrap" id="railWrap">
        <div class="rail" role="list" aria-label="Pipeline steps">
          ${S.steps.map((s, i) => railBtn(s, i)).join("")}
          <button role="listitem" data-go="${OUTPUT}" data-role="out" ${state.step === OUTPUT ? 'aria-current="step"' : ""}>
            <span class="num">OUT</span><span class="nm">Output</span><span class="rl"></span></button>
        </div>
        <div class="controls">
          <button class="btn" id="prevBtn" aria-label="Previous step">← Prev</button>
          <button class="btn primary" id="playBtn" aria-label="Play">▶ Play</button>
          <button class="btn" id="nextBtn" aria-label="Next step">Next →</button>
          <span class="faint xs grow">Keys: ← → to step · space to play</span>
        </div>
        <div class="flowline"></div>
      </div>
      <div id="stepView" aria-live="polite"></div>`;
    renderStep();
  }
  function railBtn(s, i) {
    const cls = [i < state.step ? "done" : "", s.assist === "ai" || s.assist === "user" ? "mix" : "", s.assist === "code" ? "mix-ai" : ""].join(" ");
    return `<button role="listitem" class="${cls}" data-go="${i}" data-role="${s.role}" ${i === state.step ? 'aria-current="step"' : ""} title="${esc(s.name)}">
      <span class="num">${s.n}</span><span class="nm">${esc(s.name)}</span><span class="rl"></span><span class="tdot"></span></button>`;
  }
  function updateRail() {
    $$(".rail button").forEach((b, i) => {
      if (i === state.step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.classList.toggle("done", i < state.step);
    });
    const pb = $("#prevBtn"), nb = $("#nextBtn");
    if (pb) pb.disabled = state.step === 0;
    if (nb) nb.disabled = state.step === OUTPUT;
    const play = $("#playBtn");
    if (play) { play.textContent = state.playing ? "❚❚ Pause" : "▶ Play"; play.setAttribute("aria-label", state.playing ? "Pause" : "Play"); }
    const rw = $("#railWrap"); if (rw) rw.classList.toggle("playing", state.playing);
  }
  function goStep(i) {
    state.step = Math.min(Math.max(i, 0), OUTPUT);
    store.set("step", String(state.step));
    if (state.tab !== "pipeline") { state.tab = "pipeline"; store.set("tab", "pipeline"); renderTabs(); renderPipeline(); }
    else renderStep();
  }
  function renderStep() {
    updateRail();
    const view = $("#stepView");
    if (state.step === OUTPUT) { view.innerHTML = renderOutput(); return; }
    const s = S.steps[state.step];
    view.innerHTML = `<section class="step" data-step="${s.n}" data-role="${s.role}">
      ${stepHeader(s)}
      <div class="visual">${STEP_RENDER[s.id](s)}</div>
    </section>`;
  }
  function stepHeader(s) {
    const tiles = S.tables.map(t => {
      const r = s.reads.includes(t), w = s.writes.includes(t);
      return `<button class="dtile ${r || w ? "lit" : ""} ${w ? "w" : ""}" data-insp="table:${t}" title="${r ? "read" : ""}${r && w ? " + " : ""}${w ? "written" : ""}">${t}</button>`;
    }).join("");
    return `<div class="step-head">
        <div><div class="ttl"><span class="big">STEP ${s.n}</span><h2>${esc(s.name)}</h2></div>
        <p class="headline">${esc(s.headline)}</p></div>
        <div class="row">${roleBadges(s)}${timingBadge(s)}</div>
      </div>
      <div class="ipo">
        <div class="col"><h4>Inputs</h4><ul>${s.inputs.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="arr" aria-hidden="true">→</div>
        <div class="col proc ${s.role === "ai" ? "ai" : ""}"><h4>Process</h4><ul>${s.process.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="arr" aria-hidden="true">→</div>
        <div class="col"><h4>Outputs</h4><ul>${s.outputs.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
      <div class="datastrip"><span class="faint">Data tables:</span>${tiles}<span class="faint xs">(solid = read, underline = written)</span></div>`;
  }

  // ─── Play / keyboard ──────────────────────────────────────────────
  function startPlay() {
    if (state.step === OUTPUT) goStep(0);
    state.playing = true; updateRail();
    state.timer = setInterval(() => {
      if (state.step >= OUTPUT) return stopPlay();
      goStep(state.step + 1);
    }, 4500);
  }
  function stopPlay() { state.playing = false; clearInterval(state.timer); state.timer = null; updateRail(); }

  // ═══ STEP RENDERERS ═══════════════════════════════════════════════
  const STEP_RENDER = {};

  // ① Understand
  STEP_RENDER.understand = () => {
    let chat = esc(S.chatMessage);
    S.constraints.forEach(c => {
      const p = esc(c.phrase);
      chat = chat.replace(p, `<button class="phr" data-insp="constraint:${c.id}" data-hl="${c.id}" title="→ ${esc(c.chip)}">${p}</button>`);
    });
    const q = S.clarifyingQuestion;
    return `<div class="stack">
      <div class="spread"><h3>Chat message</h3><button class="link small" data-insp="rules:understand">Constraint rules &amp; weights</button></div>
      <div class="chat">${chat}</div>
      <p class="faint xs">Click a highlighted phrase to see the constraint it produced.</p>
      <h3>Constraint cards</h3>
      <div class="ccards">${S.constraints.map(c => `
        <button class="ccard clickable ${c.strength}" data-insp="constraint:${c.id}" data-hl="${c.id}">
          <div class="spread"><span class="ct">${esc(c.chip)}</span><span class="tag">${c.strength}${c.strength === "soft" ? " · " + c.weight : ""}</span></div>
          <div class="muted xs mono" style="margin-top:4px">${esc(c.type)}</div>
          <div class="xs faint">Turns: ${c.dials.map(d => esc((allDials().find(x => x.id === d) || {}).name || d)).join(", ")}</div>
        </button>`).join("")}</div>
      <div class="qcard">
        <div class="spread"><h3>Clarifying question</h3><span class="badge b-code">asked by the route optimiser</span></div>
        <p style="margin-top:6px;font-size:16px">“${esc(q.question)}”</p>
        <div class="qopts">${q.options.map(o => `<span class="qopt ${o.label === q.selected ? "sel" : ""}">${esc(o.label)}${o.label === q.selected ? " ✓" : ""}</span>`).join("")}</div>
        <div class="why stack">
          <div><b>Why we asked.</b> ${esc(q.trigger)}</div>
          <div><b>What each answer would change</b><ul style="margin:4px 0 0;padding-left:18px">${q.options.map(o => `<li><b>${esc(o.label)}:</b> ${esc(o.effect)}</li>`).join("")}</ul></div>
          <div><b>Deliberately not asked</b> (defaults used):<div class="row" style="margin-top:6px">${q.notAsked.map(n => `<span class="chip" title="${esc(n.q)}">${esc(n.q)}: ${esc(n.default)}</span>`).join("")}</div></div>
          <div><button class="link" data-go="2">See the tie in Step ③ →</button></div>
        </div>
      </div>
      <h3>Constraint chips — as the traveller sees them</h3>
      <div class="row">${S.constraints.map(c => `<button class="chip" data-insp="constraint:${c.id}">${esc(c.chip)}</button>`).join("")}</div>
      <p class="note">${esc(S.meta.flowLine)}</p>
    </div>`;
  };

  // ② Trip Dials
  STEP_RENDER.dials = () => {
    const view = state.ui.dialView;
    const body = view === "table" ? dialsTable() : `<div class="dgroups">${S.dialGroups.map(g => `
      <div class="card dgroup"><h3>${g.icon} ${esc(g.name)}</h3>${g.dials.map(dialRow).join("")}</div>`).join("")}</div>`;
    return `<div class="stack">
      <div class="spread"><p class="note code">${esc(S.dialTagline)}</p>
        <div class="seg" role="group" aria-label="Dial view">
          <button data-ui="dialView=sliders" aria-pressed="${view === "sliders"}">Dials</button>
          <button data-ui="dialView=table" aria-pressed="${view === "table"}">Table</button></div></div>
      <p class="small muted">Presets applied: ${S.presetsApplied.map(p => `<span class="chip">${esc(p)}</span>`).join(" ")} · Rule: ${esc(S.dialRule)} · <span class="faint">faint mark = default, dot = final</span></p>
      ${body}
      <p class="note">${esc(S.meta.flowLine)}</p>
    </div>`;
  };
  function dialPos(d, v) {
    const r = S.dialRanges[d.id]; if (!r) return null;
    const n = typeof v === "string" && v.includes(":") ? toMin(v) : Number(v);
    return Math.min(100, Math.max(0, (n - r[0]) / (r[1] - r[0]) * 100));
  }
  function dialRow(d) {
    const moved = d.movedBy.map(m => `<div class="moved">${esc(d.name)}${typeof d.final === "object" ? ": " : " → " + esc(fmtVal(d.final)) + " — "}${esc(m.note)}</div>`).join("");
    let viz;
    if (S.dialRanges[d.id]) {
      const a = dialPos(d, d.default), b = dialPos(d, d.final);
      viz = `<div class="track" aria-hidden="true"><span class="fill" style="left:${Math.min(a, b)}%;width:${Math.abs(b - a)}%"></span><span class="def" style="left:${a}%"></span><span class="fin" style="left:${b}%"></span></div>`;
    } else if (d.id === "interestWeights") {
      viz = `<div style="margin-top:6px">${Object.keys(d.final).map(k => `<div class="row xs" style="gap:6px;flex-wrap:nowrap"><span style="width:80px">${esc(k)}</span>
        <div class="track" style="flex:1;margin:0"><span class="def" style="left:${d.default[k] * 100}%"></span><span class="fin" style="left:${d.final[k] * 100}%;width:10px;height:10px;margin-left:-5px;top:-2px"></span></div>
        <span class="mono" style="width:30px;text-align:right">${d.final[k]}</span></div>`).join("")}</div>`;
    } else {
      viz = d.movedBy.length ? `<div class="pillchg"><span class="tag strike">${esc(fmtVal(d.default))}</span>→<span class="tag code">${esc(fmtVal(d.final))}</span></div>` : "";
    }
    const unit = S.dialRanges[d.id] && !String(d.final).includes(":") ? ` <span class="faint">${esc(d.unit)}</span>` : "";
    const val = d.id === "interestWeights" ? "" : `${d.movedBy.length ? `<span class="faint">${esc(fmtVal(d.default))} →</span> ` : ""}<b>${esc(fmtVal(d.final))}</b>${unit}`;
    return `<div class="dial" data-insp="dial:${d.id}" data-dial="${d.id}" tabindex="0" role="button" aria-label="${esc(d.name)} details">
      <div class="dn"><span>${esc(d.name)}</span><span class="dv">${d.id === "mealWindows" ? "" : val}</span></div>${viz}${moved}</div>`;
  }
  function dialsTable() {
    return `<div class="card tscroll"><table class="t"><thead><tr><th>Dial</th><th>Default</th><th>Dial Presets</th><th>Chat constraints</th><th>Final</th></tr></thead><tbody>
      ${allDials().map(d => `<tr data-insp="dial:${d.id}" data-dial="${d.id}" class="clickable"><td>${d.group.icon} ${esc(d.name)}</td><td class="faint">${esc(fmtVal(d.default))}</td>
      <td>${esc(fmtVal(d.preset))}</td><td>${d.chat == null ? '<span class="faint">—</span>' : `<span class="tag ai">${esc(fmtVal(d.chat))}</span>`}</td><td><b>${esc(fmtVal(d.final))}</b></td></tr>`).join("")}
      </tbody></table></div>`;
  }

  // ③ Gateways & Route
  const cityById = id => byId(S.cities, id);
  const cityByName = name => S.cities.find(c => c.name === name || c.name.startsWith(name.split(" ")[0]));
  STEP_RENDER.route = () => {
    const g = S.gateways;
    const winner = S.routes.find(r => r.winner);
    const sorted = S.routes.slice().sort((a, b) => (b.valid - a.valid) || (b.total - a.total));
    return `<div class="stack">
      <div class="card"><div class="spread"><h3>Gateways</h3><span class="badge b-code">Code</span></div>
        <div class="grid2" style="margin-top:8px">${g.options.map(o => `
          <div class="card tight" style="${o.id === g.winner ? "border-color:var(--code);box-shadow:0 0 0 2px var(--code-bg)" : ""}">
            <div class="spread"><b>${esc(o.name)}</b>${o.id === g.winner ? '<span class="badge b-ok">✔ chosen</span>' : ""}</div>
            <table class="t" style="margin-top:6px"><tbody>
              <tr><td>Est. fare difference</td><td class="num">${o.fareDeltaINR ? "+₹" + o.fareDeltaINR.toLocaleString("en-IN") : "baseline"}${o.est ? " (est.)" : ""}</td></tr>
              <tr><td>Backtracking</td><td class="num">${o.backtrackH ? "~" + o.backtrackH + " h" : "none"}${o.halfDayLost ? " + half a day" : ""}</td></tr>
              <tr><td>Time saved</td><td class="num">${o.timeSavedH ? "~" + o.timeSavedH + " h" : "—"}</td></tr>
            </tbody></table></div>`).join("")}</div>
        <p class="note code" style="margin-top:8px">${esc(g.reason)} Winner becomes the fixed start and end of every route below.</p>
      </div>
      <div class="grid2">
        <div class="mapbox">${routeMap(winner)}</div>
        <div class="stack"><h3>City classification</h3><div class="cls">${S.cities.map(c => `
          <div class="card tight clickable" data-insp="city:${c.id}"><div class="spread"><b>${esc(c.name)}</b><span class="tag ${c.role === "rejected" ? "" : "code"}">${c.role === "alt" ? "tie alternative" : c.role === "daytrip" ? "day trip" : c.role}</span></div>
          <div class="xs muted" style="margin-top:3px">${esc(c.reason)}</div>${c.rule ? `<div class="xs bad">Rule: ${esc(c.rule)}</div>` : ""}</div>`).join("")}</div></div>
      </div>
      <div class="card tscroll lb"><div class="spread"><h3>Route leaderboard</h3><button class="link small" data-insp="formula:route">Scoring formula</button></div>
        <table class="t" style="margin-top:6px"><thead><tr><th>#</th><th>Ordering</th><th class="num">Transit h</th><th class="num">Backtrack</th><th class="num">Fatigue</th><th class="num">Hotel changes</th><th class="num">Fit</th><th class="num">Total</th></tr></thead><tbody>
        ${sorted.map(r => `<tr class="${r.valid ? "" : "inv"} ${r.tie ? "tie" : ""} ${r.winner ? "win" : ""}" data-insp="route:${r.id}">
          <td>${r.id}</td><td class="ord">${r.order.map(esc).join(" → ")}
            ${r.valid ? "" : `<div class="xs bad" style="text-decoration:none">✘ ${esc(r.violated)}</div>`}
            ${r.tie ? `<div><button class="badge b-ai" data-go="0">Tie → resolved by your answer</button> <span class="xs muted">${esc(r.note)}</span></div>` : ""}</td>
          <td class="num">${r.transitH}</td><td class="num">${r.backtrack}</td><td class="num">${r.fatigue}</td><td class="num">${r.hotelChanges}</td><td class="num">${r.fit}</td><td class="num"><b>${r.total}</b>${r.winner ? ' <span class="ok">✔</span>' : ""}</td></tr>`).join("")}
        </tbody></table>
        <p class="xs muted" style="margin-top:6px">Top two within ${S.tieMarginPct}% and differ on an unknown preference (Mt Fuji) → one question asked. Answer: “${esc(S.clarifyingQuestion.selected)}” → ${esc(winner.id)} kept.</p>
      </div>
    </div>`;
  };
  function routeMap(winner) {
    const pts = winner.order.map(n => cityByName(n)).filter(Boolean);
    const edges = S.edges.map(e => {
      const a = cityById(e.from), b = cityById(e.to); if (!a || !b) return "";
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      return `<line class="edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text class="edge-lbl" x="${mx + 0.8}" y="${my - 0.6}">${fmtDur(e.mins)}${e.est ? "*" : ""}</text>`;
    }).join("");
    return `<svg class="map" viewBox="0 0 100 74" role="img" aria-label="Stylised map of candidate cities and the winning route">
      <path class="land" d="M3,60 C12,50 26,52 33,46 C37,32 40,8 52,5 C62,4 68,18 76,22 C84,16 92,12 97,18 C99,32 98,50 90,60 C82,67 70,65 60,66 C50,70 40,72 28,68 C18,66 5,70 3,60 Z"/>
      ${edges}
      <polyline class="route" points="${pts.map(p => `${p.x},${p.y}`).join(" ")}"/>
      ${S.cities.map(c => `<g class="city ${c.role}" data-insp="city:${c.id}" style="cursor:pointer"><circle cx="${c.x}" cy="${c.y}" r="${c.role === "base" ? 1.6 : 1.2}"/><text x="${c.label === "l" ? c.x - 2 : c.label === "b" ? c.x : c.x + 2}" y="${c.label === "b" ? c.y + 4.4 : c.y + 1}" text-anchor="${c.label === "l" ? "end" : c.label === "b" ? "middle" : "start"}">${esc(c.name)}</text></g>`).join("")}
      <text x="2" y="72.5" class="edge-lbl">Door-to-door times · * estimated · dashed = chosen route</text>
    </svg>`;
  }

  // ④ Nights
  STEP_RENDER.nights = () => {
    const total = S.legs.reduce((a, l) => a + l.nights, 0);
    const nightDates = []; for (let i = 0; i < total; i++) nightDates.push(new Date(dateOf(S.trip.startDate).getTime() + i * 864e5).toISOString().slice(0, 10));
    const shades = [70, 55, 85, 62, 78, 48];
    return `<div class="stack">
      <div class="card tscroll"><div class="spread"><h3>Demand per city</h3><span class="xs muted">Usable hours/day: ${S.usableHoursPerDay}</span></div>
        <table class="t" style="margin-top:6px"><thead><tr><th>City</th><th class="num">Matched POI h</th><th class="num">Demand days</th><th class="num">Min</th><th class="num">Cap</th><th>Adjustments</th><th class="num">Nights</th></tr></thead><tbody>
        ${S.nightsDemand.map(n => `<tr><td>${esc(n.city)}</td><td class="num">${n.poiHours}</td><td class="num">${n.demandDays.toFixed(1)}</td><td class="num">${n.minNights}</td><td class="num">${n.cap}</td>
          <td class="xs">${[n.arrivalHalfDay ? "arrival half-day" : "", n.travelLoss ? `travel-day loss −${n.travelLoss}` : "", n.fixed || ""].filter(Boolean).map(esc).join(" · ")}</td><td class="num"><b>${n.nights}</b></td></tr>`).join("")}
        <tr><td colspan="6"><b>Total</b></td><td class="num"><b>${total}</b> ${total === S.trip.nights ? '<span class="ok">✔</span>' : '<span class="bad">✘</span>'}</td></tr></tbody></table>
        <p class="xs muted" style="margin-top:6px">${esc(S.nightsNote)}</p>
      </div>
      <div class="card"><h3>Allocation — ${total} nights</h3>
        <div class="nbar" style="margin-top:10px">${S.legs.map((l, i) => `<div class="seg-n" style="flex:${l.nights};background:color-mix(in srgb, ${l.splurge ? "var(--ext)" : "var(--code)"} ${shades[i % shades.length]}%, #000)" title="${esc(l.city)} ${l.nights}N">
          <b>${esc(l.city)} ${l.nights}N</b><span>${dm(l.from)}–${dm(l.to)}</span></div>`).join("")}</div>
        <div class="ticks" style="grid-template-columns:repeat(${total},1fr)">${nightDates.map(d => `<span title="Night of ${wd(d)} ${dm(d)}">${dateOf(d).getUTCDate()}</span>`).join("")}</div>
        <p class="xs faint" style="margin-top:2px">Night of each date, Nov ${S.trip.startDate.slice(0, 4)}. Amber = splurge ryokan (fixed 1 night).</p>
      </div>
      <div class="grid2">
        <div class="card"><div class="spread"><h3>AI nudge</h3><span class="badge b-ai">AI ±1</span></div>
          <p class="small" style="margin-top:6px">Proposed: <b>${esc(S.aiNudge.proposed)}</b></p><p class="small bad" style="margin-top:4px">✘ ${esc(S.aiNudge.result)}</p></div>
        <div class="card" style="border-color:var(--ext-line)"><div class="spread"><h3>Tradeoff: Hiroshima</h3><span class="badge b-ext">dropped</span></div>
          <p class="small" style="margin-top:6px">${esc(S.hiroshimaTradeoff.text)}</p>
          <button class="btn" style="margin-top:8px" data-insp="edit:4">+ ${esc(S.hiroshimaTradeoff.option)}</button></div>
      </div>
    </div>`;
  };

  // ⑤ Stay
  STEP_RENDER.stay = () => `<div class="stack">
    <p class="small muted">Code scores 2–3 candidate areas per city (avg travel time to that city's likely POIs, walkability, price band, vibe). AI picks one and gives a one-line reason; code checks the pick is on the shortlist. Planning only — no booking.</p>
    <div class="grid3">${S.stays.map(st => `<div class="card ${st.fixed ? "" : ""}" style="${st.fixed ? "border-color:var(--ext-line)" : ""}">
      <div class="spread"><h3>${esc(st.city)}</h3>${st.fixed ? '<span class="badge b-ext">fixed stay</span>' : '<span class="badge b-ai">AI pick</span>'}</div>
      <table class="t" style="margin-top:6px"><thead><tr><th>Area</th><th class="num">Avg min</th><th class="num">Walk</th><th>Price</th></tr></thead><tbody>
      ${st.candidates.map(c => `<tr style="${c.area === st.pick ? "font-weight:650" : ""}"><td>${c.area === st.pick ? "✔ " : ""}${esc(c.area)}<div class="xs faint" style="font-weight:400">${esc(c.vibe)}</div></td><td class="num">${c.travelMin}</td><td class="num">${c.walk}/10</td><td>${esc(c.price)}</td></tr>`).join("")}
      </tbody></table>
      <p class="note ${st.fixed ? "ext" : "ai"}" style="margin-top:8px">${esc(st.reason)}</p>
      <p class="xs muted" style="margin-top:6px">${esc(st.priceBand)} · e.g. ${st.examples.map(esc).join(", ")}</p></div>`).join("")}</div>
  </div>`;

  // ⑥ Candidates
  STEP_RENDER.candidates = () => {
    const max = S.funnel[0].count;
    return `<div class="stack">
      <div class="card funnel"><div class="spread"><h3>Kyoto funnel</h3><span class="xs muted">Click a layer for removed / down-ranked examples</span></div>
      ${S.funnel.map((f, i) => `<div class="lay" data-insp="layer:${i}" role="button" tabindex="0">
        <span class="small">${esc(f.layer)}</span><span class="fbw"><span class="fb" style="display:block;width:${Math.max(4, f.count / max * 100)}%"></span></span><span class="num mono small" style="text-align:right">${f.count.toLocaleString()}</span></div>`).join("")}
      </div>
      <div class="card"><h3>Tour vs self-guided</h3>
        <table class="t" style="margin-top:6px"><tbody>${S.tourVsSelf.map(t => `<tr><td>${esc(t.item)}</td><td><span class="tag ${t.decision === "Added" ? "code" : ""}">${esc(t.decision)}</span></td><td class="xs muted">${esc(t.why)}</td></tr>`).join("")}</tbody></table></div>
      <p class="note code">This pool is the only thing AI may pick from in Step ⑦.</p>
    </div>`;
  };

  // ⑦ Assign days
  STEP_RENDER.assign = () => {
    const used = new Set(S.kyotoFrames.flatMap(f => f.picks));
    const areas = [...new Set(S.kyotoPool.map(p => p.area))];
    const dayOf = n => S.days.find(d => d.n === n);
    let delay = 0;
    return `<div class="stack">
      <div class="frames">${S.kyotoFrames.map(f => { const d = dayOf(f.day); return `<div class="card tight">
        <div class="spread"><b>Day ${f.day}</b><span class="xs dt-${f.type}">${f.type}</span></div>
        <div class="xs faint">${wd(d.date)} ${dm(d.date)}</div>
        <div class="bar" style="margin:6px 0" title="Capacity ${f.picks.length}/${f.capacity}"><i style="width:${f.picks.length / f.capacity * 100}%"></i></div>
        <div class="xs">Capacity ${f.picks.length}/${f.capacity} · Energy: ${esc(f.energy)}</div>
        ${f.fixed.map(x => `<div class="xs muted">📌 ${esc(x)}</div>`).join("")}${f.closures.map(x => `<div class="xs muted">🚫 ${esc(x)}</div>`).join("")}</div>`; }).join("")}</div>
      <div class="assign">
        <div class="pool"><h4>Candidate pool (from code)</h4>${areas.map(a => `<div class="grp"><div class="xs faint">${esc(a)}</div>
          ${S.kyotoPool.filter(p => p.area === a).map(p => `<div class="pc ${used.has(p.id) ? "used" : ""}">${esc(p.name)}</div>`).join("")}</div>`).join("")}</div>
        <div><h4>Days (AI grouping)</h4><div class="frames" style="margin-top:6px">${S.kyotoFrames.map(f => `<div class="dcol">
          <div class="small" style="font-weight:650">Day ${f.day}</div><div class="xs muted">${esc(f.theme)}</div>
          ${f.picks.map(id => { const p = poi(id); delay += 60; return `<div class="pc" style="animation-delay:${delay}ms"><div>${esc(p.name)}</div><span class="tag ai">why: ${esc(p.why)}</span></div>`; }).join("")}</div>`).join("")}</div></div>
      </div>
      <div class="card"><div class="spread"><h3>Guardrails</h3><span class="badge b-code">Code</span></div>
        <div class="guard" style="margin-top:6px">${S.guardrails.map(g => `<span class="ok">✔ ${esc(g)}</span>`).join("")}</div></div>
    </div>`;
  };

  // ⑧ Schedule
  STEP_RENDER.schedule = () => {
    const d11 = S.days.find(d => d.n === 11);
    const start = toMin(S.dialGroups[0].dials.find(d => d.id === "dayStart").final), end = toMin("21:00"), span = end - start;
    const pct = m => (m - start) / span * 100;
    const ICON = { walk: "🚶", bus: "🚌", train: "🚆", taxi: "🚕" };
    const axis = []; for (let m = start; m <= end; m += 60) axis.push(`<span style="left:${pct(m)}%">${fmtMin(m).slice(0, 2)}</span>`);
    const rows = S.day11Timeline.map(b => {
      const s = toMin(b.start), e = toMin(b.end);
      let bg = "";
      if (b.open) {
        const [os, oe] = b.open === "24h" ? [start, end] : b.open.split("–").map(toMin);
        bg += `<span class="g-band" style="left:${pct(Math.max(os, start))}%;width:${pct(Math.min(oe, end)) - pct(Math.max(os, start))}%" title="Open ${esc(b.open)}"></span>`;
      }
      const curve = b.poi && S.crowdCurves[b.poi];
      if (curve) {
        const pts = curve.map((v, i) => `${(i / (curve.length - 1)) * 100},${100 - v * 100}`).join(" L");
        bg += `<svg class="g-crowd" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0,100 L${pts} L100,100 Z"/></svg>`;
      }
      const label = b.kind === "transfer" ? `${ICON[b.mode] || ""} ${b.mins} min` : b.label;
      const rowLbl = b.kind === "transfer" ? `<span class="faint">${ICON[b.mode] || ""} ${esc(b.label || b.mode)}</span>` : esc(b.label);
      return `<div class="g-row"><span class="lbl" title="${esc(b.label || "")}">${rowLbl}</span><div class="g-lane">${bg}
        <span class="g-blk k-${b.kind}" style="left:${pct(s)}%;width:${Math.max(pct(e) - pct(s), 1.2)}%" title="${esc(b.start)}–${esc(b.end)} ${esc(label)}">${b.kind === "transfer" || e - s < 35 ? "" : esc(b.start)}</span></div></div>`;
    }).join("");
    const P = S.penalty, w = P.weights;
    const sc = o => w.photo * o.photoBonus - w.crowd * o.crowd - w.lateStart * o.lateStart;
    const best = P.options.reduce((a, b) => sc(b) > sc(a) ? b : a);
    const ord = S.day11Orders[state.ui.day11Order];
    return `<div class="stack">
      <div class="gantt"><div class="spread"><h3>Day 11 · ${wd(d11.date)} ${dm(d11.date)} · Kyoto</h3><span class="xs muted">green band = open · amber curve = crowd (est.) · hatched = buffer</span></div>
        <div class="g-axis" style="margin-top:6px">${axis.join("")}</div>${rows}</div>
      <div class="card"><div class="spread"><h3>Penalty calculator — ${esc(P.item)}</h3><button class="link small" data-insp="formula:penalty">Formula</button></div>
        <p class="mono xs muted" style="margin-top:4px">${esc(P.formula)} · weights: late ${w.lateStart}, crowd ${w.crowd}, photo ${w.photo}</p>
        <div class="pen" style="margin-top:8px">${P.options.map(o => `<div class="opt ${o === best ? "win" : ""}"><div class="spread"><b>${o.time}</b>${o === best ? '<span class="badge b-ok">✔ winner</span>' : ""}</div>
          <div class="xs" style="margin-top:4px">Late-start penalty ${o.lateStart} · Crowd penalty ${o.crowd} · Golden-hour photo bonus ${o.photoBonus}</div>
          <div class="mono small" style="margin-top:4px">score = ${sc(o).toFixed(2)}</div></div>`).join("")}</div></div>
      <div class="card"><div class="spread"><h3>Stop order</h3>
        <div class="seg" role="group" aria-label="Order"><button data-ui="day11Order=naive" aria-pressed="${state.ui.day11Order === "naive"}">Naive</button><button data-ui="day11Order=optimised" aria-pressed="${state.ui.day11Order === "optimised"}">Optimised</button></div></div>
        <div class="row small" style="margin-top:8px">${ord.stops.map((s, i) => `<span class="chip">${i + 1}. ${esc(s)}</span>${i < ord.legs.length - 1 ? `<span class="faint">→ ${ord.legs[i + 1]}′</span>` : ""}`).join("")}</div>
        <p class="small" style="margin-top:8px">Total travel: <b>${ord.mins} min</b> <span class="muted">(naive ${S.day11Orders.naive.mins} vs optimised ${S.day11Orders.optimised.mins} — saves ${S.day11Orders.naive.mins - S.day11Orders.optimised.mins} min)</span></p></div>
    </div>`;
  };

  // ⑨ Validate & Repair
  STEP_RENDER.validate = () => `<div class="stack">
    <div class="grid2">
      <div class="card"><h3>Hard checks</h3><div class="checks" style="margin-top:8px;grid-template-columns:1fr">${S.hardCheckResults.map(c => `
        <div class="chk" data-insp="check:${esc(c.rule)}" role="button" tabindex="0"><span class="ic ok">✔</span><span style="flex:1">${esc(c.rule)}</span>
        <span class="xs faint">${c.checked} checked${c.failedBefore ? ` · <span class="bad">${c.failedBefore} failed → repaired</span>` : ""}</span></div>`).join("")}</div></div>
      <div class="card"><h3>Soft meters</h3>${S.softMeters.map(m => `<div style="margin-top:10px"><div class="spread small"><span>${esc(m.name)}</span><span class="mono xs">${Math.round(m.value * 100)}%</span></div>
        <div class="bar"><i style="width:${m.value * 100}%;background:${m.name === "Crowd exposure" ? "var(--ext)" : "var(--code)"}"></i></div></div>`).join("")}
        <p class="xs muted" style="margin-top:8px">Crowd exposure: lower is better.</p></div>
    </div>
    <div class="card"><h3>Failures and repairs</h3>${S.validationFailures.map(v => `<div style="margin-top:10px"><div class="xs faint">Rule: ${esc(v.rule)}</div>
      <div class="ba"><div class="b">✘ ${esc(v.before)}</div><div class="arr faint">→</div><div class="a">✔ ${esc(v.after)}</div></div></div>`).join("")}</div>
    <div class="card"><h3>Feedback loop</h3><div class="loop" style="margin-top:8px">${S.feedbackLoop.map((x, i) => `<span class="n">${esc(x)}</span>${i < S.feedbackLoop.length - 1 ? '<span class="faint">→</span>' : ""}`).join("")}</div>
      <p class="xs muted" style="margin-top:6px">Each rung is tried only if the one before can't fix it. Asking the user is the last resort.</p></div>
  </div>`;

  // ⑩ Narrate
  function renderTokens(text, mode) {
    return esc(text).replace(/\{\{poi:([a-z0-9_]+)\}\}/g, (m, id) => {
      const p = poi(id);
      return mode === "raw" ? `<span class="tok">${esc(m)}</span>` : `<span class="rendered" title="${esc(m)}">${esc(p ? p.name : id)}</span>`;
    });
  }
  STEP_RENDER.narrate = () => {
    const N = S.narration, mode = state.ui.narrView;
    return `<div class="stack">
      <div class="narr">
        <div class="card"><h3>Fact sheet</h3><span class="badge b-code" style="margin:6px 0">Code</span><pre>${esc(JSON.stringify(N.factSheet, null, 2))}</pre></div>
        <div class="card"><div class="spread"><h3>Generated text</h3><div class="seg"><button data-ui="narrView=raw" aria-pressed="${mode === "raw"}">Tokens</button><button data-ui="narrView=rendered" aria-pressed="${mode === "rendered"}">Rendered</button></div></div>
          <span class="badge b-ai" style="margin:6px 0">AI</span><p style="line-height:1.7">${renderTokens(N.generated, mode)}</p></div>
        <div class="card"><h3>Grounding check</h3><span class="badge b-code" style="margin:6px 0">Code</span>${S.groundingChecks.map(g => `<div class="gl"><span class="${g.ok ? "ok" : "bad"}">${g.ok ? "✔" : "✘"}</span><span><b>${renderTokens(g.claim, "rendered")}</b> <span class="faint">↔ ${esc(g.fact)}</span></span></div>`).join("")}</div>
      </div>
      <div class="card" style="border-color:var(--bad)"><h3>Rejected example</h3>
        <div class="ba" style="margin-top:8px"><div class="b">AI wrote: “${esc(N.rejected.text)}” — ${esc(N.rejected.reason)}</div><div class="arr faint">→</div><div class="a">${esc(N.rejected.action)}</div></div></div>
      <div class="grid2">
        <div class="card"><h4>Trip summary — as the traveller sees it</h4><p style="margin-top:6px;font-size:16px">${esc(N.tripSummary)}</p></div>
        <div class="card"><h4>Day 11 intro</h4><p style="margin-top:6px;font-size:16px">${esc(N.dayIntro11)}</p></div>
      </div>
    </div>`;
  };

  // ─── Output ───────────────────────────────────────────────────────
  function routeStrip() {
    return `<div class="routestrip">${S.legs.map((l, i) => `<div class="leg" style="${l.splurge ? "border-color:var(--ext-line)" : ""}"><b>${esc(l.city)} · ${l.nights}N</b><span class="xs faint">${dm(l.from)}–${dm(l.to)}</span></div>
      ${i < S.legs.length - 1 ? `<div class="tr">→<br>${esc(l.transferOut)}</div>` : ""}`).join("")}</div>`;
  }
  function dayCards() {
    return `<div class="daycards">${S.days.map(d => `<button class="dcard" data-insp="day:${d.n}" data-day="${d.n}">
      <div class="dh"><span>Day ${d.n} · ${wd(d.date)} ${dm(d.date)}</span><span class="dt-${d.type}">${d.type}</span></div>
      <div class="xs muted">${esc(d.city)}</div><div class="th">${esc(d.theme)}</div>
      <ul>${d.highlights.slice(0, 3).map(h => `<li>${esc(h)}</li>`).join("")}</ul></button>`).join("")}</div>`;
  }
  function renderOutput() {
    const nights = S.legs.reduce((a, l) => a + l.nights, 0);
    return `<section class="step stack" data-step="out">
      <div class="step-head"><div><div class="ttl"><span class="big">OUTPUT</span><h2>Validated, editable itinerary</h2></div>
        <p class="headline">${esc(S.narration.tripSummary)}</p></div>
        <div class="row"><span class="badge b-ok">✔ all hard checks pass</span><span class="badge b-data">${S.days.length} days · ${nights} nights</span></div></div>
      <div class="card">${routeStrip()}</div>
      ${dayCards()}
      <p class="xs faint">Click a day card for its details. <button class="link" data-tab="edit">Edit this plan →</button></p>
    </section>`;
  }

  // ═══ INSPECTOR ════════════════════════════════════════════════════
  function openInspector(kind, title, html) {
    $("#insp").innerHTML = `<div class="insp-head"><div><div class="insp-kind">${esc(kind)}</div><h3>${esc(title)}</h3></div>
      <button class="insp-close" id="inspClose" aria-label="Close inspector">✕</button></div><div class="insp-body">${html}</div>`;
    $("#insp").classList.add("open");
  }
  function closeInspector() { $("#insp").classList.remove("open"); }
  function provBlock(p) {
    return `<dl class="prov">${Object.entries(p).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
  }
  function tableRows(name) {
    const d = S.tableDefs[name];
    switch (d.derived) {
      case "constraints": return { cols: ["id", "type", "strength", "weight"], rows: S.constraints.map(c => [c.id, c.type, c.strength, c.weight]) };
      case "dials": return { cols: ["dial", "default", "final"], rows: allDials().map(x => [x.id, fmtVal(x.default), fmtVal(x.final)]) };
      case "cities": return { cols: ["city_id", "name", "role"], rows: S.cities.map(c => [c.id, c.name, c.role]) };
      case "edges": return { cols: ["from", "to", "mins", "mode"], rows: S.edges.map(e => [e.from, e.to, e.mins, e.mode]) };
      default: return { cols: d.cols, rows: d.rows };
    }
  }
  const INSPECT = {
    constraint(id) {
      const c = byId(S.constraints, id);
      const dials = c.dials.map(d => allDials().find(x => x.id === d)).filter(Boolean);
      openInspector("Constraint", c.chip, `
        <p class="small">From: “<mark>${esc(c.phrase)}</mark>”</p>
        <div class="row"><span class="badge ${c.strength === "hard" ? "b-bad" : "b-user"}">${c.strength}</span><span class="badge b-user">weight ${c.weight}${typeof S.weights[c.weight] === "number" ? " = " + S.weights[c.weight] : ""}</span></div>
        <pre>${esc(JSON.stringify(c.json, null, 2))}</pre>
        <h4>Turns these dials</h4>${dials.map(d => `<div class="small">${d.group.icon} ${esc(d.name)}: <span class="faint">${esc(fmtVal(d.default))}</span> → <b>${esc(fmtVal(d.final))}</b></div>`).join("")}
        <h4>Steps affected</h4><div class="row">${c.steps.map(n => `<button class="chip" data-go="${n - 1}">${n}. ${esc(S.steps[n - 1].name)}</button>`).join("")}</div>`);
    },
    dial(id) {
      const d = allDials().find(x => x.id === id);
      openInspector("Trip Dial · " + d.group.name, d.name, `
        <table class="t"><tbody><tr><td>Default</td><td>${esc(fmtVal(d.default))}</td></tr><tr><td>Dial Presets</td><td>${esc(fmtVal(d.preset))}</td></tr>
        <tr><td>Chat constraints</td><td>${esc(fmtVal(d.chat))}</td></tr><tr><td><b>Final</b></td><td><b>${esc(fmtVal(d.final))}</b></td></tr></tbody></table>
        <h4>History</h4>${d.movedBy.length ? d.movedBy.map(m => { const c = byId(S.constraints, m.c); return `<div class="small">↳ ${esc(m.note)} <button class="link xs" data-insp="constraint:${c.id}">(${esc(c.chip)})</button></div>`; }).join("") : '<p class="small faint">Unchanged from default.</p>'}
        <p class="xs muted">${esc(S.dialRule)} Unit: ${esc(d.unit)}.</p>`);
    },
    table(name) {
      const d = S.tableDefs[name], t = tableRows(name);
      openInspector("Data table", name, `<p class="small">${esc(d.desc)}</p>
        <div class="row">${d.sources.map(s => `<span class="badge b-data">${esc(S.sourceNames[s] || s)}</span>`).join("")}</div>
        <h4>Schema</h4><p class="mono xs">${t.cols.map(esc).join(" · ")}</p>
        <h4>Sample rows</h4><div class="tscroll"><table class="t"><thead><tr>${t.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
        ${t.rows.slice(0, 5).map(r => `<tr>${r.map(v => `<td class="xs">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <h4>Provenance</h4>${provBlock({ sources: d.sources.map(s => S.sourceNames[s] || s).join(", "), confidence: "medium (illustrative)", last_verified: "2026-09-15 (illustrative)" })}`);
    },
    rules() {
      openInspector("Rules", "Constraint types & weights", `
        <h4>Closed list of constraint types</h4><div class="row">${S.constraintTypes.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <h4>Hard vs soft</h4><p class="small"><b>Hard</b> = filter: anything violating it is removed. <b>Soft</b> = weighted penalty in scoring.</p>
        <h4>Weight levels</h4><table class="t"><tbody>${Object.entries(S.weights).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="mono">${esc(v)}</td></tr>`).join("")}</tbody></table>
        <h4>When to ask</h4><p class="note ai small">${esc(S.askRule)}</p>`);
    },
    city(id) { const c = cityById(id); openInspector("City · " + c.role, c.name, `<p class="small">${esc(c.reason)}</p>${c.rule ? `<p class="small bad">Rule: ${esc(c.rule)}</p>` : ""}
      <h4>Edges</h4>${S.edges.filter(e => e.from === id || e.to === id).map(e => `<div class="small">${esc(cityById(e.from) ? cityById(e.from).name : e.from)} ↔ ${esc(cityById(e.to) ? cityById(e.to).name : e.to)}: ${fmtDur(e.mins)} · ${esc(e.mode)}${e.est ? " (est.)" : ""}</div>`).join("")}`); },
    route(id) { const r = byId(S.routes, id); openInspector("Route", r.id, `<p class="small">${r.order.map(esc).join(" → ")}</p>${r.note ? `<p class="small muted">${esc(r.note)}</p>` : ""}
      ${r.valid ? "" : `<p class="small bad">✘ ${esc(r.violated)}</p>`}<pre>${esc(JSON.stringify({ transit_h: r.transitH, backtrack: r.backtrack, fatigue: r.fatigue, hotel_changes: r.hotelChanges, fit: r.fit, total: r.total }, null, 2))}</pre>`); },
    formula(id) {
      if (id === "penalty") { const P = S.penalty; return openInspector("Scoring formula", "Time-slot penalty", `<pre>${esc(P.formula)}</pre><pre>${esc(JSON.stringify(P.weights, null, 2))}</pre><p class="small">Weights come from dials: Day Start (late), Avoid Tags (crowd), Interest Weights (photography).</p>`); }
      openInspector("Scoring formula", "Route score", `<pre>total = 100 − 2.0·transit_h − 3.0·backtrack − 2.5·fatigue − 1.5·hotel_changes + 1.0·fit\ninvalid if any hard dial rule is violated</pre><p class="small">Illustrative weights. Ties within 4% that differ on an unknown preference trigger one question.</p>`);
    },
    layer(i) { const f = S.funnel[+i]; openInspector("Candidate filter", f.layer, `<p class="small">${f.count.toLocaleString()} remain after this layer.</p>
      ${f.examples.length ? f.examples.map(e => `<div class="card tight small"><b>${esc(e.name)}</b><div class="muted">${esc(e.why)}</div></div>`).join("") : '<p class="small faint">No examples for this layer.</p>'}`); },
    check(rule) { const c = S.hardCheckResults.find(x => x.rule === rule); openInspector("Validation rule", c.rule, `<p class="small">${esc(c.detail)}</p><p class="small">${c.checked} items checked · ${c.failedBefore ? `<span class="bad">${c.failedBefore} failed</span> → repaired` : '<span class="ok">0 failed</span>'}</p>
      ${S.validationFailures.filter(v => v.rule === rule).map(v => `<div class="ba"><div class="b">${esc(v.before)}</div><div class="arr">→</div><div class="a">${esc(v.after)}</div></div>`).join("")}`); },
    day(n) { const d = S.days.find(x => x.n === +n); openInspector(`Day ${d.n} · ${d.type}`, d.theme, `<p class="small">${wd(d.date)} ${dm(d.date)} · ${esc(d.city)}</p><ul class="small">${d.highlights.map(h => `<li>${esc(h)}</li>`).join("")}</ul><p class="xs faint">Full “Anatomy of a day” arrives in Stage 4.</p>`); },
    edit(id) { const e = byId(S.editRequests, +id); openInspector("Edit request", e.text, `<p class="small">${esc(e.explain)}</p><p class="xs faint">Runs in the Edit loop tab (Stage 4).</p>`); }
  };

  // ═══ EVENTS ═══════════════════════════════════════════════════════
  function onClick(e) {
    const t = e.target.closest("[data-tab],[data-go],[data-ui],[data-insp],#playBtn,#prevBtn,#nextBtn,#inspClose,#themeBtn");
    if (!t) return;
    if (t.id === "themeBtn") { const cur = store.get("theme") || "auto"; const nx = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]; store.set("theme", nx); applyTheme(nx); return; }
    if (t.id === "inspClose") return closeInspector();
    if (t.id === "playBtn") return state.playing ? stopPlay() : startPlay();
    if (t.id === "prevBtn") { stopPlay(); return goStep(state.step - 1); }
    if (t.id === "nextBtn") { stopPlay(); return goStep(state.step + 1); }
    if (t.dataset.tab) return setTab(t.dataset.tab);
    if (t.dataset.go != null) { e.stopPropagation(); stopPlay(); return goStep(+t.dataset.go); }
    if (t.dataset.ui) { const [k, v] = t.dataset.ui.split("="); state.ui[k] = v; return renderStep(); }
    if (t.dataset.insp) { const [kind, ...rest] = t.dataset.insp.split(":"); const fn = INSPECT[kind]; if (fn) fn(rest.join(":")); }
  }
  function onKey(e) {
    if (e.key === "Escape") return closeInspector();
    const tag = (e.target.tagName || "").toLowerCase();
    if (["input", "textarea", "select"].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[role=button][data-insp]")) { e.preventDefault(); e.target.click(); return; }
    if (tag === "button" && e.key === " ") return;
    if (e.target.getAttribute("role") === "tab" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      const i = TABS.findIndex(t => t.id === state.tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
      setTab(n.id); $("#tab-" + n.id).focus(); e.preventDefault(); return;
    }
    if (state.tab !== "pipeline") return;
    if (e.key === "ArrowRight") { stopPlay(); goStep(state.step + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { stopPlay(); goStep(state.step - 1); e.preventDefault(); }
    else if (e.key === " ") { state.playing ? stopPlay() : startPlay(); e.preventDefault(); }
  }

  // ═══ BOOT ═════════════════════════════════════════════════════════
  function boot() {
    renderHeader(); applyTheme(store.get("theme") || "auto");
    renderTabs(); renderMain();
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
  }
  boot();
})();
