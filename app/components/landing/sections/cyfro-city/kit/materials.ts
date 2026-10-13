import { Color, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial, type DirectionalLight, type HemisphereLight, type Scene } from 'three';
import { createMaterials, themeWorld } from '../../platform-architecture-3d/materials';

/**
 * The city's palette: the original scene's nine shared materials (unchanged, so the CyfroAI Engine
 * keeps its exact colours) plus a few city-only surfaces. Theme switching recolours in place.
 */
export function createCityMaterials() {
  const base = createMaterials();
  const std = (o: ConstructorParameters<typeof MeshStandardMaterial>[0]) => new MeshStandardMaterial(o);
  return {
    ...base,
    customerBase: std({ roughness: 0.85 }),
    customerPanel: std({ roughness: 0.62 }),
    padBase: std({ roughness: 0.85 }),
    padPanel: std({ roughness: 0.62 }),
    wall: std({ roughness: 0.55, metalness: 0.2 }),
    mysteryDeck: std({ color: '#05080c', roughness: 0.55, metalness: 0.25 }),
    green: base.green,
    glass: std({ color: '#33afdf', transparent: true, opacity: 0.18, roughness: 0.1, metalness: 0.2, depthWrite: false }),
    holo: new MeshBasicMaterial({ color: '#33afdf', transparent: true, opacity: 0.55, depthWrite: false }),
    stripCode: std({ color: '#5caa83', roughness: 0.5 }),
    baseGlow: std({ color: '#039be0', emissive: '#039be0', emissiveIntensity: 0.7, roughness: 0.4 }), // ChunkBase lit edge
    skin: std({ color: '#d7e3ee', roughness: 0.7 }),
    visor: std({ color: '#33afdf', roughness: 0.4, emissive: '#33afdf', emissiveIntensity: 0.35 }),
    rimLine: new LineBasicMaterial({ color: '#039be0', transparent: true, opacity: 0.9 }),
    selectLine: new LineBasicMaterial({ color: '#33afdf', transparent: true, opacity: 1 }),
  };
}
export type CityMaterials = ReturnType<typeof createCityMaterials>;

export function themeCity(dark: boolean, scene: Scene, m: CityMaterials, sun: DirectionalLight, fill: HemisphereLight) {
  themeWorld(dark, scene, m, sun, fill); // the original palette, untouched
  const c = (hexDark: string, hexLight: string) => new Color(dark ? hexDark : hexLight);
  m.customerBase.color.copy(c('#182b3c', '#c9d6e1'));
  m.customerPanel.color.copy(c('#273e52', '#e1e9f0'));
  m.padBase.color.copy(c('#1b2a37', '#cfd8e0'));
  m.padPanel.color.copy(c('#2c3b48', '#e7ecf0'));
  m.wall.color.copy(c('#4d6478', '#a9b9c7'));
  m.mysteryDeck.color.copy(c('#05080c', '#1a2230'));
  m.baseGlow.color.set(dark ? '#039be0' : '#0278ae'); m.baseGlow.emissive.set(dark ? '#039be0' : '#0278ae'); m.baseGlow.emissiveIntensity = dark ? 0.7 : 0.35;
  m.rimLine.color.set(dark ? '#039be0' : '#0278ae');
  m.selectLine.color.set(dark ? '#33afdf' : '#0278ae');
  m.holo.color.set(dark ? '#33afdf' : '#0278ae');
}
