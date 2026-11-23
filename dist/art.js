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
    pad:["...111111111...","..11.......11..",".11.........11.",".1..1.....1..1.","11.111...1...11","11..1......1.11","11...........11",".11..11111..11.","..111.....111.."],
    glasses:[".1111......1111.","122221....122221","123221111123221.","122221....122221",".1111......1111."],
    thimble:["...1111...","..122221..",".12323221.",".12232321.",".12323221.",".12232321.","1222222221","1111111111"],
    ice:["..11111111..",".1222222221.","123322222221","122222233221","122332222221",".1222222221.","..11111111.."],
    glove:["...1111....","..11..11...","1111111111.","1222332221.","1223333221.","1222332221.","1222222221.","1111111111."],
    heavy:["1111111.....","1222221.....","1233321444..","12333214444.","1222221.4444","1111111..444"],
    coffee:[".3..3.....","..3..3....","1111111...","1222221111","1222221..1","1222221111",".12221....","..111....."],
    lure:["....1.....","...121....","..12321...","..12321...","...121....","....4.....","..44444...",".44...44.."],
    bonus:["..111111..",".12222221.","1223333221","1232222321","1223333221",".12222221.","..111111.."],
    bandage:["..111111111111..",".12222222222221.","1242223333222421","1222223333222221","1242223333222421",".12222222222221.","..111111111111.."],
    sun:[".....1.....",".1...1...1.","..1.....1..","....222....","...22222...","11.22222.11","...22222...","....222....","..1.....1..",".1...1...1.",".....1....."],
    moon:["....1111..","..111.....",".1122.....",".112......","112.......","112.......",".112......",".1122.....","..111.....","....1111.."]
  };
  const palettes={arcade:["#ffad4c","#ffce55","#28435a","#8ffae0"],clock:["#ffec94","#edb643"],nail:["#317f8f","#69dacc","#c0fff1"],bolt:["#f17e45","#ffab71"],trophy:["#8468bd","#cfafff"],
    glasses:["#ffc94a","#7fc8ff","#ffffff"],thimble:["#2a2a33","#aeb8c2","#e8eef2"],ice:["#1f3b5c","#7fc8ff","#e6f6ff"],glove:["#3a1a1a","#e14b4b","#ffffff"],
    heavy:["#1d1f26","#5a6370","#9aa5b1","#c98a4b"],coffee:["#3b2416","#e9dccb","#c9d6e0"],lure:["#5c3b00","#ffd24a","#fff6c2","#8a93a0"],bonus:["#6b4a00","#ffcf4a","#fff1a8"],
    bandage:["#7a4b2a","#eab98a","#f7dfc4","#b98458"],sun:["#ffce55","#ff9254"],moon:["#d2e6ff","#8fb4e8"]};
  function icon(name){
    const rows=icons[name],pal=palettes[name]||["currentColor"];
    let pixels="";rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c!==".")pixels+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+pal[+c-1]+'"/>'}));
    return '<svg viewBox="0 0 '+Math.max(...rows.map(r=>r.length))+' '+rows.length+'" aria-hidden="true">'+pixels+'</svg>';
  }
  function seed(index){let n=(index+31)>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
  const rect=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  const poly=(g,c,pts)=>{g.fillStyle=c;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill()};
  function canvas(w,h){const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}

  // Night shift: the original NAIL PANIC! factory backdrop.
  function night(cv){
    const b=cv.getContext("2d"),width=cv.width,height=cv.height,cx=width*.5,scale=Math.min(width/282,height/207),ground=height*.61+18*scale;
    const rand=seed(108);const grad=b.createLinearGradient(0,0,0,height);grad.addColorStop(0,"#101726");grad.addColorStop(.66,"#2d3949");grad.addColorStop(.8,"#243144");grad.addColorStop(1,"#111925");b.fillStyle=grad;b.fillRect(0,0,width,height);
    for(let x=-8;x<width;x+=24){let top=Math.floor(ground*(.14+rand()*.35));rect(b,"#192737",x,top,26,ground-top);rect(b,"#203245",x+3,top+4,21,ground-top-3);
      for(let y=top+7;y<ground-7;y+=8)for(let j=0;j<3;j++){if(rand()>.50)rect(b,rand()>.30?"#27505c":"#3c7878",x+4+j*6,y,3,4)}}
    for(let x=0;x<width+75;x+=77){rect(b,"#101b29",x,0,8,ground);rect(b,"#3c4655",x+1,0,2,ground);for(let y=0;y<ground;y+=31){rect(b,"#101a27",x-2,y,12,7);rect(b,"#56606c",x-1,y+1,9,2)}}
    const truss=ground*.25;rect(b,"#0e1622",0,truss,width,7);rect(b,"#344051",0,truss,width,2);
    for(let x=-3;x<width;x+=40)poly(b,"#1c2736",[[x,truss+6],[x+4,truss+6],[x+24,truss+22],[x+40,truss+6],[x+44,truss+6],[x+25,truss+26],[x+20,truss+26]]);
    rect(b,"#131c2b",0,truss+24,width,4);
    for(let x=22;x<width;x+=112){let y=truss+Math.floor(6+rand()*18);rect(b,"#172032",x,0,2,y);poly(b,"#202b39",[[x-6,y+4],[x-2,y],[x+4,y],[x+8,y+4]]);rect(b,"#d1ab74",x-5,y+4,11,1);poly(b,"#ac8c6010",[[x-4,y+6],[x+6,y+6],[x+24,y+51],[x-24,y+51]])}
    for(let x=0;x<width;x+=8)rect(b,"#131e29",x,ground-15,2,16);rect(b,"#5b5141",0,ground-16,width,2);rect(b,"#131a26",0,ground,width,8);rect(b,"#4b4850",0,ground+1,width,2);
    for(let y=ground+10;y<height;y+=11)rect(b,"#2b3746",0,y,width,1);
    for(let x=-width;x<width*2;x+=54)poly(b,"#17212c",[[cx+(x-cx)*.45,ground+2],[cx+(x-cx)*.45+1,ground+2],[x+2,height],[x,height]]);
    for(let i=0;i<width/5;i++){const x=rand()*width,y=ground+rand()*(height-ground);rect(b,"#44505c52",x,y,1+rand()*4,1)}
  }

  // Day shift: the old master's warm workshop, drawn in the same pixel language.
  function day(cv){
    const b=cv.getContext("2d"),width=cv.width,height=cv.height,rand=seed(77),ground=Math.round(height*.61+18*Math.min(width/282,height/207));
    for(let x=0;x<width;x+=14){rect(b,["#5e3c25","#68442a","#573722","#6f4a2e"][Math.floor(rand()*4)],x,0,14,ground);rect(b,"#3a2416",x,0,1,ground);
      for(let y=8+Math.floor(rand()*20);y<ground;y+=40+Math.floor(rand()*30))rect(b,"#2e1c11",x+6,y,2,2)}
    const beam=Math.round(ground*.16);rect(b,"#2f1d12",0,beam,width,8);rect(b,"#86593a",0,beam,width,2);
    const ww=Math.round(Math.min(width*.2,90)),wh=Math.round(ground*.34),wx=Math.round(width*.1),wy=Math.round(ground*.3);
    rect(b,"#2a1a10",wx-4,wy-4,ww+8,wh+8);
    for(let y=0;y<wh;y+=2){const k=y/wh;rect(b,`rgb(${Math.round(150+105*k)},${Math.round(205+20*k)},${Math.round(255-90*k)})`,wx,wy+y,ww,2)}
    rect(b,"#fff6d0",wx+ww*.62,wy+wh*.2,ww*.16,ww*.16);
    rect(b,"#2a1a10",wx+ww/2-2,wy,4,wh);rect(b,"#2a1a10",wx,wy+wh/2-2,ww,4);rect(b,"#86593a",wx-6,wy+wh+4,ww+12,4);
    poly(b,"rgba(255,226,160,.10)",[[wx,wy+wh],[wx+ww,wy+wh],[wx+ww+width*.22,ground],[wx+width*.1,ground]]);
    const px=Math.round(width*.64),pw=Math.round(Math.min(width*.28,130)),py=Math.round(ground*.27),ph=Math.round(ground*.42);
    rect(b,"#2a1a10",px-3,py-3,pw+6,ph+6);rect(b,"#9a7650",px,py,pw,ph);
    for(let y=py+4;y<py+ph;y+=7)for(let x=px+4;x<px+pw;x+=7)rect(b,"#6b5136",x,y,1,1);
    poly(b,"#c9d0d8",[[px+8,py+10],[px+pw*.42,py+10],[px+pw*.42,py+17],[px+8,py+27]]);rect(b,"#b5562f",px+pw*.42,py+7,8,13);
    rect(b,"#c8874a",px+pw*.58,py+12,3,ph*.55);rect(b,"#5d656e",px+pw*.58-5,py+8,13,6);
    rect(b,"#cf9f2a",px+pw*.78,py+8,5,ph*.72);for(let y=py+10;y<py+8+ph*.72;y+=4)rect(b,"#5a4210",px+pw*.78,y,2,1);
    rect(b,"#8a939c",px+pw*.2,py+ph*.6,pw*.3,4);rect(b,"#8a939c",px+pw*.2,py+ph*.6-3,4,10);
    const sx=Math.round(width*.02),sy=Math.round(ground*.8),sw=Math.min(width*.34,160);rect(b,"#86593a",sx,sy,sw,4);rect(b,"#2f1d12",sx,sy+4,sw,2);
    ["#3d6b74","#b8863b","#6c3d2a","#d8c9a0","#47607d"].forEach((c,i)=>{const h=8+Math.floor(rand()*8);rect(b,c,sx+6+i*16,sy-h,11,h);rect(b,"#2a1a10",sx+6+i*16,sy-h,11,2)});
    const lx=Math.round(width*.5);rect(b,"#1e140c",lx,0,2,beam+10);poly(b,"#2d4766",[[lx-13,beam+19],[lx+15,beam+19],[lx+7,beam+9],[lx-5,beam+9]]);rect(b,"#ffe9b0",lx-9,beam+19,20,2);
    poly(b,"rgba(255,214,140,.09)",[[lx-10,beam+21],[lx+12,beam+21],[lx+width*.22,ground],[lx-width*.22,ground]]);
    rect(b,"#3b2618",0,ground,width,height-ground);rect(b,"#24170e",0,ground,width,3);
    for(let y=ground+7;y<height;y+=9)rect(b,"#2c1c12",0,y,width,1);
    for(let i=0;i<width/6;i++)rect(b,"#4a3020",rand()*width,ground+rand()*(height-ground),2+rand()*5,1);
  }
  return {icon,night,day,canvas,seed};
})();
