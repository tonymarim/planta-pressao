import './style.css';
import {createPlant} from './plant.js';
const el=id=>document.getElementById(id);
let plant=null,lastResponse=0,inFlight=false;
try{plant=createPlant(el('plant'));el('sceneStatus').textContent='Planta 3D · reservatório de ar comprimido';}
catch(e){el('sceneStatus').textContent='3D indisponível neste navegador; leituras e alarmes permanecem disponíveis.';console.error(e);}
el('camera').onclick=()=>plant?.reset();
function n(v){return typeof v==='number'?v.toFixed(2).replace('.',','):'—';}
async function command(payload){
  try{const r=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(3000)});const b=await r.json();if(!r.ok)throw Error(b.error||'Falha na operação');el('message').textContent='Solicitação aplicada.';render(b);}
  catch(e){el('message').textContent=e.message;}
}
el('connect').onclick=()=>command({action:'connect',port:el('port').value});
el('disconnect').onclick=()=>command({action:'disconnect'});
el('filter').onclick=()=>command({action:'filter',team:Number(el('team').value),mac:el('mac').value});
for(const name of ['ack','reset','start','stop','demo','demoPause','demoResume'])el(name).onclick=()=>command({action:name});
el('demoApply').onclick=()=>command({action:'demoPressure',pressure:el('demoPressure').value.trim()===''?null:Number(el('demoPressure').value)});
function render(s){
  lastResponse=performance.now();
  const valid=s.quality==='VALIDO';
  const color=!valid?'#9fb0bf':s.highHigh?'#ff7272':s.high?'#f3bb65':'#5dddc1';
  el('source').textContent=s.source==='DEMO'?'DEMO LOCAL / SEM RÁDIO':'ESP-NOW / PC2';
  el('banner').textContent=s.source==='DEMO'?'DEMONSTRAÇÃO LOCAL — valores gerados neste PC; não são recebidos do emissor.':valid?'Recepção ESP-NOW ativa · equipe '+s.team+' · origem '+s.lockedMac:'Aguardando dados válidos do PC1. Verifique emissor, canal 6, equipe e conexão USB.';
  el('banner').style.borderColor=color;el('pressure').style.color=color;
  el('pressure').textContent=n(s.pressure);el('mean').textContent=n(s.mean);
  el('quality').textContent=s.quality;el('quality').style.color=color;
  el('age').textContent=s.ageMs===null?'Sem amostra válida':'Última amostra há '+(s.ageMs/1000).toFixed(1)+' s'+(!valid?' · DESATUALIZADA':'');
  el('received').textContent=s.received;el('sequence').textContent='seq '+(s.sample?.seq??'—');
  el('gaps').textContent=s.gaps+' / '+(s.rejected+s.duplicate);el('rssi').textContent=valid?(s.sample?.rssi??'—'):'—';
  el('usb').textContent=s.source==='DEMO'?'USB liberada / demonstração local':s.receiverOnline?'ESP32-C3 identificada':s.connected?'Aguardando identificação USB':'Receptor USB desconectado';
  el('receiver').textContent=s.receiver?'Receptor '+s.receiver.mac+' · canal 6 · descartes na fila '+s.receiver.queue_drops:'Canal 6 · 115200 baud';
  el('origin').textContent=s.lockedMac?'Emissor vinculado: '+s.lockedMac:'Origem ainda não vinculada.';
  el('alarm').textContent=!valid?'SEM DADOS VÁLIDOS':s.highHigh?'HH · PRESSÃO MUITO ALTA':s.high?'H · PRESSÃO ALTA':s.blocked?'NORMAL · BLOQUEIO RETIDO':'PRESSÃO NORMAL';
  el('alarm').style.color=color;el('alarm').style.borderColor=color;
  el('compressor').textContent='C-101 · '+(s.compressor?'LIGADO (virtual)':'PARADO')+(s.blocked?' / BLOQUEADO':' / LIBERADO');
  el('ackState').textContent=s.acknowledged?'Alarme reconhecido pelo operador.':'Sem reconhecimento.';
  el('reset').disabled=!s.canReset||!s.blocked;el('start').disabled=!valid||s.blocked||s.compressor;el('stop').disabled=!s.compressor;
  const points=key=>s.history.map((p,i)=>`${30+i*760/119},${145-p[key]*13.5}`).join(' ');
  el('raw').setAttribute('points',points('p'));el('avg').setAttribute('points',points('avg'));
  el('events').replaceChildren(...s.events.map(e=>{const li=document.createElement('li');li.textContent=new Date(e.at).toLocaleTimeString('pt-BR')+' — '+e.text;return li;}));
  plant?.update({valid,pressure:s.pressure,color,compressor:s.compressor,source:s.source});
}
function offline(){
  el('banner').textContent='SEM CONEXÃO COM NODE-RED — valores anteriores desatualizados.';
  el('quality').textContent='SERVIDOR OFFLINE';el('pressure').textContent='—';el('mean').textContent='—';el('rssi').textContent='—';
  el('alarm').textContent='ESTADO DESCONHECIDO';el('compressor').textContent='C-101 · estado indisponível';
  el('start').disabled=true;el('reset').disabled=true;plant?.update({valid:false,pressure:null,color:'#9fb0bf',compressor:false});
}
async function poll(){
  if(inFlight)return;inFlight=true;
  try{const r=await fetch('/api/state',{cache:'no-store',signal:AbortSignal.timeout(2000)});if(!r.ok)throw Error();render(await r.json());}
  catch{offline();}finally{inFlight=false;}
}
setInterval(()=>{if(lastResponse&&performance.now()-lastResponse>3000)offline();},250);
poll();setInterval(poll,500);
