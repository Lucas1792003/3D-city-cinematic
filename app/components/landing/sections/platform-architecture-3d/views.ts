export type ArchitectureView = 'overview' | 'sources' | 'processing' | 'outputs';
export const ZONES = ['sources', 'processing', 'outputs'] as const;
export const CAMERA_PRESETS: Record<ArchitectureView,{position:[number,number,number];target:[number,number,number]}> = {
  overview: {position:[10.8,13.5,19],target:[0,.5,0]},
  sources: {position:[-.8,10,13],target:[-6,1,0]},
  processing: {position:[6.4,10,12.8],target:[0,1.1,0]},
  outputs: {position:[12,10,12.5],target:[6,1,0]},
};
