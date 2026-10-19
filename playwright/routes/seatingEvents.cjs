'use strict';
const express=require('express');
const {requireCollectorAuth}=require('../middleware/collectorAuth');
const {collectSeatingEvents,validWindow}=require('../scripts/pts/seatingEvents.cjs');
function createSeatingEventsRouter({resolveSession,collect=collectSeatingEvents,runQueued=(_id,fn)=>fn()}){
 const router=express.Router();router.post('/',requireCollectorAuth,async(req,res)=>{
  const input=req.body;try{if(!Number.isSafeInteger(input?.accountId)||!Number.isSafeInteger(input?.studioId)||Object.keys(input).some(k=>!['accountId','studioId','fromDate','toDate'].includes(k)))throw Error();validWindow(input.fromDate,input.toDate);}
  catch{return res.status(400).json({success:false,error:'Invalid bounded event request'});}
  return runQueued(input.accountId,async()=>{let session;try{
   session=await resolveSession({...input,classId:'0'});
   if(session.target.studioId!==input.studioId||session.target.accountId!==input.accountId)throw Error();
   const source=await collect({...session,fromDate:input.fromDate,toDate:input.toDate});
   return res.json({success:true,accountId:input.accountId,studioId:input.studioId,source});
  }catch(e){return res.status(502).json({success:false,error:'Event discovery failed; no copy authorized',
   ...(['calendar-before','event-detail','calendar-after','account-resolve','browser-launch','source-login'].includes(e.sourceStage)?{sourceStage:e.sourceStage}:{})});}
  finally{try{await session?.close();}catch{}}});
 });return router;
}
module.exports={createSeatingEventsRouter};
