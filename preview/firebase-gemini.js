// Firebase AI Logic client. No user-supplied Gemini key and no custom backend necessary.
// Google-managed proxy keeps the Gemini service credential off the client.
// Enforce App Check with a production reCAPTCHA Enterprise site key before enabling AI.
import {firebaseConfig,recaptchaEnterpriseSiteKey} from "./firebase-config.js";
const VERSION="13.1.0";
const cdn=(service)=>"https://www.gstatic.com/firebasejs/"+VERSION+"/firebase-"+service+".js";
export function geminiReady(){
 return !!(firebaseConfig?.apiKey&&firebaseConfig?.appId&&firebaseConfig?.projectId&&recaptchaEnterpriseSiteKey);
}
let modelPromise=null;
async function getModel(){
 if(!geminiReady())throw new Error("חיבור Firebase עדיין לא הוגדר על ידי בעל האפליקציה.");
 if(modelPromise)return modelPromise;
 modelPromise=(async()=>{
  const [{initializeApp},{initializeAppCheck,ReCaptchaEnterpriseProvider},{getAI,getGenerativeModel,GoogleAIBackend,Schema}]=await Promise.all([
   import(cdn("app")),import(cdn("app-check")),import(cdn("ai"))
  ]);
  const app=initializeApp(firebaseConfig);
  initializeAppCheck(app,{
   provider:new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
   isTokenAutoRefreshEnabled:true
  });
  const ai=getAI(app,{backend:new GoogleAIBackend()});
  const responseSchema=Schema.object({
   properties:{
    summary:Schema.string(),
    observations:Schema.array({items:Schema.object({
     properties:{key:Schema.string(),finding:Schema.string(),correction:Schema.string()}
    })}),
    drills:Schema.array({items:Schema.object({
     properties:{id:Schema.string(),reason:Schema.string()}
    })})
   }
  });
  return getGenerativeModel(ai,{
   model:"gemini-3.8-flash",
   generationConfig:{responseMimeType:"application/json",responseSchema,
    temperature:0.25,maxOutputTokens:2400}
  });
 })().catch(err=>{modelPromise=null;throw err});
 return modelPromise;
}
export async function getSharedGemini(prompt){
 if(typeof prompt!=="string"||prompt.length>14500)throw new Error("בקשת המשוב גדולה מדי.");
 const model=await getModel();
 const result=await model.generateContent(prompt);
 const responseText=result.response.text();
 if(!responseText)throw new Error("Gemini לא החזיר משוב.");
 return JSON.parse(responseText);
}
