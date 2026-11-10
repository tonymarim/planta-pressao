const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),z='aula12-pc2';
const n=[{id:z,type:'tab',label:'Aula 12 — PC2 receptor',disabled:false,info:'ESP32-C3 → USB → validação → alarmes → planta 3D. Painel em /, editor /red. Porta 1882.'}];
const add=(id,type,name,x,y,props,wires=[])=>n.push({id,type,z,name,x,y,...props,wires});
add('pc2-tick','inject','Validade / demonstração',180,80,{props:[{p:'topic',vt:'str'}],topic:'tick',repeat:'0.5',once:false},[['pc2-controller']]);
add('pc2-rx','serial in','ESP32-C3 / USB',170,170,{serial:'pc2-port'},[['pc2-rx-topic']]);
add('pc2-rx-topic','change','Amostra de rádio',390,170,{rules:[{t:'set',p:'topic',pt:'msg',to:'serial',tot:'str'}]},[['pc2-controller']]);
for(const [topic,method,y] of [['state','get',280],['control','post',360]]){
  add('pc2-'+topic,'http in',method.toUpperCase()+' /api/'+topic,170,y,{url:'/api/'+topic,method,upload:false},[['pc2-'+topic+'-topic']]);
  add('pc2-'+topic+'-topic','change',topic==='state'?'Estado atual':'Comando do operador',390,y,{rules:[{t:'set',p:'topic',pt:'msg',to:topic,tot:'str'}]},[['pc2-controller']]);
}
add('pc2-controller','function','Validar, filtrar, alarmar e intertravar',680,200,{func:fs.readFileSync(path.join(root,'src/controller.js'),'utf8'),outputs:2,timeout:0,noerr:0,initialize:'',finalize:'',libs:[]},[['pc2-serial-control'],['pc2-response']]);
add('pc2-serial-control','serial control','Conectar / liberar porta',1030,140,{serial:'pc2-port'},[]);
add('pc2-response','http response','Estado para a planta',1030,280,{statusCode:'',headers:{}},[]);
n.push({id:'pc2-port',type:'serial-port',name:'ESP32-C3 — selecionar no painel',serialport:'COM0',serialbaud:'115200',databits:'8',parity:'none',stopbits:'1',waitfor:'',dtr:'none',rts:'none',cts:'none',dsr:'none',newline:'\\n',bin:'false',out:'char',addchar:'',responsetimeout:'2000'});
fs.mkdirSync(path.join(root,'runtime'),{recursive:true});
for(const f of ['runtime/flows.json','Fluxo_PC2.json'])fs.writeFileSync(path.join(root,f),JSON.stringify(n,null,2));
console.log('Fluxos PC2 gerados.');
