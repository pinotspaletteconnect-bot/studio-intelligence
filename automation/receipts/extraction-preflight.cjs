'use strict';
function requireBoundedTokenCount(request, count, reservationMicrousd) {
 if(request?.model!=='gpt-4o-mini-2024-07-18'||request.max_output_tokens!==8192||request.truncation!=='disabled')throw Error('Unapproved extraction request');
 if(count?.object!=='response.input_tokens'||!Number.isSafeInteger(count.input_tokens)||count.input_tokens<1)throw Error('Input cost could not be verified; no extraction permitted');
 if(count.input_tokens+request.max_output_tokens>128000)throw Error('Receipt exceeds model context; split documents before extraction');
 const maximumMicrousd=Math.ceil(count.input_tokens*0.15+request.max_output_tokens*0.6);
 if(!Number.isSafeInteger(reservationMicrousd)||maximumMicrousd>reservationMicrousd)throw Error('Receipt exceeds reserved allowance; no extraction permitted');
 return {inputTokens:count.input_tokens,maximumMicrousd};
}
function addExtractionPreflight(w,uuid) {
 const original=w.nodes.find(n=>n.name==='Backlog - Extract Once with OpenAI');
 if(!original)throw Error('Extraction request node missing');
 const count={...JSON.parse(JSON.stringify(original)),id:uuid(),name:'Backlog - Count Input Before Spending',position:[1600,500]};
 count.parameters.url='https://api.openai.com/v1/responses/input_tokens';
 count.parameters.jsonBody='={{ {model:$json.request.model,input:$json.request.input,instructions:$json.request.instructions,text:$json.request.text,truncation:"disabled"} }}';
 count.retryOnFail=false;
 const verify={id:uuid(),name:'Backlog - Verify Reserved Cost',type:'n8n-nodes-base.code',typeVersion:2,position:[1800,500],parameters:{jsCode:requireBoundedTokenCount.toString()+`\nconst requests=$('Backlog - Build Bounded Requests').all(),counts=$input.all();if(requests.length!==counts.length)throw Error('Token count response mismatch');return requests.map((item,i)=>({json:{...item.json,costPreflight:requireBoundedTokenCount(item.json.request,counts[i].json,Number(item.json.ticket.reservedMicrousd))}}));`}};
 const edge=node=>({main:[[{node,type:'main',index:0}]]});
 w.nodes.push(count,verify);
 w.connections['Backlog - Build Bounded Requests']=edge(count.name);
 w.connections[count.name]=edge(verify.name);
 w.connections[verify.name]=edge('Backlog - Consume One Allowance');
 return w;
}
module.exports={requireBoundedTokenCount,addExtractionPreflight};
