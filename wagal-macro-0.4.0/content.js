(() => {
  const environment=WagalTarget.kind(location.href);if(!environment)return;
  if(globalThis.__renewStudio)return;globalThis.__renewStudio=true;
  let token=null,starting=false,checked=null,checkTime=0,revision=0;
  let language=WagalI18n.normalize(navigator.language);
  chrome.storage.local.get('language').then(saved=>{if(saved.language)language=WagalI18n.normalize(saved.language);if(host)render(runner.state);}).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.language){language=WagalI18n.normalize(changes.language.newValue||navigator.language);if(host)render(runner.state);}});
  const rpc=async(type,extra={})=>{const result=await chrome.runtime.sendMessage({type,...extra});if(result?.error)throw Error(result.error);return result;};
  const runner=new RenewEngine.Runner({inspect:()=>rpc('RS_INSPECT'),act:async screen=>!!(await rpc('RS_ACT',{screen,token})).clicked,sleep:ms=>new Promise(r=>setTimeout(r,ms)),update:state=>render(state)});
  let host,ui;
  function render(state){
    if(!host){host=document.createElement('div');host.id='renew-studio-panel';host.style.cssText='position:fixed;right:20px;bottom:20px;z-index:2147483647';const shadow=host.attachShadow({mode:'closed'});shadow.innerHTML='<style>:host{all:initial}section{width:286px;padding:20px;border:1px solid #305263;border-radius:18px;background:#101d2b;color:#eef7fc;font:14px system-ui;box-shadow:0 12px 40px #0005}small{color:#70d9d2;letter-spacing:2px}p{line-height:1.6}button{border:0;border-radius:8px;padding:10px 14px;background:#70d9d2;color:#10222b;font-weight:700;cursor:pointer}span{color:#9bafbd;font-size:12px}</style><section><small>RENEW STUDIO</small><p id="message"></p><span id="count"></span><p><button id="stop">실행 중지</button></p></section>';ui={message:shadow.getElementById('message'),count:shadow.getElementById('count'),stop:shadow.getElementById('stop')};ui.stop.onclick=stop;document.documentElement.append(host);}
    ui.message.textContent=WagalI18n.message(state.message,language);
    ui.message.parentElement.querySelector('small').textContent=WagalI18n.t('name',language)+(environment==='simulation'?' · '+WagalI18n.t('testMode',language):'');
    ui.count.textContent=WagalI18n.t('overlayCount',language,{count:state.attempt,max:state.settings?.attempts===0?'∞':(state.settings?.attempts??0)});
    ui.stop.textContent=WagalI18n.t('stop',language);ui.stop.hidden=!runner.active;
  }
  async function stop(){revision++;runner.stop();if(token){const old=token;token=null;await rpc('RS_RELEASE',{token:old}).catch(()=>{});}}
  chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
    if(sender.id!==chrome.runtime.id)return;
    (async()=>{
      if(msg.type==='STATUS')return {...runner.state,active:runner.active||starting,checked,simulation:environment==='simulation'};
      if(msg.type==='CHECK'){
        if(runner.active||starting)throw Error('실행 중에는 다시 점검할 수 없습니다.');
        checked=null;checkTime=0;
        const observed=await rpc('RS_INSPECT');
        // Inspection is an observation of an existing subscription, not proof this tool renewed it.
        checked=observed.kind==='success'?{...observed,kind:'active'}:observed;
        checkTime=Date.now();return checked;
      }
      if(msg.type==='STOP'){await stop();return {ok:true};}
      if(msg.type==='START'){
        if(runner.active||starting)throw Error('이미 실행 중입니다.');
        RenewEngine.validate(msg.options);
        if(!checked||checked.kind!=='ready'||Date.now()-checkTime>60000)throw Error('화면 점검을 다시 실행해 주세요. 점검은 1분간 유효합니다.');
        if(!msg.consent)throw Error('표시된 상품과 금액의 갱신 시도에 동의해 주세요.');
        starting=true;const rev=revision;
        try{
          const acquired=await rpc('RS_ACQUIRE',{target:checked});token=acquired.token;
          if(rev!==revision){await stop();return {ok:false};}
          const runToken=token;const target=checked;checked=null;
          runner.start(msg.options,target).finally(async()=>{await rpc('RS_RELEASE',{token:runToken}).catch(()=>{});if(token===runToken)token=null;});
          return {ok:true};
        }finally{starting=false;}
      }
      return {error:'알 수 없는 요청입니다.'};
    })().then(reply,e=>reply({error:e.message}));return true;
  });
})();
