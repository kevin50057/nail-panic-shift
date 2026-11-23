"use strict";
const PixelArt = (() => {
  // Small colour sprites also serve as the cabinet's controls.
  const icons = {
    arcade:["....2222222222..","...21111111112..","..211111111112..","..222222222222..","...2333333332...","...2314411432...","...2333333332...","...2222222222...","..22241412222...","..21111111112...","..22222222222...","...233333332....","...233223332....","...222222222...."],
    clock:[".....1111.....","......11......","....222222..1.","..22111111221.",".211....1..12.",".21.....1...2.","21......1...12","21.....111..12","21..........12",".21........12.",".211......112.","..2211111122..","....222222...."],
    nail:[".........222..","........23332.",".......2333332",".......123332.",".........112..",".......221....","......221.....",".....221......","....221.......","...221........","..221.........",".21..........."],
    bolt:[".......22222..","......22222...",".....22222....","....22222.....","...222222222..","..222222222...","......2222....",".....2222.....","....222.......","...22........."],
    trophy:["..2222222222..","22211111111222","21111111111112","21211111111212","21211111111212",".222111111222.", "...22111122...","....221122....","......22......",".....1221.....","...22222222...","...11111111..."],
    play:["11......","1111....","111111..","11111111","111111..","1111....","11......"],
    pause:["111..111","111..111","111..111","111..111","111..111","111..111","111..111"],
    sound:["......1.....","....111...1.","..11111.1..1","1111111..1.1","1111111..1.1","1111111..1.1","..11111.1..1","....111...1.","......1....."],
    mute:["......1.....","....111.....","..11111.1..1","1111111..11.","1111111..11.","1111111.1..1","..11111.....","....111.....","......1....."],
    pad:["...111111111...","..11.......11..",".11.........11.",".1..1.....1..1.","11.111...1...11","11..1......1.11","11...........11",".11..11111..11.","..111.....111.."]
  };
  const palettes={arcade:["#ffad4c","#ffce55","#28435a","#8ffae0"],clock:["#ffec94","#edb643"],nail:["#317f8f","#69dacc","#c0fff1"],bolt:["#f17e45","#ffab71"],trophy:["#8468bd","#cfafff"]};
  function icon(name){
    const rows=icons[name],pal=palettes[name]||["currentColor"];
    let pixels="";rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c!==".")pixels+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+pal[+c-1]+'"/>'}));
    return '<svg viewBox="0 0 '+Math.max(...rows.map(r=>r.length))+' '+rows.length+'" aria-hidden="true">'+pixels+'</svg>';
  }
  function seed(index){let n=(index+31)>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
  function renderer(canvas) {
    const ctx=canvas.getContext("2d",{alpha:false});
    const stump = new Image();
    stump.src = "../stump.webp";
    const hammerFrames = new Image(), magnetFrames = new Image();
    hammerFrames.src = "./hammer.webp";
    magnetFrames.src = "./magnet.webp";
    function sprite(sheet, frame, x, y, size) {
      if (!sheet.naturalWidth) return false;
      ctx.drawImage(sheet, frame*144, 0, 144, 144, x, y, size, size);
      return true;
    }
    let width,height,scale,cx,cy,back,wood;
    function rect(c,x,y,w,h,g=ctx){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
    function poly(c,points,g=ctx){g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill()}
    function ellipse(c,x,y,rx,ry,g=ctx){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill()}
    function ring(c,x,y,rx,ry,w=1){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke()}
    function buildBackdrop(){
      back=document.createElement("canvas");back.width=width;back.height=height;const b=back.getContext("2d");
      const rand=seed(108);const grad=b.createLinearGradient(0,0,0,height);grad.addColorStop(0,"#101726");grad.addColorStop(.66,"#2d3949");grad.addColorStop(.8,"#243144");grad.addColorStop(1,"#111925");b.fillStyle=grad;b.fillRect(0,0,width,height);
      const ground=cy+18*scale;
      for(let x=-8;x<width;x+=24){let top=Math.floor(ground*(.14+rand()*.35));rect("#192737",x,top,26,ground-top,b);rect("#203245",x+3,top+4,21,ground-top-3,b);
        for(let y=top+7;y<ground-7;y+=8)for(let j=0;j<3;j++){if(rand()>.50)rect(rand()>.30?"#27505c":"#3c7878",x+4+j*6,y,3,4,b)}}
      for(let x=0;x<width+75;x+=77){rect("#101b29",x,0,8,ground,b);rect("#3c4655",x+1,0,2,ground,b);for(let y=0;y<ground;y+=31){rect("#101a27",x-2,y,12,7,b);rect("#56606c",x-1,y+1,9,2,b)}}
      const truss=ground*.25;rect("#0e1622",0,truss,width,7,b);rect("#344051",0,truss,width,2,b);
      for(let x=-3;x<width;x+=40){poly("#1c2736",[[x,truss+6],[x+4,truss+6],[x+24,truss+22],[x+40,truss+6],[x+44,truss+6],[x+25,truss+26],[x+20,truss+26]],b)}
      rect("#131c2b",0,truss+24,width,4,b);
      for(let x=22;x<width;x+=112){let y=truss+Math.floor(6+rand()*18);rect("#172032",x,0,2,y,b);poly("#202b39",[[x-6,y+4],[x-2,y],[x+4,y],[x+8,y+4]],b);rect("#d1ab74",x-5,y+4,11,1,b);
        poly("#ac8c6010",[[x-4,y+6],[x+6,y+6],[x+24,y+51],[x-24,y+51]],b)}
      for(let x=0;x<width;x+=8){rect("#131e29",x,ground-15,2,16,b)}rect("#5b5141",0,ground-16,width,2,b);rect("#131a26",0,ground,width,8,b);rect("#4b4850",0,ground+1,width,2,b);
      for(let y=ground+10;y<height;y+=11)rect("#2b3746",0,y,width,1,b);
      for(let x=-width;x<width*2;x+=54)poly("#17212c",[[cx+(x-cx)*.45,ground+2],[cx+(x-cx)*.45+1,ground+2],[x+2,height],[x,height]],b);
      for(let i=0;i<width/5;i++){const x=rand()*width,y=ground+rand()*(height-ground);rect("#44505c52",x,y,1+rand()*4,1,b)}
      wood=document.createElement("canvas");wood.width=270;wood.height=165;const g=wood.getContext("2d");g.translate(135,61);
      ellipse("#0c1421b8",0,43,132,36,g);ellipse("#34242c",0,35,124,51,g);rect("#51302c",-124,0,248,34,g);
      for(let x=-123;x<=123;){let v=x/124,edge=Math.sqrt(Math.max(0,1-v*v)),w=4+Math.floor(rand()*6),base=32+edge*50,top=edge*48-4;let palette=["#724134","#9a5539","#854a35","#bf7042","#64382f"];poly(palette[Math.floor(rand()*palette.length)],[[x,top-9],[x+w+1,top-9],[x+w-1,base-1],[x,base]],g);rect("#d9894938",x+1,top+4,2,19,g);x+=w}
      ellipse("#452c2b",0,1,126,52,g);ellipse("#e6a15e",0,-1,124,49,g);ellipse("#b87145",0,-2,120,46,g);ellipse("#e8a25d",0,-3,117,44,g);
      for(let i=0;i<6;i++){g.lineWidth=i===5?1.5:1;g.strokeStyle=i%2?"#c7824e":"#d58e52";g.beginPath();g.ellipse(-9,-3,13+i*20,5+i*7.4,-.018,0,6.28);g.stroke()}
      for(let i=0;i<125;i++){const x=rand()*230-115,y=rand()*84-42;if((x/115)**2+(y/42)**2<1)rect(i%3?"#bd7c48":"#f2b376",x,y,1+rand()*4,1,g)}
      [[-104,-19,-74,-14],[98,23,74,17],[-55,40,-40,31],[45,-41,33,-32],[118,-9,101,-8],[-114,14,-91,12]].forEach(([x,y,a,d])=>poly("#935b3f",[[x,y],[a,d],[x+3,y+2]],g));
    }
    function resize(){
      const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
      const ratio=Math.min(1,Math.max(.6,320/b.width));width=Math.round(b.width*ratio);height=Math.round(b.height*ratio);canvas.width=width;canvas.height=height;
      scale=Math.min(width/282,height/207);cx=width*.5;cy=height*.61;buildBackdrop();
    }
    function delta(dx,dy){const b=canvas.getBoundingClientRect();return [dx*width/b.width/scale,dy*height/b.height/scale]}
    function nail(n){
      const top=n.y,base=n.base,done=n.hp<=0,heavy=n.heavy;const x=n.x;
      ellipse("#65422d78",x+4,base+1,done?6:11,3);
      if(!done){rect("#3a3e46",x-3,top+1,6,base-top);rect(heavy?"#ffe899":"#e4ecdc",x-2,top+1,2,base-top);rect(heavy?"#d99640":"#7a929c",x,top+2,2,base-top-1)}
      const y=done?base:top;ellipse("#424851",x,y+1,7,3.1);ellipse(heavy?"#ffd766":"#bfced0",x,y-1,7,2.6);rect(heavy?"#fff1bb":"#f4ffff",x-4,y-2,5,1);
      if(n.shield&&!done){ring("#296b84",x,y,11,6,2);ring("#7bf4f0",x,y,10,5,1);rect("#294659",x-3,y-4,6,5);rect("#8dece1",x-2,y-7,4,1);rect("#8dece1",x-3,y-6,1,3);rect("#8dece1",x+2,y-6,1,3)}
      if(!done&&!n.shield)rect(heavy?"#ad6937":"#748594",x+1,y-1,3,1);
    }
    function magnet(x,y,t,kind,size=1){
      ctx.save();ctx.translate(x,y);if(kind==="impact")ctx.rotate(Math.sin(t*40)*.025);
      ctx.scale(size,size);
      const tracking=kind==="rest" || kind==="track";
      const sway=tracking ? Math.sin(t*4)*3 : 0;
      for(let a=-9,i=0;a>-(height/scale+28)/size;a-=6,i++) {
        const offset=sway*Math.sin((-a-9)*.045);
        rect("#131c2b",offset-3,a-5,6,7);rect(i%2?"#536678":"#718090",offset-2,a-4,4,5);rect("#263546",offset-1,a-3,2,3);
      }
      const pose=tracking ? Math.floor((Math.sin(t*4)+1)*1.5) : kind==="impact"?6:4;
      if (sprite(magnetFrames,pose,-31,-30,62)) {ctx.restore();return;}
      poly("#161d2a",[[-19,-9],[-13,-16],[11,-16],[19,-10],[21,10],[16,18],[8,17],[5,5],[-5,5],[-9,17],[-17,17],[-22,11]]);
      poly("#992f3b",[[-18,-8],[-12,-14],[10,-14],[17,-8],[19,10],[15,15],[9,14],[6,1],[-6,1],[-10,14],[-16,14],[-19,10]]);
      poly("#de5147",[[-16,-8],[-10,-13],[8,-13],[14,-9],[14,-4],[-9,-3],[-13,8],[-18,7]]);
      rect("#f17b5d",-14,-8,3,9);rect("#ac3741",12,-7,4,14);
      poly("#b6c7c2",[[-19,7],[-10,10],[-11,16],[-18,14],[-20,12]]);
      poly("#d3d8c8",[[8,10],[17,7],[19,11],[16,16],[10,16]]);
      rect("#1e242d",-8,-7,19,9);rect("#101924",-6,-8,15,10);
      const eyes=kind==="lock"||kind==="slam"?"#ffbb60":"#62efe5";if(Math.floor(t*1.4)%8||kind!=="rest"){rect(eyes,-5,-5,3,5);rect(eyes,4,-5,3,5)}else{rect(eyes,-5,-2,3,1);rect(eyes,4,-2,3,1)}
      rect("#47404b",-7,-17,13,4);rect("#e9ac49",-5,-16,4,2);rect("#e9ac49",2,-16,3,2);ctx.restore();
    }
    function hammer(x,y,pose){
      const spriteLift=[8,9,10,8,4,0,2,5,8][pose];
      if (sprite(hammerFrames,pose,x-24,y-59-spriteLift,75)) return;
      const a=pose<=5 ? pose/5 : (8-pose)/3;
      ctx.save();ctx.translate(x,y);ellipse("#573e3455",8,9,15,3);
      const lift=20+(1-a)*5;ctx.translate(2,-lift*(1-a));ctx.rotate(-.57-.21*(1-a));
      // Side, grip wraps and metal face are drawn independently to keep their silhouettes readable in motion.
      poly("#192333",[[4,-3],[41,-3],[44,0],[44,6],[40,8],[3,7]]);
      rect("#a76035",4,-1,37,7);rect("#f3b54f",13,-2,27,5);rect("#ffe48c",16,-2,22,2);
      for(let k=18;k<40;k+=6)poly("#a36439",[[k,-2],[k+2,-2],[k,5],[k-2,5]]);
      poly("#29303b",[[-10,-12],[-5,-15],[7,-13],[10,-8],[8,13],[2,15],[-11,11],[-14,6]]);
      poly("#536879",[[-9,-10],[-4,-13],[6,-11],[8,-7],[5,10],[-6,10],[-11,6]]);
      poly("#afbfc2",[[-10,-10],[-4,-13],[6,-11],[3,-8],[-7,-7]]);poly("#72868e",[[-9,-6],[-6,-7],[-7,8],[-10,5]]);
      poly("#d4e2d9",[[-10,6],[5,9],[6,12],[1,13],[-10,10]]);rect("#d0a04b",-1,-7,4,4);ctx.restore();
    }
    function bossFormation(s) {
      const b=s.boss, lanes=ForgeBoss.centers, current=b.order[b.index];
      const warning=b.phase==="attack" || b.phase==="hold";
      const lit=warning || b.phase==="preview";
      const elapsed=b.time-b.impactTime;
      ctx.save();
      ctx.beginPath();ctx.ellipse(0,0,123,50,0,0,Math.PI*2);ctx.clip();
      for(let i=0;i<lanes.length;i++) {
        const left=lanes[i]-23;
        if (lit && current.lane===i) rect(warning?"#ee434c99":"#ffcf546b",left,-52,46,104);
        if (i===b.lastLane && elapsed<.14) rect("#fff2be88",left,-52,46,104);
        if (i>0) rect("#452b2588",left,-50,1,100);
      }
      ctx.restore();
      for(let lane=0;lane<lanes.length;lane++) {
        const crew=b.crewSize[lane];
        const visible=Math.min(3,crew);
        for (let rank=visible-1;rank>=0;rank--) {
          const spot=lanes[lane]+rank*5;
          const active=lit && lane===current.lane && rank===current.row%visible;
          const landing=lane===b.lastLane && rank===b.lastRank%visible && elapsed<.22;
          let y=-67-rank*15;
          if (active && b.phase==="attack") {
            y+=72*Math.pow(Math.max(0,(b.clock/b.beat-.50)*2),2);
          } else if (landing) y+=72*Math.pow(1-elapsed/.22,2);
          const kind=landing?"impact":active&&warning?"lock":"rest";
          magnet(spot,y,s.t+lane,kind,rank?.55:.83);
          if(active) {
            ellipse(warning?"#f64c48":"#ffd465",spot,y+1,5,4);
            ellipse("#fff1c6",spot,y,2,2);
          }
        }
        const x=lanes[lane];
        rect(lit && current.lane===lane ? (warning?"#a12b32":"#8e681e") : "#263343",x-10,43,20,9);
        ctx.font="bold 8px monospace";ctx.textAlign="center";ctx.fillStyle="#fff1cc";
        ctx.fillText(String(lane+1),x,51);
        if(crew>3){ctx.fillText("×"+crew,x,-92);}
      }
    }
    function frame(s){
      if(!back)return;ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(back,0,0);
      ctx.save();const shake=s.reduced?0:s.shake;ctx.translate(Math.round(cx+Math.sin(s.t*91)*shake),Math.round(cy+Math.cos(s.t*83)*shake));ctx.scale(scale,scale);
      if (stump.complete && stump.naturalWidth) {
        ellipse("#0c1421b8", 0, 61, 122, 22);
        ctx.drawImage(stump, -130, -53, 260, 139);
      } else {
        ctx.drawImage(wood, -135, -61);
      }
      const m=s.magnet,active=!s.boss && ["track","lock","slam"].includes(m.phase);
      if(active){ellipse(m.phase==="track"?"#ffc24427":"#d734443d",m.x,m.y+1,19,11);ring(m.phase==="track"?"#f9b64c":"#f55d60",m.x,m.y+1,19,11,1.5)}
      if(s.boss) bossFormation(s);
      if (s.boss?.phase === "counter" && !s.boss.counter) {
        const n = s.nails[0];
        const untilBeat = Math.max(0, 1 - 2*s.boss.clock/s.boss.beat);
        const radius = 10 + 19*untilBeat;
        ring("#fff099",n.x,n.y,radius,radius*.57,2);
      }
      s.nails.slice().sort((a,b)=>a.base-b.base).forEach(nail);
      if(active && m.phase!=="track"){
        ctx.save();ctx.translate(m.x,m.y);let k=Math.max(4,16*(1-m.elapsed/.8));ring("#fff2ba",0,0,k,k*.64,1);ctx.restore()}
      const px=s.aim.x,py=s.aim.y;
      const c=s.stun>0?"#fc6660":s.hover?"#efffd6":"#69e7de";ring("#233a3d",px,py,10,5,2);ring(c,px,py,10,5,1);rect(c,px-14,py,6,1);rect(c,px+9,py,6,1);rect(c,px,py-9,1,5);rect(c,px,py+5,1,4);
      let mx=m.phase==="rest"?Math.sin(s.t*.82)*65:m.x;
      let my=-68+(m.phase==="rest" || m.phase==="track" ? Math.sin(s.t*2)*3 : 0);
      if(m.phase==="slam"){my+=(m.y-15-my)*Math.min(1,m.elapsed/.19)**2}
      if(m.phase==="recover"){my+=(m.y-15-my)*(1-Math.min(1,m.elapsed/.52))**2}
      // The crane stays behind the mallet until its forward lunge.
      if(!s.boss && m.phase!=="slam"&&m.phase!=="recover")magnet(mx,my,s.t,m.phase);
      const grip=s.swing>0 && s.stroke ? s.stroke : s.aim;
      let pose = 0;
      if (s.swing > 0 && s.stroke) {
        const elapsed = s.stroke.duration - s.swing;
        const rebound = elapsed - swingTiming.contact - s.stroke.hold;
        if (elapsed < swingTiming.contact) pose = Math.floor(5 * elapsed / swingTiming.contact);
        else pose = rebound <= 0 ? 5 : Math.min(8,6 + Math.floor(3 * rebound / swingTiming.recovery));
      }
      hammer(grip.x,grip.y,pose);
      if(s.boss?.iframes>0)ring("#ffbd8b",px,py,15,8,1.5);
      if(!s.boss && (m.phase==="slam"||m.phase==="recover"))magnet(mx,my,s.t,m.phase==="recover"?"impact":"slam");
      for(const p of s.particles)rect(p.color,p.x,p.y,p.size,p.size);
      if(s.pop){ctx.font="bold 9px monospace";ctx.textAlign="center";const yy=s.pop.y-(.75-s.pop.ttl)*12;ctx.fillStyle="#1a2231";ctx.fillText(s.pop.text,s.pop.x+1,yy+1);ctx.fillStyle=s.pop.color;ctx.fillText(s.pop.text,s.pop.x,yy)}
      ctx.restore();
    }
    return {resize,delta,frame};
  }
  return {icon,renderer};
})();
