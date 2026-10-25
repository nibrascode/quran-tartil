import { chromium } from "playwright-core";
import fs from "fs";
const [w,h,out,step]=[+process.argv[2],+process.argv[3],process.argv[4],+(process.argv[5]||1)];
const b = await chromium.launch({ executablePath:process.env.CHROME||"/usr/bin/google-chrome", args:["--no-sandbox"] });
const p = await (await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1 })).newPage();
await p.context().addInitScript(() => { try { sessionStorage.setItem("qt.home", "0"); } catch {} }); // audits start in the reader, not on Home
await p.addInitScript(()=>{ localStorage.setItem("qt.v2", JSON.stringify({onboarded:true})); });
await p.goto((process.env.URL||"http://127.0.0.1:4180/"),{waitUntil:"networkidle"});
const res=[];
for(let n=1;n<=604;n+=step){
  await p.evaluate(n=>localStorage.setItem("page",n),n); await p.reload({waitUntil:"load"}); await p.waitForSelector(".layer.under .page .ln, .layer.under .page .sura-head"); await p.waitForTimeout(220);
  res.push(await p.evaluate(()=>{
    const pg=document.querySelector(".layer.under .page"), body=pg.querySelector(".page-body").getBoundingClientRect(), fr=pg.querySelector(".frame").getBoundingClientRect();
    const m=pg.querySelector(".mtext"); const tall=!!pg.querySelector(".page-body.tall"); const rows=[...m.children]; const issues=[];
    const rowCount=rows.length;
    rows.forEach((r,i)=>{const rc=r.getBoundingClientRect(); const cls=r.className;
      if(rc.left<body.left-1||rc.right>body.right+1) issues.push("row"+i+" outside x "+cls);
      if(!tall&&(rc.top<body.top-3||rc.bottom>body.bottom+3)) issues.push("row"+i+" outside y "+cls);
      if(r.scrollWidth>r.clientWidth+1) issues.push("row"+i+" scrollW "+cls);
      if(/sura-head/.test(cls)){ const sp=r.querySelector("span").getBoundingClientRect(); if(sp.right>rc.right+1||sp.left<rc.left-1||sp.height>rc.height+1) issues.push("head content overflow row"+i); if(rc.right>fr.right-2||rc.left<fr.left+2) issues.push("head touches frame"); if(rc.height<18) issues.push("head too short "+Math.round(rc.height)); }
      if(/\bln\b/.test(cls)){ const kids=[...r.children]; const l=Math.min(...kids.map(k=>k.getBoundingClientRect().left)), rr=Math.max(...kids.map(k=>k.getBoundingClientRect().right)); if(l<body.left-1||rr>body.right+1) issues.push("line words outside "+i); }
    });
    const lns=[...m.querySelectorAll(".ln")]; const fills=lns.map(l=>{const k=[...l.children];const a=Math.min(...k.map(x=>x.getBoundingClientRect().left)),z=Math.max(...k.map(x=>x.getBoundingClientRect().right));return (z-a)/body.width});
    const last=rows.at(-1).getBoundingClientRect();
    return {tall,page:+pg.dataset.page,rows:rowCount,minFill:Math.min(...fills),centered:m.querySelectorAll(".ln.c").length,gapBottom:Math.round(body.bottom-last.bottom),fs:parseFloat(m.style.fontSize),heads:m.querySelectorAll(".sura-head").length,docOverflow:document.documentElement.scrollWidth>innerWidth,issues};
  }));
}
fs.writeFileSync(out,JSON.stringify(res));
const bad=res.filter(r=>r.issues.length||r.docOverflow||(r.gapBottom>3&&!r.tall&&r.page>2));
console.log(w+"x"+h,"pages",res.length,"with issues",bad.length, JSON.stringify(bad.slice(0,8)));
const fsx=res.map(r=>r.fs);console.log("fs",Math.min(...fsx).toFixed(1),Math.max(...fsx).toFixed(1),"heads midpage pages",res.filter(r=>r.heads>0).length,"rows!=15/8",res.filter(r=>![15,8].includes(r.rows)).map(r=>r.page).slice(0,10), "minFill<.9 w/o centered",res.filter(r=>r.minFill<.9&&!r.centered).map(r=>r.page).slice(0,10));
await b.close(); if(bad.length) process.exit(1);
