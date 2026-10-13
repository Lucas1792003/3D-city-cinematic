import { Color, MeshStandardMaterial, type DirectionalLight, type HemisphereLight, type Scene } from 'three';
export const createMaterials = () => ({
  base:new MeshStandardMaterial({roughness:.8}), panel:new MeshStandardMaterial({roughness:.58}), edge:new MeshStandardMaterial({roughness:.4,metalness:.35}),
  blue:new MeshStandardMaterial({color:'#039be0',roughness:.4,metalness:.15}), orange:new MeshStandardMaterial({color:'#fe904d',roughness:.6}),
  screen:new MeshStandardMaterial({roughness:.5}), ink:new MeshStandardMaterial({roughness:.7}), white:new MeshStandardMaterial({roughness:.7}), green:new MeshStandardMaterial({color:'#5caa83',roughness:.65}),
});
export type Materials = ReturnType<typeof createMaterials>;
export function themeWorld(dark:boolean, scene:Scene, m:Materials, sun:DirectionalLight, fill:HemisphereLight) {
  scene.background=new Color(dark?'#0d1b29':'#ffffff');
  m.base.color.set(dark?'#20384d':'#d5e1eb');m.panel.color.set(dark?'#344f66':'#eef4f9');m.edge.color.set(dark?'#60798d':'#9fb2c3');
  m.screen.color.set(dark?'#102131':'#35587a');m.ink.color.set(dark?'#a7bfd2':'#4a6478');m.white.color.set(dark?'#b9cede':'#ffffff');
  sun.intensity=dark?2.8:2.4;fill.intensity=dark?1.7:1.6;fill.color.set(dark?'#d2e7fc':'#ffffff');fill.groundColor.set(dark?'#203448':'#c4d2de');
}
