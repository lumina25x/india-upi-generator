(function(root){
  'use strict';
  function validate(o){
    if(!o) throw Error('설정 정보를 확인해 주세요.');
    const attempts = Number.isInteger(Number(o.attempts)) && Number(o.attempts) >= 0 ? Number(o.attempts) : 50;
    const delay = Number.isFinite(Number(o.delay)) && Number(o.delay) >= 0 ? Number(o.delay) : 3;
    const useJitter = Boolean(o.useJitter !== false);
    return { attempts, delay, useJitter };
  }
  function retryDelay(settings,random=Math.random){
    const base = Math.max(1, Math.round(settings.delay));
    if(!settings.useJitter) return base;
    // 설정한 대기초 +- 1~2초 랜덤 오차 (최소 1초)
    const offset = Math.floor(random() * 3) - 1; // -1, 0, +1
    return Math.max(1, base + offset);
  }
  class Runner {
    constructor(io){this.io=io;this.active=false;this.state={phase:'idle',attempt:0,message:'구독 화면을 점검해 주세요.',logs:[]};}
    emit(phase,message){this.state={...this.state,phase,message};this.state.logs=[...this.state.logs,{time:new Date().toISOString(),phase,attempt:this.state.attempt,message}].slice(-200);this.io.update?.(this.state);}
    stop(){this.cancelled=true;if(this.active)this.emit('stopped','사용자가 중지했습니다. 전송된 결제 요청은 취소되지 않으므로 구독 상태를 확인하세요.');}
    async wait(ms){
      for(let left=ms;left>0;left-=100){
        if(this.cancelled)return false;
        await this.io.sleep(Math.min(100,left));
      }
      return !this.cancelled;
    }
    async start(options,target){
      if(this.active)throw Error('이미 실행 중입니다.');
      const settings=validate(options);
      if(!target||target.kind!=='ready'||!target.product||!target.price)throw Error('상품과 금액을 확인할 수 있는 구독 화면부터 시작하세요.');
      this.active=true;this.cancelled=false;this.state={phase:'starting',attempt:0,message:'',logs:[],target,settings,startedAt:new Date().toISOString()};
      const now=this.io.now||Date.now;
      let stage='ready',polls=0,confirmed=false,stageDeadline=now()+30000;
      this.emit('running','구독 화면을 확인하고 있습니다.');
      try{
        while(!this.cancelled){
          const screen=await this.io.inspect();
          if(this.cancelled)break;
          if(now()>=stageDeadline){this.emit('review','화면 응답 대기 시간이 지났습니다. 구독 상태를 직접 확인하세요.');break;}
          if(Number.isInteger(target.frameId)&&Number.isInteger(screen.frameId)&&target.frameId!==screen.frameId){this.emit('review','구독 화면의 실행 위치가 변경되어 중지했습니다. 다시 점검해 주세요.');break;}
          if(screen.kind==='success'){
            if(confirmed&&screen.product===target.product){this.emit('success','대상 구독의 활성 상태와 갱신일을 확인했습니다. Apple 결제 내역도 확인하세요.');}
            else this.emit('review','활성 구독 화면입니다. 이번 실행의 갱신 결과인지는 확인해 주세요.');
            break;
          }
          if(['unknown','ambiguous','auth'].includes(screen.kind)){this.emit('review','화면을 확실히 판별할 수 없습니다. Apple 화면을 직접 확인해 주세요.');break;}
          let action=null;
          if(stage==='ready'&&screen.kind==='ready'){
            if(settings.attempts!==0&&this.state.attempt>=settings.attempts){this.emit('limit','설정한 시도 횟수에 도달했습니다.');break;}
            action='ready';
          }else if(stage==='confirm'&&screen.kind==='confirm'&&screen.canConfirm!==false)action='confirm';
          else if(stage==='result'&&screen.kind==='error')action='error';
          else if(stage==='dismiss'&&['confirm','dismiss'].includes(screen.kind))action='dismiss';
          else if(['dismiss','return'].includes(stage)&&screen.kind==='ready'){
            if(settings.attempts!==0&&this.state.attempt>=settings.attempts){this.emit('limit','설정한 시도 횟수에 도달했습니다.');break;}
            const seconds=retryDelay(settings,this.io.random);this.state.delaySeconds=seconds;
            this.state.nextAt=new Date(Date.now()+seconds*1000).toISOString();
            this.emit('waiting','오류창을 닫았습니다. 다음 시도까지 기다립니다.');
            if(!await this.wait(seconds*1000))break;
            delete this.state.nextAt;stage='ready';polls=0;stageDeadline=now()+30000;continue;
          }
          if(action){
            if(['ready','confirm'].includes(action)&&(screen.product!==target.product||screen.price!==target.price)){this.emit('review','상품 또는 금액이 처음 확인한 내용과 달라 중지했습니다.');break;}
            if(this.cancelled)break;
            const clicked=await this.io.act({...screen,kind:action});
            if(this.cancelled)break;
            if(!clicked){this.emit('review','클릭 직전 화면이 변경되었습니다. 다시 점검해 주세요.');break;}
            polls=0;stageDeadline=now()+30000;
            if(action==='ready'){stage='confirm';this.emit('running','갱신 확인창을 기다리고 있습니다.');}
            if(action==='confirm'){stage='result';confirmed=true;this.state.attempt++;this.emit('running','결제 결과를 기다립니다. 확인 버튼을 다시 누르지 않습니다.');}
            if(action==='error'){stage='dismiss';this.emit('running','결제 오류창을 닫았습니다. 구독 확인창을 정리합니다.');}
            if(action==='dismiss'){stage='return';this.emit('running','구독 화면으로 돌아가는 중입니다.');}
          }else{
            if(++polls>=120){this.emit('review','30초 동안 다음 화면을 확인하지 못했습니다. 결제 결과를 직접 확인하세요.');break;}
          }
          if(!await this.wait(250))break;
        }
      }catch(error){if(!this.cancelled)this.emit('review','페이지 연결이 끊겼습니다. 구독 상태를 확인하고 다시 점검하세요.');}
      finally{this.active=false;this.state.endedAt=new Date().toISOString();this.io.update?.(this.state);}
      return this.state;
    }
  }
  root.RenewEngine={Runner,validate,retryDelay};if(typeof module!=='undefined')module.exports=root.RenewEngine;
})(globalThis);
