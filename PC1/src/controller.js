// Corpo do nó Function do Node-RED; também executado pelos testes em VM.
const now = Date.now();
let s = context.get('state') || {
  running: false, mode: 'AUTO', fixed: 5, team: 1, pressure: 5, seq: 0,
  generated: 0, submitted: 0, completed: 0, failed: 0, invalid: 0,
  port: '', connected: false, lastHeartbeat: 0, device: null, pending: null,
  latest: null, lastTx: null, history: [], log: [], error: ''
};
let serial = null, config = null, response = null;
function log(text) { s.log.unshift({time: now, text}); s.log = s.log.slice(0, 15); }
function fresh() { return s.connected && s.lastHeartbeat > 0 && now - s.lastHeartbeat < 2500; }
function view() {
  return {...s, ready: fresh(), ageMs: s.lastHeartbeat ? now - s.lastHeartbeat : null,
    receiverVerified: false, channel: 6, destination: 'FF:FF:FF:FF:FF:FF'};
}
if (msg.topic === 'control') {
  const b = msg.payload || {};
  let error = '';
  switch (b.action) {
    case 'connect':
      if (typeof b.port !== 'string' || !/^COM[1-9][0-9]{0,3}$/i.test(b.port.trim())) { error = 'Informe uma porta como COM3.'; break; }
      s.port = b.port.trim().toUpperCase(); s.connected = true;
      s.lastHeartbeat = 0; s.device = null; s.pending = null; s.error = '';
      config = {payload: {serialport: s.port, serialbaud: 115200, databits: 8, parity: 'none', stopbits: 1, enabled: true}};
      log('Abertura solicitada: ' + s.port + '. Aguardando ESP32.');
      break;
    case 'disconnect':
      s.connected = false; s.lastHeartbeat = 0; s.pending = null; s.running = false;
      config = {payload: {enabled: false}}; log('Serial liberada; geração pausada.'); break;
    case 'start': s.running = true; log('Geração iniciada.'); break;
    case 'pause': s.running = false; log('Geração pausada.'); break;
    case 'configure':
      if (!['AUTO','TESTE'].includes(b.mode) || !Number.isInteger(b.team) || b.team < 1 || b.team > 999 ||
          typeof b.pressure !== 'number' || !Number.isFinite(b.pressure) || b.pressure < 0 || b.pressure > 10) {
        error = 'Equipe: inteiro de 1 a 999; pressão: número de 0 a 10; modo: AUTO ou TESTE.'; break;
      }
      s.mode = b.mode; s.fixed = Math.round(b.pressure * 100) / 100; s.team = b.team;
      log('Configuração aplicada: equipe ' + s.team + ', ' + s.mode); break;
    default: error = 'Ação desconhecida.';
  }
  response = {...msg, statusCode: error ? 400 : 200, payload: error ? {error} : view(), headers: {'Cache-Control':'no-store'}};
} else if (msg.topic === 'serial') {
  try {
    const p = JSON.parse(String(msg.payload).trim());
    if (!s.connected) return [null, null, null];
    if (p.type === 'ready' && p.protocol === 'AULA12-PC1-V1' && p.channel === 6 && typeof p.mac === 'string') {
      if (s.device && s.device.boot !== p.boot) { s.pending = null; log('ESP32 reiniciada.'); }
      s.device = p; s.lastHeartbeat = now; s.error = '';
      // Não repetir um comando de resultado desconhecido. Liberar somente quando o firmware estiver ocioso.
      if (s.pending && now - s.pending.at > 2000 && p.busy === false) {
        s.failed++; log('Resultado não recebido para seq ' + s.pending.seq); s.pending = null;
      }
    } else if (p.type === 'tx' && s.pending && p.seq === s.pending.seq && p.equipe === s.pending.team &&
               typeof p.ok === 'boolean' && Number.isFinite(p.p_bar) && p.p_bar >= 0 && p.p_bar <= 10) {
      s.lastTx = {...p, receivedAt: now};
      if (p.ok) s.completed++; else s.failed++;
      s.pending = null;
      if (!p.ok) { s.error = p.error || 'Falha de envio ESP-NOW'; log(s.error); }
    } else if (p.type === 'error') {
      s.error = String(p.error || 'Erro no firmware'); log(s.error);
    } else { s.invalid++; }
  } catch { s.invalid++; }
} else if (msg.topic === 'tick' && s.running) {
  s.pressure = s.mode === 'TESTE' ? s.fixed : Math.round(Math.max(0, Math.min(10, s.pressure + (Math.random() * 0.3 - 0.15))) * 100) / 100;
  s.seq = s.seq >= 4294967294 ? 1 : s.seq + 1;
  s.generated++;
  s.latest = {seq: s.seq, equipe: s.team, p_bar: s.pressure, modo: s.mode, at: now};
  s.history.push(s.pressure); s.history = s.history.slice(-60);
  if (fresh() && !s.pending && s.device.busy === false) {
    serial = {payload: `P,${s.team},${s.seq},${s.pressure.toFixed(2)},${s.mode}\n`};
    s.pending = {seq: s.seq, team: s.team, at: now}; s.submitted++;
  }
} else if (msg.topic === 'state') {
  response = {...msg, payload: view(), headers: {'Cache-Control':'no-store'}};
}
context.set('state', s);
node.status({fill: fresh() ? 'green' : 'grey', shape: 'dot', text: fresh() ? (s.running ? 'Gerando / ESP32 disponível' : 'ESP32 disponível / pausado') : 'Sem ESP32 confirmada'});
return [serial, config, response];
