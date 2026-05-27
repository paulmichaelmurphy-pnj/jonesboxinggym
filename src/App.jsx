import React, { useMemo, useState } from "react";

const ACCESS_CODE = "Jones24";
const STORAGE_KEY = "jbg_profile_v3";
const UNLOCK_KEY = "jbg_unlock_v3";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function weeksUntilFight(fightDate) {
  if (!fightDate) return 0;
  const now = new Date();
  const fight = new Date(fightDate + "T00:00:00");
  const weeks = Math.ceil((fight - now) / (1000 * 60 * 60 * 24 * 7));
  return clamp(weeks, 1, 16);
}

function phaseFromWeeksOut(weeksOut) {
  if (weeksOut <= 2) return "TAPER";
  if (weeksOut <= 5) return "FIGHT SPECIFIC";
  if (weeksOut <= 9) return "BUILD";
  return "BASE";
}

function weightCutGuidance(currentKg, targetKg, weeksOut) {
  if (!currentKg || !targetKg || !weeksOut) return null;
  const diff = currentKg - targetKg; // positive = cut
  const perWeek = diff / weeksOut;
  const pct = (perWeek / currentKg) * 100;

  let note = "";
  if (diff <= 0) {
    note = "Target is not below current weight. Plan will focus on performance/body comp rather than a cut.";
  } else if (pct > 1.0) {
    note = "Cut rate is aggressive (>1% BW/week). Consider a higher fight weight or longer camp.";
  } else if (pct > 0.75) {
    note = "Cut rate is quite hard (0.75–1.0%/week). Tight nutrition + recovery needed.";
  } else {
    note = "Cut rate looks reasonable. Keep it steady and avoid last-minute crashes.";
  }

  return { diff, perWeek, pct, note };
}

/* ---------------- Granular sessions ---------------- */

function boxingSessionTemplate({ focus, phase, rounds = 6, roundMins = 3, restSec = 60 }) {
  const warmup = [
    "Skip 3 min easy + 2 min build",
    "Mobility: hips 8/side, ankles 10/side, T-spine 8/side",
    "Activation: glute bridge 12, scap push-up 12, deadbug 8/side",
  ];

  const skill = [
    "Shadowboxing 3 rounds x 2 min (45s rest)",
    "R1: jab only (step + guard recovery)",
    "R2: jab-cross + exit angle",
    "R3: defence after every combo (slip/roll/pivot)",
  ];

  const main = [];
  if (focus === "skills") {
    main.push(
      `${rounds} x ${roundMins} min technical rounds (rest ${restSec}s)`,
      "R1: distance + stance integrity (touch range, step out)",
      "R2: lead hand control (jab, probe, feint)",
      "R3: entries to body (jab → step → body shot → exit)",
      "R4: counters (slip jab → cross / roll hook → hook)",
      "R5: ringcraft (cut off; step to corners, don’t chase)",
      "R6: clean finish (70–80% pace, perfect form)"
    );
  } else if (focus === "conditioning") {
    main.push(
      "Density set: 10 x 40s work / 20s rest",
      "Work pace: 70–85% (technical volume + constant feet)",
      "Rule: defend after every combo (slip/roll/pivot)",
      "Goal: consistent output — no dead spots"
    );
  } else if (focus === "power") {
    main.push(
      `${rounds} x ${roundMins} min power rounds (rest ${restSec}s)`,
      "R1: heavy jab (step + snap)",
      "R2: rear hand power (cross/overhand) — perfect feet",
      "R3: hooks (hip/heel turn; short range)",
      "R4: body power (dig 2–3 then exit)",
      "R5: 10s power burst / 20s move (repeat)",
      "R6: power→speed contrast (2 hard → 6 fast)"
    );
  } else {
    main.push(
      `${rounds} x ${roundMins} min mixed rounds (rest ${restSec}s)`,
      "Odd rounds: output & movement",
      "Even rounds: defence & counters"
    );
  }

  const finisher =
    phase === "TAPER"
      ? ["TAPER finisher: 6 min total", "6 x 15s sharp / 45s easy (keep fresh)"]
      : ["Finisher: 8 min total", "8 x 20s hard / 40s easy (bag sprints OR burpees OR shadow sprints)"];

  const cooldown = [
    "2 min easy walk + nasal breathing",
    "Stretch: hip flexor 45s/side, hamstring 45s/side, pec stretch 45s/side",
  ];

  return { type: "BOXING", title: `Boxing — ${focus.toUpperCase()}`, warmup, skill, main, finisher, cooldown };
}

function scSessionTemplate({ focus, phase, level }) {
  const warmup = [
    "5 min brisk walk / easy skip / light shadow",
    "Mobility: hips + ankles + T-spine (6–10 reps each)",
    "Primer: 2 rounds (20s on / 40s off): fast feet + fast hands",
  ];

  let strength = [];
  let accessory = [];
  let conditioning = [];

  if (focus === "strength") {
    strength = [
      "A1 Goblet squat — 4 x 6–10 (90s rest)",
      "A2 1-arm row — 4 x 8–12/side (60–90s rest)",
      "B1 DB RDL — 3 x 8–12 (90s rest)",
      "B2 DB floor press — 3 x 8–12 (60–90s rest)",
    ];
    accessory = [
      "C1 Split squat — 3 x 8/side (3s eccentric)",
      "C2 Plank shoulder taps — 3 x 20",
      "D Suitcase hold/carry — 3 x 30–45s/side",
    ];
    conditioning =
      phase === "TAPER"
        ? ["TAPER: Zone 2 10–15 min easy OR mobility circuit"]
        : ["Finish: Zone 2 12–20 min easy OR 10-min EMOM (10 push-ups + 12 air squats)"];
  } else if (focus === "power") {
    strength = [
      "A Squat jumps — 5 x 3 (rest 90–120s)",
      "B Plyo push-ups — 6 x 3 (scale to explosive push-up)",
      "C Split stance jumps — 4 x 3/side (rest 90s)",
      "D Bag power bursts — 10 x 10s hard / 50s easy",
    ];
    accessory = ["E DB push press — 3 x 6–8 (controlled)", "F Anti-rotation plank — 3 x 30–45s"];
    conditioning =
      phase === "TAPER"
        ? ["TAPER: Skip hard conditioning. Do 8–12 min easy zone 2."]
        : ["Optional: 2 x (2 min hard shadow / 1 min easy) — keep technique crisp"];
  } else {
    strength = [
      "A Circuit x4 (60s between rounds):",
      "• DB thruster 10",
      "• 1-arm row 10/side",
      "• mountain climbers 30",
      "• skip 60s",
    ];
    accessory = ["B Core x3: deadbug 10/side + side plank 30s/side"];
    conditioning =
      phase === "TAPER"
        ? ["TAPER: 8–12 min zone 2 only"]
        : ["Intervals: 12 x 40s work / 20s rest (bag or shadow) — pace 75–85%"];
  }

  const mobility = [
    "Mobility down-regulate (5–8 min):",
    "Hip flexor + hamstrings + calves 45s/side",
    "Box breathing 4-4-4-4 x 4 cycles",
  ];

  const subtitle = level === "fighter" ? "fighter intensity" : "advanced member";
  return { type: "S&C", title: `S&C — ${focus.toUpperCase()} (${subtitle})`, warmup, strength, accessory, conditioning, mobility };
}

function getSCCount(phase, daysPerWeek) {
  if (daysPerWeek <= 2) return 1;
  if (phase === "BASE") return daysPerWeek >= 5 ? 2 : 1;
  if (phase === "BUILD") return daysPerWeek >= 4 ? 2 : 1;
  if (phase === "FIGHT SPECIFIC") return 1;
  return 1;
}

function positionsForSC(daysPerWeek, scCount) {
  if (scCount <= 0) return [];
  if (daysPerWeek === 1) return [];
  if (daysPerWeek === 2) return [2];
  if (daysPerWeek === 3) return [2];
  if (daysPerWeek === 4) return scCount === 2 ? [2, 4] : [2];
  if (daysPerWeek === 5) return scCount === 2 ? [2, 5] : [3];
  if (daysPerWeek === 6) return scCount === 2 ? [2, 5] : [3];
  if (daysPerWeek === 7) return scCount === 2 ? [2, 5] : [3];
  return [];
}

function boxingFocusForDay(phase, dayIndex0) {
  const map = {
    BASE: ["skills", "conditioning", "skills", "power", "conditioning", "skills", "skills"],
    BUILD: ["skills", "conditioning", "power", "skills", "conditioning", "power", "skills"],
    "FIGHT SPECIFIC": ["skills", "power", "skills", "conditioning", "skills", "power", "skills"],
    TAPER: ["skills", "power", "skills", "skills", "conditioning", "skills", "skills"],
  };
  const arr = map[phase] || map.BASE;
  return arr[dayIndex0 % arr.length];
}

function buildFightCamp({ weeksOut, daysPerWeek, split, level }) {
  const camp = [];
  for (let w = 1; w <= weeksOut; w++) {
    const remaining = weeksOut - w + 1;
    const phase = phaseFromWeeksOut(remaining);

    const scCount = split === "combined" ? getSCCount(phase, daysPerWeek) : split === "sc" ? daysPerWeek : 0;
    const scPositions = positionsForSC(daysPerWeek, scCount);

    const week = { week: w, phase, days: [] };

    for (let d = 1; d <= daysPerWeek; d++) {
      let type;
      if (split === "boxing") type = "BOXING";
      else if (split === "sc") type = "S&C";
      else type = scPositions.includes(d) ? "S&C" : "BOXING";

      const note =
        phase === "TAPER"
          ? "TAPER: volume down 40–60%. Keep sharpness, sleep, and stay fresh."
          : phase === "FIGHT SPECIFIC"
          ? "FIGHT SPECIFIC: crisp sessions. Quality over chaos. Adjust for sparring load."
          : phase === "BUILD"
          ? "BUILD: intensity rising. Only 2–3 hard days/week. Manage fatigue."
          : "BASE: build engine + clean reps. Volume steady. Don’t gas daily.";

      let session;
      if (type === "BOXING") {
        const focus = boxingFocusForDay(phase, d - 1);
        const rounds = phase === "TAPER" ? 4 : phase === "FIGHT SPECIFIC" ? 6 : 6;
        session = boxingSessionTemplate({ focus, phase, rounds, roundMins: 3, restSec: 60 });
      } else {
        const scFocus = phase === "BASE" || phase === "BUILD" ? "strength" : "power";
        session = scSessionTemplate({ focus: scFocus, phase, level });
      }

      if (daysPerWeek === 7 && d === 7) {
        session = {
          type: "RECOVERY",
          title: "Recovery — Zone 2 + Mobility",
          blocks: [
            "Zone 2: 25–40 min easy (talk test pace)",
            "Mobility: hips/ankles/T-spine 8–10 mins",
            "Breathing: 4-4-4-4 box breathing x 4 cycles",
          ],
        };
      }

      week.days.push({ day: d, session, note });
    }

    camp.push(week);
  }
  return camp;
}

/* ---------------- Export: Word + PDF ---------------- */

function buildPlanText(profile, plan, cut) {
  const header =
`JONES BOXING GYM — FIGHTER PLANNER

Name: ${profile.name || "—"}
Age: ${profile.age}
Experience: ${profile.experience}
Current: ${profile.currentWeight} kg
Target: ${profile.targetWeight} kg
Fight date: ${profile.fightDate}
Split: ${profile.split}
Days/week: ${profile.daysPerWeek}

`;

  const cutTxt = cut
    ? `WEIGHT TARGET CHECK
Cut needed: ${cut.diff.toFixed(1)} kg
Rate: ${cut.perWeek.toFixed(2)} kg/week (${cut.pct.toFixed(2)}% BW/week)
Note: ${cut.note}

`
    : "";

  if (!plan) return header + cutTxt + "No plan generated (missing fight date).";

  const body = plan
    .map((w) => {
      const wkHead = `WEEK ${w.week} — ${w.phase}\n`;
      const days = w.days
        .map((d) => {
          const s = d.session;

          if (s.type === "RECOVERY") {
            return `Day ${d.day}: ${s.title}\nNote: ${d.note}\n- ${s.blocks.join("\n- ")}\n`;
          }

          const blocks =
            s.type === "BOXING"
              ? [
                  "Warm-up:", ...s.warmup.map((x) => `- ${x}`),
                  "Skill:", ...s.skill.map((x) => `- ${x}`),
                  "Main:", ...s.main.map((x) => `- ${x}`),
                  "Finisher:", ...s.finisher.map((x) => `- ${x}`),
                  "Cooldown:", ...s.cooldown.map((x) => `- ${x}`),
                ]
              : [
                  "Warm-up:", ...s.warmup.map((x) => `- ${x}`),
                  "Strength/Power:", ...s.strength.map((x) => `- ${x}`),
                  "Accessory/Core:", ...s.accessory.map((x) => `- ${x}`),
                  "Conditioning:", ...s.conditioning.map((x) => `- ${x}`),
                  "Mobility:", ...s.mobility.map((x) => `- ${x}`),
                ];

          return `Day ${d.day}: ${s.title} (${s.type})\nNote: ${d.note}\n${blocks.join("\n")}\n`;
        })
        .join("\n");

      return wkHead + days;
    })
    .join("\n\n");

  const footer =
`\nDISCLAIMER
General guidance only. Scale intensity for fatigue/injuries/sparring load. Seek qualified advice if unsure.\n`;

  return header + cutTxt + body + footer;
}

function downloadAsWordDoc(filename, plainText) {
  const escaped = plainText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Jones Boxing Gym Plan</title>
      <style>
        body{ font-family: Arial, sans-serif; line-height: 1.35; }
        h2{ margin: 0 0 12px; }
      </style>
    </head>
    <body>
      <h2>Jones Boxing Gym — Fighter Plan</h2>
      <div>${escaped}</div>
    </body>
  </html>`;

  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openPrintToPDF(plainText) {
  const escaped = plainText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  const win = window.open("", "_blank");
  if (!win) return alert("Popup blocked. Allow popups to export PDF.");
  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Jones Boxing Gym Plan (PDF)</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.35; }
          .small { color: #555; font-size: 12px; margin-bottom: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h2>Jones Boxing Gym — Fighter Plan</h2>
        <div class="small">Use Print → Save as PDF</div>
        <div>${escaped}</div>
        <script>setTimeout(()=>window.print(), 250);</script>
      </body>
    </html>
  `);
  win.document.close();
}

/* ---------------- UI ---------------- */

export default function App() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem(UNLOCK_KEY) === "true"; } catch { return false; }
  });

  // ✅ IMPORTANT: code input starts blank and shows NO placeholder hint
  const [code, setCode] = useState("");

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? JSON.parse(saved)
        : {
            name: "",
            age: 19,
            currentWeight: 60,
            targetWeight: 60,
            fightDate: "",
            experience: "fighter",
            split: "combined",
            daysPerWeek: 5,
          };
    } catch {
      return {
        name: "",
        age: 19,
        currentWeight: 60,
        targetWeight: 60,
        fightDate: "",
        experience: "fighter",
        split: "combined",
        daysPerWeek: 5,
      };
    }
  });

  const [view, setView] = useState("camp");

  const weeksOut = useMemo(() => weeksUntilFight(profile.fightDate), [profile.fightDate]);
  const phase = useMemo(() => (profile.fightDate ? phaseFromWeeksOut(weeksOut) : ""), [profile.fightDate, weeksOut]);

  const cut = useMemo(
    () => weightCutGuidance(Number(profile.currentWeight), Number(profile.targetWeight), weeksOut),
    [profile.currentWeight, profile.targetWeight, weeksOut]
  );

  const plan = useMemo(() => {
    if (!profile.fightDate) return null;
    const days = clamp(Number(profile.daysPerWeek || 5), 1, 7);
    return buildFightCamp({
      weeksOut,
      daysPerWeek: days,
      split: profile.split,
      level: profile.experience,
    });
  }, [profile.fightDate, profile.daysPerWeek, profile.split, profile.experience, weeksOut]);

  const planText = useMemo(() => buildPlanText(profile, plan, cut), [profile, plan, cut]);

  const unlock = () => {
    if (code.trim() === ACCESS_CODE) {
      setUnlocked(true);
      try { localStorage.setItem(UNLOCK_KEY, "true"); } catch {}
      // optional: clear code after success
      setCode("");
    } else {
      alert("Incorrect code");
    }
  };

  const saveProfile = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
    alert("Saved.");
  };

  const resetProfile = () => {
    const fresh = {
      name: "",
      age: 19,
      currentWeight: 60,
      targetWeight: 60,
      fightDate: "",
      experience: "fighter",
      split: "combined",
      daysPerWeek: 5,
    };
    setProfile(fresh);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch {}
  };

  const copyPlan = async () => {
    try { await navigator.clipboard.writeText(planText); alert("Copied!"); }
    catch { alert("Copy blocked by browser."); }
  };

  const downloadWord = () => {
    downloadAsWordDoc(`JBG_Plan_${(profile.name || "fighter").replace(/\s+/g, "_")}`, planText);
  };

  const exportPDF = () => {
    openPrintToPDF(planText);
  };

  if (!unlocked) {
    return (
      <div className="wrap">
        <div className="card">
          <div className="brand">
            <div className="logo">JBG</div>
            <div>
              <h1>Jones Boxing Gym</h1>
              <p className="sub">Fighter Planner — members only</p>
            </div>
          </div>

          <label className="label">Access code</label>
          <input
            className="input"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder=""              /* ✅ blank hint */
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />

          <button className="btn" onClick={unlock}>Unlock</button>

          <div className="footerNote">
            Ask your coach for the access code.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="container">
        {/* LEFT */}
        <div className="card">
          <div className="brand">
            <div className="logo">JBG</div>
            <div>
              <h1>Jones Boxing Gym</h1>
              <p className="sub">Fighter plan builder</p>
            </div>
          </div>

          <label className="label">Name (optional)</label>
          <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />

          <div className="row">
            <div>
              <label className="label">Age</label>
              <input className="input" type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Experience</label>
              <select value={profile.experience} onChange={(e) => setProfile({ ...profile, experience: e.target.value })}>
                <option value="advanced">Advanced member</option>
                <option value="fighter">Fighter</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div>
              <label className="label">Current weight (kg)</label>
              <input className="input" type="number" value={profile.currentWeight} onChange={(e) => setProfile({ ...profile, currentWeight: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Target fight weight (kg)</label>
              <input className="input" type="number" value={profile.targetWeight} onChange={(e) => setProfile({ ...profile, targetWeight: Number(e.target.value) })} />
            </div>
          </div>

          <label className="label">Fight date</label>
          <input className="input" type="date" value={profile.fightDate} onChange={(e) => setProfile({ ...profile, fightDate: e.target.value })} />

          <div className="row">
            <div>
              <label className="label">Training split</label>
              <select value={profile.split} onChange={(e) => setProfile({ ...profile, split: e.target.value })}>
                <option value="combined">Combined (Boxing + S&C)</option>
                <option value="boxing">Boxing only</option>
                <option value="sc">S&C only</option>
              </select>
            </div>
            <div>
              <label className="label">Days per week</label>
              <select value={profile.daysPerWeek} onChange={(e) => setProfile({ ...profile, daysPerWeek: Number(e.target.value) })}>
                {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="chips">
            <button className={`chip ${view === "session" ? "active" : ""}`} onClick={() => setView("session")}>View: Session</button>
            <button className={`chip ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>View: Week</button>
            <button className={`chip ${view === "camp" ? "active" : ""}`} onClick={() => setView("camp")}>View: Camp</button>
          </div>

          <div className="badges">
            <div className="badge">Weeks out: {profile.fightDate ? weeksOut : "—"}</div>
            <div className="badge">Phase: {profile.fightDate ? phase : "—"}</div>
          </div>

          {cut?.note ? (
            <div className="warn">
              <b>Weight target check:</b><br />
              {Number.isFinite(cut.diff) ? (
                <>
                  Cut needed: <b>{cut.diff.toFixed(1)} kg</b> (~{cut.perWeek.toFixed(2)} kg/week, {cut.pct.toFixed(2)}% BW/week).<br />
                </>
              ) : null}
              {cut.note}
            </div>
          ) : null}

          <div className="row">
            <button className="btn secondary" onClick={saveProfile}>Save</button>
            <button className="btn secondary" onClick={resetProfile}>Reset</button>
          </div>

          <div className="row">
            <button className="btn secondary" onClick={copyPlan} disabled={!plan}>Copy</button>
            <button className="btn" onClick={downloadWord} disabled={!plan}>Download Word</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={exportPDF} disabled={!plan}>Export PDF (Print)</button>
          </div>

          <div className="footerNote">
            PDF export opens a print window → choose “Save as PDF”. Works best on desktop; on mobile depends on browser.
          </div>
        </div>

        {/* RIGHT */}
        <div className="card">
          <h1>Plan Output</h1>
          <p className="sub">Granular sessions fighters can follow step-by-step.</p>

          {!profile.fightDate ? (
            <div className="warn">Enter a fight date to generate the full camp plan.</div>
          ) : (
            <div className="plan">
              {view === "session" && plan?.[0]?.days?.[0] ? <SessionCard week={plan[0]} day={plan[0].days[0]} /> : null}
              {view === "week" && plan?.[0] ? <WeekCard week={plan[0]} /> : null}
              {view === "camp" && plan ? plan.map((w) => <WeekCard key={w.week} week={w} />) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCard({ week, day }) {
  return (
    <div className="week">
      <div className="weekHead">
        <div className="weekTitle">Week {week.week} — Day {day.day}</div>
        <div className="phase">{week.phase}</div>
      </div>
      <div className="day">
        <div className="dayTop">
          <div className="dayTitle">{day.session.title}</div>
          <div className="small">{day.session.type}</div>
        </div>
        <div className="small" style={{ marginTop: 6 }}>{day.note}</div>
        <details open>
          <summary>Show session details</summary>
          <SessionDetails session={day.session} />
        </details>
      </div>
    </div>
  );
}

function WeekCard({ week }) {
  return (
    <div className="week">
      <div className="weekHead">
        <div className="weekTitle">Week {week.week}</div>
        <div className="phase">{week.phase}</div>
      </div>

      {week.days.map((d) => (
        <div key={d.day} className="day">
          <div className="dayTop">
            <div className="dayTitle">Day {d.day}: {d.session.title}</div>
            <div className="small">{d.session.type}</div>
          </div>
          <div className="small" style={{ marginTop: 6 }}>{d.note}</div>
          <details>
            <summary>View full session</summary>
            <SessionDetails session={d.session} />
          </details>
        </div>
      ))}
    </div>
  );
}

function SessionDetails({ session }) {
  if (session.type === "RECOVERY") {
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900 }}>Recovery Blocks</div>
        <ul>{session.blocks.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </div>
    );
  }

  if (session.type === "BOXING") {
    return (
      <>
        <Section title="Warm-up" items={session.warmup} />
        <Section title="Skill" items={session.skill} />
        <Section title="Main Work" items={session.main} />
        <Section title="Finisher" items={session.finisher} />
        <Section title="Cooldown" items={session.cooldown} />
      </>
    );
  }

  return (
    <>
      <Section title="Warm-up" items={session.warmup} />
      <Section title="Strength / Power" items={session.strength} />
      <Section title="Accessory / Core" items={session.accessory} />
      <Section title="Conditioning" items={session.conditioning} />
      <Section title="Mobility" items={session.mobility} />
    </>
  );
}

function Section({ title, items }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
