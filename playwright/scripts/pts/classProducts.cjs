'use strict';
const {readClass,assertClass}=require('./classRoster.cjs');
const {collectRoomRevision}=require('./roomRevision.cjs');
const BASE='https://admin.pinotspalette.com';

function productGridDOM(){
 const grid=document.querySelector('#productReservations');
 return {locationId:document.querySelector('#LocationId')?.value,statusId:document.querySelector('#StatusId')?.value,
  fromDate:document.querySelector('#DateFilter_FromDate')?.value,toDate:document.querySelector('#DateFilter_ToDate')?.value,noClass:document.querySelector('#noClass')?.checked,
  loading:Array.from(grid?.querySelectorAll('.k-loading-mask')??[]).some(e=>e.getClientRects().length),
  headers:Array.from(grid?.querySelectorAll('th')??[]).map(e=>e.getAttribute('data-field')),
  footer:grid?.querySelector('.k-pager-info')?.textContent.trim(),
  next:!!grid?.querySelector('.k-pager-next:not(.k-state-disabled):not(.k-disabled):not([aria-disabled="true"])'),
  rows:Array.from(grid?.querySelectorAll('tbody tr[data-uid]')??[]).map(r=>({cells:Array.from(r.querySelectorAll('td')).map(c=>c.textContent.trim()),
   orderId:/^\/Order\/View\/(\d+)$/.exec(r.querySelector('a[href^="/Order/View/"]')?.getAttribute('href')??'')?.[1]??null}))};
}
function productPage(snapshot){
 const total=snapshot.footer==='No items to display'?0:Number(/\bof\s+([\d,]+)\s+items?$/.exec(snapshot.footer??'')?.[1]?.replace(/,/g,''));
 if(snapshot.loading||!Number.isSafeInteger(total)||total<0||total>2000||JSON.stringify(snapshot.headers)!==JSON.stringify(['Customer','ReservedDate','ClassDate','Product','Status','Code','Actions']))throw Error('Incomplete product grid');
 const rows=snapshot.rows.map(r=>{
  if(r.cells.length!==7||!/^\d+$/.test(r.orderId??'')||!r.cells[0]||!r.cells[2]||!r.cells[3]||r.cells[4]!=='Reserved'||!r.cells[5])throw Error('Invalid reserved product unit');
  return {sourceOrderId:r.orderId,customer:r.cells[0],classLabel:r.cells[2],item:r.cells[3],status:r.cells[4],voucherCode:r.cells[5]};
 });
 return {total,rows,next:snapshot.next};
}
function filterDate(dateText){const m=/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/.exec(dateText??'');if(!m)throw Error('Unverified class date');return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[2])+1}/${Number(m[1])}/${m[3]}`;}
async function readProducts(page,target,details){
 let sourceStage='products-grid-open';
 try{
 await page.goto(BASE+'/Product/Reservations',{waitUntil:'domcontentloaded'});
 sourceStage='products-grid-location';
 if(await page.locator('#LocationId').inputValue()!==String(target.sourceLocationId)){
  await page.locator('span[aria-owns="LocationId_listbox"]').click();
  const options=await page.locator('#LocationId_listbox li').allTextContents();
  const normalize=s=>s.trim().replace(/^St\.\s*/i,'');
  const matches=options.filter(s=>normalize(s)===target.sourceLocationLabel);
  if(matches.length!==1)throw Error('Product studio label mismatch');
  await page.locator('#LocationId_listbox').getByText(matches[0],{exact:true}).click();
 }
 sourceStage='products-grid-status';
 if(await page.locator('#StatusId').inputValue()!=='100'){
  await page.locator('span[aria-owns="StatusId_listbox"]').click();
  await page.locator('#StatusId_listbox').getByText('Reserved',{exact:true}).click();
 }
 sourceStage='products-grid-dates';
 const date=filterDate(details.dateText);
 await page.locator('#DateFilter_FromDate').fill(date);await page.locator('#DateFilter_ToDate').fill(date);await page.locator('#noClass').uncheck();
 const responseFor=action=>Promise.all([page.waitForResponse(r=>r.url().includes('/Product/GetProductReservations')&&r.status()===200),action()]).then(async([r])=>{try{return await r.json();}catch{return null;}});
 sourceStage='products-grid-response';
 let response=await responseFor(()=>page.getByRole('button',{name:'Search',exact:true}).click());
 const all=[];let expected;
 for(let pageNumber=0;pageNumber<101;pageNumber++){
  sourceStage='products-grid-settle';
  await page.waitForFunction(()=>{const g=document.querySelector('#productReservations');return g&&g.querySelector('.k-pager-info')?.textContent.trim()&&!Array.from(g.querySelectorAll('.k-loading-mask')).some(e=>e.getClientRects().length);});
  sourceStage='products-grid-parse';
  const snapshot=await page.evaluate(productGridDOM),pack=productPage(snapshot);
  if(snapshot.locationId!==String(target.sourceLocationId)||snapshot.statusId!=='100'||snapshot.noClass||snapshot.fromDate!==date||snapshot.toDate!==date)throw Error('Product filters changed');
  expected??=pack.total;if(pack.total!==expected)throw Error('Product count changed while paging');
  const raw=response?.Data??response?.data;
  for(const row of pack.rows){
   // Prefer the source API's actual class ID when its DTO exposes it. The
   // visible voucher code ties it to exactly one rendered grid unit.
   const matches=Array.isArray(raw)?raw.filter(r=>r.Code===row.voucherCode):[];
   const id=matches.length===1?matches[0].ClassId:null;
   all.push({...row,...(/^\d+$/.test(String(id??''))?{classId:String(id)}:{})});
  }
  if(all.length===expected){if(pack.next)throw Error('Unexpected extra product page');break;}
  if(!pack.next||all.length>expected||pack.rows.length===0)throw Error('Incomplete product pagination');
  sourceStage='products-grid-page';
  response=await responseFor(()=>page.locator('#productReservations .k-pager-next').click());
 }
 if(all.length!==expected||new Set(all.map(r=>r.sourceOrderId+':'+r.voucherCode)).size!==all.length)throw Error('Duplicate or missing product units');
 return all;
 }catch(error){throw Object.assign(new Error('Product grid could not be verified'),{sourceStage,sourceIssue:error?.name==='TimeoutError'?'timeout':'verification-failed'});}
}
async function collectClassProducts({page,target}){
 let stage='class-before';
 try{
  const before=await readClass(page,target.classId);
  const revision=await collectRoomRevision({before,target,readClass:id=>readClass(page,id),assertClass});
  if(revision)return revision;
  assertClass(before,target);
  stage='products-grid';const first=await readProducts(page,target,before),label=before.title?.replace(/^Class - /,'');
  const candidates=first.filter(r=>r.classId?r.classId===target.classId:r.classLabel===label),rows=[];
  const orders=new Map();
  for(const unit of candidates){
   if(unit.classLabel!==label)throw Error('Product class label conflicts with class ID');
   if(!unit.classId){
    stage='products-orders';
    if(!orders.has(unit.sourceOrderId)){
     await page.goto(BASE+'/Order/View/'+unit.sourceOrderId,{waitUntil:'domcontentloaded'});
     const links=await page.locator('a[href^="/Class/Edit/"]').evaluateAll(es=>es.map(a=>({classId:/^\/Class\/Edit\/(\d+)$/.exec(a.getAttribute('href')??'')?.[1],label:a.textContent.trim()})));
     orders.set(unit.sourceOrderId,links);
    }
    const ids=[...new Set(orders.get(unit.sourceOrderId).filter(l=>l.label===unit.classLabel).map(l=>l.classId).filter(Boolean))];
    if(ids.length!==1||ids[0]!==target.classId)throw Error('Product order class association is ambiguous');
   }
   rows.push({...unit,classId:target.classId});
  }
  stage='products-after';const last=await readProducts(page,target,before);
  const signature=rs=>JSON.stringify(rs.map(r=>[r.sourceOrderId,r.voucherCode,r.customer,r.classLabel,r.item,r.status,r.classId??'']).sort());
  if(signature(first)!==signature(last))throw Error('Products changed during collection');
  stage='class-after';const after=await readClass(page,target.classId);assertClass(after,target);
  if(JSON.stringify(productClassFacts(before))!==JSON.stringify(productClassFacts(after)))throw Error('Class changed during collection');
  return {classId:target.classId,studioCode:target.studioCode,isPrivate:false,complete:true,expectedRowCount:rows.length,retrievedAt:new Date().toISOString(),details:productClassFacts(before),rows};
 }catch(error){throw Object.assign(new Error('Class product collection failed'),{sourceStage:error?.sourceStage??stage,sourceIssue:error?.sourceIssue});}
}
function productClassFacts(details){return Object.fromEntries(['title','locationLabel','roomId','classTypeId','dateText','startTimeText','endTimeText','isPublished'].map(k=>[k,details[k]]));}
module.exports={productGridDOM,productPage,filterDate,readProducts,collectClassProducts,productClassFacts};
