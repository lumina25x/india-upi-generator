importScripts('target.js','page.js');
let queue=Promise.resolve();
const serial=fn=>{const next=queue.then(fn,fn);queue=next.catch(()=>{});return next;};
function authorized(sender){return sender.tab?.id && sender.frameId===0 && !!WagalTarget.kind(sender.url);}
async function lease(){return (await chrome.storage.session.get('lease')).lease;}
async function inspect(tabId){
  const frames=await chrome.scripting.executeScript({target:{tabId,allFrames:true},func:renewPageAction});
  const states=frames.map(f=>({...f.result,frameId:f.frameId})).filter(s=>s.kind);
  const known=states.filter(s=>!['unknown','pending'].includes(s.kind));
  if(known.length>1)return {kind:'ambiguous'};
  return known[0]||states.find(s=>s.kind==='pending')||{kind:'unknown'};
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(!msg?.type?.startsWith('RS_'))return;
  if(!authorized(sender)){reply({error:'허용되지 않은 페이지입니다.'});return;}
  const tabId=sender.tab.id;
  (async()=>{
    if(msg.type==='RS_INSPECT')return inspect(tabId);
    if(msg.type==='RS_ACQUIRE')return serial(async()=>{
      if(await lease())throw Error('다른 실행이 진행 중입니다. 실행 탭에서 중지해 주세요.');
      const screen=await inspect(tabId);
      if(!['ready','confirm'].includes(screen.kind)||screen.frameId!==msg.target?.frameId||screen.product!==msg.target?.product||screen.price!==msg.target?.price)throw Error('점검 후 상품 화면이 변경되었습니다. 다시 점검해 주세요.');
      const token=crypto.randomUUID();await chrome.storage.session.set({lease:{tabId,token,frameId:screen.frameId}});return {token};
    });
    if(msg.type==='RS_RELEASE')return serial(async()=>{const l=await lease();if(l?.tabId===tabId&&l.token===msg.token)await chrome.storage.session.remove('lease');return {};});
    if(msg.type==='RS_ACT'){
      const l=await lease();if(l?.tabId!==tabId||l.token!==msg.token)return {clicked:false};
      if(!Number.isInteger(msg.screen?.frameId)||msg.screen.frameId!==l.frameId)return {clicked:false};
      const results=await chrome.scripting.executeScript({target:{tabId,frameIds:[msg.screen.frameId]},func:renewPageAction,args:[msg.screen]});
      return results[0]?.result||{clicked:false};
    }
    return {error:'알 수 없는 요청입니다.'};
  })().then(reply,error=>reply({error:error.message}));return true;
});
const clearLease=tabId=>serial(async()=>{if((await lease())?.tabId===tabId)await chrome.storage.session.remove('lease');});
chrome.tabs.onRemoved.addListener(clearLease);
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading')clearLease(id);});
