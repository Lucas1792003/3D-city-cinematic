import { Matrix4, Mesh, type BufferGeometry, type Group, type Material, type MeshBasicMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Merge a group's static meshes into one mesh per material (and shadow mode): fewer draw calls, same look.
 * Transforms are taken relative to the group, so the merged meshes go back into it. Transparent meshes and
 * multi-material meshes are left alone. Returns the merged geometries; the caller owns and disposes them.
 *  - skip: meshes to leave as they are (animated parts, live screens)
 *  - minMeshes: merge a material only when it has at least this many meshes (default 2)
 *  - castShadow: force the merged meshes' shadow casting (default: keep each mesh's own setting)
 */
export function mergeStaticMeshes(group: Group, opts: { skip?: (mesh: Mesh) => boolean; minMeshes?: number; castShadow?: boolean; name?: string } = {}): BufferGeometry[] {
  group.updateMatrixWorld(true);
  const toGroup = new Matrix4().copy(group.matrixWorld).invert(), rel = new Matrix4();
  const buckets = new Map<string, { mat: Material; cast: boolean; geos: BufferGeometry[]; meshes: Mesh[] }>();
  group.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material) || opts.skip?.(mesh)) return;
    const mat = mesh.material as Material; if ((mat as MeshBasicMaterial).transparent) return;
    const cast = opts.castShadow ?? mesh.castShadow, key = `${mat.uuid}/${cast}`;
    if (!buckets.has(key)) buckets.set(key, { mat, cast, geos: [], meshes: [] });
    const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    for (const name of Object.keys(src.attributes)) if (!['position', 'normal', 'uv'].includes(name)) src.deleteAttribute(name);
    src.applyMatrix4(rel.multiplyMatrices(toGroup, mesh.matrixWorld));
    const b = buckets.get(key)!; b.geos.push(src); b.meshes.push(mesh);
  });
  const out: BufferGeometry[] = [];
  for (const b of buckets.values()) {
    if (b.meshes.length < (opts.minMeshes ?? 2)) { b.geos.forEach((x) => x.dispose()); continue; }
    const geo = mergeGeometries(b.geos, false); b.geos.forEach((x) => x.dispose());
    if (!geo) continue;
    out.push(geo);
    const mesh = new Mesh(geo, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = true; mesh.name = opts.name ?? 'merged';
    b.meshes.forEach((x) => x.removeFromParent()); group.add(mesh);
  }
  return out;
}
