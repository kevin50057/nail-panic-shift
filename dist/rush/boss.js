"use strict";
// 師傅出題：老師傅在木樁上依節拍畫五個圈（音一個比一個高），
// 兩聲預備拍後，玩家照同樣的節奏與順序把五個圈敲回去。
const ForgeBoss = (() => {
  const SCALE = [0, 2, 4, 7, 12];           // 大調五聲：一路往上爬
  const PATTERNS = [[0,1,2,3,4],[0,1,2,4,5],[0,2,3,4,5],[0,1,3,4,5],[0,1,2,3,5]];
  const ANSWER_AT = 8;                      // 出題後第 8 拍開始作答
  const WIN = .13, PERFECT = .06, REACH = 13;
  const BASE = 392;                         // G4，之後每波升半音
  const NH = 11;                            // 立著的釘子高度：瞄準釘頭

  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, (ay - by) * 1.25);
  const note = (b, i) => BASE * Math.pow(2, (SCALE[i] + Math.min(b.wave - 1, 12)) / 12);
  // 木樁頂面邊緣：師傅的身體藏在這條線後面。
  const rimY = x => -3 - 47 * Math.sqrt(Math.max(0, 1 - (x / 122) ** 2));

  function place(b) {
    const spread = Math.min(1, (b.wave - 1) / 6);
    const dMin = 26 + spread * 8, dMax = 44 + spread * 26;
    for (let tries = 0; tries < 400; tries++) {
      const pts = [];
      let x = (Math.random() - .5) * 60, y = (Math.random() - .5) * 24;
      pts.push({x, y});
      let ok = true;
      for (let i = 1; i < 5 && ok; i++) {
        let placed = false;
        for (let k = 0; k < 60; k++) {
          const a = Math.random() * Math.PI * 2, r = dMin + Math.random() * (dMax - dMin);
          const nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r / 1.25;
          if ((nx / 96) ** 2 + ((ny + 2) / 33) ** 2 > 1) continue;
          if (pts.some(p => dist(p.x, p.y, nx, ny) < 24)) continue;
          pts.push({x: nx, y: ny}); x = nx; y = ny; placed = true; break;
        }
        ok = placed;
      }
      if (ok) return pts;
    }
    return [[-60,0],[-30,-14],[0,4],[30,-12],[60,6]].map(([x, y]) => ({x, y}));
  }

  function newVolley(b) {
    b.wave++;
    b.beat = Math.max(.28, .42 - (b.wave - 1) * .018);
    const pattern = b.wave < 3 ? PATTERNS[0] : PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    const enter = b.wave === 1 ? 1.25 : .55;
    b.t0 = b.time + enter;
    b.answerAt = b.t0 + ANSWER_AT * b.beat;
    b.marks = place(b).map((p, i) => ({
      x: p.x, y: p.y, i,
      callAt: b.t0 + pattern[i] * b.beat,
      due: b.answerAt + pattern[i] * b.beat,
      shown: -1, state: "wait", judgedAt: 0
    }));
    b.called = 0; b.ticks = 0; b.cur = 0; b.hits = 0; b.perfects = 0;
    b.phase = "enter"; b.resultAt = 0; b.mood = "calm";
    S.nails = [];
    $("wave").textContent = "魔王第 " + b.wave + " 波　♩=" + Math.round(60 / b.beat);
  }

  function enter() {
    const b = S.boss = {lives:3, wave:0, time:0, blocks:0, iframes:0, mx:-200, tipX:-150, tipY:-30, bob:0};
    S.transition = 0; S.stun = S.swing = 0; S.stroke = null; S.aim = {x:0, y:4};
    $("timeLabel").textContent = "剩餘生命";
    $("timeUnit").textContent = "命";
    document.querySelector(".time > i").textContent = "♥";
    $("targetLabel").textContent = "敲入釘子";
    document.querySelector(".target small").textContent = "根";
    $("modeText").textContent = "BOSS RUSH";
    newVolley(b);
    announce("魔王關：老師傅會畫五個圈、插五根釘子，記住順序和節奏，再照著敲進去。");
  }

  function judge(b, m, grade, delta) {
    m.state = grade; m.judgedAt = b.time;
    b.cur++;
    const f = note(b, m.i);
    if (grade === "miss") {
      S.combo = 0; b.mood = "angry";
      b.lives--; b.iframes = .5;
      popup(delta === "off" ? "敲歪了！" : "漏拍！", m.x, m.y - NH, "#ff846f");
      sparks(m.x, m.y - 4, ["#9aa7ad","#d8e1e3","#6b7780"]);
      tone(150, .22, "sawtooth", .06, 0, 70);
      S.shake = 2;
      if (!b.lives) { finish(); return; }
    } else {
      const perfect = grade === "perfect";
      b.hits++; b.blocks++; if (perfect) { b.perfects++; S.perfect++; }
      S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
      const pts = (perfect ? 220 : 120) + Math.min(S.combo - 1, 10) * 15;
      S.points += pts;
      S.shake = perfect ? 2.6 : 1.5;
      sparks(m.x, m.y - 2, hotColors);
      popup((perfect ? "PERFECT +" : "GOOD +") + pts, m.x, m.y, perfect ? "#fff2a8" : "#ffdb76");
      tone(150, .07, "triangle", .15, 0, 50);
      tone(f, .24, "triangle", .13, .005);
      tone(f * 2, .18, "sine", .05, .015);
      if (perfect) tone(f * 3, .12, "sine", .03, .03);
      b.bob = .18;
    }
    if (b.cur === 5) {
      b.phase = "result"; b.resultAt = b.time;
      if (b.hits === 5) {
        S.points += 300;
        const healed = b.lives < 3; b.lives = Math.min(3, b.lives + 1);
        b.mood = "happy";
        popup(healed ? "全中！+1 命" : "全中！+300", 0, -20, "#9dfcf5");
        [1, 1.25, 1.5, 2].forEach((k, i) => tone(note(b, 0) * k, .16, "square", .035, .08 + i * .07));
      }
    }
  }

  // 玩家揮槌接觸木頭的瞬間呼叫；用放開那一刻判定，手感較準。
  function strike(stroke) {
    const b = S.boss;
    if (b.phase !== "play") { beat.tap(); return; }
    const m = b.marks[b.cur];
    const at = (stroke.t0 ?? b.time) + .03;
    const dt = at - m.due;
    if (dt < -WIN) {
      beat.tap(); S.combo = 0;
      popup("還沒到", stroke.x, stroke.y, "#f1b19c");
      return;
    }
    const d = dist(stroke.x, stroke.y, m.x, m.y - NH);
    if (d > REACH) { judge(b, m, "miss", "off"); return; }
    judge(b, m, Math.abs(dt) <= PERFECT && d <= 6.5 ? "perfect" : "good", dt);
  }

  function near(aim) {
    const b = S.boss, m = b?.marks?.[b.cur];
    return !!m && b.phase === "play" && dist(aim.x, aim.y, m.x, m.y - NH) <= REACH;
  }

  function step(dt) {
    const b = S.boss;
    b.time += dt;
    b.iframes = Math.max(0, b.iframes - dt);
    b.bob = Math.max(0, b.bob - dt);
    const t = b.time;

    if (b.phase === "enter" && t >= b.t0 - .02) b.phase = "call";
    if (b.phase === "call" || b.phase === "count") {
      while (b.called < 5 && t >= b.marks[b.called].callAt) {
        const m = b.marks[b.called];
        m.shown = m.callAt;
        const f = note(b, b.called);
        tone(f, .16, "square", .045);
        tone(f * 2, .09, "sine", .03, .01);
        tone(2400, .025, "square", .012);      // 粉筆擦過木頭
        tone(1900, .05, "triangle", .03, .1, 1400); // 釘子插上去
        b.called++;
      }
      if (b.called === 5 && b.phase === "call") b.phase = "count";
      while (b.ticks < 2 && t >= b.answerAt - (2 - b.ticks) * b.beat) {
        tone(b.ticks ? 1560 : 1320, .04, "square", .045);
        b.ticks++;
      }
      if (t >= b.answerAt - WIN) b.phase = "play";
    }
    if (b.phase === "play") {
      const m = b.marks[b.cur];
      if (m && t > m.due + WIN) judge(b, m, "miss", "late");
    }
    if (b.phase === "result" && t - b.resultAt >= .9 + b.beat) newVolley(b);

    // 師傅的走位與粉筆棍
    let goal = -86, tipX = b.mx + 34, tipY = rimY(b.mx + 34) + 10;
    if (b.phase === "enter") goal = -70;
    if (b.phase === "call") {
      const m = b.marks[Math.min(b.called, 4)];
      const prev = b.marks[Math.max(0, b.called - 1)];
      const next = b.called < 5 && t > m.callAt - b.beat * .55 ? m : prev;
      goal = Math.max(-80, Math.min(66, next.x * .7 - 14));
      tipX = next.x; tipY = next.y;
    } else if (b.phase === "count") {
      const last = b.marks[4];
      if (t - last.callAt < b.beat * .5) { tipX = last.x; tipY = last.y; goal = Math.max(-80, Math.min(66, last.x * .7 - 14)); }
    }
    const k = 1 - Math.exp(-dt * (b.phase === "call" ? 16 : 6));
    b.mx += (goal - b.mx) * k;
    b.tipX += (tipX - b.tipX) * (1 - Math.exp(-dt * 22));
    b.tipY += (tipY - b.tipY) * (1 - Math.exp(-dt * 22));
    b.my = rimY(b.mx) + 5;
  }

  function hint(b) {
    if (b.phase === "enter") return b.wave === 1 ? "老師傅來出題了！看他插釘子的順序" : "下一題，速度加快！";
    if (b.phase === "call") return "記住順序和節奏　" + b.called + " / 5";
    if (b.phase === "count") return b.ticks < 1 ? "預備——" : "嗒、嗒，換你！";
    if (b.phase === "play") return "照節奏敲釘子！　" + Math.min(5, b.cur + 1) + " / 5";
    return b.hits === 5 ? "全中！師傅點頭了" : "這題中 " + b.hits + " / 5";
  }

  function showSequence(b) {
    const panel = $("sequence");
    const key = [b.wave, b.phase, b.called, b.cur].join("/");
    if (panel.dataset.step === key) return;
    panel.dataset.step = key;
    panel.replaceChildren(...b.marks.map((m, i) => {
      const cell = document.createElement("span");
      cell.textContent = m.state === "miss" ? "✕" : m.state !== "wait" ? "✓" : i < b.called ? String(i + 1) : "·";
      cell.classList.toggle("current", b.phase === "play" && i === b.cur);
      cell.classList.toggle("ok", m.state === "good" || m.state === "perfect");
      cell.classList.toggle("bad", m.state === "miss");
      return cell;
    }));
  }

  return {enter, step, strike, near, hint, showSequence, rimY, note, NH};
})();
