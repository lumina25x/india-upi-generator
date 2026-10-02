(function(root){
  const simulationUrl='http://127.0.0.1:18741/wagal-test/';
  function kind(value){try{const url=new URL(value);if(url.origin==='https://account.apple.com')return 'apple';if(url.origin==='http://127.0.0.1:18741'&&url.pathname==='/wagal-test/')return 'simulation';}catch{}return null;}
  root.WagalTarget={kind,simulationUrl};if(typeof module!=='undefined')module.exports=root.WagalTarget;
})(globalThis);
