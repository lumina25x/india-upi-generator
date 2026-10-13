(function(root){
  'use strict';
  function selectFrame(states,run){
    const pending=()=>({kind:'pending',reason:'waiting-for-stage',frames:states.map(s=>({frameId:s.frameId,kind:s.kind,reason:s.reason}))});
    const ambiguous=list=>({kind:'ambiguous',reason:'multiple-frames',frames:list.map(s=>({frameId:s.frameId,kind:s.kind}))});
    const approved=s=>({...s,frameApproved:true});
    const confirms=states.filter(s=>s.kind==='confirm');
    if(!run){
      if(confirms.length>1)return ambiguous(confirms);
      if(confirms.length===1)return confirms[0];
      const known=states.filter(s=>!['unknown','pending'].includes(s.kind));
      if(known.length>1)return ambiguous(known);
      const loading=states.find(s=>s.reason==='empty-dialog');
      if(loading&&(!known.length||known.every(s=>s.kind==='ready')))return loading;
      return known[0]||states.find(s=>s.kind==='pending')||{kind:'unknown'};
    }
    const auth=states.find(s=>s.kind==='auth');if(auth)return auth;
    const verify=s=>{
      if(!s.product||!s.price)return pending();
      if(s.product!==run.product||s.price!==run.price)return {kind:'blocked',reason:'target-changed',frameId:s.frameId};
      return approved(s);
    };
    let home=states.find(s=>s.frameId===run.homeFrameId);
    if(run.unboundHome&&['dismiss','return'].includes(run.stage)){
      const candidates=states.filter(s=>s.kind==='ready'&&s.product===run.product&&s.price===run.price);
      if(candidates.length>1)return ambiguous(candidates);
      if(candidates.length===1)home=candidates[0];
    }
    if(run.stage==='confirm'){
      if(confirms.length>1)return ambiguous(confirms);
      return confirms.length?verify(confirms[0]):pending();
    }
    if(['result','dismiss','return'].includes(run.stage)){
      const success=states.filter(s=>s.kind==='success'&&s.product===run.product);
      if(success.length>1)return ambiguous(success);
      if(success.length===1)return approved(success[0]);
    }
    if(run.stage==='result'){
      const errors=states.filter(s=>s.kind==='error');
      if(errors.length>1)return ambiguous(errors);
      if(errors.length===1)return approved(errors[0]);
      const current=states.find(s=>s.frameId===run.confirmationFrameId);
      return current?.kind==='confirm'?approved(current):pending();
    }
    if(run.stage==='dismiss'){
      const current=states.find(s=>s.frameId===run.confirmationFrameId);
      if(current?.kind==='confirm')return approved(current);
      if(home?.kind==='ready')return verify(home);
      return pending();
    }
    if(['ready','return'].includes(run.stage)){
      if(home?.kind==='ready')return verify(home);
      return home?.kind==='ambiguous'?home:pending();
    }
    return pending();
  }
  root.WagalFrames={selectFrame};if(typeof module!=='undefined')module.exports=root.WagalFrames;
})(globalThis);
