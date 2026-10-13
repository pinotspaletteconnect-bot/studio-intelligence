'use strict';
const {Worker, isMainThread, parentPort, workerData} = require('node:worker_threads');
if(!isMainThread) {
  require('./bundle-pdfs.cjs').bundlePdfs(workerData).then(r=>parentPort.postMessage(r))
    .catch(()=>parentPort.postMessage({error:true}));
}
function renderBundle(input) {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(__filename,{workerData:input,resourceLimits:{maxOldGenerationSizeMb:192}});
    let settled=false;
    const finish=(error,result)=>{
      if(settled)return;settled=true;clearTimeout(timer);void worker.terminate();
      error?reject(Error('Bundle requires review')):resolve({...result,pdf:Buffer.from(result.pdf)});
    };
    const timer=setTimeout(()=>finish(true),15000);
    worker.once('message',r=>finish(r.error,r));worker.once('error',()=>finish(true));
    worker.once('exit',()=>{if(!settled)finish(true);});
  });
}
module.exports={renderBundle};
