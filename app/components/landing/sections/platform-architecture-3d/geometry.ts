import { Group, Mesh, BoxGeometry, CylinderGeometry, type BufferGeometry, type Material, type Texture } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Materials } from './materials';
import type { ArchitectureView } from './views';
import type { AnimationRig, StationAnimation } from './motion';
export type ScreenId='insights'|'assistant'|'code'|'compliance'|'topology'|'srcCode'|'agentScr'|'engIn'|'engOut';

export function buildWorld(m:Materials, logo:Texture) {
  const world=new Group(), zones=new Map<ArchitectureView,Group>(), geometry=new Map<string,BufferGeometry>();
  /** Output monitor screens that get live animated content (local to the outputs zone group). */
  const screens:{id:ScreenId;center:[number,number,number];w:number;h:number;group:Group}[]=[];
  const rig:AnimationRig={sources:{screens:[],lights:[]},agent:{screens:[],lights:[]},ingestion:{screens:[],lights:[]},core:{screens:[],lights:[]},outputs:{screens:[],lights:[]},parts:[]};
  function station(g:Group):StationAnimation{return g===zones.get('sources')?rig.sources:rig.outputs;}
  function box(parent:Group,w:number,h:number,d:number,x:number,y:number,z:number,mat:Material,round=.06) {
    if(Math.min(w,h,d)<=.06)round=0;
    const key=`${w}/${h}/${d}/${round}`;
    if(!geometry.has(key))geometry.set(key,round?new RoundedBoxGeometry(w,h,d,1,round):new BoxGeometry(w,h,d));
    const mesh=new Mesh(geometry.get(key),mat);mesh.position.set(x,y,z);mesh.castShadow=h>.2&&w>.2&&d>.14;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function cylinder(parent:Group,r:number,h:number,x:number,y:number,z:number,mat:Material){
    const key=`c/${r}/${h}`;if(!geometry.has(key))geometry.set(key,new CylinderGeometry(r,r,h,24));
    const mesh=new Mesh(geometry.get(key),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  box(world,19.2,.34,9.3,0,-.35,0,m.edge,.12);box(world,19,.4,9.1,0,-.12,0,m.base,.14);
  box(world,18.8,.08,.16,0,-.28,4.58,m.blue,.025);
  for(const x of [-8.8,8.8])for(const z of [-4,4]){cylinder(world,.07,.025,x,.1,z,m.edge);}
  for(const [i,name] of (['sources','processing','outputs'] as const).entries()){
    const g=new Group();g.position.x=(i-1)*6;world.add(g);zones.set(name,g);
    box(g,5.45,.16,7.5,0,.15,0,m.panel,.1);
    box(g,5.18,.06,.08,0,.27,3.55,i===1?m.blue:m.edge,.01);
    g.userData.zone=name;
  }
  // Physical shared deck/bridges: conceptual proximity, not asserted network links.
  for(const x of [-3,3])box(world,.6,.11,1.8,x,.17,0,m.edge,.04);
  function rack(g:Group,x:number,z:number,height=2.65){
    box(g,1.2,height,1.2,x,height/2+.3,z,m.screen,.08);
    box(g,1.24,.15,1.24,x,height+.32,z,m.panel,.03);
    for(let row=0;row<5;row++){
      const y=.6+row*.42;box(g,1.01,.32,.09,x,y,z+.63,m.panel,.025);
      for(let v=0;v<4;v++)box(g,.11,.04,.035,x-.3+v*.16,y+.02,z+.69,m.edge,.008);
      rig.sources.lights.push(box(g,.05,.07,.04,x+.4,y,z+.69,row===2?m.orange:m.blue,.007));
    }
    box(g,.72,.1,.045,x,height+.32,z+.65,m.blue,.015);
  }
  function display(g:Group,x:number,y:number,z:number,w=1.7,h=1.2,kind='analysis',id?:ScreenId){
    box(g,w+.15,h+.16,.16,x,y,z,m.edge,.055);box(g,w,h,.045,x,y,z+.105,m.screen,.025);
    const screen=station(g).screens,details=new Group();g.add(details);
    // Live screens: the static placeholder artwork is hidden; animated content sits on the glass instead
    if(id){details.visible=false;screens.push({id,center:[x,y,z+.1315],w,h,group:g});}
    // Existing screen artwork is grouped for reveal; all body geometry is unchanged.
    screen.push(box(details,w-.15,.11,.025,x,y+h*.34,z+.14,m.blue,.008));
    if(kind==='chat'){
      for(let r=0;r<3;r++)screen.push(box(details,w*.45,.14,.025,x+(r%2?.2:-.2),y+.14-r*.25,z+.14,r%2?m.blue:m.white,.04));
    }else if(kind==='code'){
      for(let r=0;r<5;r++)screen.push(box(details,w*(r%2?.55:.68),.045,.025,x-.1+(r%2?.13:0),y+.16-r*.15,z+.14,r===3?m.orange:m.white,.006));
    }else{
      for(let r=0;r<4;r++)screen.push(box(details,w*.54,.055,.025,x+.16,y+.15-r*.17,z+.14,m.white,.005));
      for(let r=0;r<3;r++)screen.push(box(details,.18,.15+r*.12,.025,x-w*.34+r*.22,y-h*.23+(r*.12)/2,z+.14,r===1?m.orange:m.blue,.008));
    }
    box(g,.12,.45,.13,x,y-h/2-.22,z,m.edge,.025);box(g,.65,.065,.4,x,y-h/2-.46,z+.03,m.edge,.025);
  }
  function desk(g:Group,x:number,z:number,kind:string,id?:ScreenId){
    box(g,2.1,.18,1.2,x,1.13,z,m.white,.08);box(g,1.6,.95,.8,x,.61,z-.08,m.panel,.06);
    display(g,x,2.1,z-.12,1.55,1.1,kind,id);
    box(g,.83,.06,.34,x,1.25,z+.33,m.screen,.025);
    for(let r=0;r<3;r++)box(g,.66,.012,.016,x,1.284,z+.21+r*.075,m.edge,.003);
    box(g,.2,.05,.29,x+.7,1.25,z+.3,m.edge,.03);
  }
  const sources=zones.get('sources')!;
  rack(sources,-1.38,-1.65);rack(sources,.1,-1.9,2.5);
  for(let r=0;r<3;r++)box(sources,1.3,.46,1.05,1.54,.55+r*.52,-1.65,r===1?m.blue:m.panel,.055);
  desk(sources,-1.15,1.75,'code','srcCode');
  box(sources,1.5,.5,1.1,1.35,.6,1.52,m.screen,.06);
  for(let p=0;p<5;p++)rig.sources.lights.push(box(sources,.16,.11,.035,.88+p*.22,.63,2.09,m.blue,.01));
  cylinder(sources,.08,.9,1.9,1.32,1.15,m.edge);
  const processing=zones.get('processing')!;
  // CyfroAI Engine: a wide, low security appliance in three layers on the existing mounting base
  // (base, channels and bridge cable unchanged). Lower: dark rails, ports, a segmented activity strip.
  // Middle: satin-blue chassis with a recessed glass bay holding the emblem core and the two live
  // analysis displays. Upper: a slim light-metal processing module carrying the status row.
  box(processing,2.9,.32,2.85,.3,.46,-.9,m.edge,.11);
  {
    const cx=.3,cz=-.9;
    // Lower layer: compact infrastructure base (recessed, dark), mounting rails, ports
    box(processing,2.6,.3,1.75,cx,.77,cz,m.screen,.06);
    for(const z of [cz+.8,cz-.8])box(processing,2.78,.06,.1,cx,.655,z,m.edge,.02);
    for(let i=0;i<3;i++)box(processing,.1,.07,.03,cx+.92+i*.15,.8,cz+.885,m.white,.01);
    // Slim cooling / activity channels: a four-segment strip lit in sequence by processingMotion
    for(let i=0;i<4;i++)rig.core.lights.push(box(processing,.34,.04,.03,cx-.75+i*.38,.8,cz+.885,m.screen,.008));
    // Middle layer: the processing chassis
    box(processing,2.75,.95,1.9,cx,1.395,cz,m.blue,.12);
    for(const x of [cx-1.28,cx+1.28])box(processing,.025,.78,.03,x,1.395,cz+.955,m.white,.006); // panel seams inside the rounded corners
    // Recessed core bay: machined bezel + dark glass
    box(processing,2.47,.8,.03,cx,1.4,cz+.96,m.edge,.03);
    box(processing,2.35,.68,.04,cx,1.4,cz+.975,m.screen,.025);
  }
  // Front display in a precision frame with four connection points (face.ts draws the bot face on it; the CyfroSec logo lives in the orb)
  const logoMat=m.white.clone();logoMat.map=logo;logoMat.transparent=true;logoMat.depthWrite=false;
  box(processing,.6,.6,.03,.3,1.4,.09,logoMat,.005);
  for(const [w,h,x,y] of [[.74,.025,.3,1.73],[.74,.025,.3,1.07],[.025,.68,-.07,1.4],[.025,.68,.67,1.4]] as const)box(processing,w,h,.02,x,y,.1,m.white,.004);
  for(const x of [-.07,.67])for(const y of [1.07,1.73])box(processing,.06,.06,.025,x,y,.105,m.blue,.008);
  // Upper layer: slim processing module, seam line and a top inset panel
  box(processing,2.62,.03,1.82,.3,1.885,-.9,m.white,.01);
  box(processing,2.55,.24,1.76,.3,2.02,-.9,m.panel,.08);
  box(processing,1.9,.03,1.15,.3,2.15,-.9,m.edge,.012);
  // Two smaller processing stations establish the center's scale hierarchy.
  box(processing,1.15,.9,1.18,-1.46,.78,1.9,m.panel,.1);box(processing,.86,.38,.045,-1.46,1,2.52,m.screen,.025);
  screens.push({id:'agentScr',center:[-1.46,1,2.5465],w:.86,h:.38,group:processing}); // live agent panel (its indicator lights stay on top)
  for(let r=0;r<3;r++)rig.agent.lights.push(box(processing,.08,.08,.035,-1.7+r*.23,1,2.55,r===2?m.orange:m.blue,.008));
  box(processing,1.55,.7,1.3,1.16,.68,1.9,m.edge,.1);
  for(let i=0;i<4;i++)rig.parts.push(box(processing,.21,.16,.75,.67+i*.33,1.12,1.91,i===1?m.blue:m.white,.025));
  // Phase A additions: a visible ingestion channel (CyfroAgent → Data Ingestion → CyfroAI Engine) and small analysis displays.
  box(processing,1.25,.1,.46,-.24,.5,1.95,m.edge,.04);box(processing,1.25,.05,.06,-.24,.6,1.74,m.blue,.01);box(processing,1.25,.05,.06,-.24,.6,2.16,m.blue,.01);
  box(processing,.46,.1,1.05,1.16,.5,.75,m.edge,.04);box(processing,.06,.05,1.05,.95,.6,.75,m.blue,.01);box(processing,.06,.05,1.05,1.37,.6,.75,m.blue,.01);
  // The engine's two live analysis displays (Incoming / Findings) sit inside the glass bay either side of the core
  for(const [x,id] of [[-.5,'engIn'],[1.1,'engOut']] as const){box(processing,.56,.4,.02,x,1.4,.1,m.edge,.015);box(processing,.52,.36,.02,x,1.4,.11,m.screen,.012);screens.push({id,center:[x,1.4,.1245],w:.52,h:.36,group:processing});}
  const outputs=zones.get('outputs')!;
  box(outputs,4.5,.22,.9,0,.35,-1.8,m.edge,.055);
  display(outputs,0,2.65,-1.95,3.9,2,'analysis','insights');
  desk(outputs,-1.19,1.25,'chat','assistant');desk(outputs,1.19,1.6,'code','code');
  // Phase A additions: a compliance report display and a topology monitor, so all five outputs are physical devices.
  function cabinetMonitor(x:number,z:number,kind:'compliance'|'topology'){
    box(outputs,1.5,.5,.62,x,.55,z,m.panel,.06);box(outputs,.1,.5,.1,x,1.05,z-.1,m.edge,.02);
    box(outputs,1.42,1,.12,x,1.75,z-.1,m.edge,.05);box(outputs,1.28,.86,.04,x,1.75,z-.02,m.screen,.02);
    screens.push({id:kind,center:[x,1.75,z+.0045],w:1.28,h:.86,group:outputs}); // live screen content is drawn by screens.ts
  }
  cabinetMonitor(-1.6,-.72,'compliance');cabinetMonitor(1.6,-.72,'topology');
  for(let r=0;r<3;r++)rig.outputs.lights.push(box(outputs,.36,.12,.04,1.88,3.1-r*.28,-1.78,r===2?m.orange:m.green,.01));
  for(const [zone,g]of zones)g.traverse(obj=>{obj.userData.zone=zone;});
  return {world,zones,rig,screens,outputs,sources,logoMat,dispose(){geometry.forEach(g=>g.dispose());logoMat.dispose();}};
}
