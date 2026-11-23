"use strict";
const $=id=>document.getElementById(id);
const art=PixelArt.renderer($("field")), keys=new Set();
const saved=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
let best=Math.max(0,parseInt(saved("nail-panic.best","0"),10)||0),soundOn=saved("nail-panic.sound","1")!=="0";
let audioCtx,drag=null,previous=0,raf=0,modal="",screenMode="home";
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const S={};
const plans=[
  [[0,12],[-65,-7],[58,17]],
  [[-63,18,1],[0,-14],[62,16,2]]
];
const names=["開工熱身","電磁鎖釘"];
const hotColors=["#ffe886","#ffbb48","#e88641","#fff2c8"];
const coldColors=["#d5faff","#6bede0","#77aecf","#fafbc9"];
function soundLabel(){const b=$("audio");b.setAttribute("aria-pressed",String(soundOn));b.querySelector("span").textContent=soundOn?"音效開":"音效關";b.querySelector("i").innerHTML=PixelArt.icon(soundOn?"sound":"mute")}
for(const i of document.querySelectorAll("[data-icon]"))i.innerHTML=PixelArt.icon(i.dataset.icon);
soundLabel();$("record").textContent=String(best).padStart(4,"0");
function unlock(){if(!soundOn)return;try{const A=window.AudioContext||window.webkitAudioContext;if(A&&!audioCtx)audioCtx=new A();if(audioCtx?.state==="suspended")audioCtx.resume().catch(()=>{})}catch{}}
function tone(freq,dur=.1,type="square",vol=.035,delay=0,end=freq){
  if(!soundOn||!audioCtx||audioCtx.state!=="running")return;
  const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(24,end),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+dur+.015);
}
const beat={
  tap(){tone(235,.085,"triangle",.085,0,70)},
  perfect(){tone(520,.09,"square",.035,0,335);tone(1140,.16,"sine",.08,.022,730)},
  nail(){tone(390,.105,"triangle",.10,0,70);tone(750,.072,"square",.027)},
  lock(){tone(580,.11);tone(790,.10,"square",.03,.15)},
  catch(){tone(172,.3,"sawtooth",.04,0,45)},
  bait(){[470,700,940].forEach((f,i)=>tone(f,.14,"square",.038,i*.065))},
  bell(){[540,720,960].forEach((f,i)=>tone(f,.18,"triangle",.08,i*.09))}
};
$("audio").onclick=()=>{soundOn=!soundOn;save("nail-panic.sound",soundOn?"1":"0");soundLabel();unlock();if(soundOn)tone(660,.1)};
function announce(message){$("announcer").textContent=message}
function tip(message,ttl=1.35,hot=false){S.tip=message;S.tipTime=ttl;S.tipHot=hot}
function loadWave(index){
  S.round=index;
  if (index === 2) { ForgeBoss.enter(); return; }const dir=Math.random()<.5?-1:1;
  S.nails=plans[index].map(([x,base,type=0])=>{const hp=type===1?1:2;return {x:x*dir,base,y:base-12,hp,max:hp,heavy:type>=2,shield:type===1}});
  S.magnet={phase:"rest",elapsed:0,wait:index===0?1.35:.85,x:0,y:0};S.transition=0;
  $("wave").textContent="第 "+(index+1)+" / 3 輪　"+names[index];
  tip(["對準釘頭，放開或按空白鍵敲擊","藍環鎖釘要引電磁怪來敲！"][index],index===0?2.6:2.5);
  announce($("wave").textContent);
}
function resetRun(){
  Object.assign(S,{boss:null,stroke:null,aim:{x:0,y:0},round:0,cleared:0,points:0,combo:0,bestCombo:0,perfect:0,baits:0,time:45,t:0,stun:0,swing:0,shake:0,transition:0,hover:false,pop:null,particles:[],tip:"",tipTime:0,tipHot:false,reduced,lastTick:46});
  loadWave(0);
}
function start(bossOnly=false){
  closeDialog();unlock();resetRun();screenMode="play";document.body.classList.add("playing");
  $("home").hidden=true;$("field").hidden=false;$("livebar").hidden=false;$("hint").hidden=false;
  $("sys").textContent="挑戰中";$("timeLabel").textContent="剩餘時間";$("targetLabel").textContent="已敲入";
  $("timeUnit").textContent="秒";$("modeText").textContent="TIME ATTACK";
  document.querySelector(".time > i").innerHTML=PixelArt.icon("clock");
  if (bossOnly === true) loadWave(2);
  keys.clear();drag=null;art.resize();$("field").focus({preventScroll:true});beat.bell();renderUI();art.frame(S);resumeLoop();
}
function goHome(){
  closeDialog();$("sequence").hidden=true;screenMode="home";cancelAnimationFrame(raf);document.body.classList.remove("playing","danger");
  $("home").hidden=false;$("field").hidden=true;$("livebar").hidden=true;$("hint").hidden=true;
  $("sys").textContent="待機中";$("timeLabel").textContent="時間限制";$("targetLabel").textContent="目標釘數";
  document.querySelector(".time > i").innerHTML=PixelArt.icon("clock");
  $("timer").textContent="45";$("timeUnit").textContent="秒";$("modeText").textContent="TIME ATTACK";$("count").textContent="06";$("score").textContent="0000";$("start").focus({preventScroll:true})
}
function nearest(x,y){
  let item=null,d=Infinity;for(const n of S.nails){if(n.hp<=0)continue;const gap=Math.hypot(x-n.x,(y-n.y)*1.25);if(gap<d){item=n;d=gap}}return {n:item,d};
}
function move(dx,dy){let x=S.aim.x+dx,y=S.aim.y+dy;const len=Math.hypot(x/119,y/57);if(len>1){x/=len;y/=len}S.aim={x,y}}
function sparks(x,y,colors){
  for(let i=0;i<(reduced?5:15);i++){const a=(Math.random()*.93+.04)*Math.PI,v=16+Math.random()*46;S.particles.push({x,y,vx:Math.cos(a)*v,vy:-Math.sin(a)*v-7,size:Math.random()<.28?2:1,life:.25+Math.random()*.29,color:colors[i%colors.length]})}
}
function popup(text,x,y,color){S.pop={text,x,y:y-12,color,ttl:.75}}
function scoreHit(n,kind){
  const bait=kind==="bait",perfect=kind==="perfect";
  S.combo++;S.bestCombo=Math.max(S.bestCombo,S.combo);if(perfect)S.perfect++;if(bait)S.baits++;
  const pts=(bait?220:perfect?150:55)+Math.min(S.combo-1,6)*15;
  S.points+=pts;n.hp=Math.max(0,n.hp-(bait?4:perfect?2:1));n.y=n.base-12*n.hp/n.max;
  if(n.hp===0)S.cleared++;S.shake=bait?3.1:perfect?2.0:1;
  sparks(n.x,n.y,bait?coldColors:hotColors);popup((bait?"BAIT":perfect?"PERFECT":"HIT")+" +"+pts,n.x,n.y,bait?"#9dfcf5":"#fff2a8");
  if(bait){beat.bait();tip("借力打釘！電磁怪替你敲了一根",1.55)}
  else if(perfect){beat.perfect();tip("正中釘心！　連擊 ×"+S.combo,.85)}
  else{beat.nail();tip("敲中了！再補一槌",.8)}
  if(S.nails.every(i=>i.hp===0)){S.transition=1;tip("這塊木樁完成了！",1);beat.bell()}
}
function strike(){
  if(screenMode!=="play"||S.transition>0||S.stun>0||S.swing>0)return;
  S.swing = .27;
  const {n,d} = nearest(S.aim.x,S.aim.y);
  S.stroke = {x:S.aim.x, y:S.aim.y, nail:n, distance:d, pending:true};
}
function contact(stroke){
  const {nail:n,distance:d,x,y}=stroke;
  if (!n || d>12 || n.hp<=0 || !S.nails.includes(n)) {
    if (!S.boss || S.boss.phase==="counter") {
      beat.tap(); S.combo=0; popup("MISS",x,y,"#f1b19c");
    }
    return;
  }
  if (S.boss) { ForgeBoss.counterHit(n,d); return; }
  if(n.shield){tone(165,.09,"square");sparks(n.x,n.y,coldColors);tip("鎖釘！停在藍環，紅圈定住就閃",1.4,true);return}
  scoreHit(n,d<=5.8?"perfect":"hit");
}
function impact(){
  const m=S.magnet;S.shake=2.7;sparks(m.x,m.y,coldColors);
  if(Math.hypot(m.x-S.aim.x,(m.y-S.aim.y)*1.3)<20){S.time=Math.max(0,S.time-4);S.stun=.48;S.combo=0;beat.catch();popup("CAUGHT -4s",m.x,m.y,"#ff9e86");tip("被吸住了！扣四秒",1.45,true);return}
  const {n,d}=nearest(m.x,m.y);
  if(n&&d<=15){scoreHit(n,"bait");return}
  S.points+=30;beat.nail();popup("DODGE +30",m.x,m.y,"#b4ffef");tip("閃過了！躲開電磁怪 +30",1);
}
function magnetStep(dt){
  const m=S.magnet;m.elapsed+=dt;
  if(m.phase==="rest"){if(m.elapsed>=m.wait){m.phase="track";m.elapsed=0;m.x=S.aim.x;m.y=S.aim.y;tip("黃圈追蹤中，把它帶到釘子上",1,true)}return}
  if(m.phase==="track"){m.x=S.aim.x;m.y=S.aim.y;if(m.elapsed>=1.05-S.round*.09){m.phase="lock";m.elapsed=0;beat.lock();tip("紅圈鎖定！快閃開！",1,true)}return}
  if(m.phase==="lock"){if(m.elapsed>=.86-S.round*.10){m.phase="slam";m.elapsed=0}return}
  if(m.phase==="slam"){if(m.elapsed>=.19){m.phase="recover";m.elapsed=0;impact()}return}
  if(m.phase==="recover"&&m.elapsed>=.56){m.phase="rest";m.elapsed=0;m.wait=1.20-S.round*.17+Math.random()*.42}
}
function step(dt){
  S.t+=dt;
  if (!S.boss && S.transition<=0) {
    S.time=Math.max(0,S.time-dt);
    if (!S.time) {finish();return;}
    const left=Math.ceil(S.time);
    if(left<=8&&left<S.lastTick)tone(left<=3?790:480,.07,"triangle",.06);
    S.lastTick=left;
  }
  const dx=(keys.has("ArrowRight")?1:0)-(keys.has("ArrowLeft")?1:0),dy=(keys.has("ArrowDown")?1:0)-(keys.has("ArrowUp")?1:0);
  if((dx||dy)&&S.stun<=0){const factor=106*dt/Math.hypot(dx,dy);move(dx*factor,dy*factor*.82)}
  S.swing=Math.max(0,S.swing-dt);S.stun=Math.max(0,S.stun-dt);S.shake=Math.max(0,S.shake-dt*9);S.tipTime=Math.max(0,S.tipTime-dt);
  if (S.stroke?.pending && S.swing <= .12) { S.stroke.pending=false; contact(S.stroke); }
  if (S.boss) ForgeBoss.step(dt);
  else if(S.transition>0){S.transition-=dt;if(S.transition<=0)loadWave(S.round+1)}else magnetStep(dt);
  S.hover=nearest(S.aim.x,S.aim.y).d<=12;
  for(const p of S.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=104*dt;p.life-=dt}
  S.particles=S.particles.filter(p=>p.life>0);if(S.pop){S.pop.ttl-=dt;if(S.pop.ttl<0)S.pop=null}
  if(screenMode==="play"&&!S.boss&&S.time<=0)finish();
}
function display(el,value){if(el.textContent!==value)el.textContent=value}
function renderUI(){
  display($("timer"),String(S.boss ? S.boss.lives : Math.ceil(S.time)).padStart(2,"0"));display($("count"),String(S.boss ? S.boss.blocks : S.cleared).padStart(2,"0"));display($("score"),String(S.points).padStart(4,"0"));
  const m=S.magnet.phase;const msg=S.boss?ForgeBoss.hint(S.boss):m==="track"?"黃圈追蹤中，把它帶到釘頭":m==="lock"||m==="slam"?"紅圈鎖定！快閃開！":S.tipTime>0?S.tip:"拖曳移槌，放開敲擊";
  $("sequence").hidden = !S.boss;
  if (S.boss) ForgeBoss.showSequence(S.boss);
  display($("hint"),msg);$("hint").classList.toggle("hot",m==="track"||m==="lock"||m==="slam"||(S.tipTime>0&&S.tipHot));document.body.classList.toggle("danger",S.boss ? S.boss.lives===1 : S.time<9);
}
function loop(now){
  if(screenMode!=="play")return;
  let left=Math.min((now-previous)/1000,.30);previous=now;
  while(left>0&&screenMode==="play"){let dt=Math.min(.04,left);step(dt);left-=dt}
  renderUI();art.frame(S);if(screenMode==="play")raf=requestAnimationFrame(loop);
}
function resumeLoop(){cancelAnimationFrame(raf);previous=performance.now();raf=requestAnimationFrame(loop)}
function showDialog(tag,title,content,actions,kind){
  const d=$("dialog");modal=kind;$("dialogTag").textContent=tag;$("dialogTitle").textContent=title;$("dialogContent").innerHTML=content;$("dialogActions").replaceChildren();
  for(const [label,callback,primary] of actions){const b=document.createElement("button");b.className=primary?"primary":"secondary";b.textContent=label;b.onclick=callback;$("dialogActions").append(b)}
  d.setAttribute("aria-labelledby","dialogTitle");if(!d.open)d.showModal();$("dialogActions").querySelector("button")?.focus({preventScroll:true});
}
function closeDialog(){modal="";if($("dialog").open)$("dialog").close()}
function freeze(){screenMode="paused";drag=null;keys.clear();cancelAnimationFrame(raf);$("sys").textContent="已暫停"}
function unfreeze(){closeDialog();screenMode="play";$("sys").textContent="挑戰中";$("field").focus({preventScroll:true});resumeLoop()}
function pause(){if(screenMode!=="play")return;freeze();showDialog("PAUSE","暫停中","<p>按繼續，從剛才的動作接著玩。</p>",[["繼續遊戲",unfreeze,true],["回到主畫面",goHome,false]],"pause")}
function help(){
  if(screenMode==="play")freeze();const paused=screenMode==="paused";
  showDialog("HOW TO PLAY","操作指南",'<div class="rule"><i>1</i><div><b>移槌，放開就敲</b><p>在遊戲區任意處按住並滑動，移動準星，放開就敲。電腦也能用方向鍵移動、空白鍵敲擊。</p></div></div><div class="rule"><i>2</i><div><b>對準釘心，少敲一槌</b><p>正中釘心有兩倍敲擊力。45 秒內完成前兩輪六根釘子，即可進入無限魔王關。</p></div></div><div class="rule"><i>3</i><div><b>黃圈誘敵，紅圈閃人</b><p>把追著你的黃圈帶到釘頭。圈變紅、位置固定就移開！怪物會替你打釘，<strong>藍環鎖釘只能靠牠敲入</strong>。被吸到扣四秒。</p></div></div><div class="rule"><i>4</i><div><b>五連砸，找空檔反擊</b><p>魔王關有三命。看磁怪亮燈的順序，左右閃開紅道。連砸結束後敲金釘，每三根回復一命，最多三命。存活越久，敵人越多。</p></div></div>',[[paused?"繼續遊戲":"開始遊戲",paused?unfreeze:start,true]],"help");
}
function finish(){
  if(screenMode!=="play")return;
  screenMode="over";keys.clear();drag=null;cancelAnimationFrame(raf);
  const high=S.points>best;
  if(high){best=S.points;save("nail-panic.best",String(best));$("record").textContent=String(best).padStart(4,"0")}
  const boss=S.boss;
  renderUI();art.frame(S);$("sys").textContent=boss?"挑戰結束":"時間到";$("hint").hidden=true;beat.catch();
  const row=(label,value)=>'<div><span>'+label+'</span><b>'+value+'</b></div>';
  const results=boss ? row("抵達波次",boss.wave)+row("存活時間",Math.floor(boss.time)+" 秒")+row("反擊金釘",boss.blocks+" 根") : row("熱身釘數",S.cleared+" / 6");
  const summary='<div class="resultScore">'+S.points+'</div><p>'+(high?"本機最高分更新！":boss?"磁怪收隊，下次再戰。":"下班鈴響了。")+'</p><div class="resultRows">'+results+row("正中釘心",S.perfect+" 槌")+'</div>';
  showDialog(boss?"BOSS RUSH":"TIME UP",boss?"最後一命用完了":"收工時間到！",summary,[[boss?"再戰魔王":"再玩一局",()=>start(Boolean(boss)),true],["主畫面",goHome,false]],"result");
}
function dismiss(){if(modal==="result")goHome();else if(screenMode==="paused")unfreeze();else closeDialog()}
$("start").onclick=()=>start();$("bossStart").onclick=()=>start(true);$("help").onclick=help;$("pause").onclick=pause;$("close").onclick=dismiss;
$("dialog").addEventListener("cancel",e=>{e.preventDefault();dismiss()});
const field=$("field");
field.addEventListener("pointerdown",e=>{if(screenMode!=="play"||drag||e.button!==0)return;e.preventDefault();unlock();field.focus({preventScroll:true});field.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY}});
function pointerMove(e){if(!drag||drag.id!==e.pointerId||screenMode!=="play")return;const [dx,dy]=art.delta(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;if(S.stun<=0)move(dx*1.12,dy*1.12)}
field.addEventListener("pointermove",pointerMove);
field.addEventListener("pointerup",e=>{if(!drag||drag.id!==e.pointerId)return;pointerMove(e);drag=null;strike()});
for(const event of ["pointercancel","lostpointercapture"])field.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null});
window.addEventListener("keydown",e=>{
  if(modal)return;
  if(screenMode==="home"&&(e.code==="Space"||e.key==="Enter")&&!e.repeat&&(e.target===document.body||e.target===$("start"))){e.preventDefault();start();return}
  if(screenMode!=="play")return;
  unlock();
  if(e.key==="Escape"||e.code==="KeyP"){e.preventDefault();if(!e.repeat)pause();return}
  if(e.target!==field&&e.target?.tagName==="BUTTON")return;
  if(e.key.startsWith("Arrow")){keys.add(e.key);e.preventDefault()}
  if(e.code==="Space"){e.preventDefault();if(!e.repeat)strike()}
});
window.addEventListener("keyup",e=>keys.delete(e.key));
window.addEventListener("blur",()=>{if(screenMode==="play")pause()});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&screenMode==="play")pause()});
new ResizeObserver(()=>{if(screenMode!=="home"){art.resize();art.frame(S)}}).observe($("screen"));

if (new URLSearchParams(location.search).has("boss")) start(true);
