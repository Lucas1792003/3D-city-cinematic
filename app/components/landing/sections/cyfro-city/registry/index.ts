/** App-side entry point for the city registry (the data files stay import-free for `node --test`). */
import { composeCity } from './chunks';
import { TEASERS } from './teasers';
export { MYSTERY_COPY, REGISTRY_MARKER, RELEASED_CHUNKS, teaserChunks, composeCity } from './chunks';
export { TEASERS, type Teaser } from './teasers';
/** the visible city: released platforms + approved teasers (default: none) */
const city = composeCity(TEASERS);
export const CHUNKS = city.chunks;
export const DISTRICTS = city.districts;
export { FLOWS } from './flows';
export { STORY, INFRA_CYCLE, CODE_CYCLE, evaluateStory, decisionFor, AMBIENT, CONVOY_GAP } from './story';
export { createDirector, REST, PACE, LOOP_SECONDS, type Directed, type Director, type DemoSpec } from './director';
export { validateRegistry } from './validate';
export * from './grid';
export type * from './types';
