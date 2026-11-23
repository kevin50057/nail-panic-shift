"use strict";
// 排行榜（存在這台裝置）＋分享成績卡。主遊戲與魔王關共用。
// Board.add(mode, entry) → 寫入並回傳名次；Board.panel(...) → 結算畫面裡的留名＋榜單＋分享區塊。
const Board = (() => {
  const KEEP = 20, SHOW = 10;
  const MODES = {main: "換班模式", boss: "魔王關・師傅五連敲"};
  const read = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const load = m => { try { return JSON.parse(read("nail-shift.board." + m, "[]")) || []; } catch { return []; } };
  const store = (m, list) => write("nail-shift.board." + m, JSON.stringify(list.slice(0, KEEP)));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clean = s => String(s || "").replace(/\s+/g, " ").trim().slice(0, 12);
  let name = clean(read("nail-shift.name", ""));

  function add(mode, e) {
    const list = load(mode);
    const entry = Object.assign({id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, at: Date.now()}, e);
    list.push(entry);
    list.sort((a, b) => b.score - a.score || a.at - b.at);
    const rank = list.indexOf(entry) + 1;
    store(mode, list);
    return {mode, entry, rank, total: list.length};
  }

  function rename(r, n) {
    name = clean(n); write("nail-shift.name", name);
    const list = load(r.mode), e = list.find(x => x.id === r.entry.id);
    if (e) { e.name = name; store(r.mode, list); }
    r.entry.name = name;
  }

  function table(r) {
    const list = load(r.mode).slice(0, SHOW);
    if (!list.some(x => x.id === r.entry.id)) list.push(Object.assign({}, r.entry, {outside: true}));
    return list.map((x, i) => {
      const me = x.id === r.entry.id, rk = x.outside ? r.rank : i + 1;
      return '<li class="' + (me ? "me" : "") + (rk <= 3 ? " top" + rk : "") + '"><i>' + rk + '</i><span>' + esc(x.name || "無名學徒") +
        '</span><small>' + esc(x.note || "") + '</small><b>' + x.score + '</b></li>';
    }).join("");
  }

  // 結算畫面的區塊。onShare 由 Board 自己處理。
  function panel(r) {
    const id = "bd" + r.entry.id;
    setTimeout(() => wire(r, id), 0);
    return '<section class="board" id="' + id + '">' +
      '<div class="boardHead"><b>' + (r.rank === 1 ? "🏆 本機第 1 名！" : "本機第 " + r.rank + " 名") + '</b><span>' + esc(MODES[r.mode]) + "・共 " + r.total + " 筆</span></div>" +
      '<label class="boardName">上榜名字<input maxlength="12" placeholder="想留名就打（可不填）" value="' + esc(name) + '" autocomplete="nickname" enterkeyhint="done"></label>' +
      '<ol class="boardList">' + table(r) + "</ol>" +
      '<button class="secondary shareBtn" type="button">分享成績卡</button><div class="shareOut" hidden></div></section>';
  }

  function wire(r, id) {
    const root = document.getElementById(id);
    if (!root) return;
    const input = root.querySelector("input"), list = root.querySelector(".boardList");
    const commit = () => { if (clean(input.value) !== r.entry.name) { rename(r, input.value); list.innerHTML = table(r); } };
    input.addEventListener("input", commit);
    input.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
    root.querySelector(".shareBtn").onclick = () => { commit(); share(r, root.querySelector(".shareOut")); };
  }

  // ── 成績卡（像素風 PNG）──
  function card(r) {
    const W = 720, H = 900, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"), e = r.entry, font = (w, s) => w + " " + s + 'px "Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif';
    g.fillStyle = "#0b1019"; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 6) { g.fillStyle = y % 12 ? "#0e1420" : "#101828"; g.fillRect(0, y, W, 3); }
    g.fillStyle = "#1a2232"; g.fillRect(30, 30, W - 60, H - 60);
    g.strokeStyle = "#ffc94a"; g.lineWidth = 6; g.strokeRect(30, 30, W - 60, H - 60);
    g.fillStyle = "#ffc94a"; g.fillRect(30, 30, W - 60, 10);
    g.textAlign = "center";
    g.fillStyle = "#8ffae0"; g.font = font("700", 24); g.fillText(r.mode === "boss" ? "BOSS RUSH" : "DAY × NIGHT SHIFT", W / 2, 100);
    g.fillStyle = "#f3ead6"; g.font = font("900", 64); g.fillText("NAIL PANIC!", W / 2, 175);
    g.fillStyle = "#ffc94a"; g.font = font("900", 40); g.fillText("最後一槌：換班", W / 2, 230);
    g.fillStyle = "#ffffff"; g.font = font("900", 44); g.fillText(e.name || "無名學徒", W / 2, 325);
    g.fillStyle = "#ffad4c"; g.font = font("900", 128); g.fillText(String(e.score), W / 2, 460);
    g.fillStyle = "#c1c8d0"; g.font = font("700", 26); g.fillText("分", W / 2, 500);
    g.fillStyle = r.rank <= 3 ? "#ffd766" : "#8fb4e8"; g.font = font("900", 44); g.fillText("本機排行第 " + r.rank + " 名", W / 2, 590);
    g.fillStyle = "#e8edf1"; g.font = font("500", 28);
    (e.lines || []).slice(0, 3).forEach((t, i) => g.fillText(t, W / 2, 660 + i * 44));
    g.fillStyle = "#ffc94a"; g.font = font("900", 34); g.fillText("來挑戰我！", W / 2, 820);
    // 小鐵鎚
    g.fillStyle = "#9aa5b1"; g.fillRect(84, 760, 60, 34); g.fillStyle = "#c98a4b"; g.fillRect(140, 770, 70, 14);
    g.fillStyle = "#9aa5b1"; g.fillRect(W - 144, 760, 60, 34); g.fillStyle = "#c98a4b"; g.fillRect(W - 210, 770, 70, 14);
    return c;
  }

  async function share(r, out) {
    const c = card(r), e = r.entry;
    const text = (e.name || "無名學徒") + " 在《NAIL PANIC! 最後一槌》" + MODES[r.mode] + "拿下 " + e.score + " 分（本機第 " + r.rank + " 名）！" +
      ((e.lines || [])[0] ? "　" + e.lines[0] : "") + "　來挑戰我！";
    const blob = await new Promise(res => c.toBlob(res, "image/png"));
    const url = URL.createObjectURL(blob);
    // 一律顯示圖片：分享視窗被擋時，長按圖片也能存。
    out.hidden = false;
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch {}
    out.innerHTML = '<img alt="成績卡" src="' + url + '"><p>長按（或右鍵）圖片即可儲存' + (copied ? "；分享文字已複製，貼給朋友就好。" : "。") + '</p>';
    try {
      const file = new File([blob], "nail-panic-score.png", {type: "image/png"});
      if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], text}); return; }
      if (navigator.share) { await navigator.share({text}); return; }
    } catch {}
  }

  return {add, panel};
})();
