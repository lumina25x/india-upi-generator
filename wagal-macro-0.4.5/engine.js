(function(root){
  'use strict';
  function validate(o){
    if(!o) throw Error('설정 정보를 확인해 주세요.');
    const attempts = Number.isInteger(Number(o.attempts)) && Number(o.attempts) >= 0 ? Number(o.attempts) : 50;
    const delay = Number.isFinite(Number(o.delay)) && Number(o.delay) >= 0 ? Number(o.delay) : 3;
    const useJitter = Boolean(o.useJitter !== false);
    const stageTimeout = Number.isFinite(Number(o.stageTimeout)) && Number(o.stageTimeout) > 0 ? Number(o.stageTimeout) : 30000;
    const autoReload = Boolean(o.autoReload !== false);
    return { attempts, delay, useJitter, stageTimeout, autoReload };
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
    emit(phase,message){this.state={...this.state,phase,message};this.state.logs=[...this.state.logs,{time:new Date().toISOString(),phase,attempt:this.state.attempt,message,observation:this.state.observation}].slice(-200);this.io.update?.(this.state);}
    stop(){this.cancelled=true;if(this.active)this.emit('stopped','사용자가 중지했습니다. 전송된 결제 요청은 취소되지 않으므로 구독 상태를 확인하세요.');}
    async wait(ms){
      for(let left=ms;left>0;left-=100){
        if(this.cancelled)return false;
        await this.io.sleep(Math.min(100,left));
      }
      return !this.cancelled;
    }
    async start(options,target,resume={}){
      if(this.active)throw Error('이미 실행 중입니다.');
      const settings=validate(options);
      if(!target||!['ready','confirm'].includes(target.kind)||!target.product||!target.price)throw Error('상품과 금액을 확인할 수 있는 구독 화면부터 시작하세요.');
      this.active=true;this.cancelled=false;
      const initialAttempt=Number.isInteger(resume.initialAttempt)?resume.initialAttempt:0;
      const startedAt=resume.startedAt||new Date().toISOString();
      const initialLogs=Array.isArray(resume.initialLogs)?resume.initialLogs:[];
      this.state={phase:'starting',attempt:initialAttempt,message:'',logs:initialLogs,target,settings,startedAt};
      const now=this.io.now||Date.now;
      const timeoutMs=settings.stageTimeout;
      const maxPolls=Math.max(120,Math.round(timeoutMs/250));
      let stage=target.kind==='confirm'?'confirm':'ready',polls=0,confirmed=target.kind==='confirm',stageDeadline=now()+timeoutMs;
      this.emit('running',initialAttempt>0?`이전 ${initialAttempt}회에 이어 구독 화면을 확인하고 있습니다.`:'구독 화면을 확인하고 있습니다.');
      try{
        while(!this.cancelled){
          const screen=await this.io.inspect();
          this.state.observation={stage,kind:screen.kind,frameId:screen.frameId,reason:screen.reason,count:screen.count,frames:screen.frames,canConfirm:screen.canConfirm};
          if(this.cancelled)break;
          if(now()>=stageDeadline||polls>=maxPolls){
            if(settings.autoReload&&typeof this.io.reloadAndResume==='function'){
              this.emit('reloading','화면 무응답 3분 감지: 페이지를 새로고침하고 자동으로 계속 진행합니다...');
              await this.io.reloadAndResume({target:this.state.target,settings:this.state.settings,attempt:this.state.attempt,startedAt:this.state.startedAt,logs:this.state.logs});
              break;
            }
            this.emit('review','화면 응답 대기 시간이 지났습니다. 구독 상태를 직접 확인하세요.');
            break;
          }
          if(screen.kind==='blocked'){this.emit('review','상품 또는 금액이 처음 확인한 내용과 달라 중지했습니다.');break;}
          if(!screen.frameApproved&&!['unknown','pending'].includes(screen.kind)&&Number.isInteger(target.frameId)&&Number.isInteger(screen.frameId)&&target.frameId!==screen.frameId){this.emit('review','구독 화면의 실행 위치가 변경되어 중지했습니다. 다시 점검해 주세요.');break;}
          if(screen.kind==='success'){
            if(confirmed&&screen.product===target.product){this.emit('success','대상 구독의 활성 상태와 갱신일을 확인했습니다. Apple 결제 내역도 확인하세요.');}
            else this.emit('review','활성 구독 화면입니다. 이번 실행의 갱신 결과인지는 확인해 주세요.');
            break;
          }
          // Transitions can briefly remove the previous DOM. Keep the original
          // stage deadline while waiting; a blank observation never resets it.
          if(screen.kind==='auth'){this.emit('review','인증 화면이 감지되었습니다. 인증 후 다시 점검하세요.');break;}
          if(screen.kind==='ambiguous'&&stage!=='confirm'){this.emit('review','여러 구독 화면이 동시에 감지되었습니다. 로그를 내려받아 확인하세요.');break;}
          if(screen.kind==='ambiguous'&&stage==='confirm'&&this.state.message!=='확인창 전환 중입니다. 대상이 하나로 확인될 때까지 기다립니다.'){this.emit('running','확인창 전환 중입니다. 대상이 하나로 확인될 때까지 기다립니다.');}
          if(['unknown','pending'].includes(screen.kind)){
            const waitElapsed=timeoutMs-(stageDeadline-now());
            if(waitElapsed>15000&&this.state.message!=='화면 응답 대기 중입니다... (3분 무응답 시 자동 새로고침)'){
              this.emit('running','화면 응답 대기 중입니다... (3분 무응답 시 자동 새로고침)');
            }else if(waitElapsed<=15000&&this.state.message!=='화면 로딩 중입니다. 버튼이 준비될 때까지 기다립니다.'){
              this.emit('running','화면 로딩 중입니다. 버튼이 준비될 때까지 기다립니다.');
            }
          }
          if(stage==='confirm'&&screen.kind==='confirm'&&((screen.product&&screen.product!==target.product)||(screen.price&&screen.price!==target.price))){this.emit('review','상품 또는 금액이 처음 확인한 내용과 달라 중지했습니다.');break;}
          let action=null;
          if(stage==='ready'&&screen.kind==='ready'){
            if(settings.attempts!==0&&this.state.attempt>=settings.attempts){this.emit('limit','설정한 시도 횟수에 도달했습니다.');break;}
            action='ready';
          }else if(stage==='confirm'&&screen.kind==='confirm'&&screen.canConfirm!==false&&screen.product&&screen.price)action='confirm';
          else if(stage==='result'&&screen.kind==='error')action='error';
          else if(stage==='dismiss'&&['confirm','dismiss'].includes(screen.kind))action='dismiss';
          else if(['dismiss','return'].includes(stage)&&screen.kind==='ready'){
            if(settings.attempts!==0&&this.state.attempt>=settings.attempts){this.emit('limit','설정한 시도 횟수에 도달했습니다.');break;}
            const seconds=retryDelay(settings,this.io.random);this.state.delaySeconds=seconds;
            this.state.nextAt=new Date(Date.now()+seconds*1000).toISOString();
            this.emit('waiting','오류창을 닫았습니다. 다음 시도까지 기다립니다.');
            if(!await this.wait(seconds*1000))break;
            delete this.state.nextAt;stage='ready';polls=0;stageDeadline=now()+timeoutMs;continue;
          }
          if(action){
            if(['ready','confirm'].includes(action)&&(screen.product!==target.product||screen.price!==target.price)){this.emit('review','상품 또는 금액이 처음 확인한 내용과 달라 중지했습니다.');break;}
            if(this.cancelled)break;
            const clicked=await this.io.act({...screen,kind:action});
            if(this.cancelled)break;
            if(!clicked){this.emit('review','클릭 직전 화면이 변경되었습니다. 다시 점검해 주세요.');break;}
            polls=0;stageDeadline=now()+timeoutMs;
            if(action==='ready'){stage='confirm';this.emit('running','갱신 확인창을 기다리고 있습니다.');}
            if(action==='confirm'){stage='result';confirmed=true;this.state.attempt++;this.emit('running','결제 결과를 기다립니다. 확인 버튼을 다시 누르지 않습니다.');}
            if(action==='error'){stage='dismiss';this.emit('running','결제 오류창을 닫았습니다. 구독 확인창을 정리합니다.');}
            if(action==='dismiss'){stage='return';this.emit('running','구독 화면으로 돌아가는 중입니다.');}
          }else{
            ++polls;
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
