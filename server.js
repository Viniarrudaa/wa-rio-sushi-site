import('./server/server.js').catch(error=>{
  console.error('Falha ao iniciar o servidor WA RIO:',error);
  process.exitCode=1;
});
