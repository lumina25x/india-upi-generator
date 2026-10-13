'use strict';
const $=id=>document.getElementById(id);
const scenarios=['retry','always-error','slow','hang','price-change','unknown','active'];
const params=new URLSearchParams(location.search);
const scenario=scenarios.includes(params.get('scenario'))?params.get('scenario'):'retry';
const number=(value,fallback,max)=>{const n=Number(value);return value!==null&&Number.isInteger(n)&&n>=0&&n<=max?n:fallback;};
const failures=number(params.get('failures'),2,20),delay=number(params.get('delay'),scenario==='slow'?5000:600,60000);
$('scenario').value=scenario;$('failures').value=failures;$('delay').value=delay;
$('scenario').onchange=()=>{if($('scenario').value==='slow'&&Number($('delay').value)<5000)$('delay').value=5000;};
const stats={renew:0,confirm:0,errorCancel:0,confirmCancel:0,state:'ready'};
Object.defineProperty(window,'simulatorState',{get:()=>({...stats})});
function log(message){const li=document.createElement('li');li.textContent=`${new Date().toLocaleTimeString()} · ${message}`;$('events').prepend(li);$('lab-status').textContent=message;$('counts').textContent=`Renew ${stats.renew} · Confirm ${stats.confirm} · 오류 Cancel ${stats.errorCancel} · 확인 Cancel ${stats.confirmCancel}`;}
function ready(){stats.state='ready';$('subscription').innerHTML='<div class="youtube-icon" aria-hidden="true"></div><h2>YouTube Premium Family</h2><p class="plan">Premium · Family</p><p class="cancelled">You have cancelled your subscription.</p><p class="subtle">Your subscription ended on 30 September.</p><button id="renew" class="blue" data-test="action-cta">Renew: ₹389/month</button><hr class="line"><button class="outline" disabled>See All Plans</button><p class="info-link">About Subscriptions and Privacy</p>';}
function active(){stats.state='active';$('modals').replaceChildren();$('subscription').innerHTML='<h2>Subscriptions</h2><p class="subtle">Active</p><a href="#active-details" class="active-card"><div><h3>YouTube</h3><p>Premium Family</p></div><p>₹389</p><p>Renews 1 November</p></a><p class="info-link">Options</p><p class="subtle">Renewal Receipt Emails</p>';log('활성 구독 화면 · 모의 갱신 완료');}
function confirmation(){stats.renew++;stats.state='confirm';const price=scenario==='price-change'?999:389;$('modals').innerHTML=`<div class="scrim" id="confirm-layer"><section role="dialog" aria-modal="true" aria-labelledby="confirm-title" class="dialog"><h2 id="confirm-title">Confirm Subscription</h2><div class="summary"><h3>YouTube Premium Family</h3><small>YouTube</small><small>Subscription</small><hr><strong>₹${price} per month</strong><small>Starting today</small><hr><p class="fine">Subscribe to YouTube Premium Family. Plan automatically renews for ₹${price}/month until cancelled.</p></div><button class="blue" id="confirm" data-test="button-confirm">Confirm</button><button class="text-cancel" id="cancel-confirm">Cancel</button></section></div>`;log('Renew 클릭 → 구독 확인창');}
function error(){stats.state='error';$('modals').insertAdjacentHTML('beforeend','<div class="scrim error-layer" id="error-layer"><section class="dialog error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="error-title"><h2 id="error-title">Unable to Complete Purchase</h2><p>We were unable to charge any of the payment methods on file for your account. Please update your billing info.</p><button class="blue" id="billing">Billing Info</button><button class="outline" id="cancel-error" data-test="Cancel-button">Cancel</button></section></div>');log('모의 결제 오류 응답');}
function submit(){const button=$('confirm');if(button.disabled)return;button.disabled=true;button.setAttribute('aria-busy','true');stats.confirm++;stats.state='pending';log('Confirm 클릭 → 모의 응답 대기');if(scenario==='hang')return;
 setTimeout(()=>{if(scenario==='unknown'){$('modals').innerHTML='<div class="scrim"><section class="dialog error-dialog" role="alertdialog"><h2>Unexpected response</h2><p>This screen requires manual review.</p></section></div>';stats.state='unknown';log('알 수 없는 창 → 수동 확인 필요');}
 else if(scenario==='always-error'||scenario==='retry'&&stats.confirm<=failures)error();else active();},delay);
}
document.addEventListener('click',event=>{const id=event.target.closest('button')?.id;
 if(id==='renew'&&stats.state==='ready')confirmation();
 if(id==='confirm'&&stats.state==='confirm')submit();
 if(id==='cancel-error'&&stats.state==='error'){$('error-layer').remove();stats.errorCancel++;stats.state='confirm-dismiss';log('오류창 Cancel 클릭');}
 if(id==='cancel-confirm'&&['confirm','confirm-dismiss'].includes(stats.state)){$('modals').replaceChildren();stats.confirmCancel++;ready();log('확인창 Cancel 클릭 → Renew 화면');}
 if(id==='billing')log('Billing Info 클릭 감지 · 실제 결제정보는 열지 않음');
});
$('reset').onclick=()=>{const query=new URLSearchParams({scenario:$('scenario').value,failures:String(number($('failures').value,2,20)),delay:String(number($('delay').value,600,60000))});location.search=query.toString();};
if(scenario==='active')active();else{ready();log('테스트 준비 · 확장 프로그램에서 화면 점검');}
