import type { FlowDefinition } from './types';

/**
 * Verified connections between chunks (docs/design/3d-city/03-workflow-map.md §5).
 * `evidence: 'code'` = traced in the product source; `'documented'` = CyfroAgent's on-host behaviour,
 * described in product documentation (the agent runtime lives in a separate repository).
 * Internal, default-off pipelines are deliberately not listed here (they would ship in the bundle).
 */
export const FLOWS: (FlowDefinition & { emphasis?: 'always' | 'focus' })[] = [
  /* Agent ↔ platform: one agent-opened connection, through the one gate in the wall */
  { id: 'F01', from: { chunk: 'cyfro-agent', port: 'uplink' }, to: { chunk: 'scan-control', port: 'agent' }, kind: 'CTRL', evidence: 'code', ref: '03:F01', display: 'animate', track: 'infra',
    label: 'The agent opens and maintains this connection. Heartbeats, status and requests for work travel out.' },
  { id: 'F02', from: { chunk: 'scan-control', port: 'agent' }, to: { chunk: 'cyfro-agent', port: 'uplink' }, kind: 'JOB', evidence: 'code', ref: '03:F02', display: 'animate', track: 'infra', carrier: 'F01',
    label: 'Scheduled scans and signed commands return over the agent’s own connection. CyfroSec never connects in.' },
  { id: 'F03', from: { chunk: 'cyfro-agent', port: 'upload' }, to: { chunk: 'data-ingestion', port: 'in' }, kind: 'DATA', evidence: 'code', ref: '03:F03', display: 'animate', track: 'infra',
    label: 'Scan results uploaded by the agent over HTTPS.' },

  /* Agent runs the three discovery scans on your systems (agent-side: documented behaviour) */
  { id: 'F23a', from: { chunk: 'cyfro-agent', port: 'n' }, to: { chunk: 'network-discovery', port: 'e' }, kind: 'CTRL', evidence: 'documented', ref: '03:F23', display: 'animate', track: 'infra',
    label: 'CyfroAgent runs Network Discovery; results return to the agent.' },
  { id: 'F23b', from: { chunk: 'cyfro-agent', port: 'w' }, to: { chunk: 'asset-discovery', port: 'n' }, kind: 'CTRL', evidence: 'documented', ref: '03:F23', display: 'animate', track: 'infra',
    label: 'CyfroAgent runs Asset Discovery; results return to the agent.' },
  { id: 'F23c', from: { chunk: 'cyfro-agent', port: 'n' }, to: { chunk: 'service-fingerprinting', port: 's' }, kind: 'CTRL', evidence: 'documented', ref: '03:F23', display: 'animate', track: 'infra',
    label: 'CyfroAgent runs Service Fingerprinting; results return to the agent.' },
  { id: 'F24a', from: { chunk: 'network-discovery', port: 's' }, to: { chunk: 'customer-infra', port: 'n' }, kind: 'DATA', evidence: 'documented', ref: '03:F23', display: 'animate', track: 'infra',
    label: 'Probes the chosen host or subnet for open ports and services.' },
  { id: 'F24b', from: { chunk: 'asset-discovery', port: 'n' }, to: { chunk: 'customer-infra', port: 's' }, kind: 'DATA', evidence: 'documented', ref: '03:F23', display: 'animate', track: 'infra',
    label: 'Sweeps the agent’s local subnet for devices.' },
  { id: 'F24c', from: { chunk: 'service-fingerprinting', port: 'w' }, to: { chunk: 'customer-infra', port: 'n' }, kind: 'DATA', evidence: 'documented', ref: '03:F23', display: 'animate', track: 'infra',
    label: 'Reads the host filesystem, mounted read-only.' },

  /* After correlation: parallel fan-out and on-demand reads */
  { id: 'F04', from: { chunk: 'data-ingestion', port: 'insights' }, to: { chunk: 'cyfro-ai-insights', port: 'in' }, kind: 'JOB', evidence: 'code', ref: '03:F04', display: 'animate', track: 'infra',
    label: 'After correlation, an AI insight job can be queued, depending on plan and settings.' },
  { id: 'F05', from: { chunk: 'data-ingestion', port: 'compliance' }, to: { chunk: 'cyfro-compliance', port: 'in' }, kind: 'JOB', evidence: 'code', ref: '03:F05', display: 'animate', track: 'infra',
    label: 'After correlation, a compliance evaluation is queued.' },
  { id: 'F06', from: { chunk: 'data-ingestion', port: 'reads' }, to: { chunk: 'cyfro-topology', port: 'in' }, kind: 'DATA', evidence: 'code', ref: '03:F06', display: 'animate', track: 'infra',
    label: 'CyfroTopology reads the latest snapshot when someone opens it.' },
  { id: 'F07', from: { chunk: 'data-ingestion', port: 'reads' }, to: { chunk: 'reporting', port: 'in' }, kind: 'RPT', evidence: 'code', ref: '03:F07', display: 'animate', track: 'infra',
    label: 'Reports and the dashboard read the same snapshots.' },
  { id: 'F08', from: { chunk: 'data-ingestion', port: 'reads' }, to: { chunk: 'reporting', port: 'notify' }, kind: 'EVT', evidence: 'code', ref: '03:F08', display: 'animate', track: 'infra',
    label: 'A “scan completed” notification appears in the app.' },
  { id: 'F13', from: { chunk: 'cyfro-ai-insights', port: 'topology' }, to: { chunk: 'cyfro-topology', port: 'in' }, kind: 'DATA', evidence: 'code', ref: '03:F13', display: 'static', track: 'infra', emphasis: 'focus',
    label: 'CyfroTopology overlays insights on its map.' },

  /* Shared AI layer (in-process library calls, then out to an external provider) */
  { id: 'F09', from: { chunk: 'cyfro-ai-insights', port: 'ai' }, to: { chunk: 'cyfro-ai-engine', port: 'insights' }, kind: 'AI', evidence: 'code', ref: '03:F09', display: 'animate', track: 'infra', inProcess: true,
    label: 'CyfroAI Insights uses the shared AI layer to explain top-ranked risks.' },
  { id: 'F10', from: { chunk: 'cyfro-assistant', port: 'ai' }, to: { chunk: 'cyfro-ai-engine', port: 'assistant' }, kind: 'AI', evidence: 'code', ref: '03:F10', display: 'animate', track: 'infra', inProcess: true,
    label: 'CyfroAssistant uses the shared AI layer for each conversation step.' },
  { id: 'F11', from: { chunk: 'cyfro-code', port: 'ai' }, to: { chunk: 'cyfro-ai-engine', port: 'code' }, kind: 'AI', evidence: 'code', ref: '03:F11', display: 'animate', track: 'code', inProcess: true,
    label: 'CyfroCode uses the shared AI layer to explain findings and draft patches.' },
  { id: 'F12', from: { chunk: 'cyfro-ai-engine', port: 'provider' }, to: { chunk: 'ai-providers', port: 's' }, kind: 'EXT', evidence: 'code', ref: '03:F12', display: 'animate', track: 'shared', external: true,
    label: 'AI features use a shared integration layer to reach external AI services. Requests leave the CyfroSec platform, and responses return through the same integration.' },

  /* CyfroAssistant: read tools (shown when relevant) and approval-gated actions */
  { id: 'F14a', from: { chunk: 'cyfro-assistant', port: 'reads' }, to: { chunk: 'cyfro-topology', port: 'assistant' }, kind: 'DATA', evidence: 'code', ref: '03:F14', display: 'animate', track: 'infra', emphasis: 'focus',
    label: 'Read tool: topology.' },
  { id: 'F14b', from: { chunk: 'cyfro-assistant', port: 'reports' }, to: { chunk: 'reporting', port: 'assistant' }, kind: 'DATA', evidence: 'code', ref: '03:F14', display: 'static', track: 'infra', emphasis: 'focus',
    label: 'Read tool: findings and reports.' },
  { id: 'F14c', from: { chunk: 'cyfro-assistant', port: 'reports' }, to: { chunk: 'cyfro-compliance', port: 'assistant' }, kind: 'DATA', evidence: 'code', ref: '03:F14', display: 'static', track: 'infra', emphasis: 'focus',
    label: 'Read tool: compliance results.' },
  { id: 'F14d', from: { chunk: 'cyfro-assistant', port: 'insights' }, to: { chunk: 'cyfro-ai-insights', port: 'assistant' }, kind: 'DATA', evidence: 'code', ref: '03:F14', display: 'static', track: 'infra', emphasis: 'focus',
    label: 'Read tool: AI insights. The Fix button in CyfroAI Insights also opens the assistant.' },
  { id: 'F14e', from: { chunk: 'cyfro-assistant', port: 'reports' }, to: { chunk: 'cyfro-code', port: 'assistant' }, kind: 'DATA', evidence: 'code', ref: '03:F14', display: 'static', track: 'infra', emphasis: 'focus',
    label: 'Read tool: code-security findings.' },
  { id: 'F15', from: { chunk: 'cyfro-assistant', port: 'action' }, to: { chunk: 'scan-control', port: 'assistant' }, kind: 'APPR', evidence: 'code', ref: '03:F15', display: 'animate', track: 'infra', gatedBy: 'cyfro-assistant:approval',
    label: 'An approved assistant action, such as starting an agent scan job. Nothing runs without a person’s approval.' },

  /* Code security: separate pipeline with external code hosting */
  { id: 'F16', from: { chunk: 'git-hosting', port: 'e' }, to: { chunk: 'cyfro-code', port: 'git' }, kind: 'EXT', evidence: 'code', ref: '03:F16', display: 'animate', track: 'code', external: true,
    label: 'CyfroCode clones the repository when a scan is requested, or on Bitbucket events where enabled.' },
  { id: 'F17', from: { chunk: 'cyfro-code', port: 'git' }, to: { chunk: 'git-hosting', port: 'e' }, kind: 'EXT', evidence: 'code', ref: '03:F17', display: 'animate', track: 'code', external: true, gatedBy: 'cyfro-code:approval',
    label: 'A branch and pull request are published only after a person approves the patch.' },

  /* Implemented but not drawn: agent-side execution cannot be verified from the platform code */
  { id: 'F20', from: { chunk: 'scan-control', port: 'agent' }, to: { chunk: 'cyfro-agent', port: 'uplink' }, kind: 'APPR', evidence: 'code', ref: '03:F20', display: 'hidden', track: 'infra', carrier: 'F01',
    label: 'Dispatch of an approved endpoint patch to an agent.' },
];
