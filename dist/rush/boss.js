"use strict";
// Five lanes always fit on the stump. Later crews queue several cranes per lane.
const ForgeBoss = (() => {
  const centers = [-92, -46, 0, 46, 92];
  function laneAt(x) {
    return Math.max(0, Math.min(4, Math.round((x + 92) / 46)));
  }
  function newVolley(b) {
    b.wave++;
    const count = Math.max(4 + b.wave, 5 + Math.floor(b.time / 15));
    b.order = [];
    b.crewSize = Array(5).fill(0);
    while (b.order.length < count) {
      const lanes = [0, 1, 2, 3, 4];
      for (let i = lanes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
      }
      if (b.order.length && b.order.at(-1).lane === lanes[0]) {
        [lanes[0], lanes[1]] = [lanes[1], lanes[0]];
      }
      const row = Math.floor(b.order.length / 5);
      for (const lane of lanes.slice(0, count - b.order.length)) {
        b.order.push({lane, row});
        b.crewSize[lane]++;
      }
    }
    b.phase = "ready";
    b.clock = 0;
    b.index = 0;
    b.beat = Math.max(.38, .68 - (b.wave - 1) * .028);
    b.counter = false;
    b.onBeat = false;
    S.nails = [];
    $("wave").textContent = "魔王第 " + b.wave + " 波　" + count + " 隻";
  }
  function enter() {
    const b = S.boss = {lives:3, wave:0, time:0, blocks:0, iframes:0};
    S.transition = 0;
    S.stun = S.swing = 0;
    S.stroke = null;
    S.aim = {x:0,y:8};
    $("timeLabel").textContent = "剩餘生命";
    $("timeUnit").textContent = "命";
    document.querySelector(".time > i").textContent = "♥";
    $("targetLabel").textContent = "反擊金釘";
    $("modeText").textContent = "BOSS RUSH";
    newVolley(b);
    announce("魔王關，三條命。看燈記順序，移開亮紅的直道。");
  }
  function counterHit(n, distance) {
    const b = S.boss;
    if (b.phase !== "counter" || b.counter || n.hp <= 0) return;
    b.counter = true;
    b.blocks++;
    S.combo++;
    S.bestCombo = Math.max(S.bestCombo, S.combo);
    n.hp = 0;
    n.y = n.base;
    const perfect = distance <= 5.8;
    if (perfect) S.perfect++;
    // The nail appears half a beat after the last impact. Its ring closes on the next beat.
    b.onBeat = Math.abs(b.clock - b.beat/2) <= .115;
    const points = (perfect ? 300 : 180) + (b.onBeat ? 150 : 0);
    S.points += points;
    const extraHold = b.onBeat ? .055 : .025;
    S.stroke.hold += extraHold;
    S.stroke.duration += extraHold;
    S.swing += extraHold;
    S.shake = b.onBeat ? 3 : 1.4;
    if (b.blocks % 3 === 0) b.lives = Math.min(3,b.lives+1);
    sparks(n.x,n.y,hotColors);
    popup((b.onBeat ? "ON BEAT +" : "ECHO +")+points,n.x,n.y,"#ffdb76");
    tone(210,.07,"triangle",.18,0,55);
    tone(1180,.23,"sine",.09,.022,920);
    if (b.onBeat) tone(1870,.35,"sine",.055,.03,1570);
  }
  function step(dt) {
    const b = S.boss;
    b.time += dt;
    b.clock += dt;
    b.iframes = Math.max(0,b.iframes-dt);
    const duration = {ready:1.3, preview:b.beat, hold:b.beat, attack:b.beat, rest:b.beat/2, counter:2.4}[b.phase];
    if (b.clock < duration) return;
    b.clock -= duration;
    const enemy = b.order[b.index];
    if (b.phase === "ready") b.phase = "preview";
    else if (b.phase === "preview") {
      if (++b.index === Math.min(5,b.order.length)) { b.index = 0; b.phase = "hold"; }
    } else if (b.phase === "hold") b.phase = "attack";
    else if (b.phase === "attack") {
      const x = centers[enemy.lane];
      b.lastLane = enemy.lane;
      b.lastRank = enemy.row;
      b.impactTime = b.time;
      const finalHit = b.index === b.order.length-1;
      S.shake = finalHit ? 4 : 2.3;
      sparks(x,12,hotColors);
      tone(155 + enemy.lane * 19,.15,"triangle",.18,0,40);
      tone(finalHit ? 82 : 58,finalHit ? .155 : .105,"sine",finalHit ? .32 : .2,0,31);
      if (finalHit) tone(285,.065,"sawtooth",.055,0,67);
      if (laneAt(S.aim.x) === enemy.lane && !b.iframes) {
        b.lives--;
        b.iframes = .85;
        S.combo = 0;
        popup("−1",S.aim.x,S.aim.y,"#ff846f");
        if (!b.lives) { finish(); return; }
      } else if (laneAt(S.aim.x) !== enemy.lane) S.points += 20;
      if (++b.index === b.order.length) {
        b.index--;
        b.phase = "rest";
      }
    } else if (b.phase === "rest") {
      b.phase = "counter";
      S.nails = [{x:centers[enemy.lane],base:16,y:4,hp:1,max:1,heavy:true}];
    } else newVolley(b);
    if (b.phase === "preview") tone(390 + b.order[b.index].lane * 90,.08,"sine",.08);
  }
  function hint(b) {
    if (b.phase === "ready") return "三命生存 · 左右移槌閃開紅色直道";
    if (b.phase === "preview") return "跟著亮燈數五拍　" + (b.index+1) + " / 5";
    if (b.phase === "hold") return "準備連砸！留意木樁上的紅色直道";
    if (b.phase === "attack") return "閃開第 " + (b.order[b.index].lane+1) + " 道　" + (b.index+1) + " / " + b.order.length;
    if (b.phase === "rest") return "停半拍…";
    if (b.onBeat) return "接上了！節拍獎勵 +150";
    return b.counter ? "反擊成功 · 每三根金釘補一命" : "輪到你！金圈收緊時敲下";
  }
  function showSequence(b) {
    const panel = $("sequence");
    const key = [b.wave,b.phase,b.index].join("/");
    if (panel.dataset.step === key && panel.dataset.run === String(b.order[0].lane)) return;
    panel.dataset.step = key;
    panel.dataset.run = String(b.order[0].lane);
    const start = Math.max(0, Math.min(b.index-2,b.order.length-7));
    const beats = b.order.slice(start,start+7).map((enemy,i) => {
      const cell = document.createElement("span");
      const position = start+i;
      const hidden = b.phase==="ready" || (b.phase==="preview" && position>b.index);
      cell.textContent = hidden ? "·" : String(enemy.lane+1);
      cell.classList.toggle("current", position===b.index && !hidden);
      return cell;
    });
    panel.replaceChildren(...beats);
  }
  return {centers,laneAt,enter,step,counterHit,hint,showSequence};
})();
