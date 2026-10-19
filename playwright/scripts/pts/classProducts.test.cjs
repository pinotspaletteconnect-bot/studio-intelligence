'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {productPage,productGridDOM,filterDate}=require('./classProducts.cjs');
test('product source exposes actual schedule facts and detects time/publication changes',()=>{
 const {productClassFacts}=require('./classProducts.cjs'),d={title:'Class',locationLabel:'Matthews',roomId:'21',classTypeId:'100',dateText:'Mon, 19 Oct 2026',startTimeText:'6:30 PM',endTimeText:'8:30 PM',isPublished:true,privateContact:'excluded'};
 const facts=productClassFacts(d);assert.equal(facts.startTimeText,'6:30 PM');assert.equal(facts.isPublished,true);assert.equal(facts.privateContact,undefined);
 assert.notDeepEqual(productClassFacts({...d,startTimeText:'7:00 PM'}),facts);assert.notDeepEqual(productClassFacts({...d,isPublished:false}),facts);
});
const headers=['Customer','ReservedDate','ClassDate','Product','Status','Code','Actions'];
const snapshot={loading:false,headers,footer:'1 - 2 of 2 items',next:false,rows:[1,2].map(n=>({orderId:'123',cells:['Example Guest','date','Class label','Cheese - 1 Serving','Reserved','TEST-'+n,'Manage']}))};
test('product grid accepts each rendered unit and rejects missing counts, changed columns and inactive status',()=>{
 const p=productPage(snapshot);assert.equal(p.total,2);assert.equal(p.rows.length,2);assert.equal(p.rows[0].voucherCode,'TEST-1');
 for(const changed of [{footer:'Loading'},{loading:true},{headers:headers.slice(1)},{rows:[{...snapshot.rows[0],cells:['name']}]},{rows:[{...snapshot.rows[0],orderId:null}]},{rows:[{...snapshot.rows[0],cells:['Name','date','class','product','Refunded','code','Manage']}]}])assert.throws(()=>productPage({...snapshot,...changed}));
 assert.equal(productPage({...snapshot,footer:'No items to display',rows:[]}).total,0);
 assert.equal(filterDate('Mon, 19 Oct 2026'),'10/19/2026');assert.throws(()=>filterDate('unknown'));
});
test('rendered product grid preserves actual voucher identity and order association',async()=>{
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage();await page.setContent(`<input id="LocationId" value="19"><input id="StatusId" value="100"><input id="DateFilter_FromDate" value="10/19/2026"><input id="DateFilter_ToDate" value="10/19/2026"><input id="noClass" type="checkbox"><div id="productReservations"><table><thead><tr>${headers.map(h=>`<th data-field="${h}">${h}</th>`).join('')}</tr></thead><tbody><tr data-uid="volatile-ui-id"><td>Example Guest</td><td>date</td><td>Actual class</td><td>Cheese</td><td>Reserved</td><td>CODE-1</td><td><a href="/Order/View/123">Manage</a></td></tr></tbody></table><span class="k-pager-info">1 - 1 of 1 items</span><a class="k-pager-next k-state-disabled" aria-disabled="true">Next</a></div>`);const d=await page.evaluate(productGridDOM);assert.equal(d.locationId,'19');assert.equal(productPage(d).rows[0].sourceOrderId,'123');assert.equal(productPage(d).next,false);}
 finally{await browser.close();}
});
test('collector applies studio/date/status filters and ties source API class IDs to visible voucher units',async()=>{
 const {chromium}=require('playwright'),{readProducts}=require('./classProducts.cjs'),browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage();page.setDefaultTimeout(5000);
  await page.route('https://admin.pinotspalette.com/Product/GetProductReservations',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({Data:[{Code:'CODE-1',ClassId:456}],Total:1})}));
  await page.route('https://admin.pinotspalette.com/Product/Reservations',r=>r.fulfill({contentType:'text/html',body:`
  <input id="LocationId" value="1"><span role="listbox" aria-owns="LocationId_listbox">Select</span><ul id="LocationId_listbox"><li onclick="document.querySelector('#LocationId').value='19'">St. Matthews</li></ul>
  <input id="StatusId" value="100"><span role="listbox" aria-owns="StatusId_listbox">Reserved</span><ul id="StatusId_listbox" style="display:none"><li>Reserved</li></ul>
  <input id="DateFilter_FromDate"><input id="DateFilter_ToDate"><input id="noClass" type="checkbox">
  <button onclick="loadProducts()">Search</button><script>function loadProducts(){fetch('/Product/GetProductReservations').then(r=>r.json()).then(()=>{document.querySelector('#rows').innerHTML='<tr data-uid="volatile"><td>Example Guest</td><td>date</td><td>Actual class</td><td>Cheese</td><td>Reserved</td><td>CODE-1</td><td><a href="/Order/View/123">Manage</a></td></tr>';document.querySelector('.k-pager-info').textContent='1 - 1 of 1 items'})}</script>
  <div id="productReservations"><table><thead><tr>${headers.map(h=>`<th data-field="${h}">${h}</th>`).join('')}</tr></thead><tbody id="rows"></tbody></table><span class="k-pager-info"></span><a class="k-pager-next k-state-disabled" aria-disabled="true">Next</a></div>`}));
  const rows=await readProducts(page,{sourceLocationId:'19',sourceLocationLabel:'Matthews'},{dateText:'Mon, 19 Oct 2026'});
  assert.equal(rows.length,1);assert.equal(rows[0].classId,'456');assert.equal(rows[0].voucherCode,'CODE-1');
 }finally{await browser.close();}
});
