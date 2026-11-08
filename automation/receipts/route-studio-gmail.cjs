'use strict';
const {randomUUID} = require('node:crypto');

// n8n credentials are static node bindings. Route by a validated mailbox
// instead of attempting to interpolate credential IDs or copying workflows.
function routeStudioGmail(source, registry, scopeNode = 'Mailbox Context') {
  const w = structuredClone(source);
  const mailboxes = registry.studios.map(s => s.mailbox);
  if (mailboxes.length !== 4 || new Set(mailboxes).size !== 4 ||
      registry.studios.some(s => !s.gmailCredentialId)) throw Error('Four connected studio credentials required');
  const targets = w.nodes.filter(n => n.credentials?.gmailOAuth2 && n.type !== 'n8n-nodes-base.gmailTrigger');
  for (const original of targets) {
    const originalName = original.name;
    const routeName = originalName + ' — Studio';
    const x = original.position[0], y = original.position[1];
    for (const connection of Object.values(w.connections))
      for (const outputs of Object.values(connection))
        for (const edges of outputs) for (const edge of edges) if (edge.node === originalName) edge.node = routeName;
    const output = '={{ (() => { const mailbox = $(' + JSON.stringify(scopeNode) + ').first().json.mailboxContext.mailbox; const index = ' + JSON.stringify(mailboxes) + '.indexOf(mailbox); if (index < 0) throw new Error("Unknown studio mailbox"); return index; })() }}';
    w.nodes.push({id:randomUUID(),name:routeName,type:'n8n-nodes-base.switch',typeVersion:3.2,
      position:[x-240,y],parameters:{mode:'expression',numberOutputs:4,output}});
    const branches = registry.studios.map((studio,index) => {
      const clone = structuredClone(original);
      clone.id = randomUUID(); clone.name = originalName + ' — ' + studio.studio;
      clone.position = [x,y+(index-1.5)*150];
      clone.credentials.gmailOAuth2 = {id:studio.gmailCredentialId,name:studio.credentialName};
      if(clone.parameters.options?.replyTo===mailboxes[0])clone.parameters.options.replyTo=studio.mailbox;
      w.nodes.push(clone);
      w.connections[clone.name] = {main:[[{node:originalName,type:'main',index:0}]]};
      return [{node:clone.name,type:'main',index:0}];
    });
    w.connections[routeName] = {main:branches};
    // Preserve the original output name and item links for downstream references.
    Object.assign(original,{type:'n8n-nodes-base.noOp',typeVersion:1,parameters:{},position:[x+260,y]});
    delete original.credentials; delete original.onError; delete original.retryOnFail;
  }
  return w;
}
module.exports = {routeStudioGmail};
