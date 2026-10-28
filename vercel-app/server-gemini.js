// Server-side Gemini bridge: clients never access the Gemini secret.
let enabled=false;
export const geminiReady=()=>enabled;
export async function checkGeminiStatus(){
 try{
  const r=await fetch("/api/coach",{cache:"no-store"});
  if(!r.ok)throw Error("status unavailable");
  const data=await r.json();
  enabled=data?.enabled===true;
 }catch{enabled=false}
 return enabled;
}
export async function getSharedGemini(evidence,{signal}={}){
 if(!enabled)throw Error("Gemini עדיין לא הופעל.");
 const response=await fetch("/api/coach",{
  method:"POST",headers:{"Content-Type":"application/json"},
  cache:"no-store",signal,body:JSON.stringify({evidence})
 });
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(body.message||"Gemini לא זמין כרגע.");
 return body;
}
