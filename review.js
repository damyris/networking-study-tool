/* Blind-spots: pure helpers for ranking a learner's weak domains and steering
   review selection with the Phase 1 confidence signal. No DOM here. The page
   uses window.Review; tests require() this file under Node. (Mirrors sprint.js
   / calibration.js — IIFE with dual window / module.exports export.) */
(function(){
const SW_BOOST=3;   /* selection-weight multiplier for Sure-and-wrong items */
const SOLID=80;     /* accuracy % at/above which a seen domain reads as "ok" */

/* Bucket Sure-and-wrong ids by their domain. idToDomain(id) returns a domain id
   or null/undefined (other course, hidden, deleted); null-resolving ids are skipped. */
function swCounts(sw,idToDomain){
  const out={};
  for(const id of (Array.isArray(sw)?sw:[])){
    const d=idToDomain(id);
    if(d==null)continue;
    out[d]=(out[d]||0)+1;
  }
  return out;
}

/* Urgency score for one domain; higher = review sooner. Unseen domains score 0
   so they never outrank a domain with real weakness. Sure-and-wrong dominates,
   then the accuracy gap, then the Leitner-box gap. */
function blindSpotScore(mastery,sureWrongCount){
  const m=mastery||{};
  /* A sure-wrong can land on a generated question, which mastery() doesn't count
     as "seen"; such a domain is still a real blind spot, so don't zero it out. */
  if(!m.seen&&!sureWrongCount)return 0;
  const accGap=100-(m.acc==null?100:m.acc);
  const boxGap=100-(m.pct||0);
  return (sureWrongCount||0)*1000+accGap*10+boxGap;
}

/* Label for display. A domain never seen is "not-started"; any Sure-and-wrong
   makes it "weak" regardless of accuracy; a solid seen domain is "ok". */
function domainStatus(mastery,sureWrongCount){
  const m=mastery||{};
  if(sureWrongCount>0)return "weak";
  if(!m.seen)return "not-started";
  if(m.acc!=null&&m.acc>=SOLID)return "ok";
  return "weak";
}

/* Rank domains worst-first. entries: [{d, mastery, sureWrong}]. Returns a new
   array, each entry extended with {score, status}, sorted by score desc then d asc. */
function rankDomains(entries){
  return (entries||[]).map(e=>Object.assign({},e,{
    score:blindSpotScore(e.mastery,e.sureWrong||0),
    status:domainStatus(e.mastery,e.sureWrong||0)
  })).sort((a,b)=>b.score-a.score||a.d-b.d);
}

const API={SW_BOOST,SOLID,swCounts,blindSpotScore,domainStatus,rankDomains};
if(typeof module!=="undefined"&&module.exports)module.exports=API;
if(typeof window!=="undefined")window.Review=API;
})();
