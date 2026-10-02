'use strict';
const $=id=>document.getElementById(id),I=WagalI18n;
const preview=typeof chrome==='undefined'||!chrome.tabs;
let language=I.normalize(navigator.language),tabId=null,state=null,checked=null,busy=false;
const version=preview?'0.4.0':chrome.runtime.getManifest().version;
let connectionKey='checking',noticeKey=null,noticeLiteral=null,noticeError=false,logFingerprint='';
const t=(key,params)=>I.t(key,language,params),message=text=>I.message(text||'',language);
function notice(key,error=false,literal=false){noticeKey=literal?null:key;noticeLiteral=literal?key:null;noticeError=error;renderNotice();}
function renderNotice(){const text=noticeLiteral?message(noticeLiteral):noticeKey?t(noticeKey):'';$('notice').textContent=text;$('notice').hidden=!text;$('notice').classList.toggle('error',noticeError);}
function selectTab(name,focus=false){for(const key of ['run','log','settings']){const active=key===name;$(`${key}-tab`).setAttribute('aria-selected',String(active));$(`${key}-tab`).tabIndex=active?0:-1;$(`${key}-pane`).hidden=!active;}if(focus)$(`${name}-tab`).focus();}
for(const [index,key] of ['run','log','settings'].entries()){
  $(`${key}-tab`).onclick=()=>selectTab(key);
  $(`${key}-tab`).onkeydown=e=>{const keys=['run','log','settings'];let target;if(e.key==='ArrowRight')target=keys[(index+1)%3];if(e.key==='ArrowLeft')target=keys[(index+2)%3];if(e.key==='Home')target=keys[0];if(e.key==='End')target=keys[2];if(target){e.preventDefault();selectTab(target,true);}};
}
function translate(){
  document.documentElement.lang=language;document.title=t('name');
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  $('version').textContent=version;$('language').value=language;
  logFingerprint='';if(state)render(state);else{$('connection').textContent=t(connectionKey);updateStart();renderNotice();}
}
async function send(type,extra={}){
  if(preview)throw Error(t('preview'));if(!tabId)throw Error(t('pageRequired'));
  const result=await chrome.tabs.sendMessage(tabId,{type,...extra},{frameId:0});
  if(result?.error)throw Error(result.error);return result;
}
function updateStart(){$('start').disabled=checked?.kind!=='ready'||!$('consent').checked||busy;$('start').textContent=t(checked?.kind==='ready'?'start':'checkFirst');}
function inspectionView(target){const kind=['ready','active','list','confirm','error','auth','ambiguous'].includes(target?.kind)?target.kind:'unknown';return {badge:t(kind+'Badge'),title:t(kind+'Title'),detail:t(kind+'Detail')};}
function showTarget(target){$('product').textContent=target?.product||t('emptyProduct');$('price').textContent=[target?.price,target?.kind==='active'?target.renewalText:null].filter(Boolean).join(' · ')||t('emptyPrice');}
function render(s){
  state=s;const active=!!s.active,hasRun=!!s.startedAt;checked=s.checked||null;
  $('environment').hidden=!s.simulation;
  showTarget(checked||s.target);
  $('setup').hidden=active||checked?.kind!=='ready';$('progress').hidden=!hasRun||!!checked;$('stop').hidden=!active;$('recheck').hidden=active;
  $('check').disabled=active||busy;$('open').disabled=active;$('minutes').disabled=active;$('jitter').disabled=active;$('reload').hidden=active||!['review','stopped'].includes(s.phase);
  const view=checked?inspectionView(checked):null;
  $('connection').textContent=active?t('connected'):view?.badge||t('connected');
  $('inspection').hidden=active||!checked||checked.kind==='ready';
  if(view){$('inspection-title').textContent=view.title;$('inspection-detail').textContent=view.detail;}
  $('phase').textContent=t(s.phase||'idle');$('count').textContent=s.attempt||0;$('cap').textContent=t('count',{max:s.settings?.attempts===0?'∞':(s.settings?.attempts??5)});$('message').textContent=message(s.message);
  const seconds=hasRun?Math.max(0,Math.floor(((active?Date.now():Date.parse(s.endedAt||s.startedAt))-Date.parse(s.startedAt))/1000)):0;
  $('elapsed').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  $('countdown').hidden=!(active&&s.nextAt);$('countdown').textContent=active&&s.nextAt?t('next',{seconds:Math.max(0,Math.ceil((Date.parse(s.nextAt)-Date.now())/1000))}):'';
  const logs=s.logs||[],fingerprint=language+JSON.stringify(logs);
  if(fingerprint!==logFingerprint){
    logFingerprint=fingerprint;$('empty-logs').hidden=logs.length>0;
    $('logs').replaceChildren(...logs.slice().reverse().map(log=>{const li=document.createElement('li'),time=document.createElement('time'),body=document.createElement('span');time.textContent=new Date(log.time).toLocaleTimeString(language==='ko'?'ko-KR':'en-US');body.textContent=message(log.message);li.append(time,body);return li;}));
  }
  updateStart();renderNotice();
}
async function check(){
  if(busy)return;busy=true;$('consent').checked=false;checked=null;updateStart();$('check').disabled=true;notice(null);
  try{const result=await send('CHECK');render({...state,checked:result,active:false});}catch(e){notice(e.message,true,true);}finally{busy=false;$('check').disabled=false;updateStart();}
}
$('check').onclick=check;$('recheck').onclick=check;$('consent').onchange=updateStart;
$('open').onclick=()=>{if(preview){notice('preview');return;}chrome.tabs.create({url:'https://account.apple.com/account/manage/section/subscriptions'});window.close();};
$('start').onclick=async()=>{busy=true;updateStart();try{await send('START',{options:{attempts:Number($('attempts').value),delay:Number($('delay').value),jitter:Number($('jitter').value),minutes:Number($('minutes').value)},consent:$('consent').checked});$('consent').checked=false;checked=null;notice(null);await poll();}catch(e){notice(e.message,true,true);}finally{busy=false;updateStart();}};
$('reload').onclick=async()=>{try{const current=await send('STATUS');if(current.active)return;await chrome.tabs.reload(tabId);window.close();}catch(e){notice(e.message,true,true);}};
$('stop').onclick=async()=>{try{await send('STOP');await poll();}catch(e){notice(e.message,true,true);}};
$('export').onclick=()=>{const data={version,language,simulation:!!state?.simulation,phase:state?.phase||'idle',attempt:state?.attempt||0,inspection:checked?.kind||null,logs:(state?.logs||[]).map(log=>({...log,message:message(log.message)}))};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='wagal-macro-session.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('open-test').onclick=()=>{if(preview){notice('testHelp');return;}chrome.tabs.create({url:WagalTarget.simulationUrl});window.close();};
$('language').onchange=async()=>{language=I.normalize($('language').value);translate();try{if(!preview)await chrome.storage.local.set({language});$('saved').textContent=t('saved');}catch{$('saved').textContent=t('saveFailed');}};
async function poll(){if(busy&&state?.active)return;try{render(await send('STATUS'));}catch{connectionKey='disconnected';$('connection').textContent=t(connectionKey);checked=null;updateStart();notice('reconnect',true);}}
(async()=>{
  if(!preview){try{const saved=await chrome.storage.local.get('language');if(saved.language)language=I.normalize(saved.language);}catch{}}
  translate();
  if(preview){connectionKey='disconnected';$('connection').textContent=t(connectionKey);notice('preview');return;}
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(tab?.url&&WagalTarget.kind(tab.url)){tabId=tab.id;await poll();setInterval(()=>{if(!busy)poll();},700);}
  else{connectionKey='disconnected';$('connection').textContent=t(connectionKey);$('check').disabled=true;notice('pageRequired');}
})();
