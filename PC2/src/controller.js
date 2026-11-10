// Corpo do nó Function. Estado exclusivamente em memória; DEMO e rádio são separados.
const now = Date.now();
const macPattern = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
let s = context.get('state') || {
  source:'LIVE', connected:false, port:'COM5', team:1, configuredMac:'', lockedMac:'',
  receiver:null, heartbeat:0, received:0, rejected:0, duplicate:0, gaps:0,
  sample:null, lastAt:0, history:[], window:[], average:null, session:null, retired:[],
  high:false, highHigh:false, blocked:true, compressor:false, acknowledged:false,
  quality:'DESCONHECIDO', events:[], demoPressure:5, demoSeq:0, demoRunning:false, error:''
};
let config=null, response=null;
function event(text){s.events.unshift({at:now,text});s.events=s.events.slice(0,40);}
function fresh(){return s.sample!==null && now-s.lastAt<=3000 && (s.source==='DEMO'||s.connected);}
function trip(reason){if(!s.blocked||s.compressor)event(reason);s.blocked=true;s.compressor=false;}
function freshness(){
  const q=fresh()?'VALIDO':s.sample?'SEM_DADOS':'DESCONHECIDO';
  if(q!==s.quality){
    event(q==='VALIDO'?'Telemetria válida.':'Dados ausentes ou vencidos.');
    if(q!=='VALIDO'){trip('Intertravamento por perda de dados.');s.window=[];s.acknowledged=false;}
  }
  s.quality=q;
}
function clearStream(){
  s.sample=null;s.lastAt=0;s.history=[];s.window=[];s.average=null;s.session=null;s.retired=[];
  s.high=false;s.highHigh=false;s.blocked=true;s.compressor=false;s.acknowledged=false;
  s.quality='DESCONHECIDO';s.lockedMac=s.configuredMac;s.received=0;s.rejected=0;s.duplicate=0;s.gaps=0;
}
function accept(p,mac,rssi,age=0){
  if(!p||p.v!==1||p.tanque!=='TK-101'||!Number.isInteger(p.equipe)||p.equipe!==s.team||
    !Number.isInteger(p.boot)||p.boot<0||p.boot>4294967295||
    !Number.isInteger(p.seq)||p.seq<1||p.seq>4294967294||
    !Number.isInteger(p.t_ms)||p.t_ms<0||p.t_ms>4294967295||
    typeof p.p_bar!=='number'||!Number.isFinite(p.p_bar)||p.p_bar<0||p.p_bar>10||
    !['AUTO','TESTE'].includes(p.modo)||!macPattern.test(mac)||
    !Number.isFinite(age)||age<0||age>1500||!Number.isFinite(rssi)||rssi>0||rssi< -127){s.rejected++;return;}
  if(s.lockedMac && s.lockedMac!==mac){s.rejected++;return;}
  const key=mac+':'+p.boot;
  if(s.retired.includes(key)){s.duplicate++;return;}
  if(s.session===key && p.seq<=s.sample.seq){s.duplicate++;return;}
  if(s.session!==key){
    if(s.session){s.retired.push(s.session);s.retired=s.retired.slice(-32);}
    s.session=key;s.window=[];event('Nova sessão do emissor: '+p.boot);
  }else if(s.sample && p.seq>s.sample.seq+1){s.gaps+=p.seq-s.sample.seq-1;}
  if(!s.lockedMac){s.lockedMac=mac;event('Origem vinculada: '+mac);}
  if(!fresh())s.window=[];
  s.sample={...p,mac,rssi};s.lastAt=now-age;s.received++;
  s.window.push(p.p_bar);s.window=s.window.slice(-5);
  s.average=s.window.reduce((a,b)=>a+b,0)/s.window.length;
  s.history.push({at:s.lastAt,p:p.p_bar,avg:s.average});s.history=s.history.slice(-120);
  const h=s.high, hh=s.highHigh;
  if(p.p_bar>=7)s.high=true;else if(p.p_bar<=6.7)s.high=false;
  if(p.p_bar>=8.5)s.highHigh=true;else if(p.p_bar<=8.2)s.highHigh=false;
  if(h!==s.high){event(s.high?'Alarme alto: pressão ≥ 7 bar.':'Condição de pressão alta encerrada.');if(s.high)s.acknowledged=false;}
  if(hh!==s.highHigh){event(s.highHigh?'Alarme muito alto: pressão ≥ 8,5 bar.':'Condição muito alta encerrada; bloqueio retido.');if(s.highHigh)s.acknowledged=false;}
  if(s.highHigh)trip('Compressor virtual bloqueado por pressão muito alta.');
  freshness();
}
function view(){freshness();return {...s,now,ageMs:s.sample?Math.max(0,now-s.lastAt):null,
  pressure:fresh()?s.sample.p_bar:null,mean:fresh()?s.average:null,
  receiverOnline:s.connected&&now-s.heartbeat<2500&&s.heartbeat>0,
  canReset:fresh()&&s.sample.p_bar<=6.7,channel:6};}
freshness();
if(msg.topic==='serial' && s.source==='LIVE' && s.connected){
  try{
    const r=JSON.parse(String(msg.payload).trim());
    if(r.type==='ready'&&r.protocol==='AULA12-PC2-V1'&&r.channel===6&&macPattern.test(r.mac)){
      s.receiver=r;s.heartbeat=now;s.error='';
    }else if(r.type==='rx'&&typeof r.data==='string'&&r.data.length<=250){
      accept(JSON.parse(r.data),String(r.mac).toUpperCase(),r.rssi,r.age_ms);
    }else if(r.type==='error'){s.error=String(r.error);event('Receptor: '+s.error);}
    else s.rejected++;
  }catch{s.rejected++;}
}else if(msg.topic==='tick'){
  if(s.source==='DEMO'&&s.demoRunning){
    s.demoSeq++;
    accept({v:1,equipe:s.team,tanque:'TK-101',boot:1,seq:s.demoSeq,t_ms:s.demoSeq*500,p_bar:s.demoPressure,modo:'TESTE'},'DE:00:00:00:00:01',-40,0);
  }
}else if(msg.topic==='control'){
  const b=msg.payload||{};let error='';
  switch(b.action){
    case 'connect':
      if(typeof b.port!=='string'||!/^COM[1-9][0-9]{0,3}$/i.test(b.port.trim())){error='Porta inválida. Exemplo: COM5.';break;}
      if(s.source==='LIVE'&&s.connected&&s.port===b.port.trim().toUpperCase())break;
      s.source='LIVE';s.connected=true;s.port=b.port.trim().toUpperCase();s.heartbeat=0;s.receiver=null;s.demoRunning=false;
      clearStream();config={payload:{serialport:s.port,serialbaud:115200,databits:8,parity:'none',stopbits:1,enabled:true}};
      event('Serial solicitada: '+s.port+'. Aguardando rádio.');break;
    case 'disconnect':
      s.connected=false;s.heartbeat=0;trip('USB liberada; compressor virtual bloqueado.');
      config={payload:{enabled:false}};event('USB liberada.');break;
    case 'filter':{
      const mac=typeof b.mac==='string'?b.mac.trim().toUpperCase():'';
      if(!Number.isInteger(b.team)||b.team<1||b.team>999||typeof b.mac!=='string'||(mac&&!macPattern.test(mac))){error='Equipe deve ser 1–999 e MAC vazio ou AA:BB:CC:DD:EE:FF.';break;}
      if(s.source==='DEMO'){error='Volte ao rádio antes de alterar o filtro.';break;}
      s.team=b.team;s.configuredMac=mac;clearStream();event('Filtro aplicado. Origem '+(mac||'automática na primeira amostra válida')+'.');break;
    }
    case 'ack':s.acknowledged=true;event('Operador reconheceu os alarmes; bloqueios mantidos.');break;
    case 'reset':
      if(!fresh()||s.sample.p_bar>6.7){error='Rearme exige leitura válida e pressão ≤ 6,7 bar.';break;}
      s.blocked=false;event('Bloqueio rearmado; compressor permanece parado.');break;
    case 'start':
      if(!fresh()||s.blocked||s.highHigh){error='Partida bloqueada: confira dados e rearme.';break;}
      s.compressor=true;event('Compressor virtual ligado.');break;
    case 'stop':s.compressor=false;event('Compressor virtual parado.');break;
    case 'demo':
      s.connected=false;s.heartbeat=0;s.source='DEMO';clearStream();s.lockedMac='';s.demoSeq=0;s.demoRunning=true;s.demoPressure=5;
      config={payload:{enabled:false}};event('DEMO local: nenhum dado de rádio é utilizado.');break;
    case 'demoPressure':
      if(s.source!=='DEMO'||typeof b.pressure!=='number'||!Number.isFinite(b.pressure)||b.pressure<0||b.pressure>10){error='Pressão DEMO inválida.';break;}
      s.demoPressure=b.pressure;break;
    case 'demoPause':s.demoRunning=false;break;
    case 'demoResume':if(s.source==='DEMO')s.demoRunning=true;break;
    default:error='Ação desconhecida.';
  }
  response={...msg,statusCode:error?400:200,payload:error?{error}:view(),headers:{'Cache-Control':'no-store'}};
}else if(msg.topic==='state'){
  response={...msg,payload:view(),headers:{'Cache-Control':'no-store'}};
}
context.set('state',s);
node.status({fill:s.quality==='VALIDO'?'green':'grey',shape:'dot',text:s.source+' / '+s.quality+' / '+s.received+' amostras'});
return [config,response];
