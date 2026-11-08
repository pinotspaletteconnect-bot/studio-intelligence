'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {routeStudioGmail}=require('./route-studio-gmail.cjs');
const registry=require('./receipt-studio-mailboxes.json');
test('every Gmail operation routes to four static authorized bindings, retaining its output name',()=>{
 const source={nodes:[{id:'read',name:'Read',position:[300,200],type:'n8n-nodes-base.httpRequest',typeVersion:4.2,
 parameters:{url:'https://gmail.googleapis.com/gmail/v1/users/me/profile'},credentials:{gmailOAuth2:{id:'old',name:'old'}}}],
 connections:{Input:{main:[[{node:'Read',type:'main',index:0}]]},Read:{main:[[{node:'Next',type:'main',index:0}]]}}};
 const w=routeStudioGmail(source,registry);
 assert.equal(source.nodes.length,1);assert.equal(w.nodes.length,6);
 assert.equal(w.connections.Input.main[0][0].node,'Read — Studio');
 assert.equal(w.connections.Read.main[0][0].node,'Next');
 assert.equal(w.nodes.find(n=>n.name==='Read').type,'n8n-nodes-base.noOp');
 registry.studios.forEach((s,i)=>{
  const n=w.nodes.find(n=>n.name==='Read — '+s.studio);
  assert.equal(n.credentials.gmailOAuth2.id,s.gmailCredentialId);
  assert.equal(w.connections['Read — Studio'].main[i][0].node,n.name);
  assert.equal(w.connections[n.name].main[0][0].node,'Read');
 });
 const expression=w.nodes.find(n=>n.type==='n8n-nodes-base.switch').parameters.output.slice(3,-2);
 for(const [i,s]of registry.studios.entries())assert.equal(new Function('$','return '+expression)(()=>({first:()=>({json:{mailboxContext:{mailbox:s.mailbox}}})})),i);
 assert.throws(()=>new Function('$','return '+expression)(()=>({first:()=>({json:{mailboxContext:{mailbox:'wrong@gmail.com'}}})})));
});
