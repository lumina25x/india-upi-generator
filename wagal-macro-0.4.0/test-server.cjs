'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assets={
 '/wagal-test/':['test-page.html','text/html; charset=utf-8'],
 '/wagal-test/test-page.css':['test-page.css','text/css; charset=utf-8'],
 '/wagal-test/test-page.js':['test-page.js','text/javascript; charset=utf-8']
};
function createServer(){return http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; frame-ancestors 'none'");
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
  const asset=assets[new URL(req.url,'http://127.0.0.1').pathname];
  if(!asset){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(path.join(__dirname,asset[0]),(error,data)=>{if(error){res.writeHead(500);res.end('Test asset unavailable');return;}res.writeHead(200,{'Content-Type':asset[1]});res.end(req.method==='HEAD'?undefined:data);});
});}
if(require.main===module){
 const server=createServer();server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 18741 is already in use. Close the previous test server, or open the existing test page.':error.message);process.exitCode=1;});
 server.listen(18741,'127.0.0.1',()=>{
  console.log('Wagal Macro local test: http://127.0.0.1:18741/wagal-test/');console.log('No real purchases. Keep this window open. Ctrl+C stops the server.');
  if(process.argv.includes('--open')&&process.platform==='win32'){
   const child=require('node:child_process').spawn('rundll32.exe',['url.dll,FileProtocolHandler','http://127.0.0.1:18741/wagal-test/'],{windowsHide:true,stdio:'ignore'});child.on('error',()=>console.log('Open the URL above in Chrome manually.'));
  }
 });
}
module.exports={createServer};
