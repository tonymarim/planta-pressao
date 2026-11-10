import {Engine,Scene,ArcRotateCamera,Vector3,Color3,Color4,HemisphericLight,DirectionalLight,MeshBuilder,StandardMaterial,DynamicTexture,Mesh,TransformNode} from '@babylonjs/core';

export function createPlant(canvas){
  const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
  engine.setHardwareScalingLevel(Math.min(2,window.devicePixelRatio||1));
  const scene=new Scene(engine);scene.clearColor=new Color4(.065,.105,.15,1);
  scene.fogMode=Scene.FOGMODE_EXP2;scene.fogDensity=.011;scene.fogColor=new Color3(.065,.105,.15);
  const camera=new ArcRotateCamera('vista',-Math.PI/2.9,1.12,28,new Vector3(0,2,0),scene);
  camera.attachControl(canvas,true);camera.lowerRadiusLimit=13;camera.upperRadiusLimit=46;camera.upperBetaLimit=1.48;camera.lowerBetaLimit=.35;camera.wheelPrecision=18;
  const hemi=new HemisphericLight('ambiente',new Vector3(0,1,0),scene);hemi.intensity=.95;hemi.groundColor=new Color3(.2,.28,.36);
  const sun=new DirectionalLight('luz',new Vector3(-.5,-1,.3),scene);sun.intensity=1.4;
  function material(name,hex,spec=.2){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(spec,spec,spec);return m;}
  const steel=material('aço escovado','#9aadb8',.65),darkSteel=material('estrutura','#354b5e'),floor=material('concreto','#33414b'),blue=material('tubulação','#38829b',.4),yellow=material('guarda-corpo','#e4ae4a'),green=material('motor','#368f82'),back=material('tanques cenográficos','#526773',.3),black=material('borracha','#14222c'),white=material('marcações','#aabec9');
  const lamp=material('sinalização','#9fb0bf');lamp.emissiveColor=new Color3(.2,.25,.28);
  const box=(name,w,h,d,x,y,z,mat)=>{const a=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);a.position.set(x,y,z);a.material=mat;return a;};
  const cyl=(name,d,h,x,y,z,mat)=>{const a=MeshBuilder.CreateCylinder(name,{diameter:d,height:h,tessellation:48},scene);a.position.set(x,y,z);a.material=mat;return a;};
  function pipe(name,points,radius=.14,mat=blue){const m=MeshBuilder.CreateTube(name,{path:points.map(p=>new Vector3(...p)),radius,tessellation:12,cap:Mesh.CAP_ALL},scene);m.material=mat;return m;}
  function label(text,x,y,z,w=3.5,h=.7){const tex=new DynamicTexture(text,{width:768,height:160},scene,false);tex.hasAlpha=true;tex.drawText(text,null,107,'bold 62px Segoe UI','#dbedf5','#112332',true);const m=new StandardMaterial('placa '+text,scene);m.diffuseTexture=tex;m.emissiveColor=new Color3(.7,.7,.7);m.backFaceCulling=false;const a=MeshBuilder.CreatePlane(text,{width:w,height:h},scene);a.position.set(x,y,z);a.material=m;return a;}
  box('base da usina',24,.25,18,0,-.15,1,floor);
  for(let i=-11;i<12;i+=2)pipe('junta do piso',[[i,.001,-7],[i,.001,9]],.012,darkSteel);
  for(let i=-7;i<10;i+=2)pipe('junta transversal',[[-12,.001,i],[12,.001,i]],.012,darkSteel);
  // Reservatório horizontal sobre berços; sem líquido animado: a variável é pressão de ar.
  const tank=cyl('TK-101 corpo',4,7,-1,3.05,0,steel);tank.rotation.z=Math.PI/2;
  for(const x of [-4.5,2.5]){const cap=MeshBuilder.CreateSphere('tampo elíptico',{diameter:4,segments:32},scene);cap.scaling.x=.32;cap.position.set(x,3.05,0);cap.material=steel;}
  for(const x of [-3,1]){box('berço do tanque',.55,1.6,2.8,x,.95,0,darkSteel);box('sapata',1,.3,3.2,x,.2,0,darkSteel);}
  for(const x of [-3.6,1.7]){const band=MeshBuilder.CreateTorus('cinta',{diameter:4.04,thickness:.07,tessellation:48},scene);band.rotation.z=Math.PI/2;band.position.set(x,3.05,0);band.material=darkSteel;}
  label('TK-101  /  AR COMPRIMIDO',-1,3,-2.04,4.3,.6);
  cyl('tomada PT',.22,.7,-.5,5.3,0,blue);const instrument=cyl('PT-101',.6,.3,-.5,5.75,0,lamp);instrument.rotation.x=Math.PI/2;
  label('PT-101',-.5,6.35,0,1.8,.5);
  pipe('saída para coletor',[[2.9,3.1,0],[4.7,3.1,0],[4.7,1,0],[9,1,0],[9,1,6]],.18);
  pipe('entrada compressor',[[-5,3,0],[-6.1,3,0],[-6.1,1.1,0],[-6.1,1.1,-4]],.19);
  box('skid compressor',3,.35,2.6,-6.5,.3,-4.8,darkSteel);
  const motor=cyl('C-101 motor',1.25,2.2,-6.5,1.1,-4.8,green);motor.rotation.x=Math.PI/2;
  const flywheel=new TransformNode('ventilador virtual',scene);flywheel.position.set(-6.5,1.1,-5.95);
  for(let i=0;i<3;i++){const blade=box('pá',.15,1.05,.06,0,0,0,black);blade.parent=flywheel;blade.rotation.z=i*Math.PI*2/3;}
  label('C-101  /  COMPRESSOR',-6.5,.35,-6.3,3.8,.55);
  const valve=cyl('XV-101 corpo',.52,.8,4.7,2.1,0,darkSteel);valve.rotation.z=Math.PI/2;
  const handwheel=MeshBuilder.CreateTorus('volante válvula',{diameter:.8,thickness:.08,tessellation:24},scene);handwheel.position.set(5.25,2.1,0);handwheel.rotation.z=Math.PI/2;handwheel.material=yellow;
  // Passarela e escada industrial.
  box('passarela',10,.16,1.5,-.5,3.8,3.3,darkSteel);
  for(const x of [-5,4])for(const z of [2.7,3.9])box('coluna',.16,3.8,.16,x,1.9,z,darkSteel);
  for(let x=-5;x<=4;x+=1.5){box('montante',.07,1,.07,x,4.35,4,yellow);box('montante interno',.07,1,.07,x,4.35,2.6,yellow);}
  for(const z of [2.6,4])for(const y of [4.3,4.85])pipe('corrimão',[[-5,y,z],[4,y,z]],.045,yellow);
  for(let i=0;i<10;i++)box('degrau',1.25,.1,.32,5.2,.35+i*.37,4.6-i*.19,darkSteel);
  pipe('corrimão escada',[[5.85,1.1,4.8],[5.85,4.7,2.8]],.05,yellow);
  // Tanques secundários são apenas cenário, rotulados explicitamente.
  for(const [x,z,id] of [[-7,6,'TK-102'],[0,7,'TK-103']]){
    cyl(id,3,5.4,x,2.8,z,back);
    const roof=MeshBuilder.CreateSphere('cúpula',{diameter:3,segments:24},scene);roof.scaling.y=.3;roof.position.set(x,5.5,z);roof.material=back;
    label(id+' · CENÁRIO',x,2.5,z-1.52,2.6,.5);
    pipe('respiro',[[x,5.8,z],[x,6.5,z],[x+.7,6.5,z]],.1,darkSteel);
  }
  // Galpão aberto e pipe rack ao fundo.
  for(const x of [-10,0,10])box('pilar galpão',.24,8,.24,x,4,9,darkSteel);
  box('viga galpão',21,.28,.35,0,8,9,darkSteel);
  box('cobertura',22,.12,3,0,8.2,9,back);
  for(const x of [6.4,10]){box('suporte coletor',.15,3.2,.15,x,1.6,5,darkSteel);}
  pipe('rack superior',[[6.4,3.2,5],[10,3.2,5]],.09,darkSteel);
  for(const z of [4.7,5.2])pipe('linha de processo',[[5.5,3.4,z],[11,3.4,z]],.1,blue);
  for(const x of [-10.5,10.5])for(const z of [-6,7]){cyl('poste',.1,5.8,x,2.9,z,darkSteel);box('luminária',.7,.12,.4,x,5.8,z,white);}
  // Faixa de circulação amarela ao redor do skid principal.
  for(let x=-4;x<5;x+=.8)box('faixa de segurança',.45,.015,.12,x,.02,-3,yellow);
  let running=false;
  engine.runRenderLoop(()=>{if(running)flywheel.rotation.z+=engine.getDeltaTime()*.008;scene.render();});
  const resize=()=>engine.resize();window.addEventListener('resize',resize);
  new ResizeObserver(resize).observe(canvas);
  return {update(s){running=s.valid&&s.compressor;const c=Color3.FromHexString(s.color);lamp.diffuseColor=c;lamp.emissiveColor=c.scale(.45);green.diffuseColor=running?Color3.FromHexString('#48b7a0'):Color3.FromHexString('#426d69');},reset(){camera.setTarget(new Vector3(0,2,0));camera.alpha=-Math.PI/2.9;camera.beta=1.12;camera.radius=28;}};
}
