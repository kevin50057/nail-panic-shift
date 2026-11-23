"use strict";
// 魔王關（跟白班一樣）：老師傅拿鐵鎚，你扶釘子。
// 師傅先依節拍在木樁畫五個圈（音一個比一個高），兩聲預備拍後，
// 照同樣的節奏一圈一槌敲下去。你要趕在每一槌落下前，把手上的釘子扶進那個圈。
const ForgeBoss = (() => {
  const SCALE = [0, 2, 4, 7, 12];
  const PATTERNS = [[0,1,2,3,4],[0,1,2,4,5],[0,2,3,4,5],[0,1,3,4,5],[0,1,2,3,5]];
  const ANSWER_AT = 8;
  const BASE = 392;
  const NH = 11;                       // 釘子高度：鐵鎚打在釘頭
  // 釘子離圈心的距離 → 判定（跟白班同一套：正中／敲好／敲歪／打到手／沒扶釘）
  const PERFECT = 3.5, GOOD = 8, BENT = 12, OUCH = 26;

  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, (ay - by) * 1.25);
  const note = (b, i) => BASE * Math.pow(2, (SCALE[i] + Math.min(b.wave - 1, 12)) / 12);
  const rimY = x => -3 - 47 * Math.sqrt(Math.max(0, 1 - (x / 122) ** 2));

  function place(b) {
    const spread = Math.min(1, (b.wave - 1) / 6);
    const dMin = 28 + spread * 8, dMax = 46 + spread * 24;
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
          if ((nx / 94) ** 2 + ((ny + 2) / 32) ** 2 > 1) continue;
          if (pts.some(p => dist(p.x, p.y, nx, ny) < 26)) continue;
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
    b.beat = Math.max(.3, .44 - (b.wave - 1) * .016);
    const pattern = b.wave < 3 ? PATTERNS[0] : PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    const enter = b.wave === 1 ? 1.25 : .55;
    b.t0 = b.time + enter;
    b.answerAt = b.t0 + ANSWER_AT * b.beat;
    b.marks = place(b).map((p, i) => ({
      x: p.x, y: p.y, i,
      callAt: b.t0 + pattern[i] * b.beat,
      due: b.answerAt + pattern[i] * b.beat,
      shown: -1, state: "wait", judgedAt: 0, nx: p.x, ny: p.y
    }));
    b.called = 0; b.ticks = 0; b.cur = 0; b.hits = 0; b.clean = 0;
    b.phase = "enter"; b.resultAt = 0; b.mood = "calm";
    S.nails = [];
    $("wave").textContent = "魔王第 " + b.wave + " 波　♩=" + Math.round(60 / b.beat);
  }

  function enter() {
    const b = S.boss = {lives:3, wave:0, time:0, blocks:0, iframes:0, mx:-200, my:-40,
      tipX:-150, tipY:-30, hx:0, hy:-20, bob:0, sw:0, hurt:0, slamAt:-9, slamMark:null};
    S.transition = 0; S.stun = S.swing = 0; S.stroke = null; S.aim = {x:30, y:14};
    $("timeLabel").textContent = "剩餘生命";
    $("timeUnit").textContent = "命";
    document.querySelector(".time > i").textContent = "♥";
    $("targetLabel").textContent = "敲入釘子";
    document.querySelector(".target small").textContent = "根";
    $("modeText").textContent = "BOSS RUSH";
    newVolley(b);
    announce("魔王關：老師傅拿鐵鎚，你扶釘子。記住五個圈的順序，在每一槌落下前把釘子扶進圈裡。");
  }

  // 手指腫了會抖（跟白班一樣），釘子實際位置 = 準星 + 抖動。
  function nailPos(b) {
    const w = b.sw * 1.6;
    return {x: S.aim.x + Math.sin(b.time * 13) * w, y: S.aim.y + Math.cos(b.time * 11) * w * .6};
  }

  function slam(b, m) {
    const p = nailPos(b);
    const d = dist(p.x, p.y, m.x, m.y);
    const f = note(b, m.i);
    m.judgedAt = b.time; b.slamAt = b.time; b.slamMark = m; b.cur++;
    tone(120, .09, "triangle", .2, 0, 45);           // 槌子落下
    S.shake = 2.4;
    if (d <= GOOD) {
      const perfect = d <= PERFECT;
      m.state = perfect ? "perfect" : "good";
      b.hits++; b.clean++; b.blocks++; if (perfect) S.perfect++;
      S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
      const pts = (perfect ? 220 : 120) + Math.min(S.combo - 1, 10) * 15;
      S.points += pts;
      sparks(m.x, m.y - 2, hotColors);
      popup((perfect ? "PERFECT +" : "GOOD +") + pts, m.x, m.y - NH, perfect ? "#fff2a8" : "#ffdb76");
      tone(f, .24, "triangle", .13, .005);
      tone(f * 2, .18, "sine", .05, .015);
      if (perfect) tone(f * 3, .12, "sine", .03, .03);
      b.bob = .18;
    } else if (d <= BENT) {
      m.state = "bent"; m.nx = p.x; m.ny = p.y;
      b.hits++; b.blocks++;
      S.combo = 0; S.points += 30; b.mood = "angry";
      popup("敲歪了", m.x, m.y - NH, "#ffc08a");
      sparks(p.x, p.y - 4, ["#9aa7ad","#d8e1e3","#6b7780"]);
      tone(f * .94, .2, "sawtooth", .045, 0, f * .7);
    } else {
      const ouch = d <= OUCH;
      m.state = "miss";
      S.combo = 0; b.mood = "angry"; b.lives--;
      if (ouch) {
        b.sw = Math.min(3, b.sw + 1); b.hurt = .5;
        popup("好痛！手指腫了", p.x, p.y - 12, "#ff846f");
        sparks(p.x + 6, p.y - 6, ["#ff8a7a","#ffd1c2","#e2504a"]);
        tone(90, .25, "square", .07, 0, 45); tone(700, .18, "sawtooth", .03, .02, 300);
        S.shake = 4;
      } else {
        popup("沒扶釘子！", m.x, m.y - NH, "#ff846f");
        tone(150, .22, "sawtooth", .06, 0, 70);
      }
      if (!b.lives) { finish(); return; }
    }
    if (b.cur === 5) {
      b.phase = "result"; b.resultAt = b.time;
      if (b.clean === 5) {
        S.points += 300;
        const healed = b.lives < 3; b.lives = Math.min(3, b.lives + 1);
        b.sw = Math.max(0, b.sw - 1);
        b.mood = "happy";
        popup(healed ? "全中！+1 命" : "全中！+300", 0, -24, "#9dfcf5");
        [1, 1.25, 1.5, 2].forEach((k, i) => tone(note(b, 0) * k, .16, "square", .035, .08 + i * .07));
      }
    }
  }

  function step(dt) {
    const b = S.boss;
    b.time += dt;
    b.bob = Math.max(0, b.bob - dt);
    b.hurt = Math.max(0, b.hurt - dt);
    const t = b.time;

    if (b.phase === "enter" && t >= b.t0 - .02) b.phase = "call";
    if (b.phase === "call" || b.phase === "count") {
      while (b.called < 5 && t >= b.marks[b.called].callAt) {
        const m = b.marks[b.called];
        m.shown = m.callAt;
        const f = note(b, b.called);
        tone(f, .16, "square", .045);
        tone(f * 2, .09, "sine", .03, .01);
        tone(2400, .025, "square", .012);
        b.called++;
      }
      if (b.called === 5 && b.phase === "call") b.phase = "count";
      while (b.ticks < 2 && t >= b.answerAt - (2 - b.ticks) * b.beat) {
        tone(b.ticks ? 1560 : 1320, .04, "square", .045);
        b.ticks++;
      }
      if (b.called === 5 && t >= b.answerAt - b.beat) b.phase = "play";
    }
    if (b.phase === "play") {
      const m = b.marks[b.cur];
      if (m && t >= m.due) slam(b, m);
    }
    if (b.phase === "result" && t - b.resultAt >= .9 + b.beat) newVolley(b);

    // 師傅走位：出題時用粉筆棍，作答時拿鐵鎚站到下一個圈的左上方。
    let goal = -86, tipX = b.mx + 34, tipY = rimY(b.mx + 34) + 10;
    const side = x => Math.max(-88, Math.min(52, x - 42));
    if (b.phase === "enter") goal = -70;
    if (b.phase === "call") {
      const m = b.marks[Math.min(b.called, 4)];
      const prev = b.marks[Math.max(0, b.called - 1)];
      const next = b.called < 5 && t > m.callAt - b.beat * .55 ? m : prev;
      goal = Math.max(-80, Math.min(66, next.x * .7 - 14));
      tipX = next.x; tipY = next.y;
    }
    const target = b.phase === "play" ? b.marks[b.cur] : (b.phase === "count" ? b.marks[0] : null);
    if (target) { goal = side(target.x); }
    else if (b.phase === "result" && b.slamMark) goal = side(b.slamMark.x);
    const k = 1 - Math.exp(-dt * (b.phase === "enter" ? 6 : 16));
    b.mx += (goal - b.mx) * k;
    b.tipX += (tipX - b.tipX) * (1 - Math.exp(-dt * 22));
    b.tipY += (tipY - b.tipY) * (1 - Math.exp(-dt * 22));
    b.my = rimY(b.mx) + 5;
    // 鐵鎚：剛敲完停在原處，接著移到下一個圈上方。
    const recent = b.slamMark && t - b.slamAt < Math.min(.16, b.beat * .45);
    const hammerAt = recent ? b.slamMark : target;
    if (hammerAt) {
      const kh = 1 - Math.exp(-dt * 30);
      b.hx += (hammerAt.x - b.hx) * kh; b.hy += (hammerAt.y - b.hy) * kh;
    }
  }

  // 鐵鎚動作：落下前半拍舉起 → 落下 → 回彈。
  function hammerPose(b) {
    const t = b.time;
    if (b.slamMark && t - b.slamAt < b.beat * .5) {
      const r = (t - b.slamAt) / (b.beat * .5);
      return {pose: r < .25 ? 5 : Math.min(8, 6 + Math.floor((r - .25) / .75 * 3)), lift: 0};
    }
    const m = b.phase === "play" ? b.marks[b.cur] : b.phase === "count" ? b.marks[0] : null;
    if (!m) return {pose: 0, lift: 10};
    const u = (m.due - t) / b.beat;               // 距離落下還有幾拍
    if (u > .5) return {pose: 0, lift: 10};
    return {pose: Math.min(4, Math.floor((1 - u / .5) * 5)), lift: 10 * (u / .5)};
  }

  function hint(b) {
    if (b.phase === "enter") return b.wave === 1 ? "師傅拿鐵鎚，你扶釘子！先看他畫的圈" : "下一題，速度加快！";
    if (b.phase === "call") return "記住順序和節奏　" + b.called + " / 5";
    if (b.phase === "count") return b.ticks < 2 ? "預備——把釘子扶到 ① 號圈" : "要敲了！";
    if (b.phase === "play") return "扶到 " + "①②③④⑤"[Math.min(4, b.cur)] + " 號圈！　" + Math.min(5, b.cur + 1) + " / 5";
    return b.clean === 5 ? "全中！師傅點頭了" : "這題敲好 " + b.clean + " / 5";
  }

  function showSequence(b) {
    const panel = $("sequence");
    const key = [b.wave, b.phase, b.called, b.cur].join("/");
    if (panel.dataset.step === key) return;
    panel.dataset.step = key;
    panel.replaceChildren(...b.marks.map((m, i) => {
      const cell = document.createElement("span");
      cell.textContent = m.state === "miss" ? "✕" : m.state === "bent" ? "～" : m.state !== "wait" ? "✓" : i < b.called ? String(i + 1) : "·";
      cell.classList.toggle("current", (b.phase === "play" || b.phase === "count") && i === b.cur);
      cell.classList.toggle("ok", m.state === "good" || m.state === "perfect");
      cell.classList.toggle("bad", m.state === "miss" || m.state === "bent");
      return cell;
    }));
  }

  return {enter, step, hint, showSequence, rimY, note, nailPos, hammerPose, NH};
})();
