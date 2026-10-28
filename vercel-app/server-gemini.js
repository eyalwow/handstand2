// Athlete cloud bridge is intentionally closed. No key, environment flag or stored
// permission enables a provider until the audience and data terms are approved.
export const cloudFeedbackPolicy=Object.freeze({
 enabled:false,
 reason:"provider_audience_review_required",
 message:"משוב AI בענן אינו זמין כרגע. תנאי הספק הנוכחי אינם מתאימים לאפליקציה שעשויה לשמש בני פחות מ־18. הניתוח והמשוב המקומיים זמינים במלואם."
});
export const geminiReady=()=>false;
export async function checkGeminiStatus(){return false}
export async function getSharedGemini(){
 throw new Error(cloudFeedbackPolicy.message);
}
