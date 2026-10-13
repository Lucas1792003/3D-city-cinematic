import { type Group, type Mesh, type MeshStandardMaterial } from 'three';

export type StationAnimation={screens:Mesh[];lights:Mesh[]};
export type AnimationRig={sources:StationAnimation;agent:StationAnimation;ingestion:StationAnimation;core:StationAnimation;outputs:StationAnimation;parts:Mesh[]};
const smooth=(a:number,b:number,t:number)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p);};

/**
 * What remains of the original motion: the Data Ingestion paddles (unchanged) and the Outputs
 * status lights. Data Sources, CyfroAgent, the CyfroAI Engine and every data packet are handled by
 * sourcesMotion.ts and processingMotion.ts, where packets travel along physical channels.
 */
export function createArchitectureMotion(_world:Group,rig:AnimationRig){
  const materialCopies:MeshStandardMaterial[]=[];
  const lights=new Map<Mesh,MeshStandardMaterial>();
  for(const mesh of rig.outputs.lights){
    const material=(mesh.material as MeshStandardMaterial).clone();mesh.material=material;
    material.emissive.copy(material.color);materialCopies.push(material);lights.set(mesh,material);
  }
  const restY=rig.parts.map(mesh=>mesh.position.y);
  function update(t:number,still:boolean){
    rig.outputs.lights.forEach((mesh,i)=>{
      const material=lights.get(mesh)!;
      const on=still?1:smooth(8.5+i*.065,9+i*.065,t);
      const scan=still?0:Math.pow(Math.max(0,Math.sin(t*1.35-i*.7)),10);
      material.emissiveIntensity=on*(.08+scan*.55);mesh.scale.setScalar(.78+.22*on);
    });
    rig.parts.forEach((mesh,i)=>{
      // Existing normalization paddles perform short, staggered reciprocating strokes.
      const active=still?0:smooth(5.1,6,t);
      mesh.position.y=restY[i]+active*.10*Math.pow(Math.max(0,Math.sin(t*1.8-i*.8)),4);
    });
    return 0;
  }
  return {update,dispose(){materialCopies.forEach(m=>m.dispose());}};
}
