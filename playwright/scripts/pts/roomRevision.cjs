'use strict';
const FACTS=['title','locationLabel','roomId','classTypeId','classTypeLabel','dateText','startTimeText','endTimeText','isPublished'];
const roomFacts=details=>Object.fromEntries(FACTS.map(key=>[key,details[key]]));
async function collectRoomRevision({before,target,readClass,assertClass,now=()=>new Date().toISOString()}){
 if(before.roomId===target.sourceRoomId)return null;
 if(!/^\d+$/.test(before.roomId??'')||before.isPublished!==true)throw Error('Published actual room required');
 // A new room does not relax account, location, class type or source validation.
 assertClass(before,{...target,sourceRoomId:before.roomId});
 const after=await readClass(target.classId);
 assertClass(after,{...target,sourceRoomId:before.roomId});
 if(JSON.stringify(roomFacts(before))!==JSON.stringify(roomFacts(after)))throw Error('Class changed during room verification');
 // Metadata only. This is deliberately NOT a complete product/guest snapshot,
 // and cannot be passed to a warehouse claim or treated as zero reservations.
 return {kind:'room-revision',classId:target.classId,studioCode:target.studioCode,isPrivate:false,complete:false,
  expectedRoomId:target.sourceRoomId,details:roomFacts(before),retrievedAt:now()};
}
module.exports={roomFacts,collectRoomRevision};
