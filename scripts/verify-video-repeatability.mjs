// Run against a local server or an authorized Preview. No inference mocks.
// npm install --no-save playwright (or set PLAYWRIGHT_MODULE to an existing copy).
// node scripts/verify-video-repeatability.mjs --url URL --video FILE --browser webkit --output report.json
import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {createRequire} from "node:module";
import {parseArgs} from "node:util";
const {values}=parseArgs({options:{url:{type:"string"},video:{type:"string"},browser:{type:"string",default:"chromium"},output:{type:"string",default:"repeatability.json"},runs:{type:"string",default:"3"}}});
if(!values.url||!values.video||!["chromium","webkit"].includes(values.browser))throw new Error("Provide --url, --video and --browser chromium|webkit");
const runs=Number(values.runs);if(!Number.isInteger(runs)||runs<1||runs>10)throw new Error("--runs must be between 1 and 10");
const require=createRequire(import.meta.url),playwright=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const video=resolve(values.video),report={browser:values.browser,url:values.url,inputSha256:createHash("sha256").update(readFileSync(video)).digest("hex"),runs:[],pageErrors:[],outboundPosts:[]};
const browser=await playwright[values.browser].launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on("pageerror",e=>report.pageErrors.push(e.message));
 page.on("request",req=>{if(req.method()==="POST")report.outboundPosts.push(new URL(req.url()).origin+new URL(req.url()).pathname)});
 await page.addInitScript(()=>{window.analysisReports=[];window.analysisDiagnostic=null;window.addEventListener("movalyt:analysis-timing",e=>window.analysisReports.push(e.detail));window.addEventListener("movalyt:analysis-diagnostic",e=>window.analysisDiagnostic=e.detail)});
 await page.goto(values.url,{waitUntil:"domcontentloaded"});
 if(!new URL(values.url).hash)await page.evaluate(()=>{location.hash="analyze"});
 for(let i=0;i<runs;i++){
  await page.locator("#file").setInputFiles(video);
  await page.waitForFunction(n=>window.analysisReports.length>n,i,{timeout:240000});
  const run=await page.evaluate(()=>({timing:window.analysisReports.at(-1),diagnostic:window.analysisDiagnostic,displayedScore:document.getElementById("score").textContent}));
  report.runs.push(run);writeFileSync(values.output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({run:i+1,outcome:run.timing.outcome,score:run.displayedScore,ms:run.timing.totalMs}));
  if(run.timing.outcome!=="scored")throw new Error("Real video did not produce a reliable scored result");
 }
 const reference=JSON.stringify(report.runs[0].diagnostic);
 report.identical=report.runs.every(run=>JSON.stringify(run.diagnostic)===reference&&run.displayedScore===report.runs[0].displayedScore);
 if(!report.identical||report.pageErrors.length||report.outboundPosts.length)throw new Error("Repeatability, page-error or local-processing check failed; see report");
}finally{await browser.close();writeFileSync(values.output,JSON.stringify(report,null,2))}
