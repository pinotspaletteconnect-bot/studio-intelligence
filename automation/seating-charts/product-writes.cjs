'use strict';
function productSummary(source,mapping){
 if(source?.complete!==true||source.isPrivate!==false||!/^\d+$/.test(source.classId??'')||!Array.isArray(source.rows)||source.rows.length!==source.expectedRowCount)throw Error('Incomplete class product source');
 if(!Array.isArray(mapping)||mapping.length!==3)throw Error('Verified three-box product mapping required');
 const seen=new Set(),groups=mapping.map(m=>({...m,customers:new Map(),total:0}));
 for(const unit of source.rows){
  const key=unit.sourceOrderId+':'+unit.voucherCode;
  if(!/^\d+$/.test(unit.sourceOrderId??'')||!unit.voucherCode?.trim()||seen.has(key)||unit.classId!==source.classId||unit.status!=='Reserved'||typeof unit.customer!=='string'||!unit.customer.trim()||typeof unit.item!=='string')throw Error('Invalid or duplicate product unit');
  seen.add(key);
  const normalized=unit.item.replace(/\s+/g,' ').trim();
  const matches=groups.filter(g=>g.sourceNames.includes(normalized));
  if(matches.length!==1)throw Error('Unmapped product; review source item before changing totals');
  const group=matches[0],name=unit.customer.trim().replace(/\s+/g,' '),identity=name.toLocaleLowerCase('en-US');
  const existing=group.customers.get(identity)??{name,count:0};existing.count++;group.customers.set(identity,existing);group.total++;
 }
 return groups.map(g=>({namesCell:g.namesCell,totalCell:g.totalCell,total:g.total,names:[...g.customers.values()].sort((a,b)=>a.name.localeCompare(b.name,'en-US')).map(c=>`${c.name} (${c.count})`).join(', ')}));
}
function planProductWrites({source,mapping,sheetName,cells,ledger={},pending=null}){
 const groups=productSummary(source,mapping),lastWritten={...ledger},expected={},review=[],data=[],tab="'"+sheetName.replace(/'/g,"''")+"'!";
 const allowed=new Set(['J19','R19','J20','R20','J21','R21','J23','R23','J24','R24','J25','R25']);
 if(new Set(groups.flatMap(g=>[g.namesCell,g.totalCell])).size!==6)throw Error('Product mapping overlaps');
 for(const group of groups){
  const wanted={[group.namesCell]:group.names,[group.totalCell]:group.total};
  for(const cell of Object.keys(wanted))if(!allowed.has(cell)||!Object.hasOwn(cells,cell))throw Error('Unread or unsupported product destination');
  const safe=Object.entries(wanted).every(([cell,value])=>{
   const live=cells[cell];if(live!==null&&typeof live==='object')return false;
   return Object.hasOwn(ledger,cell)?live===ledger[cell]||live===value:live===''||live===null||live===value||(cell===group.totalCell&&live===0);
  });
  if(pending){
   for(const cell of Object.keys(wanted)){
    if(!Object.hasOwn(pending.expected,cell))continue;
    const live=cells[cell],old=ledger[cell]??(cell===group.totalCell?0:'');
    if(JSON.stringify(live)!==JSON.stringify(pending.expected[cell])&&live!==old)throw Error('Pending product plan conflicts with staff edit');
   }
   continue;
  }
  if(!safe){review.push({namesCell:group.namesCell,totalCell:group.totalCell,reason:'preserve_staff_product_edit'});continue;}
  for(const [cell,value]of Object.entries(wanted)){
   expected[cell]=value;lastWritten[cell]=value;
   if(cells[cell]!==value)data.push({range:tab+cell,values:[[value]]});
  }
 }
 return pending??{request:{valueInputOption:'RAW',data},lastWritten,expected,review,unitCount:source.rows.length};
}
function verifyProductWrites({plan,before,after,protectedBefore,protectedAfter}){
 if(JSON.stringify(protectedBefore)!==JSON.stringify(protectedAfter))throw Error('Product update changed seating, attendance or formulas');
 for(const [cell,value]of Object.entries(plan.expected))if(JSON.stringify(after[cell])!==JSON.stringify(value))throw Error('Product readback mismatch');
 for(const cell of Object.keys(before))if(!Object.hasOwn(plan.expected,cell)&&JSON.stringify(before[cell])!==JSON.stringify(after[cell]))throw Error('Unplanned product cell changed');
 return {productsVerified:true,protectedCellsUnchanged:true,unitCount:plan.unitCount,writeCount:plan.request.data.length,reviewCount:plan.review.length};
}
function chartProductState(document,target){
 const sheet=document.sheets?.find(s=>s.properties.sheetId===target.sheetId);
 if(sheet?.properties.title!==target.sheetName)throw Error('Wrong product chart tab');
 const matrix=Array.from({length:1000},()=>Array.from({length:29},()=>({})));
 for(const block of sheet.data??[])for(let r=0;r<(block.rowData?.length??0);r++)for(let c=0;c<(block.rowData[r].values?.length??0);c++){
  const row=(block.startRow??0)+r,col=(block.startColumn??0)+c;if(row<1000&&col<29)matrix[row][col]=block.rowData[r].values[c]??{};
 }
 const scalar=c=>c.userEnteredValue?.formulaValue?{formulaValue:c.userEnteredValue.formulaValue}:c.userEnteredValue?.stringValue??c.userEnteredValue?.numberValue??c.userEnteredValue?.boolValue??'';
 if(String(scalar(matrix[4][17]))!==target.classId)throw Error('Product chart class ID header mismatch');
 const mapping=target.productMapping,cells={};
 for(const m of mapping)for(const cell of [m.namesCell,m.totalCell]){
  const match=/^([JR])(\d+)$/.exec(cell);if(!match)throw Error('Unsupported product anchor');
  const row=Number(match[2])-1,col=match[1]==='J'?9:17;
  cells[cell]=scalar(matrix[row][col]);
  // Exclude only the six permitted literal values; their validation remains
  // protected, as do all other seating, staff, formula and attendance cells.
  matrix[row][col]={...matrix[row][col],userEnteredValue:undefined};
 }
 return {cells,protectedCells:matrix.map(row=>row.map(c=>[c.userEnteredValue??null,c.dataValidation??null]))};
}
module.exports={productSummary,planProductWrites,verifyProductWrites,chartProductState};
