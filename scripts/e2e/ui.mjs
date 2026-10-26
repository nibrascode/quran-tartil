import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath:process.env.CHROME||"/usr/bin/google-chrome", args:["--no-sandbox"] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, hasTouch:true, isMobile:true });
const p = await ctx.newPage(); const errs=[]; p.on("pageerror",e=>errs.push(e.stack.split("\n").slice(0,2).join("|"))); p.on("console",m=>m.type()==="error"&&errs.push("console:"+m.text()));
await p.context().addInitScript(() => { try { sessionStorage.setItem("qt.home", "0"); } catch {} }); // audits start in the reader, not on Home
await p.addInitScript(()=>{ const C = class { start(){ window.__rec=this; } abort(){} stop(){} }; window.webkitSpeechRecognition = C; window.SpeechRecognition = C; });
const S="/workspace/screens/quran7/"; const issues=[];
const check=(tag)=>p.evaluate((tag)=>{ const out=[]; const W=innerWidth,H=innerHeight;
  if(document.documentElement.scrollWidth>W) out.push("doc scrollX");
  const root=document.querySelector(".sheet")||document.querySelector(".ob")||document.body;
  root.querySelectorAll("*").forEach(e=>{ const r=e.getBoundingClientRect(); if(!r.width||!r.height) return; const cs=getComputedStyle(e); if(cs.visibility==="hidden"||cs.display==="none") return;
    if(e.closest(".tabs")) return;
    if(r.right>W+1||r.left<-1) out.push("outside x: "+e.tagName+"."+String(e.className).slice(0,30)+" "+Math.round(r.left)+"-"+Math.round(r.right));
    const ox=cs.overflowX; if(e.scrollWidth>e.clientWidth+2 && !/auto|scroll/.test(ox) && e.clientWidth>0 && cs.display!=="inline" && cs.textOverflow!=="ellipsis" && !e.closest("svg")) out.push("clipped: "+e.tagName+"."+String(e.className).slice(0,30)+" "+e.scrollWidth+">"+e.clientWidth);
  });
  return out.slice(0,6).map(x=>tag+" "+x); },tag);
const go=async(lang,theme,page=3,ob=false)=>{ await p.goto((process.env.URL||"http://127.0.0.1:4180/")); await p.evaluate(([l,t,pg,ob])=>{localStorage.clear();localStorage.setItem("qt.v2",JSON.stringify(ob?{}:{onboarded:true}));localStorage.setItem("page",pg);localStorage.setItem("theme",t);localStorage.setItem("lang",l)},[lang,theme,page,ob]); await p.reload({waitUntil:"networkidle"}); await p.waitForTimeout(350); };
const langs=["az","en","tr","ar","ru"], themes=["light","dark","sepia"];
for(const lang of langs) for(const theme of themes){
  await go(lang,theme,1,true); issues.push(...await check(`ob ${lang}/${theme}`)); 
  for(let i=0;i<1;i++){ await p.click("button.primary"); await p.waitForTimeout(150); issues.push(...await check(`ob${i+2} ${lang}/${theme}`)); } // onboarding has 2 steps while RECITE=false (mic step hidden)
  await go(lang,theme,50);
  await p.mouse.click(195,12); await p.waitForTimeout(300);
  await p.click(".bar.top .ib >> nth=0"); await p.waitForTimeout(400);
  const tabs=await p.$$('[role=tab]');
  for(let i=0;i<tabs.length;i++){ const tabs2=await p.$$('[role=tab]'); await tabs2[i].click(); await p.waitForTimeout(250); issues.push(...await check(`tab${i} ${lang}/${theme}`)); }
}
// settings cards open each
await go("tr","sepia",50); await p.mouse.click(195,12); await p.click('.bar.top .ib >> nth=-1'); await p.waitForTimeout(400);
const n=await p.$$eval(".scard-h:not(.link)",e=>e.length);
for(let i=0;i<n;i++){ await p.evaluate(i=>{const h=document.querySelectorAll(".scard-h:not(.link)")[i];h.click()},i); await p.waitForTimeout(400); issues.push(...await check("card"+i+" tr/sepia")); }
console.log("errors",errs.slice(0,5)); console.log("issues",issues.length); console.log([...new Set(issues)].slice(0,40).join("\n")); await b.close(); if(issues.length||errs.length) process.exit(1);
