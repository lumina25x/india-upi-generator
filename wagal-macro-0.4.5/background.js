importScripts('target.js','page.js','frame-router.js');
let queue=Promise.resolve();
const revoked=new Set();
const serial=fn=>{const next=queue.then(fn,fn);queue=next.catch(()=>{});return next;};
function authorized(sender){return sender.tab?.id && sender.frameId===0 && !!WagalTarget.kind(sender.url);}
async function lease(){return (await chrome.storage.session.get('lease')).lease;}
async function inspect(tabId,run){
  const frames=await chrome.scripting.executeScript({target:{tabId,allFrames:true},func:renewPageAction});
  const states=frames.map(f=>({...f.result,frameId:f.frameId})).filter(s=>s.kind);
  return WagalFrames.selectFrame(states,run);
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(!msg?.type?.startsWith('RS_'))return;
  if(!authorized(sender)){reply({error:'허용되지 않은 페이지입니다.'});return;}
  const tabId=sender.tab.id;
  (async()=>{
    if(msg.type==='RS_INSPECT'){const l=await lease();return inspect(tabId,l?.tabId===tabId?l:null);}
    if(msg.type==='RS_ACQUIRE')return serial(async()=>{
      if(await lease())throw Error('다른 실행이 진행 중입니다. 실행 탭에서 중지해 주세요.');
      const screen=await inspect(tabId);
      if(!['ready','confirm'].includes(screen.kind)||screen.frameId!==msg.target?.frameId||screen.product!==msg.target?.product||screen.price!==msg.target?.price)throw Error('점검 후 상품 화면이 변경되었습니다. 다시 점검해 주세요.');
      const token=crypto.randomUUID();await chrome.storage.session.set({lease:{tabId,token,frameId:screen.frameId,homeFrameId:screen.frameId,unboundHome:screen.kind==='confirm',confirmationFrameId:screen.kind==='confirm'?screen.frameId:null,stage:screen.kind,product:screen.product,price:screen.price}});return {token};
    });
    if(msg.type==='RS_RELEASE'){
      revoked.add(msg.token);
      return serial(async()=>{try{const l=await lease();if(l?.tabId===tabId&&l.token===msg.token)await chrome.storage.session.remove('lease');return {};}finally{revoked.delete(msg.token);}});
    }
    if(msg.type==='RS_ACT')return serial(async()=>{
      const l=await lease();if(l?.tabId!==tabId||l.token!==msg.token||revoked.has(msg.token))return {clicked:false};
      const action=msg.screen?.kind;
      const stages={ready:['ready','return','dismiss'],confirm:['confirm'],error:['result'],dismiss:['dismiss']};
      if(!stages[action]?.includes(l.stage))return {clicked:false};
      const fresh=await inspect(tabId,l);
      if(revoked.has(msg.token))return {clicked:false};
      if(!fresh.frameApproved||fresh.frameId!==msg.screen.frameId)return {clicked:false};
      if(fresh.kind!==action&&!(action==='dismiss'&&fresh.kind==='confirm'))return {clicked:false};
      if(['ready','confirm'].includes(action)&&(fresh.product!==l.product||fresh.price!==l.price))return {clicked:false};
      const results=await chrome.scripting.executeScript({target:{tabId,frameIds:[fresh.frameId]},func:renewPageAction,args:[{...fresh,kind:action}]});
      const result=results[0]?.result||{clicked:false};
      if(result.clicked){if(action==='ready'&&l.unboundHome){l.homeFrameId=fresh.frameId;l.unboundHome=false;}l.frameId=fresh.frameId;l.stage={ready:'confirm',confirm:'result',error:'dismiss',dismiss:'return'}[action];if(action==='confirm')l.confirmationFrameId=fresh.frameId;await chrome.storage.session.set({lease:l});}
      return result;
    });
    if(msg.type==='RS_NAVIGATE_LIST')return serial(async()=>{
      const screen=await inspect(tabId);
      if(screen.kind==='list'){
        const results=await chrome.scripting.executeScript({target:{tabId,frameIds:[screen.frameId]},func:renewPageAction,args:[{...screen,kind:'list'}]});
        return results[0]?.result||{clicked:false};
      }
      return {clicked:false};
    });
    return {error:'알 수 없는 요청입니다.'};
  })().then(reply,error=>reply({error:error.message}));return true;
});
const clearLease=tabId=>serial(async()=>{if((await lease())?.tabId===tabId)await chrome.storage.session.remove('lease');});
chrome.tabs.onRemoved.addListener(clearLease);
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading')clearLease(id);});
