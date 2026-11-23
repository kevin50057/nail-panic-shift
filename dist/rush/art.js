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
    const OUT="#1b1621";
    // 老師傅（正面）：藍工作服、皮圍裙、頭巾、眼鏡、八字鬍。腰部以下藏在木樁後面。
    function masterBody(b,t){
      ctx.save();ctx.translate(b.mx,b.my-(b.bob>0?Math.sin(b.bob/.18*Math.PI)*2:0));ctx.scale(1.3,1.3);
      poly(OUT,[[-17,4],[-16,-22],[-11,-27],[11,-27],[16,-22],[17,4]]);
      poly("#2f5f9a",[[-15,4],[-14,-21],[-10,-25],[10,-25],[14,-21],[15,4]]);
      rect("#4a7fc0",-12,-22,4,25);
      poly("#e9e2cf",[[-5,-25],[0,-19],[5,-25]]);
      rect(OUT,-9,-17,18,21);rect("#8a5a36",-8,-16,16,20);rect("#a8713f",-7,-15,3,18);
      rect("#6b4428",-8,-25,2,9);rect("#6b4428",6,-25,2,9);
      rect("#6b4428",-6,-9,7,6);rect("#f2c94c",-5,-13,2,5);rect("#e46a5a",-5,-14,2,1);
      rect(OUT,-20,-23,6,21);rect("#2f5f9a",-19,-22,4,16);rect("#f0b48a",-19,-6,4,3);
      rect("#d99a72",-3,-29,6,3);
      rect(OUT,-11,-47,22,20);rect("#f0b48a",-10,-46,20,18);rect("#ffd0a8",-9,-45,6,4);
      rect("#e2a07a",-12,-40,2,5);rect("#e2a07a",10,-40,2,5);
      rect(OUT,-12,-51,24,8);rect("#2b3f73",-11,-50,22,6);rect("#3f5a9c",-9,-50,10,2);
      rect("#e8ecf3",-6,-47,1,1);rect("#e8ecf3",2,-48,1,1);rect("#e8ecf3",7,-46,1,1);
      const f=Math.sin(t*6)*1.5;poly("#2b3f73",[[10,-48],[18,-46+f],[19,-41+f],[12,-44]]);
      rect(OUT,-9,-42,8,6);rect(OUT,1,-42,8,6);rect("#bfe6f2",-8,-41,6,4);rect("#bfe6f2",2,-41,6,4);rect(OUT,-1,-40,2,1);
      const blink=(t*1.3)%5<.12;
      if(blink){rect(OUT,-6,-39,3,1);rect(OUT,4,-39,3,1)}else{rect(OUT,-6,-40,2,3);rect(OUT,4,-40,2,3)}
      if(b.mood==="angry"){poly(OUT,[[-9,-46],[-2,-44],[-2,-43],[-9,-45]]);poly(OUT,[[9,-46],[2,-44],[2,-43],[9,-45]])}
      else if(b.mood==="happy"){rect(OUT,-8,-46,6,1);rect(OUT,2,-46,6,1)}
      rect("#e98a7a",-9,-35,3,2);rect("#e98a7a",6,-35,3,2);
      rect("#4a4146",-6,-34,12,3);rect("#4a4146",-8,-33,3,2);rect("#4a4146",5,-33,3,2);
      if(b.mood==="happy"){rect("#7a2e2e",-3,-31,6,1);rect("#7a2e2e",-4,-32,1,1);rect("#7a2e2e",3,-32,1,1)}
      else if(b.mood==="angry"){rect("#7a2e2e",-3,-30,6,1);rect("#7a2e2e",-4,-29,1,1);rect("#7a2e2e",3,-29,1,1)}
      else if(b.phase==="call"){rect("#7a2e2e",-2,-31,4,2)}
      else rect("#7a2e2e",-2,-30,4,1);
      ctx.restore();
    }
    // 右手與粉筆棍：畫在木樁前面，棍尖點在要畫圈的位置。
    function masterArm(b){
      const sx=b.mx+14*1.3,sy=b.my-22*1.3;
      let dx=b.tipX-sx,dy=b.tipY-sy;const len=Math.hypot(dx,dy)||1;
      const reach=Math.min(18,len*.45),hx=sx+dx/len*reach,hy=sy+dy/len*reach;
      ctx.lineCap="round";
      ctx.strokeStyle=OUT;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(hx,hy);ctx.stroke();
      ctx.strokeStyle="#2f5f9a";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(hx,hy);ctx.stroke();
      ctx.strokeStyle=OUT;ctx.lineWidth=3.4;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(b.tipX,b.tipY);ctx.stroke();
      ctx.strokeStyle="#9a6236";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(b.tipX,b.tipY);ctx.stroke();
      ctx.strokeStyle="#d9a066";ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(b.tipX,b.tipY);ctx.stroke();
      ctx.lineCap="butt";
      ellipse(OUT,hx,hy,4,4);ellipse("#f0b48a",hx,hy,3,3);
      rect(OUT,b.tipX-2,b.tipY-3,4,4);rect("#ff5d52",b.tipX-1.5,b.tipY-2.5,3,3);
    }
    // 歪掉的釘子（跟白班敲歪一樣）：釘身斜倒，釘頭偏到一邊。
    function bentNail(x,y){
      ellipse("#65422d78",x+4,y+1,8,3);
      ctx.strokeStyle="#3a3e46";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y-5);ctx.lineTo(x+9,y-8);ctx.stroke();
      ctx.strokeStyle="#aebcc0";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y-5);ctx.lineTo(x+9,y-8);ctx.stroke();
      ctx.save();ctx.translate(x+10,y-8);ctx.rotate(-.9);ellipse("#424851",0,1,6,2.6);ellipse("#bfced0",0,-.5,6,2.2);ctx.restore();
    }
    function bossMarks(s){
      const b=s.boss,t=b.time,NH=ForgeBoss.NH;
      ctx.font="bold 8px monospace";ctx.textAlign="center";
      const order=b.marks.filter(m=>m.shown>=0).sort((p,q)=>p.y-q.y);
      for(const m of order){
        const draw=Math.min(1,(t-m.shown)/(b.beat*.45));
        const current=(b.phase==="play"||b.phase==="count")&&m.i===b.cur;
        const done=m.state==="good"||m.state==="perfect",bad=m.state==="miss"||m.state==="bent";
        const col=done?"#ffd766":bad?"#8a7d78":current?"#ff6d5e":"#e9584e";
        if(!done&&!bad)ellipse(current?"#ff5d5244":"#ff5d5222",m.x,m.y,11,6.3);
        ctx.strokeStyle="#3a1c1c";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y,11,6.3,0,-Math.PI/2,-Math.PI/2+Math.PI*2*draw);ctx.stroke();
        ctx.strokeStyle=col;ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(m.x,m.y,11,6.3,0,-Math.PI/2,-Math.PI/2+Math.PI*2*draw);ctx.stroke();
        if(m.state==="wait"){
          ctx.fillStyle="#1a2231";ctx.fillText(String(m.i+1),m.x+1,m.y+3);
          ctx.fillStyle="#fff1cc";ctx.fillText(String(m.i+1),m.x,m.y+2);
        }
        if(current&&b.phase==="play"){
          const k=Math.max(0,Math.min(1,(m.due-t)/b.beat));
          const r=11+k*22;
          ring(k<.2?"#fff7c2":"#ffd24a",m.x,m.y,r,r*.573,k<.2?2.2:1.4);
        }
      }
      for(const m of order){
        if(m.state==="good"||m.state==="perfect"){
          const k=Math.min(1,(t-m.judgedAt)/.05);
          nail({x:m.x,base:m.y,y:m.y-NH*(1-k),hp:k<1?1:0,max:1,heavy:m.state==="perfect"});
        } else if(m.state==="bent") bentNail(m.nx,m.ny);
        else if(m.state==="miss"){ellipse("#3b231c99",m.x,m.y,5,2.5);rect("#2a1a16",m.x-2,m.y-1,4,1)}
        if(m.judgedAt&&t-m.judgedAt<.18){const r=9+(t-m.judgedAt)*80;ring(m.state==="miss"?"#ff8a7a":"#fff3c0",m.x,m.y,r,r*.573,1)}
      }
    }
    // 你的手：拇指和食指捏著一根釘子；被敲到會腫、會發紅。
    function bossHand(s){
      const b=s.boss,NH=ForgeBoss.NH,p=ForgeBoss.nailPos(b);
      const x=p.x,y=p.y,sw=b.sw,hot=b.hurt>0;
      const skin=hot?"#ff9a86":sw>=2?"#f39a84":sw>=1?"#f4a98a":"#f0b48a",shade=hot?"#e0705f":"#d99a72";
      const hasNail=!(b.slamMark&&t0(b)<.12);
      ring("#6be7de88",x,y,5,2.9,1);
      if(hasNail)nail({x,base:y,y:y-NH,hp:1,max:1});
      ctx.save();ctx.translate(x,y);ctx.scale(1.35,1.35);{const x=0,y=0;
      // 前臂從右下伸過來
      poly(OUT,[[x+3,y-11],[x+12,y-12],[x+34,y+20],[x+21,y+27]]);
      poly(skin,[[x+4,y-10],[x+11,y-11],[x+32,y+19],[x+22,y+25]]);
      poly(shade,[[x+16,y+4],[x+31,y+18],[x+24,y+23]]);
      rect("#2f5f9a",x+20,y+14,13,10);rect(OUT,x+19,y+13,1,12);
      // 拇指（在釘子右側）
      rect(OUT,x+1,y-10,7,6);rect(skin,x+2,y-9,5,4);rect("#fff0e0",x+2,y-9,2,1);
      // 食指橫過釘身，腫起來會變粗
      const th=4+Math.round(sw*1.5);
      rect(OUT,x-5-sw,y-8-th/2,14+sw,th+2);rect(skin,x-4-sw,y-7-th/2,12+sw,th);
      rect(shade,x-4-sw,y-7+th/2-2,12+sw,1);rect("#fff0e0",x-3-sw,y-7-th/2,2,1);
      if(sw>0)rect("#e2504a88",x-3-sw,y-6-th/2+1,4+sw,Math.max(1,th-3));
      }ctx.restore();
      if(hot){ctx.fillStyle="#ff6b5c";ctx.font="bold 8px monospace";ctx.fillText("！",x+12,y-14)}
    }
    const t0=b=>b.time-b.slamAt;
    // 師傅的鐵鎚：圖左右翻轉，讓握把朝向師傅。
    function bossHammer(s){
      const b=s.boss,NH=ForgeBoss.NH,{pose,lift}=ForgeBoss.hammerPose(b);
      const hx=b.hx,hy=b.hy-NH-lift;
      ctx.save();ctx.translate(hx,0);ctx.scale(-1,1);hammer(0,hy,pose);ctx.restore();
      const sx=b.mx+14*1.3,sy=b.my-22*1.3,ex=hx-36,ey=hy-34+(pose>=5?8:0);
      ctx.lineCap="round";
      ctx.strokeStyle=OUT;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.strokeStyle="#2f5f9a";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.lineCap="butt";
      ellipse(OUT,ex,ey,4.2,4.2);ellipse("#f0b48a",ex,ey,3.2,3.2);
    }
    function frame(s){
      if(!back)return;ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(back,0,0);
      ctx.save();const shake=s.reduced?0:s.shake;ctx.translate(Math.round(cx+Math.sin(s.t*91)*shake),Math.round(cy+Math.cos(s.t*83)*shake));ctx.scale(scale,scale);
      if (s.boss) masterBody(s.boss,s.t);
      if (stump.complete && stump.naturalWidth) {
        ellipse("#0c1421b8", 0, 61, 122, 22);
        ctx.drawImage(stump, -130, -53, 260, 139);
      } else {
        ctx.drawImage(wood, -135, -61);
      }
      const m=s.magnet,active=!s.boss && ["track","lock","slam"].includes(m.phase);
      if(active){ellipse(m.phase==="track"?"#ffc24427":"#d734443d",m.x,m.y+1,19,11);ring(m.phase==="track"?"#f9b64c":"#f55d60",m.x,m.y+1,19,11,1.5)}
      if(s.boss){bossMarks(s);bossHand(s);if(s.boss.phase==="enter"||s.boss.phase==="call")masterArm(s.boss);else bossHammer(s)}
      s.nails.slice().sort((a,b)=>a.base-b.base).forEach(nail);
      if(active && m.phase!=="track"){
        ctx.save();ctx.translate(m.x,m.y);let k=Math.max(4,16*(1-m.elapsed/.8));ring("#fff2ba",0,0,k,k*.64,1);ctx.restore()}
      const px=s.aim.x,py=s.aim.y;
      const c=s.stun>0?"#fc6660":s.hover?"#efffd6":"#69e7de";if(!s.boss){ring("#233a3d",px,py,10,5,2);ring(c,px,py,10,5,1);rect(c,px-14,py,6,1);rect(c,px+9,py,6,1);rect(c,px,py-9,1,5);rect(c,px,py+5,1,4);}
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
      if(!s.boss)hammer(grip.x,grip.y,pose);
      if(!s.boss && (m.phase==="slam"||m.phase==="recover"))magnet(mx,my,s.t,m.phase==="recover"?"impact":"slam");
      for(const p of s.particles)rect(p.color,p.x,p.y,p.size,p.size);
      if(s.pop){ctx.font="bold 9px monospace";ctx.textAlign="center";const yy=s.pop.y-(.75-s.pop.ttl)*12;ctx.fillStyle="#1a2231";ctx.fillText(s.pop.text,s.pop.x+1,yy+1);ctx.fillStyle=s.pop.color;ctx.fillText(s.pop.text,s.pop.x,yy)}
      ctx.restore();
    }
    return {resize,delta,frame};
  }
  return {icon,renderer};
})();
