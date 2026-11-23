"use strict";
(() => {
const $=id=>document.getElementById(id);
const V3=THREE.Vector3,UP=new V3(0,1,0),XA=new V3(1,0,0);
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const eIn=t=>t*t*t,eOut=t=>1-(1-t)**3,pick=a=>a[Math.floor(Math.random()*a.length)],damp=(r,dt)=>1-Math.exp(-r*dt);
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const saved=(k,f)=>{try{return localStorage.getItem(k)??f}catch{return f}},save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
let best=Math.max(0,parseInt(saved("nail-shift.best","0"),10)||0),soundOn=saved("nail-panic.sound","1")!=="0";
const DIFFS=[{name:"輕鬆",lives:4,off:-4,night:8,mag:-1,mult:0.8},{name:"標準",lives:3,off:0,night:0,mag:0,mult:1},{name:"高手",lives:2,off:8,night:-5,mag:1.5,mult:1.5}];
let diff=clamp(parseInt(saved("nail-shift.diff","1"),10)||0,0,2);
const MODS={drunk:{name:"師傅喝了兩杯",desc:"白班圓圈晃得厲害",mult:1.25},rush:{name:"趕工日",desc:"白班只有 22 秒，夜班多 2 根新釘",mult:1.25},flies:{name:"蒼蠅季",desc:"白班蒼蠅一直來",mult:1.15},
  gold:{name:"發薪日",desc:"白班全是金釘，白班得分 ×2",mult:1},blackout:{name:"停電夜",desc:"夜班只剩電磁怪和準星的光",mult:1.3},rampage:{name:"電磁怪暴走",desc:"夜班電磁怪不休息，騙怪代打分數 ×2",mult:1.2}};
const modDesc=k=>MODS[k].desc+(MODS[k].mult>1?"・全日得分 ×"+MODS[k].mult:"");
const PERKS={glove:{name:"急救包",desc:"補 1 片 OK 繃；滿了就多 1 格"},thimble:{name:"鐵指套",desc:"每天白班擋下第一次敲到手"},lens:{name:"師傅的新眼鏡",desc:"白班比較不會敲歪"},ice:{name:"冰敷袋",desc:"手指立刻消腫，夜班準星不晃"},
  heavy:{name:"加重槌頭",desc:"夜班每一槌多 1 倍力"},coffee:{name:"濃咖啡",desc:"夜班多 6 秒"},lure:{name:"強力誘餌",desc:"電磁怪轟擊範圍變大，容易一次砸多根"},bonus:{name:"加班費",desc:"之後所有得分 +20%"}};
const DAY_T=30,NIGHT_T=35,HAND_R=2.0,TGT_R=1.75,AIM_R=2.05,PITCH=0.92,SW_T=0.2;
const R=0.22,PERF=0.09,GOODR=0.19,CONTACT=0.29,PY=0.36,NL=0.9,L=2.0,A_HIT=0.12,HEADY=NL+0.05;
const icon=(el,name)=>{el.dataset.icon=name;el.innerHTML=PixelArt.icon(name)};
for(const i of document.querySelectorAll("[data-icon]"))i.innerHTML=PixelArt.icon(i.dataset.icon);

/* ================= three.js world ================= */
const screenEl=$("screen"),canvas=$("field"),fx=$("fx"),bubble=$("bubble");
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true});
renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,0.1,120);
const LOOK=new V3(),camBase=new V3();let pxW=0.01,cw=1,ch=1;
const hemi=new THREE.HemisphereLight(0xfff0d8,0x4a2e1e,0.55);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe2b8,0.64);sun.position.set(0.35,12,0.5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-6,right:6,top:7,bottom:-7,near:2,far:22});sun.shadow.bias=-0.0006;scene.add(sun);
const fillL=new THREE.DirectionalLight(0xcfdcff,0.2);fillL.position.set(-5,5,7);scene.add(fillL);
const magLight=new THREE.PointLight(0x62efe5,0,7,2);scene.add(magLight);const aimLight=new THREE.PointLight(0xbfeaff,0,4.2,2);scene.add(aimLight);
const ENV=[{sky:0xfff0d8,gnd:0x4a2e1e,h:0.55,sun:0xffe2b8,s:0.64,f:0.2},{sky:0x8098d8,gnd:0x121a2a,h:0.5,sun:0xffd9a0,s:0.5,f:0.1}];
let env=0,envTarget=0,dark=0;const cA=new THREE.Color(),cB=new THREE.Color();
function applyEnv(){const a=ENV[0],b=ENV[1],k=env;hemi.color.copy(cA.setHex(a.sky).lerp(cB.setHex(b.sky),k));hemi.groundColor.copy(cA.setHex(a.gnd).lerp(cB.setHex(b.gnd),k));
  hemi.intensity=lerp(a.h,b.h,k)*(1-0.9*dark);sun.color.copy(cA.setHex(a.sun).lerp(cB.setHex(b.sun),k));sun.intensity=lerp(a.s,b.s,k)*(1-0.92*dark);fillL.intensity=lerp(a.f,b.f,k)*(1-dark);}

const mat=(c,o={})=>new THREE.MeshLambertMaterial(Object.assign({color:c},o));
const phong=(c,s=60,sp=0x666666)=>new THREE.MeshPhongMaterial({color:c,shininess:s,specular:sp});
const basic=(c,o={})=>new THREE.MeshBasicMaterial(Object.assign({color:c},o));
const sph=new THREE.SphereGeometry(1,14,10),cyl=new THREE.CylinderGeometry(1,1,1,10);
function add(p,geo,m,pos,scale,rot){const o=new THREE.Mesh(geo,m);if(pos)o.position.set(...pos);if(scale!=null)(typeof scale==="number"?o.scale.setScalar(scale):o.scale.set(...scale));if(rot)o.rotation.set(...rot);o.castShadow=true;p.add(o);return o}
function placeSeg(m,a,b,r){const d=new V3().subVectors(b,a),len=d.length();m.position.copy(a).addScaledVector(d,0.5);m.scale.set(r,len,r);m.quaternion.setFromUnitVectors(UP,d.normalize())}
function seg(p,a,b,r,m){const o=new THREE.Mesh(cyl,m);placeSeg(o,a,b,r);o.castShadow=true;p.add(o);return o}
const pix=t=>{t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t};

/* --- the stump (borrowed from NAIL PANIC!) --- */
function stumpTop(){const s=96,cv=PixelArt.canvas(s,s),g=cv.getContext("2d"),r=PixelArt.seed(5),cols=["#e8a25d","#d58e52","#e6a15e","#c7824e","#dd9856"];
  g.fillStyle="#5a3424";g.fillRect(0,0,s,s);
  for(let k=0;k<12;k++){g.fillStyle=k?cols[k%cols.length]:"#c07a48";g.beginPath();g.arc(s/2-1,s/2+1,s/2-2-k*3.8,0,Math.PI*2);g.fill()}
  g.strokeStyle="#8e5233";g.lineWidth=2;[[0.3,0.55],[1.6,0.45],[2.7,0.6],[4.1,0.4],[5.3,0.5]].forEach(([a,l])=>{g.beginPath();g.moveTo(s/2+Math.cos(a)*s*.48,s/2+Math.sin(a)*s*.48);g.lineTo(s/2+Math.cos(a+.08)*s*(.48-l*.45),s/2+Math.sin(a+.08)*s*(.48-l*.45));g.stroke()});
  for(let i=0;i<170;i++){const a=r()*6.28,d=r()*s*.45;g.fillStyle=i%3?"#bd7c48":"#f2b376";g.fillRect(Math.round(s/2+Math.cos(a)*d),Math.round(s/2+Math.sin(a)*d),1+Math.floor(r()*3),1)}
  return pix(new THREE.CanvasTexture(cv))}
function barkTex(){const w=128,h=24,cv=PixelArt.canvas(w,h),g=cv.getContext("2d"),r=PixelArt.seed(9),pal=["#724134","#9a5539","#854a35","#bf7042","#64382f"];
  for(let x=0;x<w;){const ww=2+Math.floor(r()*4);g.fillStyle=pal[Math.floor(r()*pal.length)];g.fillRect(x,0,ww,h);g.fillStyle="rgba(217,137,73,.25)";g.fillRect(x+1,4,1,h-9);x+=ww}
  g.fillStyle="#e6a15e";g.fillRect(0,0,w,2);g.fillStyle="#3e2420";g.fillRect(0,h-3,w,3);const t=pix(new THREE.CanvasTexture(cv));t.wrapS=THREE.RepeatWrapping;t.repeat.set(3,1);return t}
const stump=new THREE.Mesh(new THREE.CylinderGeometry(2.45,2.62,0.9,40),[mat(0xffffff,{map:barkTex()}),mat(0xffffff,{map:stumpTop()}),mat(0x3e2420)]);
stump.position.y=-0.45;stump.receiveShadow=true;scene.add(stump);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:0.38}));floor.rotation.x=-Math.PI/2;floor.position.y=-0.9;floor.receiveShadow=true;scene.add(floor);

/* --- nails --- */
const steel=phong(0xb7bfc9,90,0x999999),gold=phong(0xffcf4a,80,0xfff0b0);
const gShank=new THREE.CylinderGeometry(0.036,0.036,NL,8),gTip=new THREE.ConeGeometry(0.036,0.13,8),gHead=new THREE.CylinderGeometry(0.13,0.115,0.05,16);
let nailProto=null;
function makeNail(m=steel){const g=new THREE.Group();if(nailProto){const c=nailProto.clone();c.traverse(o=>{if(o.isMesh&&o.material.name!=="Outline")o.material=m});g.add(c);scene.add(g);return g}add(g,gShank,m,[0,NL/2,0]);add(g,gTip,m,[0,-0.065,0],null,[Math.PI,0,0]);add(g,gHead,m,[0,NL+0.025,0]);scene.add(g);return g}

/* --- apprentice hand (day) --- */
const skinA=0xf2c4a0,skinMat=phong(skinA,18,0x333333),sleeveMat=mat(0xd99c2e);
const IDX=[new V3(-0.56,0.07,-0.2),new V3(-0.31,0.05,-0.21),new V3(-0.07,0.01,-0.085)];
const THB=[new V3(-0.62,-0.01,0.24),new V3(-0.33,0,0.21),new V3(-0.07,0,0.085)];
const PALM=new V3(-0.86,0.05,0.02),ARM=[new V3(-1.0,0.06,0.12),new V3(-2.3,0.45,1.5)];
const hand=new THREE.Group();scene.add(hand);
add(hand,sph,skinMat,PALM.toArray(),[0.36,0.17,0.32]);
[[-0.62,-0.03,-0.36],[-0.76,-0.05,-0.42],[-0.9,-0.05,-0.38]].forEach(p=>add(hand,sph,skinMat,p,[0.1,0.08,0.11]));
seg(hand,ARM[0],ARM[1],0.17,skinMat);seg(hand,new V3(-1.95,0.36,1.15),new V3(-3.8,1.0,3.0),0.28,sleeveMat);
add(hand,new THREE.TorusGeometry(0.27,0.06,6,14),mat(0xb57d1c),[-1.95,0.36,1.15],null,[0.75,-0.55,0]);
let fingers=null;
const swellColor=s=>cA.setHex(skinA).lerp(cB.setHex(0xe0574d),clamp((s-1)/0.8,0,1)).getHex();
function chain(pts,r,m){const g=new THREE.Group();for(let i=0;i<pts.length-1;i++)seg(g,pts[i],pts[i+1],r,m);pts.forEach(p=>add(g,sph,m,p.toArray(),r));
  const tip=pts[pts.length-1],prev=pts[pts.length-2],d=new V3().subVectors(tip,prev).normalize();add(g,sph,phong(0xf7dcd0,60),[tip.x-d.x*r*0.3,tip.y+r*0.72,tip.z-d.z*r*0.3],[r*0.62,r*0.28,r*0.62]);return g}
let glbFingers=null;
function buildFingers(){if(glbFingers){for(const[k,node]of glbFingers){const s=G.sw[k];node.traverse(o=>{if(o.isMesh&&o.morphTargetInfluences)o.morphTargetInfluences[0]=clamp((s-1)/0.85,0,1);if(o.isMesh&&/^Skin/.test(o.material.name))o.material.color.setHex(swellColor(s))})}playerFist.color.setHex(swellColor((G.sw.index+G.sw.thumb)/2));return}
  if(fingers)hand.remove(fingers);fingers=new THREE.Group();fingers.add(chain(IDX,0.07*G.sw.index,phong(swellColor(G.sw.index),18,0x333333)));fingers.add(chain(THB,0.078*G.sw.thumb,phong(swellColor(G.sw.thumb),18,0x333333)));hand.add(fingers);
  playerFist.color.setHex(swellColor((G.sw.index+G.sw.thumb)/2))}

/* --- the old master --- */
const indigo=mat(0x2d4766),skinM=phong(0xefbf95,15,0x333333),hairM=mat(0xdcd6cc),darkM=mat(0x24170f),whiteM=mat(0xf6f1e7);
const master=new THREE.Group();master.position.set(0,0,-3.45);scene.add(master);
add(master,new THREE.CylinderGeometry(0.85,1.05,1.7,12),indigo,[0,0.15,0]);
add(master,new THREE.CylinderGeometry(0.55,0.55,0.08,12),whiteM,[0,1.0,0.05],[1,1,0.6]);
seg(master,new V3(0.95,1.0,0.15),new V3(1.4,0.08,1.05),0.21,indigo);add(master,sph,skinM,[1.45,0.04,1.12],[0.22,0.18,0.24]);
const headG=new THREE.Group();headG.position.set(0,1.65,0.05);master.add(headG);
add(headG,sph,skinM,[0,0,0],[0.74,0.78,0.72]);
[0.62,-0.62].forEach(x=>add(headG,sph,hairM,[x,-0.08,-0.12],[0.2,0.34,0.36]));[0.73,-0.73].forEach(x=>add(headG,sph,skinM,[x,-0.04,0.02],[0.11,0.18,0.12]));
add(headG,new THREE.TorusGeometry(0.73,0.1,6,24),whiteM,[0,0.3,0],null,[Math.PI/2,0,0]);add(headG,sph,whiteM,[0,0.32,0.75],[0.14,0.11,0.1]);
const glassM=mat(0x3a2618),rg=new THREE.TorusGeometry(0.17,0.03,5,16),lensM=basic(0xdff3ff,{transparent:true,opacity:0.3});
[0.24,-0.24].forEach(x=>{add(headG,rg,glassM,[x,0.02,0.69]);add(headG,new THREE.CircleGeometry(0.16,16),lensM,[x,0.02,0.7])});
add(headG,new THREE.BoxGeometry(0.15,0.03,0.03),glassM,[0,0.05,0.71]);
let eyes=[0.24,-0.24].map(x=>add(headG,sph,darkM,[x,0.02,0.64],[0.055,0.07,0.04]));
let brows=[0.25,-0.25].map(x=>add(headG,new THREE.BoxGeometry(0.26,0.06,0.06),hairM,[x,0.24,0.68]));
add(headG,sph,phong(0xe39a7a,20),[0,-0.14,0.72],[0.13,0.12,0.12]);
add(headG,sph,hairM,[0.16,-0.3,0.66],[0.2,0.08,0.09],[0,0,-0.3]);add(headG,sph,hairM,[-0.16,-0.3,0.66],[0.2,0.08,0.09],[0,0,0.3]);
let mouth=add(headG,sph,darkM,[0,-0.44,0.62],[0.09,0.02,0.04]);
let sweat=add(headG,sph,new THREE.MeshPhongMaterial({color:0x8fd0ff,shininess:90,transparent:true,opacity:0.9}),[0.64,0.32,0.42],[0.07,0.11,0.07]);sweat.visible=false;
let armSleeve=new THREE.Mesh(cyl,indigo),armSkin=new THREE.Mesh(cyl,skinM);armSleeve.castShadow=armSkin.castShadow=true;scene.add(armSleeve,armSkin);
const SHL=new V3(-0.95,1.0,0.15);

/* --- hammers: the master's, and the one you get at night --- */
const steelD=phong(0x5d656e,70,0x888888),steelF=phong(0xd2d8df,130,0xffffff),playerFist=phong(skinA,18,0x333333);
function makeHammer(fist,handle){const h=new THREE.Group();scene.add(h);add(h,sph,fist,[0,0.02,0],[0.23,0.21,0.25]);
  add(h,new THREE.CylinderGeometry(0.062,0.075,L+0.3,8),handle,[0,0,L/2-0.12],null,[Math.PI/2,0,0]);
  add(h,new THREE.CylinderGeometry(0.2,0.2,0.56,12),steelD,[0,0.03,L]);add(h,new THREE.CylinderGeometry(0.22,0.21,0.06,14),steelF,[0,-0.28,L]);
  add(h,new THREE.BoxGeometry(0.3,0.2,0.3),steelD,[0,0,L]);[0.065,-0.065].forEach(x=>add(h,new THREE.BoxGeometry(0.06,0.32,0.12),steelD,[x,0.43,L-0.07],null,[-0.5,0,0]));return h}
const hamM=makeHammer(skinM,phong(0xc8874a,25)),hamP=makeHammer(playerFist,phong(0xf3b54f,30));
let pSleeve=new THREE.Mesh(cyl,skinMat);pSleeve.castShadow=true;scene.add(pSleeve);
const YM=0.8,YP=Math.PI+0.55,PS=0.78,FACE=new V3(0,-0.31,L),F0=y=>FACE.clone().applyAxisAngle(XA,A_HIT).applyAxisAngle(UP,y),FM=F0(YM),FP=F0(YP).multiplyScalar(PS);hamP.scale.setScalar(PS);
function poseHammer(h,f,yaw,T,a,lift){h.position.set(T.x-f.x,T.y-f.y+lift,T.z-f.z);h.rotation.set(a,yaw,0,"YXZ")}

/* --- 電磁怪 (from NAIL PANIC!) --- */
const magnet=new THREE.Group();scene.add(magnet);const red=mat(0xde5147),tipM=mat(0xd3d8c8);
add(magnet,new THREE.TorusGeometry(0.42,0.17,8,18,Math.PI),red,[0,0.1,0]);
[0.42,-0.42].forEach(x=>{add(magnet,new THREE.BoxGeometry(0.34,0.3,0.34),red,[x,-0.05,0]);add(magnet,new THREE.BoxGeometry(0.36,0.16,0.36),tipM,[x,-0.28,0])});
add(magnet,new THREE.BoxGeometry(0.1,0.32,0.36),mat(0x992f3b),[0.6,0.12,0]);
add(magnet,new THREE.BoxGeometry(0.46,0.24,0.08),mat(0x14181f),[0,0.42,0.17]);
const magEyeM=basic(0x62efe5);let magEyes=[0.1,-0.1].map(x=>add(magnet,new THREE.BoxGeometry(0.06,0.11,0.02),magEyeM,[x,0.42,0.215]));
add(magnet,new THREE.BoxGeometry(0.32,0.12,0.24),mat(0x47404b),[0,0.64,0]);[0.08,-0.08].forEach(x=>add(magnet,new THREE.BoxGeometry(0.07,0.04,0.25),basic(0xe9ac49),[x,0.68,0]));
const linkG=new THREE.TorusGeometry(0.075,0.024,5,8),linkM=mat(0x718090);for(let i=0;i<34;i++)add(magnet,linkG,linkM,[0,0.78+i*0.15,0],null,[0,i%2?Math.PI/2:0,0]);
magnet.position.set(0,9,-0.8);

/* --- rings & markers --- */
function flat(geo,c,op){const m=new THREE.Mesh(geo,basic(c,{transparent:true,opacity:op,depthTest:false,depthWrite:false}));m.rotation.x=-Math.PI/2;m.renderOrder=9;return m}
function makeRing(op){const g=new THREE.Group(),parts=[flat(new THREE.RingGeometry(R,R+0.03,32),0x1a0e06,op*0.55),flat(new THREE.RingGeometry(R-0.075,R-0.045,32),0x1a0e06,op*0.55),flat(new THREE.RingGeometry(R-0.045,R,32),0xfff4dc,op),flat(new THREE.CircleGeometry(0.03,8),0xfff4dc,op),flat(new THREE.CircleGeometry(R-0.045,28),0xfff4dc,op*0.16)];
  parts.forEach(p=>g.add(p));g.userData.tint=parts.slice(2);g.position.y=0.02;g.visible=false;scene.add(g);return g}
const tint=(g,c)=>g.userData.tint.forEach(p=>p.material.color.setHex(c));
const ring=makeRing(0.95),ghost=makeRing(0.95);
const ret=new THREE.Group();ret.visible=false;scene.add(ret);
const retParts=[flat(new THREE.RingGeometry(0.2,0.25,28),0x233a3d,0.9),flat(new THREE.RingGeometry(0.17,0.21,28),0x69e7de,1)];
[[0.34,0,0],[-0.34,0,0],[0,0,0.3],[0,0,-0.3]].forEach(([x,,z])=>{const t=flat(new THREE.PlaneGeometry(z?0.035:0.14,z?0.12:0.035),0x69e7de,1);t.position.set(x,0,z);retParts.push(t)});
retParts.forEach(p=>ret.add(p));const retTint=c=>retParts.slice(1).forEach(p=>p.material.color.setHex(c));
const magRing=new THREE.Group(),magFill=flat(new THREE.CircleGeometry(0.42,28),0xffc244,0.18),magEdge=flat(new THREE.RingGeometry(0.39,0.45,32),0xf9b64c,0.95),magShrink=flat(new THREE.RingGeometry(0.9,1,32),0xfff2ba,0.9);
magRing.add(magFill,magEdge,magShrink);magRing.visible=false;scene.add(magRing);

/* --- fly --- */
const fly=new THREE.Group();fly.visible=false;scene.add(fly);add(fly,sph,darkM,[0,0,0],[0.07,0.055,0.1]);
[0.035,-0.035].forEach(x=>add(fly,sph,basic(0xb3261e),[x,0.02,0.07],0.03));
const wingM=basic(0xffffff,{transparent:true,opacity:0.55,side:THREE.DoubleSide}),wings=[1,-1].map(s=>add(fly,new THREE.PlaneGeometry(0.16,0.08),wingM,[0.07*s,0.05,-0.02],null,[-Math.PI/2,0,0.3*s]));
const F={on:false,ph:"",t:0,from:new V3(),pos:new V3(),vel:new V3()};

/* --- particles --- */
const pGeo=new THREE.BoxGeometry(1,1,1),pM={hot:basic(0xffd75e),hot2:basic(0xe88641),cold:basic(0x6bede0),cold2:basic(0xd5faff),chip:mat(0xc98b52)};
const parts=[],stars=[],dents=[];
function burst(p,kinds,n,sp,size,life,up=2){for(let i=0;i<(reduced?Math.ceil(n/3):n);i++){const m=new THREE.Mesh(pGeo,pM[kinds[i%kinds.length]]);m.position.copy(p);const a=Math.random()*Math.PI*2,s=rand(sp*0.35,sp);
  m.userData={v:new V3(Math.cos(a)*s,rand(up*0.4,up),Math.sin(a)*s),life,max:life};m.scale.setScalar(size);scene.add(m);parts.push(m)}}
const dentGeo=new THREE.CircleGeometry(0.15,10),dentMat=basic(0x3b1d0b,{transparent:true,opacity:0.32,depthWrite:false});
function dent(x,z){const d=new THREE.Mesh(dentGeo,dentMat);d.rotation.x=-Math.PI/2;d.position.set(x,0.004,z);scene.add(d);dents.push(d)}
const starGeo=new THREE.OctahedronGeometry(0.07);
function starRing(){for(let i=0;i<3;i++){const m=new THREE.Mesh(starGeo,pM.hot);m.userData={a:i*2.09,life:1.3};scene.add(m);stars.push(m)}}

/* ================= audio (both cabinets' sounds) ================= */
let ac=null,out=null,nb=null,buzzO=null,buzzG=null;
// iPhone：先播一段無聲 <audio>，讓系統把網頁當成播放媒體，側邊靜音鍵就不會把音效關掉。
let unmuteEl=null;function unmuteIOS(){if(unmuteEl)return;try{unmuteEl=document.createElement("audio");unmuteEl.setAttribute("playsinline","");unmuteEl.setAttribute("x-webkit-airplay","deny");unmuteEl.loop=true;unmuteEl.src="data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";const p=unmuteEl.play();if(p)p.catch(()=>{unmuteEl=null})}catch{unmuteEl=null}}
document.addEventListener("visibilitychange",()=>{if(!unmuteEl)return;if(document.hidden)unmuteEl.pause();else unmuteEl.play().catch(()=>{})});
// 在點擊當下播一個極短的空白音，舊版 iOS 要這樣才會真正解鎖音訊。
function primeCtx(c){try{const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0)}catch{}}
function unlock(){if(!soundOn)return;unmuteIOS();try{if(navigator.audioSession)navigator.audioSession.type="playback"}catch{}try{if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();out=ac.createGain();out.gain.value=0.55;out.connect(ac.destination);
  nb=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}primeCtx(ac);if(ac.state!=="running")ac.resume().catch(()=>{})}catch{ac=null}}
const live=()=>soundOn&&ac&&ac.state==="running";
for(const ev of ["pointerdown","touchend","click","keydown"])document.addEventListener(ev,()=>unlock(),{capture:true});
function tone(f,dur,type="square",vol=0.035,to=null,delay=0){if(!live())return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(24,to),t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.006);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+0.03)}
function noise(dur,vol,type="lowpass",f=800,q=1,to=null,delay=0){if(!live())return;const t=ac.currentTime+delay,s=ac.createBufferSource(),fl=ac.createBiquadFilter(),g=ac.createGain();s.buffer=nb;fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+dur);fl.Q.value=q;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(out);s.start(t,Math.random()*0.5);s.stop(t+dur+0.03)}
const SFX={
  perfect(){tone(1760,0.55,"sine",0.22);tone(4860,0.25,"sine",0.06);tone(880,0.4,"triangle",0.14);noise(0.04,0.45,"highpass",3200)},
  good(){tone(1180,0.38,"sine",0.2);tone(3250,0.16,"sine",0.05);noise(0.04,0.4,"highpass",2600)},
  bent(){tone(480,0.3,"sawtooth",0.07,200);noise(0.05,0.35,"highpass",2200)},
  thud(){tone(120,0.2,"sine",0.5,50);noise(0.13,0.55,"lowpass",650)},
  ouch(){noise(0.1,0.65,"lowpass",500);tone(760,0.5,"square",0.08,130);tone(523,0.14,"triangle",0.14,null,0.06)},
  whoosh(d=0.3,lo=300,hi=1800){noise(d,0.16,"bandpass",lo,1.4,hi)},
  pop(){tone(620,0.08,"sine",0.1,980)},heal(){[784,1047,1568].forEach((f,i)=>tone(f,0.16,"triangle",0.15,null,i*0.1))},
  sneeze(){noise(0.3,0.55,"bandpass",2200,0.8,600)},
  tap(){tone(235,0.085,"triangle",0.085,70)},nperfect(){tone(520,0.09,"square",0.035,335);tone(1140,0.16,"sine",0.08,730,0.022)},
  nail(){tone(390,0.105,"triangle",0.1,70);tone(750,0.072,"square",0.027)},lock(){tone(580,0.11);tone(790,0.1,"square",0.03,null,0.15)},
  caught(){tone(172,0.3,"sawtooth",0.04,45)},bait(){[470,700,940].forEach((f,i)=>tone(f,0.14,"square",0.038,null,i*0.065))},
  bell(){[540,720,960].forEach((f,i)=>tone(f,0.18,"triangle",0.08,null,i*0.09))},clank(){tone(165,0.09,"square",0.05);noise(0.05,0.3,"highpass",3000)},
  over(){[392,330,262].forEach((f,i)=>tone(f,0.3+i*0.15,"triangle",0.18,null,i*0.25))},
  // 電磁怪：下降時鏈條嘩啦＋蒸汽「嘶—」；砸下「框」一聲金屬重擊＋「ㄘ」一團蒸汽噴出；升起時洩壓「噗咻」
  mdrop(){noise(0.2,0.22,"bandpass",2200,0.9,6500);for(let i=0;i<4;i++)tone(1500+i*170,0.03,"square",0.018,null,i*0.035);tone(300,0.18,"sawtooth",0.03,90)},
  mslam(){tone(105,0.34,"sine",0.55,38);[331,467,702,1043].forEach((f,i)=>tone(f,0.42-i*0.06,i%2?"triangle":"square",0.05-i*0.008));noise(0.09,0.6,"lowpass",900);
    noise(0.42,0.3,"bandpass",5200,0.6,2600,0.07);noise(0.3,0.14,"highpass",7000,0.7,null,0.09)},
  mrise(){noise(0.22,0.12,"bandpass",3000,1.2,1200,0.5);tone(220,0.16,"triangle",0.04,440,0.56)}};
function buzz(on,vol=0.05){if(!live()){if(!on&&buzzO){try{buzzO.stop();buzzO._l.stop()}catch{}buzzO=null}return}const t=ac.currentTime;
  if(on&&!buzzO){buzzO=ac.createOscillator();buzzO.type="sawtooth";buzzO.frequency.value=210;const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=13;lg.gain.value=28;l.connect(lg);lg.connect(buzzO.frequency);l.start();
    const fl=ac.createBiquadFilter();fl.type="bandpass";fl.frequency.value=900;buzzG=ac.createGain();buzzG.gain.value=0.0001;buzzO.connect(fl);fl.connect(buzzG);buzzG.connect(out);buzzO.start();buzzO._l=l}
  if(buzzG)buzzG.gain.setTargetAtTime(on?vol:0.0001,t,0.08);if(!on&&buzzO){const o=buzzO;buzzO=null;setTimeout(()=>{try{o.stop();o._l.stop()}catch{}},400)}}

/* ================= 夜班配樂：蒸汽龐克＋緊張感（全部即時合成） =================
   D 小調。活塞低音（鋸齒波過低通）、汽缸重拍、鐵砧敲擊、蒸汽洩壓、懷錶滴答，
   加上一段蒸汽風琴（calliope）旋律。剩最後 12 秒會加速、濾波打開、加十六分音符警報。 */
const MUS={on:false,next:0,step:0,g:null,lp:null};
const mf=n=>440*Math.pow(2,(n-69)/12);
// 每小節的低音根音（MIDI）：D D B♭ A
const MBASS=[38,38,34,33],MCHUG=[1,0,1,1, 1,0,1,0, 1,0,1,1, 1,0,1,1],MOCT=[0,0,0,12, 0,0,0,0, 0,0,12,0, 0,0,0,7];
// 蒸汽風琴旋律（八分音符，0＝休止），D 和聲小調
const MLEAD=[69,0,74,0,77,76,74,73, 74,0,69,0,70,0,69,0, 69,0,74,0,77,79,81,0, 82,81,79,77,76,0,73,0];
function mOsc(f,t,dur,type,vol,dest,to,det=0){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.detune.value=det;if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+0.02)}
function mNoise(t,dur,vol,type,f,q=1,to,att=0.003){const s=ac.createBufferSource(),fl=ac.createBiquadFilter(),g=ac.createGain();s.buffer=nb;fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+dur);fl.Q.value=q;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(MUS.g);s.start(t,Math.random()*0.5);s.stop(t+dur+0.02)}
function mStep(i,t,ten,s16){const st=i%16,bar=Math.floor(i/16)%4,root=MBASS[bar],G1=MUS.g,dark=G.mod==="blackout";
  // 活塞低音
  if(MCHUG[st]){mOsc(mf(root+MOCT[st]),t,s16*0.9,"sawtooth",0.065,MUS.lp,null,st%2?6:-6);mOsc(mf(root+12+MOCT[st]),t,s16*0.7,"square",0.06,MUS.lp)}
  // 汽缸重拍（第 1、9 格；緊張時多兩下）
  if(st===0||st===8||(ten>0.3&&(st===6||st===14))){mOsc(130,t,0.16,"sine",0.22,G1,45);mNoise(t,0.015,0.2,"lowpass",2800)}
  // 鐵砧／齒輪敲擊（第 5、13 格）：兩個不和諧方波＋高頻噪音
  if(st===4||st===12){mOsc(1170,t,0.09,"square",0.05,G1);mOsc(1637,t,0.07,"square",0.035,G1);mOsc(587,t,0.12,"triangle",0.06,G1);mNoise(t,0.06,0.24,"highpass",3500,1)}
  // 蒸汽洩壓（每小節最後）
  if(st===14&&bar%2===1)mNoise(t,s16*3.5,0.12,"bandpass",3800,0.7,7500,0.08);
  // 懷錶滴答（八分音符，滴／答）
  if(st%2===0)mNoise(t,0.018,0.12,"highpass",st%4?2600:4200,4);
  // 最後幾秒：十六分音符警報＋高音持續
  if(ten>0.45&&st%2===1)mNoise(t,0.015,0.09,"highpass",5200,6);
  if(ten>0.6&&st%4===0)mOsc(mf(81),t,s16*1.6,"square",0.022,G1);
  // 蒸汽風琴：後兩小節出現（停電夜少一點）
  if(bar>=2&&st%2===0&&!(dark&&bar===2)){const n=MLEAD[(bar-2)*16+st];if(n){const f=mf(n+(ten>0.6?12:0));mOsc(f,t,s16*1.7,"square",0.05,G1,null,-8);mOsc(f,t,s16*1.7,"triangle",0.06,G1,null,8);mOsc(f*2,t,s16*0.6,"sine",0.012,G1)}}}
/* 白班配樂：G 大調、每分鐘 128 拍的晶片風工坊進行曲（和弦 G–D–Em–C）。
   為了手機喇叭也聽得到：低音放在 98／196 Hz 八度跳、旋律用明亮的 25% 方波，
   加上大鼓、小鼓、腳踏鈸、反拍和弦切音，每四小節尾巴敲一下鐵砧。
   兩段旋律輪流（A／B），最後 8 秒加十六分琶音、再快一點。 */
const DROOT=[43,38,40,36],DTRI=[[0,4,7],[0,4,7],[0,3,7],[0,4,7]];
const DLEAD=[[79,0,79,81,83,0,79,0, 78,0,78,79,81,0,74,0, 76,0,76,78,79,0,83,0, 81,79,76,74,76,0,0,0],
             [83,0,86,0,83,81,79,0, 81,0,78,0,74,0,78,81, 79,0,83,0,79,78,76,0, 72,74,76,79,78,0,74,0]];
function mPulse(f,t,dur,vol,dest,det=0){if(!MUS.pw){const n=24,re=new Float32Array(n),im=new Float32Array(n);for(let k=1;k<n;k++)re[k]=2/(k*Math.PI)*Math.sin(k*Math.PI*0.25);MUS.pw=ac.createPeriodicWave(re,im)}
  const o=ac.createOscillator(),g=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain();o.setPeriodicWave(MUS.pw);o.frequency.setValueAtTime(f,t);o.detune.value=det;
  l.frequency.value=5.5;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*0.008,t+dur*0.6);l.connect(lg);lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.008);g.gain.setValueAtTime(vol*0.8,t+dur*0.5);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(dest);o.start(t);l.start(t);o.stop(t+dur+0.02);l.stop(t+dur+0.02)}
function dStep(i,t,ten,s16){const st=i%16,bar=Math.floor(i/16)%4,loop=Math.floor(i/64),root=DROOT[bar],tri=DTRI[bar],G1=MUS.g;
  // 鼓：大鼓 1、3 拍（第 3 小節多一下），小鼓 2、4 拍，腳踏鈸八分
  if(st===0||st===8||(bar===2&&st===10)){mOsc(150,t,0.12,"sine",0.3,G1,55);mNoise(t,0.015,0.18,"lowpass",3200)}
  if(st===4||st===12){mNoise(t,0.12,0.4,"bandpass",1900,0.8);mOsc(220,t,0.07,"triangle",0.14,G1,150)}
  if(st%2===0)mNoise(t,0.025,st%4?0.08:0.05,"highpass",7800,1);
  // 低音：八度跳（98／196 Hz 一帶，手機喇叭聽得到）
  if(st%2===0)mOsc(mf(root+(st%4?12:0)),t,s16*1.6,"square",0.05,G1);
  // 反拍和弦切音
  if(st%4===2)tri.forEach(k=>mOsc(mf(root+24+k),t,0.06,"square",0.018,G1));
  // 主旋律（A、B 段輪流）
  if(st%2===0){const n=DLEAD[loop%2][bar*8+st/2];if(n){let len=1;while(len<4&&(bar*8+st/2+len)%32&&!DLEAD[loop%2][bar*8+st/2+len]&&(st/2+len)<8)len++;
    mPulse(mf(n),t,s16*2*len*0.92,0.1,G1);mPulse(mf(n),t,s16*2*len*0.92,0.035,G1,7)}}
  // 每四小節尾巴：鐵砧「叮」
  if(bar===3&&st===14){mOsc(2100,t,0.35,"sine",0.06,G1);mOsc(3170,t,0.25,"sine",0.03,G1)}
  // 最後幾秒：十六分琶音
  if(ten>0.35){const k=tri[st%3];mOsc(mf(root+36+k),t,s16*0.8,"square",0.014,G1)}}
function musicTick(){if(!ac||!out)return;const t=ac.currentTime,night=mode==="night",day=mode==="day";
  const want=live()&&!paused&&(night||day)?mode:null;
  if(!MUS.g){MUS.g=ac.createGain();MUS.g.gain.value=0.0001;MUS.cp=ac.createDynamicsCompressor();MUS.cp.threshold.value=-20;MUS.cp.ratio.value=4;MUS.cp.attack.value=0.004;MUS.cp.release.value=0.15;MUS.g.connect(MUS.cp);MUS.cp.connect(out);MUS.lp=ac.createBiquadFilter();MUS.lp.type="lowpass";MUS.lp.Q.value=6;MUS.lp.connect(MUS.g)}
  if(want!==MUS.on){MUS.on=want;MUS.g.gain.cancelScheduledValues(t);MUS.g.gain.setTargetAtTime(want?(night?1.25:1.3):0.0001,t,want?0.4:0.12);if(want){MUS.next=t+0.08;MUS.step=0}}
  if(!want)return;
  if(MUS.next<t)MUS.next=t+0.02;
  if(night){const ten=clamp(1-(N.time-2)/12,0,1),bpm=112+ten*26+(G.mod==="rampage"?8:0),s16=60/bpm/4;
    MUS.lp.frequency.setTargetAtTime(900+ten*1600,t,0.3);
    while(MUS.next<t+0.16){mStep(MUS.step,MUS.next,ten,s16);MUS.next+=s16;MUS.step++}}
  else{const ten=clamp(1-(D.t-1)/8,0,1),s16=60/(128+ten*12)/4;
    while(MUS.next<t+0.16){dStep(MUS.step,MUS.next,ten,s16);MUS.next+=s16;MUS.step++}}}
function soundLabel(){const b=$("audio");b.setAttribute("aria-pressed",String(soundOn));b.querySelector("span").textContent=soundOn?"音效開":"音效關";icon(b.querySelector("i"),soundOn?"sound":"mute")}
$("audio").onclick=()=>{soundOn=!soundOn;save("nail-panic.sound",soundOn?"1":"0");soundLabel();unlock();if(!soundOn)buzz(false);tone(660,0.1)};soundLabel();

/* ================= state ================= */
let mode="home",paused=false,last=0,raf=0,modal="";
const G={day:1,score:0,lives:3,maxLives:3,perks:{},mod:null,nextMod:null,sw:{index:1,thumb:1},dayNails:0,perfects:0,baits:0,dodges:0,flies:0,combo:0,bestCombo:0,nightNails:0};
const D={hand:new V3(0.4,0,1),prev:new V3(),vel:new V3(),nail:null,alive:false,popT:1,respawn:0,placed:[],t:DAY_T,today:0,streak:0,ending:false,hurt:0,react:0,bent:0,good:0,perfect:0};
const S={st:"idle",t:0,kind:"n",aimD:1,windD:0.5,strD:0.15,recD:0.4,gapD:0.3,wob:0,ph:[0,0],base:new V3(),aim:new V3(),hover:new V3(0.6,HEADY,-0.6),lock:new V3(),cur:new V3(),from:new V3(),to:new V3(),curve:false,sneeze:false,sn:0,pendingDbl:false,sinceFly:0,a:0,lift:1.5,a0:0};
const N={aim:new V3(0,0,0.7),time:NIGHT_T,stun:0,swing:0,at:new V3(),hitDone:true,nails:[],cleared:0,lastTick:99,wob:0};
const M={phase:"off",el:0,wait:1.3,x:0,z:0,mx:0,my:9,mz:-0.8};
const X={handOut:0,hamIn:0,masterOut:0,t:0,dropped:null};
let tipText="",tipTime=0,tipHot=false,sayT=0,lineAt=-1;

const pk=k=>G.perks[k]||0,prog=()=>G.dayNails+(G.day-1)*3+DIFFS[diff].off+(G.mod==="drunk"?7:0),nightBase=()=>NIGHT_T+DIFFS[diff].night+6*pk("coffee");
const gain=p=>{p=Math.round(p*DIFFS[diff].mult*(1+0.2*pk("bonus"))*(G.mod?MODS[G.mod].mult:1));G.score+=p;return p};
const sysMod=()=>G.mod?"｜"+MODS[G.mod].name:"";
function P(){const n=prog();return{aim:Math.max(0.55,1.4-n*0.03),wind:Math.max(0.22,0.55-n*0.01),strike:Math.max(0.085,0.15-n*0.002),rec:Math.max(0.22,0.42-n*0.006),gap:Math.max(0.1,0.35-n*0.008),dist:Math.min(1.9,Math.max(0.3,0.45+n*0.06)),
  wob:Math.max(G.mod==="drunk"?0.24:0,n>=6?Math.min(0.42,0.12+(n-6)*0.015):0),curve:n>=12?Math.min(0.42,0.2+(n-12)*0.012):0,sneeze:n>=18?Math.min(0.28,0.14+(n-18)*0.01):0,dbl:n>=24?Math.min(0.32,0.16+(n-24)*0.01):0,fly:G.mod==="flies"?0.4:n>=5?0.13:0,lead:Math.min(0.45,0.15+n*0.006)}}
const randDir=(a,b)=>{const t=Math.random()*Math.PI*2,d=rand(a,b);return new V3(Math.cos(t)*d,0,Math.sin(t)*d)};
const inCircle=(p,r)=>{const l=Math.hypot(p.x,p.z);if(l>r){p.x*=r/l;p.z*=r/l}return p};
function chooseTarget(from,a,b){let bp=null,bd=-1;for(let i=0;i<12;i++){const p=inCircle(from.clone().add(randDir(a,b)),TGT_R);p.y=0;let md=9;for(const n of D.placed)md=Math.min(md,Math.hypot(n.x-p.x,n.z-p.z));if(md>0.42)return p;if(md>bd){bd=md;bp=p}}return bp}
const flyLand=()=>new V3(D.hand.x+IDX[1].x,PY+IDX[1].y+0.07*G.sw.index+0.06,D.hand.z+IDX[1].z);

/* ================= UI helpers ================= */
function say(t,d=1.6){bubble.textContent=t;bubble.classList.add("on");sayT=d}
function tip(t,ttl=1.3,hot=false){tipText=t;tipTime=ttl;tipHot=hot}
function scr(v){const p=v.clone().project(camera);return{x:(p.x+1)/2*cw,y:(1-p.y)/2*ch}}
function pop(text,cls,w){const s=scr(w),d=document.createElement("div");d.className="pop "+cls;d.textContent=text;d.style.left=clamp(s.x,60,cw-60)+"px";d.style.top=clamp(s.y,50,ch-30)+"px";fx.appendChild(d);setTimeout(()=>d.remove(),1000)}
function flash(cold){const d=document.createElement("div");d.className="flash"+(cold?" cold-flash":"");fx.appendChild(d);setTimeout(()=>d.remove(),520)}
const announce=m=>{$("announcer").textContent=m};
function livesUI(){$("lives").innerHTML=Array.from({length:G.maxLives},(_,i)=>i).map(i=>`<i class="${i<G.lives?"":"lost"}">${PixelArt.icon("bandage")}</i>`).join("")}
function setWave(){const night=mode==="night"||mode==="handover";icon($("waveIcon"),night?"moon":"sun");$("waveText").textContent=`第 ${G.day} 天・${night?"夜班":"白班"}`;
  $("timeLabel").textContent=night?"夜班剩餘":"白班剩餘";$("targetLabel").textContent=night?"待敲釘數":"今日扶好";$("countUnit").textContent="根";$("modeTag").textContent=night?"NIGHT SHIFT":"DAY SHIFT"}
const display=(el,v)=>{if(el.textContent!==v)el.textContent=v};
function renderUI(){
  const night=mode==="night",ho=mode==="handover";display($("timer"),String(Math.ceil(Math.max(0,night?N.time:mode==="day"?D.t:ho?nightBase():0))).padStart(2,"0"));
  display($("count"),String(night?N.nails.filter(n=>n.hp>0).length:ho?D.good+D.bent+nightPlan().fresh+nightPlan().heavy:D.today).padStart(2,"0"));display($("score"),String(G.score).padStart(4,"0"));display($("record"),String(Math.max(best,G.score)).padStart(4,"0"));
  let msg=tipTime>0?tipText:"",hot=tipHot&&tipTime>0;
  if(night&&N.stun<=0){if(M.phase==="track"){msg="黃圈追蹤中：把它帶到歪釘上";hot=true}else if(M.phase==="lock"||M.phase==="slam"){msg="紅圈鎖定！快閃開！";hot=true}}
  if(mode==="day"&&!msg){if(S.st==="wind"||S.st==="strike"){msg=S.kind==="fly"?"現在閃！":ghost.visible?"黃圈才是落點！追過去接，或閃開":"紅圈＝要落鎚了！";hot=true}else if(S.st==="aim"&&S.kind==="fly"){msg="蒼蠅！等圓圈變紅再閃";hot=true}}
  if(!msg)msg=night?"拖曳移槌，放開敲擊":mode==="day"?"把釘子送到圓圈正中央・小心手指":"交班中…";
  display($("hint"),msg);$("hint").classList.toggle("hot",hot);document.body.classList.toggle("danger",night&&N.time<9)}

/* ================= day shift: hold the nail ================= */
function spawnNail(){D.nail=makeNail(G.mod==="gold"?gold:steel);D.nail.scale.setScalar(0.01);D.popT=0;D.alive=true;SFX.pop()}
function leaveNail(kind,dx,dz){const n=D.nail;D.nail=null;D.alive=false;D.respawn=S.pendingDbl?0.1:0.3;n.scale.setScalar(1);n.position.set(D.hand.x,0,D.hand.z);
  if(kind==="perfect")n.position.y=-(NL-0.02);else if(kind==="good"){n.position.y=-(NL-0.02)*0.8;n.rotation.set(rand(-0.06,0.06),0,rand(-0.06,0.06))}
  else{const l=Math.hypot(dx,dz)||1;n.position.y=-0.22;n.rotation.set(dz/l*0.95,0,-dx/l*0.95)}
  D.placed.push({mesh:n,kind,x:D.hand.x,z:D.hand.z})}
function segD(px,pz,a,b){const ax=b.x-a.x,az=b.z-a.z,t=clamp(((px-a.x)*ax+(pz-a.z)*az)/(ax*ax+az*az),0,1);return Math.hypot(px-(a.x+ax*t),pz-(a.z+az*t))}
function bodyHit(tx,tz){const lx=tx-D.hand.x,lz=tz-D.hand.z;let b=null;const chk=(pts,r,name)=>{for(let i=0;i<pts.length-1;i++){const pen=R+r-segD(lx,lz,pts[i],pts[i+1]);if(pen>0&&(!b||pen>b.pen))b={name,pen}}};
  chk(IDX,0.07*G.sw.index,"index");chk(THB,0.078*G.sw.thumb,"thumb");chk(ARM,0.17,"arm");const pp=R+0.3-Math.hypot(lx-PALM.x,lz-PALM.z);if(pp>0&&(!b||pp>b.pen))b={name:"palm",pen:pp};return b}
function judge(tx,tz){if(D.alive&&D.popT>0.6){const d=Math.hypot(tx-D.hand.x,tz-D.hand.z);if(d<CONTACT)return{type:d<PERF?"perfect":d<GOODR+0.03*Math.min(2,pk("lens"))?"good":"bent"}}const b=bodyHit(tx,tz);return b?{type:"ouch",b}:{type:"miss"}}
function contactY(tx,tz){const j=judge(tx,tz);return j.type==="ouch"?PY+(j.b.name==="arm"?0.25:0.1):j.type==="miss"?0:HEADY}
function combo(){G.combo++;G.bestCombo=Math.max(G.bestCombo,G.combo);return Math.min(G.combo-1,6)*15}
function dayImpact(){
  const tx=S.cur.x,tz=S.cur.z,j=judge(tx,tz),isFly=S.kind==="fly",hp=new V3(tx,S.cur.y,tz),p=P(),up=new V3(tx,1.3,tz);
  S.pendingDbl=!isFly&&S.kind!=="dbl"&&Math.random()<p.dbl;
  const sp=!isFly&&S.curve?(S.sn===3?"sneeze":"slip"):null;
  if(j.type==="perfect"||j.type==="good"){const pf=j.type==="perfect",pts=gain(((pf?150:80)+combo())*(G.mod==="gold"?2:1)*(sp?2:1));G.dayNails++;D.today++;pf?(G.perfects++,D.perfect++,D.streak++):(D.good++,D.streak=0);
    leaveNail(j.type);pf?SFX.perfect():SFX.good();burst(hp,["hot","hot2"],pf?16:9,pf?3.2:2.2,0.05,0.45,2.6);G.freeze=pf?0.09:0.06;G.shake=pf?0.12:0.08;
    pop(sp?(sp==="sneeze"?"接住噴嚏！+":"接住手滑！+")+pts:(isFly?"LUCKY ":pf?"PERFECT ":"HIT ")+"+"+pts,sp?"gold zh":pf?"gold":"hit",up);
    if(sp){say(sp==="sneeze"?"…你居然接得住？OK 繃給你。":"喔！反應不錯嘛！",1.6);if(sp==="sneeze"&&G.lives<G.maxLives){G.lives++;SFX.heal();livesUI()}}
    if(pf&&D.streak%5===0){if(G.lives<G.maxLives){G.lives++;SFX.heal();livesUI();say("手很穩嘛，OK 繃還你一片。",2)}else if(D.streak===5)say("喔～手很穩嘛！",1.4)}levelLine()}
  else if(j.type==="bent"){G.combo=0;D.streak=0;D.bent++;leaveNail("bent",D.hand.x-tx,D.hand.z-tz);SFX.bent();burst(hp,["hot"],5,1.6,0.04,0.3,1.5);G.shake=0.06;G.freeze=0.05;
    pop("BENT","grey",up);say(pick(pk("lens")&&Math.random()<0.6?PERK_LINES.lens.bent:["嘖，歪了。晚上記得處理。","歪了！夜班自己收拾喔。","這根歪了，留給晚上的你。"]),1.6)}
  else if(j.type==="miss"){SFX.thud();dent(tx,tz);burst(new V3(tx,0.02,tz),["chip"],8,1.6,0.06,0.5,1.8);G.shake=0.1;G.freeze=0.05;
    if(isFly){G.flies++;pop("DODGE +"+gain(30),"mint",up);say(pick(["嘖，飛走了。","蒼蠅跑得真快…"]),1.2)}else{G.combo=0;D.streak=0;pop("MISS","grey",up);if(Math.random()<0.45)say(pick(["咦？釘子呢？","你跑去哪了？","慢吞吞的！"]),1.2)}}
  else if(D.shield>0){D.shield--;G.combo=0;SFX.clank();G.shake=0.15;G.freeze=0.06;burst(hp,["cold2"],8,2,0.05,0.35);pop("指套擋住！","mint zh",up);say("…好險有指套。",1.4)}
  else{const nm=j.b.name;D.hurtToday++;G.lives--;G.combo=0;D.streak=0;SFX.ouch();flash();G.shake=0.35;G.freeze=0.13;D.hurt=0.7;D.react=1.4;
    if(nm==="index"||nm==="thumb")G.sw[nm]=Math.min(1.9,G.sw[nm]+0.42);else{G.sw.index=Math.min(1.9,G.sw.index+0.18);G.sw.thumb=Math.min(1.9,G.sw.thumb+0.18)}
    buildFingers();starRing();livesUI();pop({index:"食指！！",thumb:"大拇指！！",palm:"手背！！",arm:"手臂！！"}[nm],"red zh",up);try{navigator.vibrate&&navigator.vibrate(90)}catch{}
    if(G.lives<=0)gameOver("hurt");else say(pick(["啊！抱歉抱歉…","哎呀！手放哪啦！","不痛不痛，吹一下就好。","…晚上握槌會抖喔。"]),1.6)}}
function levelLine(){const n=prog(),T={6:"老了…手開始有點抖。",12:"越敲越順手了！看好喔！",18:"鼻子…有點癢…",24:"來點節奏！連敲！"};if(T[n]&&lineAt!==n){lineAt=n;setTimeout(()=>say(T[n],2),350)}}
function newSwing(){const p=P();S.t=0;S.curve=false;S.sneeze=false;S.sn=0;S.wob=0;S.ph=[rand(0,6),rand(0,6)];
  if(S.pendingDbl){S.pendingDbl=false;S.kind="dbl";S.aimD=0.38;S.windD=0.16;S.strD=p.strike;S.base.copy(chooseTarget(S.lock,0.45,0.9));say("再一下！",0.7)}
  else if(p.fly&&S.sinceFly>(G.mod==="flies"?0:2)&&Math.random()<p.fly){S.kind="fly";S.sinceFly=0;S.aimD=1.35;S.windD=Math.max(0.2,0.42-G.dayNails*0.004);S.strD=0.1;S.aim.set(D.hand.x,0,D.hand.z);
    F.on=true;F.ph="in";F.t=0;F.from.set(rand(-3,3),2.4,-2.8);F.pos.copy(F.from);fly.visible=true;buzz(true,0.05);say("有蒼蠅！別動喔～",1.5)}
  else{if(sayT<=0&&Math.random()<0.07)perkChat();S.kind="n";S.sinceFly++;S.aimD=p.aim;S.windD=p.wind;S.strD=p.strike;S.wob=p.wob;S.base.copy(chooseTarget(new V3(D.hand.x,0,D.hand.z),p.dist*0.5,p.dist));S.sneeze=Math.random()<p.sneeze;if(!S.sneeze)S.curve=Math.random()<p.curve}
  S.st="aim"}
function lockNow(){if(S.kind==="fly"){const ld=D.vel.clone().multiplyScalar(P().lead);if(ld.length()>0.9)ld.setLength(0.9);const fl=flyLand();S.lock.set(fl.x+ld.x,0,fl.z+ld.z);inCircle(S.lock,TGT_R);F.ph="out";F.t=0;F.vel.set(rand(-1.5,1.5),2.6,rand(-1.6,-0.4));buzz(true,0.08)}
  else{S.lock.set(S.aim.x,0,S.aim.z);S.to.copy(S.lock);
    if(S.sneeze)S.to.copy(chooseTarget(S.lock,0.6,1.1));
    else if(S.curve){S.to.copy(chooseTarget(S.lock,0.45,0.8));say("唔…手好滑…",0.9);firstTip("slip")}}
  S.st="wind";S.t=0;SFX.whoosh(S.windD+0.1,250,1200)}
// 手滑／噴嚏：真正落點提早亮黃圈。原本的紅圈變灰，表示不會打在那裡。
const seenTip=new Set();function firstTip(k){if(seenTip.has(k))return;seenTip.add(k);tip(k==="slip"?"手滑了！黃圈才是真正落點：追過去接住分數加倍，來不及就閃開":"要打噴嚏了！黃圈是噴嚏落點：接住加倍再回一片 OK 繃，或趕快閃",2.6,true)}
function showGhost(){const on=(S.curve&&!S.sneeze)||(S.sneeze&&S.sn>0);ghost.visible=on;if(on){tint(ghost,0xffc83d);ghost.position.set(S.to.x,0.02,S.to.z);ghost.scale.setScalar(1+Math.sin(S.t*16)*0.08)}return on}
function masterStep(dt){S.t+=dt;const p=P();
  switch(S.st){
  case "gap":if(X.masterOut>0.03){S.hover.x=master.position.x+0.6;S.hover.z=-1.2}S.a=lerp(S.a,0,damp(8,dt));S.lift=lerp(S.lift,1.5,damp(8,dt));poseHammer(hamM,FM,YM,S.hover,S.a,S.lift);
    if(S.t>=S.gapD&&mode==="day"&&X.masterOut<0.06){if(D.ending){beginHandover();break}if(D.alive&&D.popT>=1)newSwing()}break;
  case "aim":{if(S.kind==="fly"){if(F.ph==="land"){const fl=flyLand();S.aim.x=lerp(S.aim.x,fl.x,damp(7,dt));S.aim.z=lerp(S.aim.z,fl.z,damp(7,dt))}}
    else{const w=S.wob,t=S.t;S.aim.set(S.base.x+w*(Math.sin(t*7.1+S.ph[0])*0.65+Math.sin(t*12.7+S.ph[1])*0.35),0,S.base.z+w*(Math.cos(t*6.3+S.ph[1])*0.65+Math.sin(t*10.9+S.ph[0])*0.35));inCircle(S.aim,TGT_R)}
    S.hover.x=lerp(S.hover.x,S.aim.x,damp(9,dt));S.hover.z=lerp(S.hover.z,S.aim.z,damp(9,dt));S.hover.y=HEADY;S.a=lerp(S.a,0,damp(8,dt));S.lift=lerp(S.lift,1.5+Math.sin(S.t*3)*0.06,damp(8,dt));poseHammer(hamM,FM,YM,S.hover,S.a,S.lift);
    ring.visible=true;tint(ring,0xfff4dc);ring.position.set(S.aim.x,0.02,S.aim.z);ring.scale.setScalar(1+Math.sin(S.t*9)*0.05);if(S.t>=S.aimD)lockNow();break}
  case "wind":{const wd=S.windD,k=eOut(Math.min(1,S.t/wd));S.cur.set(lerp(S.hover.x,S.lock.x,k),HEADY,lerp(S.hover.z,S.lock.z,k));let a=lerp(0,-1.1,k);const lift=lerp(1.5,0.6,k);
    ring.visible=true;tint(ring,showGhost()?0x6f6a66:0xff4a3d);ring.position.set(S.lock.x,0.02,S.lock.z);ring.scale.setScalar(1);
    if(S.sneeze){if(S.t>wd&&S.sn===0){S.sn=1;say("哈…",0.6);firstTip("sneeze")}if(S.t>wd+0.55&&S.sn===1){S.sn=2;say("哈……",0.6)}if(S.sn>0){const q=S.t-wd;a+=Math.sin(q*9)*0.12-0.15*Math.min(1,q)}
      if(S.t>wd+1.05){S.sn=3;say("哈啾！！",0.9);SFX.sneeze();G.shake=0.12;S.from.copy(S.lock);S.lock.copy(S.to);S.curve=true;S.strD=0.32;S.st="strike";S.t=0;S.a0=a}}
    else if(S.t>=wd){S.from.copy(S.lock);if(S.curve){S.strD+=0.2;say("手滑！",0.7)}else S.to.copy(S.lock);S.st="strike";S.t=0;S.a0=a;SFX.whoosh(0.18,600,2600)}
    S.a=a;S.lift=lift;poseHammer(hamM,FM,YM,S.cur,a,lift);break}
  case "strike":{const k=Math.min(1,S.t/S.strD),m=S.curve?eOut(Math.min(1,k/0.72)):1;S.cur.x=lerp(S.from.x,S.to.x,m);S.cur.z=lerp(S.from.z,S.to.z,m);S.cur.y=contactY(S.cur.x,S.cur.z);
    S.a=lerp(S.a0,A_HIT,eIn(k));S.lift=lerp(0.6,0,eIn(k));poseHammer(hamM,FM,YM,S.cur,S.a,S.lift);ring.visible=true;ring.position.set(S.cur.x,0.02,S.cur.z);
    ghost.visible=S.curve;if(S.curve){tint(ghost,0xffc83d);ghost.position.set(S.to.x,0.02,S.to.z);ghost.scale.setScalar(1)}
    if(k>=1){ring.visible=ghost.visible=false;S.st="hit";S.t=0;S.lock.copy(S.to);dayImpact()}break}
  case "hit":poseHammer(hamM,FM,YM,S.cur,A_HIT,0);if(S.t>0.05){S.st="rec";S.t=0;S.recD=p.rec}break;
  case "rec":{const k=eOut(Math.min(1,S.t/S.recD));S.a=lerp(A_HIT,0,k);S.lift=lerp(0,1.5,k);S.hover.set(S.cur.x,HEADY,S.cur.z);poseHammer(hamM,FM,YM,new V3(S.cur.x,lerp(S.cur.y,HEADY,k),S.cur.z),S.a,S.lift);
    if(k>=1){S.st="gap";S.t=0;S.gapD=S.pendingDbl?0.04:p.gap}break}
  default:poseHammer(hamM,FM,YM,S.hover,S.a,S.lift)}}
function dayStep(dt){
  D.t=Math.max(0,D.t-dt);if(D.t<=0&&!D.ending){D.ending=true;tip("下班鈴響！這一槌是最後一槌",1.6,true)}
  if(!D.alive&&!D.ending){D.respawn-=dt;if(D.respawn<=0)spawnNail()}
  masterStep(dt)}

/* ================= handover: 白班 → 夜班 ================= */
function beginHandover(){mode="handover";X.t=0;ring.visible=ghost.visible=false;S.st="idle";if(F.on){F.on=false;fly.visible=false;buzz(false)}
  {const np=["heavy","lure","coffee","bonus"].filter(k=>pk(k));say(np.length?"收工！"+PERK_LINES[pick(np)].night:"收工！剩下的交給你了。",2.4)}SFX.bell();envTarget=1;screenEl.classList.add("night");screenEl.classList.toggle("blackout",G.mod==="blackout");setWave();$("sys").textContent="交班中";announce("交班：師傅下班，電磁怪醒了")}
function handoverStep(dt){X.t+=dt;const t=X.t;
  if(t>0.7&&D.nail&&!X.dropped){X.dropped=D.nail;D.nail=null;D.alive=false;X.dropped.userData.v=new V3(0.3,1.2,0.4)}
  if(X.dropped){const n=X.dropped,v=n.userData.v;v.y-=9*dt;n.position.addScaledVector(v,dt);n.rotation.z+=dt*6;if(n.position.y<-0.06){n.position.y=-0.06;v.set(0,0,0)}}
  X.handOut=clamp((t-0.9)/0.9,0,1);X.masterOut=clamp((t-1.0)/1.4,0,1);X.hamIn=clamp((t-1.8)/0.8,0,1);
  M.my=lerp(9,2.4,eOut(clamp((t-1.3)/1.4,0,1)));M.mx=lerp(M.mx,0,damp(3,dt));M.mz=-0.8;
  S.hover.set(master.position.x+0.6,HEADY,-1.5);poseHammer(hamM,FM,YM,S.hover,0,1.5);
  if(t>1.6&&t-dt<=1.6){SFX.lock();tip(G.mod==="blackout"?"停電了！只剩電磁怪和準星的光":G.mod==="rampage"?"電磁怪暴走中！牠今晚不休息":"電磁怪醒了！",1.4,true)}
  if(t>=3)startNight()}

/* ================= night shift: swing the hammer ================= */
function makeNightNail(x,z,kind,mesh){const max=kind==="heavy"?4:kind==="fresh"?2:1,d0=kind==="heavy"?0.08:kind==="fresh"?0.15:kind==="left"?0.8:0.25;
  if(!mesh){mesh=makeNail(kind==="heavy"?gold:steel);if(kind==="heavy")mesh.scale.set(1.35,1.08,1.35);mesh.position.set(x,0,z)}
  const n={x,z,kind,hp:max,max,d0,mesh,bent:kind==="bent",marker:null,bob:Math.random()*6};
  if(n.bent){n.marker=new THREE.Group();n.marker.add(flat(new THREE.RingGeometry(0.24,0.31,24),0x296b84,0.95),flat(new THREE.RingGeometry(0.26,0.29,24),0x7bf4f0,1));n.marker.position.set(x,0.03,z);scene.add(n.marker)}
  setDepth(n);N.nails.push(n);return n}
const depthOf=n=>1-(n.hp/n.max)*(1-n.d0);
function setDepth(n){if(n.bent&&n.hp>0)return;n.mesh.position.y=-depthOf(n)*(NL-0.02)}
const headTop=n=>n.bent&&n.hp>0?0.55:n.mesh.position.y+(NL+0.05)*n.mesh.scale.y;
function nearestNail(x,z){let item=null,d=Infinity;for(const n of N.nails){if(n.hp<=0)continue;const g=Math.hypot(x-n.x,z-n.z);if(g<d){item=n;d=g}}return{n:item,d}}
function nightPlan(){const lvl=Math.min(G.day-1,8);return{fresh:3+Math.floor(lvl/2)+(G.mod==="rush"?2:0),heavy:G.day>=6?3:G.day>=4?2:G.day>=2?1:0}}
function startNight(){mode="night";X.handOut=1;X.hamIn=1;X.masterOut=1;if(X.dropped){X.dropped.visible=false}
  N.nails.length=0;N.cleared=0;N.time=NIGHT_T;N.stun=0;N.swing=0;N.hitDone=true;N.lastTick=99;N.aim.set(0.3,0,0.8);
  for(const p of D.placed){if(p.kind==="good")makeNightNail(p.x,p.z,"left",p.mesh);else if(p.kind==="bent")makeNightNail(p.x,p.z,"bent",p.mesh)}
  const{fresh,heavy}=nightPlan();
  const spots=[...D.placed.map(p=>({x:p.x,z:p.z}))];const free=()=>{for(let i=0;i<40;i++){const p=inCircle(randDir(0.2,1.65),1.65);if(spots.every(s=>Math.hypot(s.x-p.x,s.z-p.z)>0.6)){spots.push({x:p.x,z:p.z});return p}}return inCircle(randDir(0.2,1.6),1.6)};
  for(let i=0;i<fresh;i++){const p=free();makeNightNail(p.x,p.z,"fresh")}for(let i=0;i<heavy;i++){const p=free();makeNightNail(p.x,p.z,"heavy")}
  N.wob=(G.sw.index+G.sw.thumb-2)*0.08;const nb=N.nails.filter(n=>n.bent).length;N.time=nightBase()+Math.round(nb*1.5);
  M.phase="rest";M.el=0;M.wait=1.4;setWave();$("sys").textContent="夜班中"+sysMod();
  const bent=nb;
  tip(bent?`白班留下 ${bent} 根歪釘（加班 +${Math.round(bent*1.5)} 秒）：自己敲不動，引電磁怪來敲！`:"拖曳移槌，放開敲擊。正中釘心兩倍力！",2.8,!!bent);
  if(N.wob>0)setTimeout(()=>{if(mode==="night")tip("手指還腫著…握槌會晃",1.8,true)},3000);
  announce(`第 ${G.day} 天夜班開始，待敲 ${N.nails.length} 根`)}
function aimPoint(){const t=performance.now()/1000,w=N.wob;return new V3(N.aim.x+w*(Math.sin(t*5.3)+0.5*Math.sin(t*9.1)),0,N.aim.z+w*(Math.cos(t*4.4)+0.5*Math.sin(t*8.3)))}
function strike(){if(mode!=="night"||paused||N.stun>0||N.swing>0)return;N.swing=SW_T;N.at.copy(aimPoint());N.hitDone=false}
function strikeResolve(){const{n,d}=nearestNail(N.at.x,N.at.z),at=new V3(N.at.x,1.1,N.at.z);
  if(!n||d>0.34){SFX.tap();G.combo=0;pop("MISS","grey",at);dent(N.at.x,N.at.z);tip("敲空了，準星要對著釘頭",0.9);return}
  if(n.bent){SFX.clank();burst(new V3(n.x,0.5,n.z),["cold","cold2"],6,1.4,0.04,0.3);pop("LOCKED","cold",at);tip("歪釘敲不動！把黃圈帶過來，紅圈時閃開",1.6,true);return}
  scoreNight(n,d<=0.12?"perfect":"hit")}
function scoreNight(n,kind){const bait=kind==="bait",pf=kind==="perfect",pts=gain(((bait?220:pf?150:55)+combo())*(bait&&G.mod==="rampage"?2:1));if(pf)G.perfects++;if(bait)G.baits++;
  n.hp=Math.max(0,n.hp-(bait?99:(pf?2:1)+pk("heavy")));
  if(n.bent&&n.hp<=0){n.mesh.rotation.set(0,0,0);if(n.marker){scene.remove(n.marker);n.marker=null}}
  if(n.hp<=0){n.mesh.position.y=-(NL-0.02)+(n.kind==="heavy"?0.05:0);N.cleared++;G.nightNails++}else setDepth(n);
  const p=new V3(n.x,headTop(n),n.z);burst(p,bait?["cold","cold2"]:["hot","hot2"],bait?16:pf?14:8,bait?3:2.4,0.05,0.45,2.4);G.shake=bait?0.3:pf?0.18:0.1;G.freeze=bait?0.08:0.05;
  pop((bait?"BAIT ":pf?"PERFECT ":"HIT ")+"+"+pts,bait?"cold":pf?"gold":"hit",new V3(n.x,1.3,n.z));
  if(bait){SFX.bait();tip("借力打釘！電磁怪替你敲了一根",1.5)}else if(pf){SFX.nperfect();tip("正中釘心！　連擊 ×"+G.combo,0.85)}else{SFX.nail();tip(n.hp>0?"敲中了！再補一槌":"敲進去了！",0.8)}
  if(N.nails.every(i=>i.hp<=0))nightClear()}
function magnetImpact(){G.shake=0.27;M.sq=1;const at=new V3(M.x,0.05,M.z);burst(at,["cold","cold2"],12,2.6,0.05,0.4,2);
  const ap=aimPoint();if(Math.hypot(M.x-ap.x,M.z-ap.z)<0.45){N.time=Math.max(0,N.time-4);N.stun=0.48;G.combo=0;SFX.caught();flash(true);pop("CAUGHT -4s","red",new V3(M.x,1.3,M.z));tip("被吸住了！扣四秒",1.45,true);return}
  const hits=N.nails.filter(n=>n.hp>0&&Math.hypot(n.x-M.x,n.z-M.z)<=0.5+0.2*Math.min(2,pk("lure")));if(hits.length){hits.forEach(n=>scoreNight(n,"bait"));if(hits.length>1){const b=gain(100*(hits.length-1));pop(`×${hits.length} BAIT +${b}`,"cold",new V3(M.x,1.9,M.z))}return}
  G.dodges++;SFX.nail();pop("DODGE +"+gain(30),"mint",new V3(M.x,1.3,M.z));tip("閃過了！躲開電磁怪 +30",1)}
function magnetStep(dt){M.el+=dt;const lvl=clamp(G.day-1+DIFFS[diff].mag,-1,5.5);
  if(M.phase==="rest"){if(M.el>=M.wait){M.phase="track";M.el=0;const a=aimPoint();M.x=a.x;M.z=a.z}return}
  if(M.phase==="track"){const a=aimPoint();M.x=a.x;M.z=a.z;if(M.el>=1.05-lvl*0.07){M.phase="lock";M.el=0;SFX.lock()}return}
  if(M.phase==="lock"){if(M.el>=0.86-lvl*0.08){M.phase="slam";M.el=0;SFX.mdrop()}return}
  if(M.phase==="slam"){if(M.el>=0.19){M.phase="recover";M.el=0;SFX.mslam();SFX.mrise();magnetImpact()}return}
  if(M.phase==="recover"&&M.el>=0.56){M.phase="rest";M.el=0;M.wait=G.mod==="rampage"?0.15:1.2-lvl*0.12+Math.random()*0.42}}
function nightStep(dt){
  N.time=Math.max(0,N.time-dt);const left=Math.ceil(N.time);if(left<=8&&left<N.lastTick)tone(left<=3?790:480,0.07,"triangle",0.06);N.lastTick=left;
  if(N.time<=0){gameOver("night");return}
  N.stun=Math.max(0,N.stun-dt);
  if(N.swing>0){N.swing=Math.max(0,N.swing-dt);if(!N.hitDone&&N.swing<=SW_T*0.5){N.hitDone=true;strikeResolve()}}
  magnetStep(dt)}
function nightClear(){if(mode!=="night")return;mode="dayend";const bonus=gain(Math.floor(N.time)*20);SFX.bell();M.phase="off";magRing.visible=false;
  setTimeout(()=>dayEndDialog(bonus),700)}

/* ================= flow ================= */
function clearBoard(){for(const p of D.placed)scene.remove(p.mesh);D.placed.length=0;for(const n of N.nails){scene.remove(n.mesh);if(n.marker)scene.remove(n.marker)}N.nails.length=0;
  dents.forEach(d=>scene.remove(d));dents.length=0;if(X.dropped){scene.remove(X.dropped);X.dropped=null}if(D.nail){scene.remove(D.nail);D.nail=null}}
function startRun(){closeDialog();unlock();Object.assign(G,{day:1,score:0,lives:DIFFS[diff].lives,maxLives:DIFFS[diff].lives,perks:{},mod:null,nextMod:null,sw:{index:1,thumb:1},dayNails:0,perfects:0,baits:0,dodges:0,flies:0,combo:0,bestCombo:0,nightNails:0,shake:0,freeze:0});G.lastPerk=null;perkLooks();
  buildFingers();livesUI();lineAt=-1;
  $("home").hidden=true;canvas.hidden=false;$("livebar").hidden=false;$("hint").hidden=false;document.body.classList.add("playing");resize();
  X.handOut=1;X.masterOut=1;X.hamIn=0;master.position.x=6.5;M.my=9;startDay(true);canvas.focus({preventScroll:true});resume()}
function startDay(first){mode="day";G.mod=first?null:G.nextMod;clearBoard();envTarget=0;screenEl.classList.remove("night","blackout");M.phase="off";magRing.visible=ret.visible=false;
  Object.assign(D,{t:G.mod==="rush"?22:DAY_T,shield:pk("thimble"),hurtToday:0,today:0,streak:0,ending:false,hurt:0,react:0,bent:0,good:0,perfect:0,respawn:0});D.hand.set(0.4,0,1);D.prev.copy(D.hand);D.vel.set(0,0,0);
  spawnNail();S.st="gap";S.t=first?-1.0:-1.6;S.gapD=0.3;S.pendingDbl=false;S.sinceFly=0;S.hover.set(0.6,HEADY,-0.6);
  setWave();$("sys").textContent="白班中"+sysMod();const lp=!first&&G.lastPerk?PERK_LINES[G.lastPerk]:null;G.lastPerk=null;
  say(first?"新來的？釘子扶好，我來敲。":lp?(lp===PERK_LINES.lens&&pk("lens")>1?lp.two:lp.pick):pick(["早！今天也麻煩你了。","昨晚辛苦啦，今天繼續！","手還好吧？來，扶好。"]),2.6);
  if(G.mod)tip(`今日工單：${MODS[G.mod].name}｜${modDesc(G.mod)}`,3.6,true);else tip(first?"拖曳畫面任何地方移動手，把釘子送到圓圈中心":"白班開始！敲歪的釘子晚上要自己處理",2.6);if(!first)SFX.bell();announce(`第 ${G.day} 天白班開始`)}
function row(a,b){return"<div><span>"+a+"</span><b>"+b+"</b></div>"}
function applyPerk(k){G.perks[k]=pk(k)+1;G.lastPerk=k;if(k==="glove"){if(G.lives>=G.maxLives)G.maxLives++;G.lives++}if(k==="ice")G.sw={index:1,thumb:1};buildFingers();livesUI();perkLooks(k)}
function dayEndDialog(bonus){
  const g=D.hurtToday===0&&D.bent===0&&N.time>=12?"S":D.hurtToday===0&&D.bent<=1?"A":D.hurtToday<=1&&D.bent<=3?"B":"C",gb=g==="S"?gain(400):g==="A"?gain(150):0;
  if(G.score>best){best=G.score;save("nail-shift.best",String(best))}renderUI();
  G.nextMod=Math.random()<Math.min(0.9,0.45+G.day*0.1)?pick(Object.keys(MODS).filter(k=>k!==G.mod)):null;
  const pool=Object.keys(PERKS).filter(k=>k==="ice"?G.sw.index+G.sw.thumb>2.05:k==="glove"?G.lives<G.maxLives||G.maxLives<5:["lens","lure","thimble"].includes(k)?pk(k)<2:true).sort(()=>Math.random()-0.5).slice(0,3);
  showDialog("SHIFT CLEAR",`第 ${G.day} 天・打卡下班！`,'<div class="resultScore">'+String(G.score).padStart(4,"0")+'<span class="grade g'+g+'">'+g+' 級</span></div><div class="resultRows">'+
    row("白班扶好／敲歪",`${D.today}／${D.bent} 根`)+row("夜班敲入",N.cleared+" 根")+row("提早收工＋評等獎勵","+"+(bonus+gb))+row("OK 繃",G.lives+" / "+G.maxLives)+'</div>'+
    '<p class="nextmod">'+(G.nextMod?"<strong>明日工單："+MODS[G.nextMod].name+"</strong><br>"+modDesc(G.nextMod):"明日工單：普通的一天")+'</p><p>挑一樣帶去明天：</p><div class="perks" id="perks"></div>',
    [["回主畫面",goHome,false]],"result");
  for(const k of pool){const b=document.createElement("button");b.className="perk withIcon";b.dataset.perk=k;b.innerHTML='<i class="pi">'+PixelArt.icon(PERK_ICON[k])+"</i><b>"+PERKS[k].name+(pk(k)?"（已有 "+pk(k)+"）":"")+"</b><span>"+PERKS[k].desc+"</span>";
    b.onclick=()=>{applyPerk(k);closeDialog();G.day++;startDay(false);resume()};$("perks").append(b)}
  $("perks").querySelector("button")?.focus({preventScroll:true})}
function gameOver(why){if(mode==="over")return;const prev=mode;mode="over";S.st=S.st==="idle"?"idle":"rec";S.t=0;M.phase="off";magRing.visible=false;if(F.on){F.on=false;fly.visible=false;buzz(false)}
  if(why==="hurt")say("…今天先這樣，去擦藥吧。",3);SFX.over();
  setTimeout(()=>{const high=G.score>best;if(high){best=G.score;save("nail-shift.best",String(best))}renderUI();
    showDialog(why==="hurt"?"GAME OVER":"TIME UP",why==="hurt"?"送醫了！":"夜班沒做完！",'<div class="resultScore">'+String(G.score).padStart(4,"0")+'</div><p>'+(high?"本機最高分更新！":why==="hurt"?"OK 繃用完了，手指需要休息。":"下班鈴響了，釘子還沒敲完。")+'</p><div class="resultRows">'+
      row("難度",DIFFS[diff].name)+row("撐到",`第 ${G.day} 天・${prev==="night"?"夜班":"白班"}`)+row("白班扶好",G.dayNails+" 根")+row("正中釘心",G.perfects+" 槌")+row("夜班敲入",G.nightNails+" 根")+row("騙怪代打",G.baits+" 根")+row("閃過",(G.dodges+G.flies)+" 次")+row("最長連擊",G.bestCombo)+"</div>"+
      Board.panel(Board.add("main",{score:G.score,note:DIFFS[diff].name+"・第 "+G.day+" 天",lines:["難度 "+DIFFS[diff].name+"・撐到第 "+G.day+" 天"+(prev==="night"?"夜班":"白班"),"正中釘心 "+G.perfects+" 槌・最長連擊 "+G.bestCombo]})),
      [["重新上班",startRun,true],["回主畫面",goHome,false]],"result")},why==="hurt"?1300:500)}
function goHome(){closeDialog();mode="home";paused=false;cancelAnimationFrame(raf);clearBoard();document.body.classList.remove("playing","danger");screenEl.classList.remove("night","blackout");
  $("home").hidden=false;canvas.hidden=true;$("livebar").hidden=true;$("hint").hidden=true;$("sys").textContent="待機中";$("modeTag").textContent="SHIFT CHANGE";
  $("timeLabel").textContent="白班";$("timer").textContent=String(DAY_T);$("targetLabel").textContent="夜班";$("count").textContent=String(NIGHT_T+DIFFS[diff].night);$("countUnit").textContent="秒";$("score").textContent="0000";$("record").textContent=String(best).padStart(4,"0");
  bubble.classList.remove("on");buzz(false);$("start").focus({preventScroll:true})}

/* ================= dialogs (cabinet style) ================= */
function showDialog(tag,title,content,actions,kind){const d=$("dialog");modal=kind;$("dialogTag").textContent=tag;$("dialogTitle").textContent=title;$("dialogContent").innerHTML=content;$("dialogActions").replaceChildren();
  for(const[label,cb,primary]of actions){const b=document.createElement("button");b.className=primary?"primary":"secondary";b.textContent=label;b.onclick=cb;$("dialogActions").append(b)}
  d.setAttribute("aria-labelledby","dialogTitle");if(!d.open)d.showModal();$("dialogActions").querySelector("button")?.focus({preventScroll:true})}
function closeDialog(){modal="";if($("dialog").open)$("dialog").close()}
const playing=()=>["day","handover","night"].includes(mode);
function pause(){if(!playing()||paused)return;paused=true;drag=null;keys.clear();buzz(false);$("sys").textContent="已暫停";showDialog("PAUSE","暫停中","<p>時間停在這一刻。</p><p>難度："+DIFFS[diff].name+(G.mod?"<br>今日工單：<strong>"+MODS[G.mod].name+"</strong>　"+modDesc(G.mod):"")+"<br>裝備："+(Object.keys(G.perks).map(k=>PERKS[k].name+(pk(k)>1?" ×"+pk(k):"")).join("、")||"還沒有")+"</p>",[["繼續遊戲",unpause,true],["回到主畫面",goHome,false]],"pause")}
function unpause(){closeDialog();paused=false;$("sys").textContent=(mode==="night"?"夜班中":"白班中")+sysMod();if(F.on)buzz(true,0.04);canvas.focus({preventScroll:true});resume()}
function help(){if(mode==="dayend"||mode==="over")return;const wasPlaying=playing()&&!paused;if(wasPlaying){paused=true;drag=null;keys.clear()}
  showDialog("HOW TO PLAY","操作指南",
  '<div class="shiftcard"><i>'+PixelArt.icon("sun")+'</i><div><b>白班：扶釘子（30 秒）</b><p>拖曳畫面任何地方移動手。老師傅瞄哪裡就把釘子送過去，圓圈變紅就要落鎚了。正中＝釘平，擦到邊＝<strong>歪釘</strong>，敲到手指會腫、少一片 OK 繃。師傅<strong>手滑</strong>或<strong>打噴嚏</strong>時，真正的落點會先亮<strong>黃圈</strong>（原本的紅圈變灰）：追過去接住分數加倍，噴嚏還多回一片 OK 繃；不想冒險就閃開。</p></div></div>'+
  '<div class="shiftcard"><i>'+PixelArt.icon("moon")+'</i><div><b>夜班：自己掄槌（35 秒）</b><p>拖曳移槌、放開敲擊（電腦用方向鍵＋空白鍵）。白班凸出來的釘子要補敲，正中釘心兩倍力。<strong>白班的歪釘你敲不動</strong>：把追著你的黃圈帶過去，紅圈鎖定就閃開，讓電磁怪代打。被吸到扣 4 秒。</p></div></div>'+
  '<div class="shiftcard"><i>'+PixelArt.icon("bandage")+'</i><div><b>兩班互相影響</b><p>白班手指被敲腫，夜班握槌會晃。OK 繃用完或夜班沒敲完就結束；撐過去就隔天再上班，越來越難。</p></div></div>'+
  '<div class="shiftcard"><i>'+PixelArt.icon("trophy")+'</i><div><b>裝備、工單、難度</b><p>每天過關可以三選一帶一樣裝備。第 2 天起可能抽到特殊工單（停電夜、蒼蠅季、電磁怪暴走…），難但分數加成。難度在主畫面選：輕鬆 ×0.8、標準 ×1、高手 ×1.5。</p></div></div>',
  [[wasPlaying?"繼續遊戲":mode==="home"?"開始上班":"知道了",wasPlaying?unpause:mode==="home"?startRun:closeDialog,true]],"help")}
function dismiss(){if(modal==="result")goHome();else if(paused)unpause();else closeDialog()}
$("start").onclick=startRun;$("help").onclick=help;$("pause").onclick=pause;$("close").onclick=dismiss;$("dialog").addEventListener("cancel",e=>{e.preventDefault();dismiss()});

/* ================= input ================= */
let drag=null;const keys=new Set();
function moveBy(dx,dz){if(paused)return;if(mode==="day"){D.hand.x+=dx;D.hand.z+=dz;inCircle(D.hand,HAND_R)}else if(mode==="night"&&N.stun<=0){N.aim.x+=dx*1.1;N.aim.z+=dz*1.1;inCircle(N.aim,AIM_R)}}
canvas.addEventListener("pointerdown",e=>{if(!playing()||paused||drag||e.button!==0)return;e.preventDefault();unlock();canvas.focus({preventScroll:true});try{canvas.setPointerCapture(e.pointerId)}catch{}drag={id:e.pointerId,x:e.clientX,y:e.clientY}});
function pmove(e){if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;moveBy(dx*pxW,dy*pxW/Math.sin(PITCH))}
canvas.addEventListener("pointermove",pmove);
canvas.addEventListener("pointerup",e=>{if(!drag||drag.id!==e.pointerId)return;pmove(e);drag=null;strike()});
for(const ev of["pointercancel","lostpointercapture"])canvas.addEventListener(ev,e=>{if(drag?.id===e.pointerId)drag=null});
addEventListener("keydown",e=>{if(modal)return;
  if(mode==="home"&&(e.code==="Space"||e.key==="Enter")&&!e.repeat&&(e.target===document.body||e.target===$("start"))){e.preventDefault();startRun();return}
  if(!playing())return;if(e.key==="Escape"||e.code==="KeyP"){e.preventDefault();if(!e.repeat)pause();return}
  if(e.target!==canvas&&e.target?.tagName==="BUTTON")return;
  if(e.key.startsWith("Arrow")){keys.add(e.key);e.preventDefault();unlock()}if(e.code==="Space"){e.preventDefault();if(!e.repeat)strike()}});
addEventListener("keyup",e=>keys.delete(e.key));
addEventListener("blur",()=>{if(playing())pause()});document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing())pause()});

/* ================= sizing ================= */
function resize(){const b=screenEl.getBoundingClientRect();if(!b.width||!b.height)return;cw=b.width;ch=b.height;
  const pr=clamp(380/cw,0.55,1);renderer.setPixelRatio(pr);renderer.setSize(cw,ch,false);
  for(const[id,draw]of[["bgDay",PixelArt.day],["bgNight",PixelArt.night]]){const c=$(id);c.width=Math.round(cw*pr);c.height=Math.round(ch*pr);draw(c)}
  camera.aspect=cw/ch;const tv=Math.tan(camera.fov*Math.PI/360),por=camera.aspect<1;LOOK.set(0,por?0.35:0.7,por?-1.0:-0.8);
  const d=por?Math.max(10.5,2.85/(tv*camera.aspect)):Math.max(9.6,3.6/tv);camBase.set(0,Math.sin(PITCH)*d,Math.cos(PITCH)*d).add(LOOK);camera.position.copy(camBase);camera.lookAt(LOOK);camera.updateProjectionMatrix();pxW=2*d*tv/ch}
new ResizeObserver(()=>{resize();if(mode!=="home")renderer.render(scene,camera)}).observe(screenEl);

/* ================= loop ================= */
let blink=0,mbody=null;const tmp=new V3(),EXP={eye:0.07,brow:0.24,mouth:0.02};
function step(dt){
  const kx=(keys.has("ArrowRight")?1:0)-(keys.has("ArrowLeft")?1:0),kz=(keys.has("ArrowDown")?1:0)-(keys.has("ArrowUp")?1:0);if(kx||kz){const s=(mode==="night"?2.8:3.2)*dt/Math.hypot(kx,kz);moveBy(kx*s,kz*s)}
  if(dt>0){D.vel.x=lerp(D.vel.x,(D.hand.x-D.prev.x)/dt,damp(10,dt));D.vel.z=lerp(D.vel.z,(D.hand.z-D.prev.z)/dt,damp(10,dt))}D.prev.copy(D.hand);
  if(mode==="day")dayStep(dt);else if(mode==="handover")handoverStep(dt);else if(mode==="night")nightStep(dt);else if(mode==="over"&&S.st!=="idle")masterStep(dt);
  if(F.on){F.t+=dt;wings.forEach((w,i)=>w.rotation.z=(i?-1:1)*(0.3+Math.sin(F.t*(F.ph==="land"?20:75))*0.6));
    if(F.ph==="in"){const k=Math.min(1,F.t/0.75);F.pos.lerpVectors(F.from,flyLand(),eOut(k));F.pos.y+=Math.sin(F.t*17)*0.14*(1-k);F.pos.x+=Math.sin(F.t*11)*0.18*(1-k);if(k>=1){F.ph="land";buzz(true,0.02)}}
    else if(F.ph==="land")F.pos.copy(flyLand());else{F.vel.y+=1.5*dt;F.pos.addScaledVector(F.vel,dt);if(F.t>1.3){F.on=false;fly.visible=false;buzz(false)}}fly.position.copy(F.pos);fly.rotation.y=Math.sin(F.t*3)*0.6}
  for(let i=parts.length-1;i>=0;i--){const m=parts[i],u=m.userData;u.life-=dt;u.v.y-=9*dt;m.position.addScaledVector(u.v,dt);if(m.position.y<0.01){m.position.y=0.01;u.v.multiplyScalar(0.3)}m.rotation.x+=dt*9;m.scale.setScalar(Math.max(0.001,m.scale.x*(u.life>0?Math.pow(Math.max(0.01,u.life/u.max),dt*3):0)));if(u.life<=0){scene.remove(m);parts.splice(i,1)}}
  tipTime=Math.max(0,tipTime-dt)}
function visuals(rdt){const now=performance.now()/1000;perkAnim(now);musicTick();
  env=lerp(env,envTarget,damp(1.6,rdt));dark=lerp(dark,mode==="night"&&G.mod==="blackout"?1:0,damp(1.5,rdt));applyEnv();
  D.hurt=Math.max(0,D.hurt-rdt);D.react=Math.max(0,D.react-rdt);
  // apprentice hand (slides out at night)
  const hk=D.hurt/0.7,sx=(Math.random()-0.5)*0.07*hk,sz=(Math.random()-0.5)*0.07*hk,dip=D.hurt>0?-0.14*Math.sin(Math.PI*Math.min(1,(0.7-D.hurt)/0.3)):0,ho=eOut(X.handOut);
  if(mode==="day"){X.handOut=lerp(X.handOut,0,damp(4,rdt));X.hamIn=lerp(X.hamIn,0,damp(5,rdt))}
  hand.visible=X.handOut<0.99;hand.position.set(D.hand.x+sx-ho*2.4,PY+dip-ho*0.4,D.hand.z+sz+ho*2.6);
  hand.rotation.z=lerp(hand.rotation.z,clamp(-D.vel.x*0.03,-0.15,0.15),damp(8,rdt));hand.rotation.x=lerp(hand.rotation.x,clamp(D.vel.z*0.03,-0.15,0.15),damp(8,rdt));
  if(D.nail){D.popT=Math.min(1,D.popT+rdt*6);const s=D.popT<1?1+Math.sin(D.popT*Math.PI)*0.25:1;D.nail.scale.setScalar(Math.max(0.01,D.popT*s));D.nail.position.set(hand.position.x,0,hand.position.z);D.nail.rotation.set(hand.rotation.x*0.3,0,hand.rotation.z*0.3)}
  // master walks off at night
  if(mode==="day")X.masterOut=lerp(X.masterOut,0,damp(2.2,rdt));
  const mo=eOut(X.masterOut),mBase=clamp((mode==="day"?(S.st==="aim"||S.st==="gap"?S.hover.x:S.cur.x):0)*0.35,-0.8,0.8);
  const mx0=master.position.x;master.position.x=lerp(master.position.x,mBase+mo*6.5,damp(mode==="day"?3:6,rdt));const walk=clamp(Math.abs(master.position.x-mx0)/Math.max(rdt,1e-3)/3,0,1);
  master.position.y=lerp(master.position.y,Math.abs(Math.sin(now*11))*0.12*walk,damp(12,rdt));master.rotation.z=Math.sin(now*11)*0.05*walk;if(mbody)mbody.scale.y=1+Math.sin(now*2.1)*0.012;master.visible=hamM.visible=armSleeve.visible=armSkin.visible=master.position.x<6;
  if(mode==="day"&&S.st==="idle")poseHammer(hamM,FM,YM,S.hover,0,1.5);
  master.updateMatrixWorld();const sh=master.localToWorld(SHL.clone()),w=hamM.position,dir=sh.clone().sub(w).normalize(),el=w.clone().addScaledVector(dir,0.5);placeSeg(armSleeve,sh,el,0.21);placeSeg(armSkin,el,w,0.15);
  const tg=S.st==="aim"||S.st==="gap"?S.hover:S.cur;headG.rotation.y=lerp(headG.rotation.y,clamp((tg.x-master.position.x)*0.2,-0.5,0.5)+(X.masterOut>0.05&&mode!=="day"?0.9:0),damp(8,rdt));
  let eye=1,brow=0,hx=-0.3,mouthS=0.02;if(S.st==="aim")eye=0.55;if(S.st==="wind"||S.st==="strike"){eye=0.32;brow=0.3;hx=-0.15}
  if(S.sneeze&&S.st==="wind"&&S.sn>0){eye=0.08;hx=-0.6;mouthS=0.08}if(S.sn===3&&S.st==="strike"){eye=0.1;hx=0.15;mouthS=0.1}if(D.react>0){eye=1.6;brow=-0.3;mouthS=0.07}
  blink-=rdt;if(blink<-3.5-Math.random()*2)blink=0.12;if(blink>0)eye*=0.12;
  eyes.forEach(e=>e.scale.y=lerp(e.scale.y,EXP.eye*eye,damp(25,rdt)));brows[0].rotation.z=lerp(brows[0].rotation.z,brow,damp(12,rdt));brows[1].rotation.z=-brows[0].rotation.z;
  brows.forEach(b=>b.position.y=lerp(b.position.y,EXP.brow+(D.react>0?0.07:0),damp(12,rdt)));headG.rotation.x=lerp(headG.rotation.x,hx,damp(10,rdt));mouth.scale.y=lerp(mouth.scale.y,EXP.mouth*mouthS/0.02,damp(15,rdt));sweat.visible=D.react>0;
  // night: your hammer + reticle
  const hi=eOut(X.hamIn);hamP.visible=pSleeve.visible=hi>0.01;
  const night=mode==="night",ap=night?aimPoint():N.aim.clone();
  if(hamP.visible){const sw=N.swing>0?Math.sin((1-N.swing/SW_T)*Math.PI):0,at=N.swing>0?N.at:ap,nn=nearestNail(at.x,at.z),cy=nn.n&&nn.d<=0.34?headTop(nn.n):0,stunLift=N.stun>0?0.7*(N.stun/0.48):0;
    tmp.set(at.x+(1-hi)*2.5,cy,at.z+(1-hi)*2.8);poseHammer(hamP,FP,YP,tmp,lerp(-0.5,A_HIT,sw),(1-sw)*0.85+Math.sin(now*2.4)*0.03+stunLift+(1-hi)*1.2);
    placeSeg(pSleeve,hamP.position,hamP.position.clone().add(new V3(0.55,0.5,0.75)),0.17)}
  aimLight.intensity=dark*1.5;aimLight.position.set(ap.x,1.1,ap.z);ret.visible=night;if(night){ret.position.set(ap.x,0.03,ap.z);const nn=nearestNail(ap.x,ap.z);retTint(N.stun>0?0xfc6660:nn.n&&nn.d<=0.34?(nn.n.bent?0x7bf4f0:0xefffd6):0x69e7de)}
  // magnet
  const mag=M.phase;let my=M.my,mx=M.mx,mz=M.mz;
  if(mode==="night"||mode==="dayend"||mode==="over"){
    if(mag==="rest"||mag==="off"){mx=lerp(M.mx,Math.sin(now*0.82)*1.4,damp(3,rdt));mz=lerp(M.mz,-0.8,damp(3,rdt));my=lerp(M.my,2.4+Math.sin(now*2)*0.06,damp(4,rdt))}
    else if(mag==="track"||mag==="lock"){mx=lerp(M.mx,M.x,damp(12,rdt));mz=lerp(M.mz,M.z,damp(12,rdt));my=lerp(M.my,2.3+Math.sin(now*2)*0.05,damp(6,rdt))}
    else{const nn=nearestNail(M.x,M.z),cy=(nn.n&&nn.d<=0.42?headTop(nn.n):0)+0.36;mx=M.x;mz=M.z;my=mag==="slam"?lerp(2.3,cy,eIn(Math.min(1,M.el/0.19))):lerp(cy,2.3,eOut(Math.min(1,M.el/0.52)))}}
  else if(mode==="day"){my=lerp(M.my,9,damp(2,rdt))}
  M.mx=mx;M.my=my;M.mz=mz;magnet.position.set(mx,my,mz);M.sq=Math.max(0,(M.sq||0)-rdt*3.5);{const q=M.sq*Math.cos((1-M.sq)*14);magnet.scale.set(1+0.22*q,1-0.28*q,1+0.22*q)}magnet.visible=my<8.9;magnet.rotation.z=mag==="lock"?Math.sin(now*40)*0.04:Math.sin(now*1.3)*0.05;
  const hotEye=mag==="lock"||mag==="slam";magEyeM.color.setHex(hotEye?0xffbb60:0x62efe5);magEyes.forEach(e=>e.scale.y=mag==="rest"&&Math.floor(now*1.4)%8===0?0.25:1);
  magLight.position.set(mx,my-0.3,mz);magLight.intensity=env*(hotEye?1.4:0.8)*(1+dark);magLight.color.setHex(hotEye?0xffa060:0x62efe5);
  magRing.visible=night&&(mag==="track"||mag==="lock"||mag==="slam");if(magRing.visible){magRing.position.set(M.x,0.025,M.z);magRing.scale.setScalar(1+0.4*Math.min(2,pk("lure")));const tr=mag==="track";magFill.material.color.setHex(tr?0xffc244:0xd73444);magEdge.material.color.setHex(tr?0xf9b64c:0xf55d60);
    magShrink.visible=!tr;if(!tr)magShrink.scale.setScalar(Math.max(0.1,0.4*(1-(mag==="lock"?M.el/0.8:1))))}
  for(const n of N.nails)if(n.marker){n.marker.scale.setScalar(1+Math.sin(now*4+n.bob)*0.06)}
  for(let i=stars.length-1;i>=0;i--){const m=stars[i],u=m.userData;u.life-=rdt;u.a+=rdt*6;m.position.set(hand.position.x-0.3+Math.cos(u.a)*0.32,PY+0.55+Math.sin(u.a*2)*0.05,hand.position.z+Math.sin(u.a)*0.32);m.rotation.y+=rdt*8;if(u.life<=0){scene.remove(m);stars.splice(i,1)}}
  // bubble, camera
  if(sayT>0){sayT-=rdt;if(sayT<=0)bubble.classList.remove("on")}
  const hp=scr(master.localToWorld(new V3(0,2.55,0))),bw=bubble.offsetWidth,bh=bubble.offsetHeight;let bx=hp.x,by=hp.y;
  if(by-bh<56){const side=scr(master.localToWorld(new V3(0.85,1.95,0)));bx=side.x+bw/2+6;by=side.y+bh/2;if(bx+bw/2>cw-8){const l=scr(master.localToWorld(new V3(-0.85,1.95,0)));bx=l.x-bw/2-6}}
  bubble.style.left=clamp(bx,bw/2+8,cw-bw/2-8)+"px";bubble.style.top=clamp(by,56+bh,ch-60)+"px";
  G.shake=(G.shake||0)*Math.exp(-9*rdt);const sk=reduced?0:G.shake;camera.position.set(camBase.x+(Math.random()-0.5)*sk,camBase.y+(Math.random()-0.5)*sk,camBase.z+(Math.random()-0.5)*sk)}
function frame(now){if(mode==="home")return;const rdt=Math.min(0.05,(now-last)/1000);last=now;
  if(!paused){let dt=rdt;if(G.freeze>0){G.freeze-=rdt;dt=0}step(dt);visuals(rdt);renderUI()}
  renderer.render(scene,camera);if(!paused)raf=requestAnimationFrame(frame)}
function resume(){cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(frame)}


/* ================= 裝備：選了就看得到、師傅也會講 ================= */
const PERK_ICON={glove:"glove",thimble:"thimble",lens:"glasses",ice:"ice",heavy:"heavy",coffee:"coffee",lure:"lure",bonus:"bonus"};
const PERK_LINES={
  lens:{pick:"新眼鏡！嘿…原來木頭紋路長這樣。",two:"雙層鏡片！連蒼蠅腿毛都看得一清二楚。",chat:["這副眼鏡真清楚，連你的指紋都看得到。","戴上新眼鏡，瞄得準多了吧？","眼鏡別亂摸，會留指紋。"],bent:["戴了新眼鏡還歪…是你手抖吧？","奇怪，眼鏡明明很清楚啊…"]},
  thimble:{pick:"戴鐵指套啦？好，那我就放心敲了…開玩笑的。",chat:["指套戴緊，敲到會「鏗」很大聲喔。"]},
  ice:{pick:"手消腫啦？冰敷袋先綁著，別滴到木頭上。",chat:["冰敷袋還冰嗎？"]},
  glove:{pick:"急救包放旁邊，痛了自己拿。",chat:["急救包裡的 OK 繃省著點用。"]},
  heavy:{pick:"加重槌頭幫你換好了，晚上手腕撐住。",chat:["晚上那支槌子很重，現在先熱身。"],night:"加重槌頭給你，一槌當兩槌用！"},
  coffee:{pick:"喝了濃咖啡？眼睛瞪那麼大幹嘛。",chat:["咖啡別放太近，會打翻。"],night:"咖啡留給你，夜班多撐一下。"},
  lure:{pick:"誘餌我晚點掛到電磁怪身上。",chat:["那個誘餌一直在發光，看得我眼睛好花。"],night:"誘餌掛好了，引牠過來一次砸一排！"},
  bonus:{pick:"加班費談好了！今天好好幹。",chat:["領了加班費，可不能偷懶喔。"],night:"記得喔，加班費是算件的。"}};
const GEAR={};
const isIn=(o,g)=>{for(let p=o;p;p=p.parent)if(p===g)return true;return false};
function looks(){if(GEAR.ready)return;GEAR.ready=true;
  // 師傅的新眼鏡：金框、大鏡片、反光；第二副再加一支放大鏡片
  const goldF=phong(0xffc94a,120,0xffffff),lensB=basic(0xbfe8ff,{transparent:true,opacity:0.5}),white=basic(0xffffff);
  const g=new THREE.Group();
  [0.24,-0.24].forEach(x=>{add(g,new THREE.TorusGeometry(0.205,0.045,6,20),goldF,[x,0.02,0.72]);add(g,new THREE.CircleGeometry(0.19,18),lensB,[x,0.02,0.726]);add(g,new THREE.PlaneGeometry(0.05,0.15),white,[x-0.07,0.08,0.732],null,[0,0,-0.6])});
  add(g,new THREE.BoxGeometry(0.1,0.04,0.04),goldF,[0,0.06,0.73]);[1,-1].forEach(k=>seg(g,new V3(0.44*k,0.04,0.66),new V3(0.72*k,0.06,0.1),0.022,goldF));
  const loupe=new THREE.Group();add(loupe,new THREE.CylinderGeometry(0.1,0.13,0.22,12),phong(0x2a2a30,60),[0,0,0],null,[Math.PI/2,0,0]);add(loupe,new THREE.CircleGeometry(0.1,12),basic(0x9fe8ff),[0,0,0.112]);
  loupe.position.set(-0.24,0.02,0.86);g.add(loupe);headG.add(g);GEAR.glasses=g;GEAR.loupe=loupe;
  // 鐵指套：套在食指指尖
  const steelT=phong(0xb9c2cc,110,0xffffff),tg=new THREE.Group(),dir=IDX[2].clone().sub(IDX[1]).normalize();
  const a=IDX[1].clone().lerp(IDX[2],0.45),b=IDX[2].clone().addScaledVector(dir,0.04);seg(tg,a,b,0.092,steelT);add(tg,sph,steelT,b.toArray(),0.092);
  add(tg,new THREE.TorusGeometry(0.095,0.018,5,12),phong(0x7d8792,60),a.toArray(),null,[0,Math.atan2(dir.x,dir.z),0]);hand.add(tg);GEAR.thimble=tg;
  // 冰敷袋：綁在前臂
  const ice=new THREE.Group();add(ice,sph,phong(0x8fd4ff,90,0xffffff),[-1.42,0.3,0.56],[0.32,0.14,0.25]);add(ice,new THREE.TorusGeometry(0.27,0.03,5,14),mat(0xffffff),[-1.42,0.3,0.56],null,[0.4,-0.6,0]);hand.add(ice);GEAR.ice=ice;
  // 急救包（右後）、濃咖啡（左後）、加班費信封＋硬幣（左側）：放在木樁邊緣
  const kit=new THREE.Group();add(kit,new THREE.BoxGeometry(0.56,0.34,0.4),mat(0xd94545),[0,0.17,0]);add(kit,new THREE.BoxGeometry(0.26,0.07,0.02),mat(0xffffff),[0,0.18,0.205]);add(kit,new THREE.BoxGeometry(0.07,0.24,0.02),mat(0xffffff),[0,0.18,0.205]);
  add(kit,new THREE.BoxGeometry(0.22,0.05,0.06),mat(0x6e2222),[0,0.37,0]);kit.position.set(1.62,0,-1.55);kit.rotation.y=-0.5;scene.add(kit);GEAR.kit=kit;
  const mug=new THREE.Group();add(mug,new THREE.CylinderGeometry(0.17,0.15,0.32,14),phong(0xeee2cf,50),[0,0.16,0]);add(mug,new THREE.CircleGeometry(0.15,14),basic(0x3b2416),[0,0.3,0],null,[-Math.PI/2,0,0]);
  add(mug,new THREE.TorusGeometry(0.09,0.03,5,10),phong(0xeee2cf,50),[0.19,0.17,0]);GEAR.steam=[0,1,2].map(i=>add(mug,sph,basic(0xffffff,{transparent:true,opacity:0.5}),[0,0.4,0],0.05));
  mug.position.set(-1.62,0,-1.55);scene.add(mug);GEAR.mug=mug;
  const cash=new THREE.Group();add(cash,new THREE.BoxGeometry(0.5,0.03,0.32),mat(0xf3ead6),[0,0.015,0]);add(cash,new THREE.CylinderGeometry(0.06,0.06,0.02,10),mat(0xc0392b),[0,0.035,0.05]);
  for(let i=0;i<4;i++)add(cash,new THREE.CylinderGeometry(0.1,0.1,0.035,12),phong(0xffcf4a,100,0xffffff),[0.42,0.02+i*0.036,0.05]);cash.position.set(-2.02,0,-0.55);cash.rotation.y=0.35;scene.add(cash);GEAR.cash=cash;
  // 強力誘餌：電磁怪下面吊一顆發光的餌
  const bait=new THREE.Group();seg(bait,new V3(0,-0.2,0),new V3(0,-0.52,0),0.015,mat(0x8a93a0));add(bait,sph,basic(0xffd24a),[0,-0.6,0],0.11);
  GEAR.baitGlow=add(bait,sph,basic(0xffe58a,{transparent:true,opacity:0.3,depthWrite:false}),[0,-0.6,0],0.22);GEAR.bait=bait;
  // 師傅的新眼鏡 → 瞄準圈多了刻度（看得更清楚）
  const ticks=new THREE.Group();for(let i=0;i<4;i++){const ang=i*Math.PI/2,m=flat(new THREE.PlaneGeometry(0.05,0.16),0x9ff6ff,0.95);m.position.set(Math.cos(ang)*(R+0.12),0,Math.sin(ang)*(R+0.12));m.rotation.z=-ang+Math.PI/2;ticks.add(m)}
  ring.add(ticks);ghost.add(ticks.clone());GEAR.ticks=[ticks,ghost.children[ghost.children.length-1]]}
function perkLooks(newKey){looks();const L=pk("lens");
  GEAR.glasses.visible=L>0;GEAR.loupe.visible=L>1;
  (GEAR.head||headG).traverse(o=>{if(o.isMesh&&!isIn(o,GEAR.glasses)&&(o.material===glassM||o.material===lensM||o.material.name==="Glass"||o.material.name==="Lens"))o.visible=!L});
  GEAR.thimble.visible=pk("thimble")>0;GEAR.ice.visible=pk("ice")>0;GEAR.kit.visible=pk("glove")>0;GEAR.mug.visible=pk("coffee")>0;GEAR.cash.visible=pk("bonus")>0;
  if(GEAR.bait.parent!==magnet)magnet.add(GEAR.bait);GEAR.bait.visible=pk("lure")>0;GEAR.bait.scale.setScalar(1+0.3*Math.max(0,pk("lure")-1));
  GEAR.ticks.forEach(t=>t.visible=L>0);
  const hk=1+0.14*Math.min(3,pk("heavy"));hamP.scale.setScalar(PS*hk);FP.copy(F0(YP).multiplyScalar(PS*hk));
  $("gear").innerHTML=Object.keys(G.perks).filter(k=>pk(k)>0).map(k=>'<i title="'+PERKS[k].name+'" class="'+(k===newKey?"new":"")+'">'+PixelArt.icon(PERK_ICON[k])+(pk(k)>1?"<b>"+pk(k)+"</b>":"")+"</i>").join("")}
function perkAnim(now){if(!GEAR.ready)return;
  if(GEAR.mug.visible)GEAR.steam.forEach((m,i)=>{const u=(now*0.6+i/3)%1;m.position.set(Math.sin(now*2+i)*0.04,0.36+u*0.5,0);m.scale.setScalar(0.04+u*0.07);m.material.opacity=0.5*(1-u)});
  if(GEAR.bait.visible){GEAR.baitGlow.scale.setScalar(0.2+Math.sin(now*6)*0.04)}
  if(GEAR.thimble.visible){const sw=G.sw.index;GEAR.thimble.scale.setScalar(1);GEAR.thimble.children.forEach(c=>c.material.color&&c.material.color.setHex(D.shield>0||mode!=="day"?0xb9c2cc:0x7a7f86))}}
function perkChat(){const ks=Object.keys(G.perks).filter(k=>pk(k)>0);if(!ks.length)return;const k=pick(ks);say(pick(PERK_LINES[k].chat),1.9)}

/* ================= Blender models (models.glb) ================= */
const glbMats={};
function glbMat(m){const nm=m.name;if(glbMats[nm])return glbMats[nm];const c=m.color?m.color.getHex():0xffffff;let n;
  if(nm==="Outline")n=basic(0x15121a);else if(nm==="Eye")n=magEyeM;else if(nm==="Lens")n=lensM;
  else if(nm==="StumpTop")n=mat(0xffffff,{map:stumpTop()});else if(nm==="Bark")n=mat(0xffffff,{map:barkTex()});
  else if(nm==="Sweat")n=new THREE.MeshPhongMaterial({color:c,shininess:90,transparent:true,opacity:0.9});
  else if(/^Steel|^Chain/.test(nm))n=phong(c,nm==="SteelFace"?130:80,0x999999);
  else if(nm==="SkinIndex"||nm==="SkinThumb"||nm==="Fingernail"){n=phong(c,18,0x333333);n.morphTargets=true;n.morphNormals=true}
  else if(/Skin/.test(nm))n=phong(c,15,0x333333);else n=mat(c);
  n.name=nm;return glbMats[nm]=n}
function hideKids(g,keep){g.children.forEach(c=>{if(c!==keep)c.visible=false})}
function useModels(root){
  root.traverse(o=>{if(o.isMesh){o.material=glbMat(o.material);o.castShadow=o.material.name!=="Outline";o.receiveShadow=o.material.name==="StumpTop"}});
  const get=n=>{const o=root.getObjectByName(n);if(!o)throw new Error("missing "+n);return o},take=n=>{const o=get(n);o.parent&&o.parent.remove(o);return o};
  const st=take("Stump");stump.visible=false;scene.add(st);
  nailProto=take("Nail");nailProto.position.set(0,0,0);
  const fistM=take("Fist"),hm=take("HammerM"),hp=take("HammerP");
  hideKids(hamM);hm.position.set(0,0,0);hamM.add(hm);const f1=fistM.clone();f1.position.set(0,0.02,0);hamM.add(f1);
  hideKids(hamP);hp.position.set(0,0,0);hamP.add(hp);const f2=fistM.clone();f2.position.set(0,0.02,0);f2.traverse(o=>{if(o.isMesh&&o.material.name==="Skin")o.material=playerFist});hamP.add(f2);
  const ss=take("SegSleeve"),sk=take("SegSkin");
  for(const[old,proto,set]of[[armSleeve,ss,v=>armSleeve=v],[armSkin,sk,v=>armSkin=v],[pSleeve,sk,v=>pSleeve=v]]){scene.remove(old);const c=proto.clone();scene.add(c);set(c)}
  hideKids(magnet);const mg=take("Magnet");mg.position.set(0,0,0);magnet.add(mg);magEyes=[mg.getObjectByName("MagEyeA"),mg.getObjectByName("MagEyeB")];
  const link=take("ChainLink");for(let i=0;i<34;i++){const c=link.clone();c.position.set(0,0.82+i*0.17,0);c.rotation.y=i%2?Math.PI/2:0;magnet.add(c)}
  hideKids(master,headG);mbody=take("MasterBody");mbody.position.set(0,0,0);master.add(mbody);
  hideKids(headG);const hd=take("MasterHead");hd.position.set(0,0,0);headG.add(hd);
  const hg=n=>hd.getObjectByName(n);eyes=[hg("EyeA"),hg("EyeB")];brows=[hg("BrowA"),hg("BrowB")];mouth=hg("Mouth");sweat=hg("Sweat");sweat.visible=false;
  EXP.eye=1;EXP.brow=brows[0].position.y;EXP.mouth=1;mouth.scale.y=0.02/0.02;
  hideKids(hand);if(fingers){hand.remove(fingers);fingers=null}const hn=take("Hand");hn.position.set(0,0,0);hand.add(hn);
  glbFingers=[["index",hn.getObjectByName("Index")],["thumb",hn.getObjectByName("Thumb")]];buildFingers();GEAR.head=hd;perkLooks()}
let modelsReady=!THREE.GLTFLoader;
function modelsDone(){if(modelsReady)return;modelsReady=true;const b=$("start");b.disabled=false;b.lastChild.textContent="開始上班"}
if(THREE.GLTFLoader){const b=$("start");b.disabled=true;b.lastChild.textContent="載入模型中…";
  const ld=new THREE.GLTFLoader(),ok=g=>{try{useModels(g.scene)}catch(e){console.error(e)}modelsDone()};
  ld.load("./models.glb",ok,undefined,()=>ld.load("./models.json",ok,undefined,e=>{console.error(e);modelsDone()}));setTimeout(modelsDone,9000)}
function diffUI(){$("diff").replaceChildren(...DIFFS.map((d,i)=>{const b=document.createElement("button");b.textContent=d.name;b.setAttribute("aria-pressed",String(i===diff));b.onclick=()=>{diff=i;save("nail-shift.diff",String(i));diffUI()};return b}));
  $("diffNote").textContent=`OK 繃 ${DIFFS[diff].lives} 片・夜班 ${NIGHT_T+DIFFS[diff].night} 秒・得分 ×${DIFFS[diff].mult}`;if(mode==="home")$("count").textContent=String(NIGHT_T+DIFFS[diff].night)}
diffUI();$("record").textContent=String(best).padStart(4,"0");resize();
if(location.hash==="#debug")window.__shift={scene,G,D,S,N,M,X,get mode(){return mode},startRun,gameOver,applyPerk,MUS,nightClear};
})();

