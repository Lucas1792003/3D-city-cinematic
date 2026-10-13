import type { ChunkBuilder } from './types';
import { buildCyfroAiEngine } from './cyfroAiEngine';
import { withEngineSurrounds } from './engineSurrounds';
import { buildCustomerInfra, buildCyfroAgent, buildNetworkDiscovery, buildAssetDiscovery, buildServiceFingerprinting } from './customer';
import { buildScanControl, buildDataIngestion, buildCyfroCode } from './control';
import { buildCyfroAiInsights, buildCyfroCompliance, buildCyfroTopology, buildCyfroAssistant, buildReporting } from './operations';
import { buildAiProviders, buildGitHosting, buildMystery } from './edge';
import { buildYourTeam } from './team';

/** Registry `builder` key → visual builder. Adding a chunk = one registry entry + (optionally) one builder. */
export const BUILDERS: Record<string, ChunkBuilder> = {
  cyfroAiEngine: withEngineSurrounds(buildCyfroAiEngine), // the Engine unchanged + its platform surrounds
  customerInfra: buildCustomerInfra,
  cyfroAgent: buildCyfroAgent,
  networkDiscovery: buildNetworkDiscovery,
  assetDiscovery: buildAssetDiscovery,
  serviceFingerprinting: buildServiceFingerprinting,
  scanControl: buildScanControl,
  dataIngestion: buildDataIngestion,
  cyfroCode: buildCyfroCode,
  cyfroAiInsights: buildCyfroAiInsights,
  cyfroCompliance: buildCyfroCompliance,
  cyfroTopology: buildCyfroTopology,
  cyfroAssistant: buildCyfroAssistant,
  reporting: buildReporting,
  accessPlaza: buildYourTeam,
  aiProviders: buildAiProviders,
  gitHosting: buildGitHosting,
  mystery: buildMystery,
};
