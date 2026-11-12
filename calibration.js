/* Confidence calibration: pure helpers for XP, the calibration tally, the
   Sure-and-Wrong set, and the readout math. No DOM here. The page uses
   window.Calib; tests require() this file under Node. (Mirrors sprint.js.) */
(function(){
const CAL_MIN=5;
const LEVELS=["sure","likely","guess"];

const emptyCal=()=>({sure:{c:0,w:0},likely:{c:0,w:0},guess:{c:0,w:0}});

/* XP for one graded answer. Honesty is rewarded, not punished: a confident
   correct answer earns the combo bonus; likely/guess earn flat, smaller
   amounts; any wrong earns nothing. A comeback (correct on review) is a flat
   8 regardless of confidence, and Lightning uses its own speed formula. */
function xpGain({ok,mode,conf,comeback,combo}){
  if(mode==="lightning")return ok?5+Math.min(combo,10):0;
  if(!ok)return 0;
  if(comeback)return 8;
  if(conf==="sure")return 10+Math.min(combo-1,10)*2;
  if(conf==="likely")return 8;
  if(conf==="guess")return 5;
  return 5;
}

/* Tally one answer into the calibration buckets. No-op for an unknown
   confidence (e.g. a timeout with conf unset). Mutates and returns cal. */
function applyConfidence(cal,conf,ok){
  if(!LEVELS.includes(conf))return cal;
  if(ok)cal[conf].c++;else cal[conf].w++;
  return cal;
}

/* Maintain the Sure-and-Wrong id set. Returns a NEW array: adds the id (deduped)
   when answered Sure+wrong, removes it when answered Sure+correct, otherwise a
   plain copy. Only "sure" answers touch the set. */
function sureWrongUpdate(sw,id,conf,ok){
  const list=Array.isArray(sw)?sw.slice():[];
  if(conf!=="sure")return list;
  if(ok)return list.filter(x=>x!==id);
  return list.includes(id)?list:list.concat([id]);
}

/* Readout for one confidence level. pct is null until there are at least minN
   answers at that level, so a thin sample never shows a misleading percentage. */
function calStat(cal,level,minN=CAL_MIN){
  const b=(cal&&cal[level])||{c:0,w:0};
  const correct=b.c,n=b.c+b.w;
  return {n,correct,pct:n<minN?null:Math.round(100*correct/n)};
}

/* Make an old save forward-compatible: default cal/sw when absent or malformed,
   leave every other field untouched. */
function normalizeState(state){
  const s=state||{};
  if(!s.cal||typeof s.cal!=="object")s.cal=emptyCal();
  if(!Array.isArray(s.sw))s.sw=[];
  return s;
}

const API={CAL_MIN,emptyCal,xpGain,applyConfidence,sureWrongUpdate,calStat,normalizeState};
if(typeof module!=="undefined"&&module.exports)module.exports=API;
if(typeof window!=="undefined")window.Calib=API;
})();
