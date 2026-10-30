const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(file){const module={exports:{}};vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nmodule.exports.testLogin=login;', {module,require:()=>({}),URL,console});return module.exports.testLogin;}
const login=load(__dirname+'/../services/homebaseBrowser.js');
function fake({codeDefault=true,authenticated=false,brokenToggle=false}={}){
 const calls=[];let url='',passwordVisible=!codeDefault,submitted=authenticated,formReady=false;
 const password={first(){return this},isVisible:async()=>passwordVisible,waitFor:async()=>{calls.push('wait-password');if(!passwordVisible)throw Error('Password unavailable')},fill:async()=>{assert.ok(passwordVisible);calls.push('password')}};
 const email={first(){return this},waitFor:async()=>{formReady=true},fill:async()=>calls.push('email'),isVisible:async()=>!submitted};
 const page={url:()=>url,goto:async()=>{url=submitted?'https://app.joinhomebase.com/company_timesheets':'https://app.joinhomebase.com/accounts/sign-in'},waitForURL:async()=>{},
 locator(selector){if(selector.startsWith('input[type="password"]'))return password;if(selector.startsWith('input[type="email"]'))return email;if(selector.startsWith('button[type="submit"]'))return{first(){return this},count:async()=>1,click:async()=>{calls.push('submit-password');submitted=true;url='https://app.joinhomebase.com/company_timesheets'}};return{allTextContents:async()=>[]};},
 getByRole(role,{name}){if(name==='Sign in with email and password')return{isVisible:async()=>codeDefault&&formReady,click:async()=>{calls.push('choose-password');passwordVisible=!brokenToggle}};if(String(name).includes('continue|next'))return{click:async()=>{calls.push('next');throw Error('Email-code Next must not run')}};return{isVisible:async()=>submitted};}};
 return{page,calls};
}
test('selects password mode before entering credentials; never sends an email code',async()=>{const f=fake();await login(f.page,{email:'test@example.invalid',password:'fixture',targets:[]});assert.deepEqual(f.calls,['choose-password','wait-password','email','password','submit-password']);});
test('retains legacy password form login',async()=>{const f=fake({codeDefault:false});await login(f.page,{email:'test@example.invalid',password:'fixture',targets:[]});assert.deepEqual(f.calls,['email','password','submit-password']);});
test('does not reauthenticate an existing session',async()=>{const f=fake({authenticated:true});await login(f.page,{targets:[]});assert.deepEqual(f.calls,[]);});
test('stops without submitting Next if password mode fails',async()=>{const f=fake({brokenToggle:true});await assert.rejects(login(f.page,{targets:[]}),/Password unavailable/);assert.deepEqual(f.calls,['choose-password','wait-password']);});
