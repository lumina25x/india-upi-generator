// Self-contained function serialized by chrome.scripting; no external code or requests.
function renewPageAction(expected) {
  const norm=s=>(s||'').replace(/\s+/g,' ').trim();
  const visible=e=>!!e && e.getClientRects().length>0 && getComputedStyle(e).visibility!=='hidden' && getComputedStyle(e).display!=='none' && !e.closest('[hidden],[aria-hidden="true"]');
  const roots=[document];
  for(let i=0;i<roots.length;i++)for(const e of roots[i].querySelectorAll('*'))if(e.shadowRoot)roots.push(e.shadowRoot);
  const all=selector=>roots.flatMap(r=>Array.from(r.querySelectorAll(selector)));
  const text=e=>norm(e?.innerText||e?.textContent);
  const usable=e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
  const buttons=scope=>(scope?Array.from(scope.querySelectorAll('button,[role="button"],input[type="submit"]')):all('button,[role="button"],input[type="submit"]')).filter(usable);
  const label=e=>norm(e.innerText||e.value||e.getAttribute('aria-label')||e.textContent);
  const unique=items=>items.length===1?items[0]:null;
  const product=scope=>{const t=text(scope);return /YouTube\s+Premium\s+Family/i.test(t)?'YouTube Premium Family':/YouTube\s+Premium/i.test(t)?'YouTube Premium':null;};
  const productLabels=scope=>{
    const labels=Array.from(scope?.querySelectorAll('h1,h2,h3,h4,p,span,div,[role="heading"]')||[])
      .filter(e=>visible(e)&&/^YouTube(?:\s+Premium(?:\s+Family)?)?$/i.test(text(e)));
    return labels.filter(e=>!labels.some(child=>child!==e&&e.contains(child)));
  };
  const cleanCard=scope=>{
    const labels=productLabels(scope);
    if(labels.length!==1)return false;
    const title=labels[0];
    return !Array.from(scope.querySelectorAll('h1,h2,h3,h4,[role="heading"]')).some(e=>visible(e)&&e!==title&&!e.contains(title)&&!title.contains(e)&&!/^(YouTube|Premium(?: Family)?)$/i.test(text(e)));
  };
  const price=scope=>{const values=[...text(scope).matchAll(/(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi)].map(m=>'INR '+Number(m[1].replaceAll(',','')));return [...new Set(values)].length===1?values[0]:null;};
  const renewalText=scope=>{
    const month='(?:January|February|March|April|May|June|July|August|September|October|November|December)';
    const day='(?:0?[1-9]|[12][0-9]|3[01])';
    const date=`(?:${day} ${month}(?:,? [0-9]{4})?|${month} ${day}(?:,? [0-9]{4})?|[0-9]{4}-[0-9]{2}-[0-9]{2})`;
    const english=text(scope).match(new RegExp(`\\b(?:Renews?(?: on)?|Next billing date)\\s*:?\\s*${date}\\b`,'i'));
    const korean=text(scope).match(/(?:다음 (?:갱신|결제)일|갱신 예정일)\s*:?\s*(?:\d{4}년\s*)?\d{1,2}월\s*\d{1,2}일/);
    return english?.[0]||korean?.[0]||null;
  };
  const cardForLabel=title=>{
    const linkedCard=title.closest('a,button,[role="button"],[data-test="subscription-card"],[data-testid="subscription-card"]');
    if(linkedCard&&product(linkedCard)&&cleanCard(linkedCard))return linkedCard;
    // Stop at the first local product container; never climb to borrow a sibling card's date.
    let card=title.parentElement;
    for(let depth=0;card&&depth<5;depth++,card=card.parentElement){
      if(product(card))return cleanCard(card)?card:null;
      if(card.matches('main,body,article,section,a,button,[role="button"]'))break;
    }
    return null;
  };
  let snapshot={kind:'unknown'},button=null;
  const dialogs=all('[role="dialog"],[role="alertdialog"],[aria-modal="true"],dialog[open]').filter(visible);
  const leafDialogs=dialogs.filter(d=>!dialogs.some(other=>other!==d&&d.contains(other)));
  if(leafDialogs.length>1){
    const errors=leafDialogs.filter(d=>/Unable to Complete Purchase|unable to charge|구매를 완료할 수 없/i.test(text(d)));
    if(errors.length===1)leafDialogs.splice(0,leafDialogs.length,errors[0]);
  }
  if(leafDialogs.length===1){
    const dialog=leafDialogs[0];const t=text(dialog);
    if(/Unable to Complete Purchase|unable to charge|구매를 완료할 수 없/i.test(t)){
      button=unique(buttons(dialog).filter(b=>/^(Cancel|취소)$/i.test(label(b))));snapshot={kind:button?'error':'unknown'};
    }else if(/Confirm Subscription|구독 확인/i.test(t)){
      const cancelling=expected?.kind==='dismiss';
      button=unique(buttons(dialog).filter(b=>(cancelling?/^(Cancel|취소)$/i:/^(Confirm|확인)$/i).test(label(b))));
      snapshot={kind:cancelling?(button?'dismiss':'unknown'):'confirm',canConfirm:!!button,product:product(dialog),price:price(dialog)};
    }else snapshot={kind:/password|verification|인증|암호|sign in/i.test(t)?'auth':'unknown'};
  }else if(leafDialogs.length>1)snapshot={kind:'ambiguous'};
  else {
    const scope=document.querySelector('main')||document.body;const t=text(scope);
    const candidates=buttons().filter(b=>/^(Renew|Resubscribe|갱신|재구독|다시 구독)(?:\b|\s|:)/i.test(label(b))||/^(Renew|Resubscribe|갱신|재구독|다시 구독)$/i.test(label(b)));
    if(candidates.length===1){
      button=candidates[0];
      // Do not borrow a product label from a neighbouring subscription card.
      const card=button.parentElement||button.getRootNode().host?.parentElement;
      snapshot={kind:'ready',product:product(card),price:price(card)};
      if(!snapshot.product||!snapshot.price||!cleanCard(card))snapshot={kind:'unknown'};
    }
    else if(candidates.length>1)snapshot={kind:'ambiguous'};
    else if(productLabels(scope).length>1)snapshot={kind:'ambiguous'};
    else if(productLabels(scope).length===1){
      const card=cardForLabel(productLabels(scope)[0]);const cardText=text(card);const renewal=card&&renewalText(card);
      if(card&&renewal&&!/cancelled|canceled|expired|만료|취소되었습니다/i.test(cardText))snapshot={kind:'success',product:product(card),price:price(card),renewalText:renewal};
      else if(card&&(card.matches('a,button,[role="button"]')||Array.from(scope.querySelectorAll('h1,h2,[role="heading"]')).some(e=>visible(e)&&/^(Subscriptions|구독)$/i.test(text(e)))))snapshot={kind:'list',product:product(card),price:price(card)};
      else if(all('[role="progressbar"],[aria-busy="true"]').some(visible))snapshot={kind:'pending'};
    }
    else if(all('[role="progressbar"],[aria-busy="true"]').some(visible))snapshot={kind:'pending'};
    else if(all('input[type="password"]').some(visible))snapshot={kind:'auth'};
  }
  if(!expected)return snapshot;
  const identityMatches=!['ready','confirm'].includes(expected.kind)||(expected.product===snapshot.product&&expected.price===snapshot.price);
  if(snapshot.kind!==expected.kind||!identityMatches||!button||!usable(button))return {clicked:false};
  // A single DOM click. Never dispatch an additional synthetic click event.
  button.click();return {clicked:true};
}
if(typeof module!=='undefined')module.exports={renewPageAction};
