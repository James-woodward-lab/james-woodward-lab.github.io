const $ = id => document.getElementById(id);
const CONFIG = window.CALCULATOR_CONFIG || {};
let lastSummary = "";

function init(){
  $("apiKey").value = localStorage.getItem("rcpchApiKey") || CONFIG.rcpchApiKey || "";
  $("apiEndpoint").value = localStorage.getItem("rcpchEndpoint") || CONFIG.rcpchEndpoint || "https://api.rcpch.ac.uk/growth/v1/uk-who/calculation";
  const today = new Date().toISOString().slice(0,10); $("obsDate").value = today;
  $("calcForm").addEventListener("submit", handleSubmit);
  $("resetBtn").addEventListener("click", () => location.reload());
  $("copyBtn").addEventListener("click", copyResults);
  $("saveSettingsBtn").addEventListener("click", saveSettings);
  $("testApiBtn").addEventListener("click", testApiConnection);
}

function saveSettings(){
  localStorage.setItem("rcpchApiKey", $("apiKey").value.trim());
  localStorage.setItem("rcpchEndpoint", $("apiEndpoint").value.trim());
  setStatus("Settings saved in this browser", "ok");
}
function setStatus(text, cls="") { const el=$("apiStatus"); el.textContent=text; el.className="status-card"+(cls?" "+cls:""); }
function msg(text,type=""){ const div=document.createElement("div"); div.className="message "+type; div.textContent=text; $("messages").appendChild(div); }
function clearMessages(){ $("messages").innerHTML=""; }
function dateDiffYearsMonths(dob, obs){
  let y = obs.getFullYear()-dob.getFullYear(); let m = obs.getMonth()-dob.getMonth();
  if(obs.getDate()<dob.getDate()) m--; if(m<0){y--;m+=12;} return {years:y, months:m, decimal:(obs-dob)/(365.25*24*3600*1000)};
}
function fmtCentile(v){ if(v===null || v===undefined || Number.isNaN(v)) return "—"; const n=Number(v); if(n<1) return "<1st"; if(n>99) return ">99th"; return `${Math.round(n)}${suffix(Math.round(n))}`; }
function suffix(n){ const v=n%100; if(v>=11&&v<=13)return"th"; if(n%10===1)return"st"; if(n%10===2)return"nd"; if(n%10===3)return"rd"; return"th"; }
function calculateBMI(weightKg,heightCm){ const m=heightCm/100; return weightKg/(m*m); }
function validateInputs(v){
  const errors=[];
  if(v.age.decimal < 2 || v.age.decimal > 18.999) errors.push("This tool is intended for children aged 2–18 years.");
  if(v.height<50||v.height>220) errors.push("Height appears outside the permitted range of 50–220 cm.");
  if(v.weight<2||v.weight>250) errors.push("Weight appears outside the permitted range of 2–250 kg.");
  if(v.sbp<40||v.sbp>250) errors.push("Systolic BP appears outside the permitted range of 40–250 mmHg.");
  if(v.dbp<20||v.dbp>150) errors.push("Diastolic BP appears outside the permitted range of 20–150 mmHg.");
  if(v.dbp>v.sbp) errors.push("Diastolic BP is higher than systolic BP.");
  return errors;
}
async function handleSubmit(e){
  e.preventDefault(); clearMessages(); $("copyBtn").disabled=true;
  const dob = new Date($("dob").value+"T00:00:00"); const obs = new Date($("obsDate").value+"T00:00:00");
  const values = { dob:$("dob").value, obsDate:$("obsDate").value, sex:$("sex").value, height:parseFloat($("height").value), weight:parseFloat($("weight").value), sbp:parseFloat($("sbp").value), dbp:parseFloat($("dbp").value), age:dateDiffYearsMonths(dob,obs) };
  const errors=validateInputs(values); if(errors.length){ errors.forEach(x=>msg(x,"error")); return; }
  const bmi = calculateBMI(values.weight,values.height);
  $("ageOut").textContent = `${values.age.years}y ${values.age.months}m`;
  $("bmiOut").textContent = `${bmi.toFixed(1)} kg/m²`;
  let growth = null;
  try { growth = await getGrowthResults(values, bmi); setStatus("RCPCH API connected", "ok"); }
  catch(err){ setStatus("RCPCH API unavailable", "bad"); msg(`Growth API call failed: ${err.message}`, "warn"); msg("If this says CORS/network error, the static no-server approach is being blocked by the browser or network. BP and actual BMI still calculate locally.", "warn"); }
  const bp = calculateBp(values.sex, values.age.decimal, values.sbp, values.dbp);
  renderResults(values,bmi,growth,bp);
}
async function testApiConnection(){
  clearMessages(); setStatus("Testing API…");
  const sample={dob:"2020-04-12",obsDate:"2028-06-12",sex:"female",height:115,weight:20,sbp:100,dbp:60,age:{decimal:8.17}};
  try { await callRcpch(sample.height,"height",sample); setStatus("API test successful","ok"); msg("RCPCH API test succeeded."); }
  catch(err){ setStatus("API test failed","bad"); msg(`API test failed: ${err.message}`,"error"); }
}
async function getGrowthResults(v,bmi){
  // Only two RCPCH POST calls are needed: one height and one BMI.
  // The RCPCH BMI response includes measurement_calculated_values.corrected_percentage_median_bmi
  // and chronological_percentage_median_bmi, so no binary-search / extra median calls are required.
  const [heightResp,bmiResp] = await Promise.all([callRcpch(v.height,"height",v), callRcpch(bmi,"bmi",v)]);
  const height = extractGrowth(heightResp);
  const bmiGrowth = extractGrowth(bmiResp);
  if(typeof bmiGrowth.percentageMedianBmi === "number" && Number.isFinite(bmiGrowth.percentageMedianBmi)){
    bmiGrowth.estimatedMedianFromPercentage = bmi / (bmiGrowth.percentageMedianBmi / 100);
  }
  return { height, bmi: bmiGrowth, apiCallsUsed: 2, raw:{heightResp,bmiResp} };
}
async function callRcpch(value,method,v){
  const key=$("apiKey").value.trim(); const endpoint=$("apiEndpoint").value.trim(); if(!key) throw new Error("No RCPCH API key configured.");
  const payload={birth_date:v.dob, observation_date:v.obsDate, observation_value:Number(value), sex:v.sex, gestation_weeks:40, gestation_days:0, measurement_method:method};
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",[CONFIG.apiHeaderName||"Subscription-Key"]:key},body:JSON.stringify(payload)});
  const text=await response.text();
  if(!response.ok){ throw new Error(`HTTP ${response.status}: ${text.slice(0,180)}`); }
  try{return JSON.parse(text);}catch{throw new Error("API returned non-JSON response.");}
}
function findNumberDeep(obj, keys){
  const wanted=keys.map(k=>k.toLowerCase()); const seen=new Set();
  function walk(x){
    if(!x||typeof x!=="object"||seen.has(x))return null; seen.add(x);
    for(const [k,v] of Object.entries(x)){ if(wanted.includes(k.toLowerCase()) && typeof v==="number") return v; }
    for(const v of Object.values(x)){ const r=walk(v); if(r!==null) return r; }
    return null;
  } return walk(obj);
}
function extractGrowth(resp){
  return {
    centile: findNumberDeep(resp,["corrected_centile","chronological_centile","centile","measurement_centile","corrected_measurement_centile"]),
    sds: findNumberDeep(resp,["corrected_sds","chronological_sds","sds","measurement_sds","corrected_measurement_sds","y"]),
    // For BMI, the RCPCH API returns this directly in measurement_calculated_values.
    percentageMedianBmi: findNumberDeep(resp,["corrected_percentage_median_bmi","chronological_percentage_median_bmi","percentage_median_bmi"]),
    median: findNumberDeep(resp,["median","m","measurement_median","median_bmi","p50","fiftieth_centile"])
  };
}
function normalCdf(z){
  // Abramowitz and Stegun approximation, adequate for display logic only.
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const erf = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-z*z);
  return 0.5 * (1 + sign * erf);
}
function growthScoreForMedianSearch(g){
  if(g && typeof g.sds === "number" && Number.isFinite(g.sds)) return g.sds;
  if(g && typeof g.centile === "number" && Number.isFinite(g.centile)) return g.centile - 50;
  return null;
}
async function estimateMedianBmiFromApi(v){
  // The calculation endpoint returns centile/SDS for an observed BMI but usually not the median BMI (M).
  // To avoid embedding licensed LMS tables, estimate the median by finding the BMI where SDS≈0 / centile≈50.
  // This uses the same RCPCH API, but requires extra calls. Local validation remains required.
  let low = 8, high = 40;
  let lowScore = null, highScore = null;
  try {
    lowScore = growthScoreForMedianSearch(extractGrowth(await callRcpch(low,"bmi",v)));
    highScore = growthScoreForMedianSearch(extractGrowth(await callRcpch(high,"bmi",v)));
    // Expand the search range if needed for unusual children/ages.
    if(lowScore !== null && lowScore > 0){ low = 5; lowScore = growthScoreForMedianSearch(extractGrowth(await callRcpch(low,"bmi",v))); }
    if(highScore !== null && highScore < 0){ high = 60; highScore = growthScoreForMedianSearch(extractGrowth(await callRcpch(high,"bmi",v))); }
    if(lowScore === null || highScore === null) return {value:null, method:"unavailable", callsUsed:null, warning:"RCPCH API response did not include centile or SDS for median BMI search."};
    if(!(lowScore <= 0 && highScore >= 0)) return {value:null, method:"unavailable", callsUsed:null, warning:"Median BMI search range did not bracket the 50th centile."};
    let mid = null, midScore = null, calls = 2;
    for(let i=0;i<12;i++){
      mid = (low + high) / 2;
      midScore = growthScoreForMedianSearch(extractGrowth(await callRcpch(mid,"bmi",v)));
      calls++;
      if(midScore === null) return {value:null, method:"unavailable", callsUsed:calls, warning:"Median BMI search failed because a BMI API response lacked centile/SDS."};
      if(Math.abs(midScore) < 0.02) break;
      if(midScore < 0) low = mid; else high = mid;
    }
    return {value:mid, method:"api_binary_search_50th_centile", callsUsed:calls};
  } catch(err){
    return {value:null, method:"failed", callsUsed:null, warning:err.message};
  }
}
function calculateBp(sex,ageDecimal,sbp,dbp){
  const ref=window.BP_REFERENCE; if(ageDecimal < ref.minAge) return {available:false,reason:"BP centiles unavailable below 4 years using this Jackson 2007 GB reference approach."};
  if(ageDecimal > ref.maxAge+0.999) return {available:false,reason:"BP centile reference in this tool is restricted to ages 4–18 years."};
  const rows=ref.data[sex]; const low=Math.max(ref.minAge,Math.floor(ageDecimal)); const high=Math.min(ref.maxAge,Math.ceil(ageDecimal)); const frac=high===low?0:(ageDecimal-low)/(high-low);
  const a=rows.find(r=>r.age===low), b=rows.find(r=>r.age===high);
  function interp(kind,p){return a[kind][p]+(b[kind][p]-a[kind][p])*frac;}
  function estimate(value,kind){
    const pts=[{c:50,v:interp(kind,"p50")},{c:90,v:interp(kind,"p90")},{c:95,v:interp(kind,"p95")},{c:99,v:interp(kind,"p99")}];
    if(value<=pts[0].v) return Math.max(1,50-(pts[0].v-value)*2.5);
    for(let i=0;i<pts.length-1;i++){ if(value<=pts[i+1].v){ const t=(value-pts[i].v)/(pts[i+1].v-pts[i].v); return pts[i].c+t*(pts[i+1].c-pts[i].c); } }
    return Math.min(99.9,99+(value-pts[3].v)*0.25);
  }
  const sbpC=estimate(sbp,"sbp"), dbpC=estimate(dbp,"dbp"); const highest=Math.max(sbpC,dbpC);
  let category="<90th"; if(highest>=99) category=">99th"; else if(highest>95) category=">95th"; else if(highest>=90) category="90–95th";
  return {available:true,sbpCentile:sbpC,dbpCentile:dbpC,category};
}
function renderResults(v,bmi,growth,bp){
  const bmiCentile=growth?.bmi?.centile;
  const heightCentile=growth?.height?.centile;
  const pmBMI = growth?.bmi?.percentageMedianBmi;
  const median = growth?.bmi?.median || growth?.bmi?.estimatedMedianFromPercentage;
  $("bmiCentileOut").textContent=fmtCentile(bmiCentile);
  $("heightCentileOut").textContent=fmtCentile(heightCentile);
  if($("medianBmiOut")) $("medianBmiOut").textContent = median ? `${median.toFixed(2)} kg/m²` : "—";
  $("pmBMIOut").textContent = (typeof pmBMI === "number" && Number.isFinite(pmBMI)) ? `${pmBMI.toFixed(0)}%` : "—";
  if(!(typeof pmBMI === "number" && Number.isFinite(pmBMI))){
    msg("The RCPCH BMI response did not include percentage median BMI for this request.", "warn");
  }
  if(bp.available){ $("sbpCentileOut").textContent=fmtCentile(bp.sbpCentile); $("dbpCentileOut").textContent=fmtCentile(bp.dbpCentile); $("bpCategoryOut").textContent=bp.category; msg("BP centiles use embedded Jackson 2007-derived testing data and require local validation before clinical use.","warn"); }
  else { $("sbpCentileOut").textContent="—"; $("dbpCentileOut").textContent="—"; $("bpCategoryOut").textContent="Unavailable"; msg(bp.reason,"warn"); }
  lastSummary = `BMI ${bmi.toFixed(1)} kg/m² (${fmtCentile(bmiCentile)} centile${typeof pmBMI === "number" && Number.isFinite(pmBMI)?`, ${pmBMI.toFixed(0)}% median BMI`:""}). Height ${fmtCentile(heightCentile)} centile. BP ${v.sbp}/${v.dbp} mmHg (${bp.available?`SBP ${fmtCentile(bp.sbpCentile)} centile, DBP ${fmtCentile(bp.dbpCentile)} centile; category ${bp.category}`:"BP centile unavailable"}).`;
  $("copyText").value=lastSummary; $("copyBtn").disabled=false;
}
async function copyResults(){ try{ await navigator.clipboard.writeText(lastSummary); msg("Results copied to clipboard."); }catch{ $("copyText").select(); document.execCommand("copy"); msg("Results selected/copied. If not copied, press Ctrl+C."); } }
init();
