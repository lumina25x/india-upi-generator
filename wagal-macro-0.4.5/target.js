(function(root){
  const simulationUrl='http://127.0.0.1:18741/wagal-test/';
  function kind(value){
    try{
      const url=new URL(value);
      if(url.origin==='https://account.apple.com') return 'apple';
      // 127.0.0.1 또는 localhost 로 열린 테스트 페이지 (포트 무관)
      if((url.hostname==='127.0.0.1'||url.hostname==='localhost')&&(url.pathname.includes('wagal-test')||url.pathname.includes('test-page'))) return 'simulation';
      // file:/// 로 열린 로컬 test-page.html 파일
      if(url.protocol==='file:'&&url.pathname.includes('test-page')) return 'simulation';
    }catch{}
    return null;
  }
  root.WagalTarget={kind,simulationUrl};if(typeof module!=='undefined')module.exports=root.WagalTarget;
})(globalThis);
