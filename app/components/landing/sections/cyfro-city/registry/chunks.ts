import type { ChunkDefinition, DistrictDefinition, CameraDef } from './types';
import type { Teaser } from './teasers';

/**
 * CyfroSec 3D City — the ONE authoritative list of chunks (docs/design/3d-city/02 §4, 04 §4.1).
 * Everything else (positions, labels, hit volumes, camera stops, ports, the HTML list view)
 * is derived from these entries. Public copy is checked against the source-code evidence in
 * docs/design/3d-city/02-feature-inventory.md and 03-workflow-map.md.
 *
 * Reserved (mystery) chunks exist ONLY for approved, active teasers (teasers.ts — default: none). They get
 * opaque `reserved-NN` ids, `copy: null`, no ports, no hotspots. Which feature a teaser stands for is NOT
 * recorded in this repository.
 */

export const REGISTRY_MARKER = 'cyfro-city-registry-v1';

/** Shared public copy for every reserved platform. Nothing feature-specific may appear here. */
export const MYSTERY_COPY = {
  label: '? — Coming Soon',
  body: 'A new CyfroSec capability will appear here.',
} as const;

const BASE_DISTRICTS: DistrictDefinition[] = [
  { id: 'customer', name: 'Your environment', boundary: 'wall', summary: 'Infrastructure you control. CyfroAgent runs here and only connects out to CyfroSec.' },
  { id: 'control', name: 'Scan control & data processing', boundary: 'none', summary: 'Scans are scheduled here, and uploaded results are normalised, correlated and ranked.' },
  { id: 'code', name: 'Code security', boundary: 'none', summary: 'A separate pipeline that scans repositories from your code hosting. It does not use CyfroAgent.' },
  { id: 'ai', name: 'AI intelligence', boundary: 'none', summary: 'The shared AI layer and AI-written explanations of your top risks.' },
  { id: 'operations', name: 'Security operations', boundary: 'none', summary: 'The views your team works in: topology, compliance, the assistant and reports.' },
  { id: 'edge', name: 'Your team', boundary: 'none', summary: 'Where your people sign in, review findings and approve protected actions.' },
  { id: 'external', name: 'External services', boundary: 'detached', summary: 'Third-party services outside the CyfroSec platform.' },
];

const cam = (azimuth: number, elevation: number, distance: number, target: [number, number, number] = [0, 1.2, 0]): CameraDef => ({ target, azimuth, elevation, distance });
const ONE = { w: 1, d: 1 };

/** released and publicly approved platforms */
export const RELEASED_CHUNKS: ChunkDefinition[] = [
  /* ───────────── Customer environment (walled) ───────────── */
  {
    id: 'customer-infra', class: 'environment', district: 'customer', grid: { x: 0, z: 1 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'customerInfra', perfTier: 'standard',
    copy: {
      name: 'Your infrastructure',
      summary: 'Your servers, workstations, containers and network. CyfroAgent runs here.',
      details: 'This part of the city belongs to you. The only CyfroSec component installed here is the CyfroAgent container, which runs the three discovery scans against these systems.',
      depicts: 'Server racks, a container stack, a router, a core switch, a firewall, a workstation and a laptop on a darker ground plate inside a low perimeter wall.',
      evidenceNote: 'CyfroAgent is installed as a Docker container in your environment, using the product’s install command.',
      short: 'Your infra',
    },
    ports: [{ id: 'n', side: 'n' }, { id: 's', side: 's' }, { id: 'e', side: 'e' }],
    hotspots: [
      { id: 'racks', name: 'Servers', summary: 'Hosts that the agent can scan.', at: [-0.9, 3.2, -0.9] },
      { id: 'router', name: 'Network', summary: 'Subnets and devices that discovery scans can reach.', at: [1.2, 1.5, 1.2] },
    ],
    camera: cam(25, 34, 11), dependsOn: [],
  },
  {
    id: 'cyfro-agent', class: 'feature', district: 'customer', grid: { x: 1, z: 1 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'cyfroAgent', perfTier: 'standard', href: '/solutions/cyfro-agent',
    copy: {
      name: 'CyfroAgent',
      summary: 'A lightweight container on your hosts that collects security evidence.',
      details: 'CyfroAgent enrolls once with a single-use token, then opens its own outbound HTTPS connection to CyfroSec. Scheduled scans and signed commands arrive over that connection, and results are uploaded the same way. CyfroSec never connects in. The agent also runs the three discovery scans.',
      depicts: 'The agent appliance on a plinth (cooling fins, connector panel, a result buffer behind glass, run-state lamps) with three collection modules: port scan (probe mast and socket panel), asset discovery (listener dish) and fingerprinting (filesystem platters, a container image, shard lamps). Also a press that packs each scan’s results for upload, a status screen, a heartbeat light and the outbound uplink.',
      evidenceNote: 'Enrollment, the agent-opened control stream, heartbeats, signed commands, acknowledgements and the per-scan upload endpoints, including sharded fingerprint uploads, are implemented in the platform. Scanners (Nmap, Trivy) and on-host collection follow the CyfroAgent documentation. The agent’s own source code was not part of this review.',
    },
    ports: [{ id: 'uplink', side: 'e', offset: -0.18 }, { id: 'upload', side: 'e', offset: 0.18 }, { id: 'n', side: 'n' }, { id: 'w', side: 'w' }, { id: 's', side: 's' }],
    hotspots: [
      { id: 'uplink', name: 'Outbound Connection', summary: 'The agent opens the connection, and work arrives over it.', at: [1.7, 1.6, -0.4] },
      { id: 'panel', name: 'Agent Status', summary: 'Heartbeats and run status, reported to Scan Control.', at: [0, 2.2, 0.4] },
      { id: 'modules', name: 'Scan Modules', summary: 'Network Discovery, Asset Discovery and Fingerprinting run inside the agent.', at: [0.4, 2.0, 0.15] },
      { id: 'portscan', name: 'Port Scan', summary: 'Uses Nmap to find open ports, services and versions.', at: [1.6, 1.45, -0.35] },
      { id: 'fingerprint', name: 'Fingerprinting', summary: 'Uses Trivy on a host filesystem or container image. Results are uploaded in shards.', at: [-2.0, 0.95, 1.0] },
      { id: 'packaging', name: 'Result Upload', summary: 'Each scan’s results are packaged and uploaded to CyfroSec over outbound HTTPS.', at: [-0.35, 1.85, 1.75] },
    ],
    camera: cam(35, 32, 10.5), dependsOn: ['scan-control'],
  },
  {
    id: 'network-discovery', class: 'feature', district: 'customer', grid: { x: 0, z: 0 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'networkDiscovery', perfTier: 'standard', href: '/solutions/network-discovery',
    copy: {
      name: 'Network Discovery',
      summary: 'Finds reachable hosts, open ports and the services behind them.',
      details: 'CyfroAgent scans a host or subnet you choose, on demand or on a schedule of every 1, 6, 12 or 24 hours, set in Scan Setup. It reports open ports, detected services and their versions over the agent’s own connection.',
      depicts: 'A sweeping antenna mast with probe rings, a scanner unit, a board of port indicators and a rack where a card appears for each service found.',
      evidenceNote: 'Scan types, scheduling and result ingestion are implemented in the platform. The probing itself runs inside CyfroAgent, as documented.',
    },
    ports: [{ id: 's', side: 's' }, { id: 'e', side: 'e' }],
    hotspots: [
      { id: 'mast', name: 'Port Scan', summary: 'Probes the chosen target for open ports.', at: [-0.6, 3.6, -0.4] },
      { id: 'ports', name: 'Services Found', summary: 'Ports, services and versions, reported back to the agent.', at: [2.05, 1.6, 0.1] },
      { id: 'scanner', name: 'Scanner', summary: 'Runs inside CyfroAgent against the target you choose.', at: [-1.65, 1.2, 1.45] },
    ],
    camera: cam(20, 34, 10), dependsOn: ['cyfro-agent'],
  },
  {
    id: 'asset-discovery', class: 'feature', district: 'customer', grid: { x: 0, z: 2 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'assetDiscovery', perfTier: 'standard', href: '/solutions/asset-discovery',
    copy: {
      name: 'Asset Discovery',
      summary: 'Finds devices on the agent’s local network and builds an inventory by type.',
      details: 'CyfroAgent sweeps its local subnet, once a day by default, and records which devices answer and how they relate. CyfroSec then assigns each device a role, such as server, workstation, router, printer, IoT device or virtual machine, for the asset inventory and CyfroTopology.',
      depicts: 'A radar sends out a scan pulse; a device answers; the identify console reads it; a sorter belt carries its card to one of six bins by device type; the inventory board and catalog drawers count it in.',
      evidenceNote: 'The default schedule and result ingestion are implemented in the platform. Discovery itself runs inside CyfroAgent, as documented.',
    },
    ports: [{ id: 'n', side: 'n' }, { id: 'e', side: 'e' }],
    hotspots: [
      { id: 'radar', name: 'Detect', summary: 'Sweeps the agent’s local subnet and records the devices that answer.', at: [-0.75, 2.9, -1.35] },
      { id: 'identify', name: 'Identify', summary: 'Reads each device’s address, name and response.', at: [-1.7, 2.55, 0.0] },
      { id: 'sorter', name: 'Classify', summary: 'CyfroSec assigns each device a role.', at: [0.4, 1.25, 1.6] },
      { id: 'inventory', name: 'Inventory', summary: 'Device counts by type, with the newest asset highlighted.', at: [1.4, 2.6, -1.9] },
      { id: 'listener', name: 'Neighbour Listener', summary: 'Detects DHCP servers and Layer 2 neighbours.', at: [-2.1, 1.3, -2.1] },
    ],
    camera: cam(30, 34, 10), dependsOn: ['cyfro-agent'],
  },
  {
    id: 'service-fingerprinting', class: 'feature', district: 'customer', grid: { x: 1, z: 0 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'serviceFingerprinting', perfTier: 'standard', href: '/solutions/service-fingerprinting',
    copy: {
      name: 'Service Fingerprinting',
      summary: 'Looks inside the host for vulnerable packages, misconfigurations and exposed secrets.',
      details: 'CyfroAgent examines the host filesystem, mounted into the agent as read-only, and reports vulnerabilities, misconfigurations and secrets. Large results are uploaded in chunks. In the CyfroSec app, this scan is called System Vulnerability Discovery.',
      depicts: 'An inspection lab: a target (host filesystem, read-only, or a container image) slides from a loading dock onto the inspection bed; a sensor head sweeps it between two sensor towers and identifies installed software; each package is matched against an advisory database; an analyzer sorts the results into vulnerabilities, misconfigurations and secrets; the results screen highlights the key match and shards are packed for CyfroAgent.',
      evidenceNote: 'Result formats for vulnerabilities, misconfigurations and secrets, and chunked uploads, are implemented in the platform. The scan runs inside CyfroAgent, as documented.',
      short: 'Fingerprinting',
    },
    ports: [{ id: 's', side: 's' }, { id: 'w', side: 'w' }],
    hotspots: [
      { id: 'gantry', name: 'Inspection Chamber', summary: 'Inspects one target at a time: a host filesystem (read-only) or a container image.', at: [-0.45, 2.4, -0.4] },
      { id: 'signatures', name: 'Advisory Database', summary: 'Matches installed packages against known vulnerabilities.', at: [1.95, 2.0, -1.55] },
      { id: 'trays', name: 'Classification', summary: 'Sorts results into vulnerabilities, misconfigurations and secrets.', at: [1.55, 1.1, 1.85] },
      { id: 'results', name: 'Fingerprint Results', summary: 'Identified software, advisory matches and the key finding.', at: [1.65, 2.3, 0.35] },
    ],
    camera: cam(25, 34, 10), dependsOn: ['cyfro-agent'],
  },

  /* ───────────── Scan control & data processing ───────────── */
  {
    id: 'scan-control', class: 'feature', district: 'control', grid: { x: 2, z: 0 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'scanControl', perfTier: 'standard',
    copy: {
      name: 'Scan Control',
      summary: 'Configures scans, schedules them and assigns them to agents.',
      details: 'Choose a scan type, a target, the agents to use and an interval. Every 30 seconds, a scheduler checks for scans that are due and sends each assignment over the agent’s own connection. Agent enrollment, fleet status and endpoint patch requests, which require approval, are also managed here.',
      depicts: 'A control tower with a schedule dial and a due-scan queue, an agent registry board, a token dispenser, an endpoint-patch approval terminal and the Scan Setup console with its operator.',
      evidenceNote: 'Scan setup, the 30-second scheduler, agent registration and the control stream are implemented in the platform.',
    },
    ports: [{ id: 'agent', side: 'w', offset: 0.32 }, { id: 'assistant', side: 'e' }, { id: 's', side: 's' }],
    hotspots: [
      { id: 'setup', name: 'Scan Setup', summary: 'Choose the scan type, target, agents and interval.', at: [-1.0, 2.4, 0.9] },
      { id: 'scheduler', name: 'Scheduler', summary: 'Every 30 seconds, due scans become agent assignments.', at: [0.6, 3.6, -0.6] },
      { id: 'patches', name: 'Endpoint Patch Approvals', summary: 'Proposing, approving and dispatching a patch each need their own permission.', at: [1.6, 1.6, 1.35] },
      { id: 'tokens', name: 'Registration Tokens', summary: 'Each agent enrolls once with a single-use token.', at: [1.85, 1.45, -0.15] },
    ],
    camera: cam(25, 33, 10.5), dependsOn: [],
  },
  {
    id: 'data-ingestion', class: 'feature', district: 'control', grid: { x: 2, z: 1 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'dataIngestion', perfTier: 'standard',
    copy: {
      name: 'Data Ingestion & Correlation',
      summary: 'Turns raw scan uploads into one consistent, ranked view.',
      details: 'Each upload is checked for duplicates, stored encrypted and normalised by scan type. Results are then correlated into an immutable snapshot and ranked by fixed rules: evidence from the same run, confirmed exposure, severity, CVSS score and recency. The ranking is deterministic. AI does not decide the order.',
      depicts: 'Intake (with a duplicate chute), normalisation and correlation stations on one line, a ranking-rule plaque, encrypted storage, and a shelf of ranked snapshot blocks.',
      evidenceNote: 'Staging, normalisation, correlation snapshots and the ranking rule are implemented in the platform.',
      short: 'Data Ingestion',
    },
    ports: [{ id: 'in', side: 'w', offset: 0.18 }, { id: 'insights', side: 'e' }, { id: 'compliance', side: 's', offset: 0.3 }, { id: 'reads', side: 's', offset: -0.1 }],
    hotspots: [
      { id: 'intake', name: 'Intake', summary: 'Checks each upload for duplicates and stores it encrypted.', at: [-1.5, 1.8, 0.8] },
      { id: 'normalise', name: 'Normalisation', summary: 'Converts each scan type into one consistent format.', at: [0, 1.9, 0.8] },
      { id: 'correlate', name: 'Correlation & Ranking', summary: 'Builds an immutable snapshot in a deterministic order.', at: [1.4, 2.4, -0.8] },
      { id: 'storage', name: 'Encrypted Storage', summary: 'Raw uploads are kept encrypted.', at: [0.2, 1.6, -1.55] },
    ],
    camera: cam(25, 32, 10.5), dependsOn: ['cyfro-agent'],
  },

  /* ───────────── Code security (separate pipeline) ───────────── */
  {
    id: 'cyfro-code', class: 'feature', district: 'code', grid: { x: 2, z: 2 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'cyfroCode', perfTier: 'standard', href: '/solutions/cyfrocode',
    copy: {
      name: 'CyfroCode',
      summary: 'Scans connected repositories and proposes fixes that are published only after approval.',
      details: 'CyfroCode connects to GitHub, and to Bitbucket where enabled. It clones the repository on CyfroSec’s side and runs code, secret, dependency and infrastructure-as-code scanners. Scans run when you request them, or on Bitbucket events where enabled. CyfroCode can draft a patch with AI assistance and check that it applies cleanly. A pull request is opened only after a person approves the patch, and a rejected draft is discarded.',
      depicts: 'A repository shelf beside the code hosting pad, a row of scanners, a patch printer and an orange approval barrier across the outbound pull-request lane.',
      evidenceNote: 'Repository connections, scanners, AI patch drafts, validation and approval-gated pull requests are implemented in the platform.',
    },
    ports: [{ id: 'git', side: 'w', offset: 0.25 }, { id: 'ai', side: 'n', offset: 0.3 }, { id: 'assistant', side: 'e' }],
    hotspots: [
      { id: 'scanners', name: 'Scanners', summary: 'Code, secrets, dependencies and infrastructure as code.', at: [-0.5, 2.0, -1.25] },
      { id: 'draft', name: 'Patch Draft', summary: 'Drafted with AI assistance and checked to apply cleanly.', at: [0.9, 2.6, 0.1] },
      { id: 'approval', name: 'Human Approval', summary: 'Nothing is published until a person approves.', at: [-1.45, 1.8, 0.75] },
    ],
    camera: cam(25, 34, 10.5), dependsOn: ['git-hosting'],
  },

  /* ───────────── AI intelligence ───────────── */
  {
    id: 'cyfro-ai-engine', class: 'feature', district: 'ai', grid: { x: 3, z: 0 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'cyfroAiEngine', perfTier: 'hero',
    copy: {
      name: 'CyfroAI Engine',
      summary: 'The shared AI layer used by CyfroAI Insights, CyfroAssistant and CyfroCode.',
      details: 'AI requests from these features go through one shared integration. It selects the model, applies usage limits and sends the request to an external AI provider. It is a software library inside the platform, not a server that all data passes through. Scan ingestion, topology, compliance checks and reports run without it.',
      depicts: 'The CyfroAI Engine device: a layered appliance with a bot-face display, analysis screens and the floating CyfroSec reactor orb.',
      evidenceNote: 'Implemented as one shared AI library that each AI feature calls. Models are provided by external AI providers.',
    },
    ports: [{ id: 'provider', side: 'n' }, { id: 'insights', side: 's' }, { id: 'assistant', side: 'e', offset: 0.3 }, { id: 'code', side: 'w', offset: 0.3 }],
    hotspots: [
      { id: 'face', name: 'Model Routing', summary: 'Selects the model for each type of request.', at: [0, 2.1, 0.6] },
      { id: 'orb', name: 'Usage Limits', summary: 'Requests are metered against your plan limits.', at: [0, 4.0, -0.4] },
    ],
    camera: { target: [-0.3, 1.5, 1.0], azimuth: 14.5, elevation: 31.7, distance: 7.23 }, dependsOn: ['ai-providers'],
  },
  {
    id: 'cyfro-ai-insights', class: 'feature', district: 'ai', grid: { x: 3, z: 1 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'cyfroAiInsights', perfTier: 'standard', href: '/solutions/cyfro-ai-insights',
    copy: {
      name: 'CyfroAI Insights',
      summary: 'Explains and summarises the highest-priority risks after each scan.',
      details: 'After a scan is correlated, CyfroAI Insights can write an executive summary and plain-language explanations for up to 15 top-ranked risks, each linked to its evidence. Depending on your plan and settings, this runs automatically or on request. Suggested commands are shown for you to review and run yourself. The platform never executes them.',
      depicts: 'A large insights wall listing prioritised findings with an AI explanation panel, a board of up to 15 ranked risks, an evidence cabinet and a kiosk where suggested commands are shown for review.',
      evidenceNote: 'Automatic and on-demand generation, the 15-risk limit and display-only commands are implemented in the platform.',
    },
    ports: [{ id: 'in', side: 'w' }, { id: 'ai', side: 'n' }, { id: 'topology', side: 'e', offset: -0.3 }, { id: 'assistant', side: 'e', offset: 0.2 }],
    hotspots: [
      { id: 'wall', name: 'Prioritised Risks', summary: 'Up to 15 top-ranked risks, each explained.', at: [1.5, 3.9, 0] },
      { id: 'commands', name: 'Suggested Commands', summary: 'Shown for your review. The platform never runs them.', at: [-1.2, 1.5, 1.6] },
      { id: 'ranked', name: 'Top-Ranked Risks', summary: 'Up to 15 risks, in the order set by fixed rules.', at: [0.25, 2.0, -2.1] },
      { id: 'evidence', name: 'Evidence', summary: 'Each explained risk links to its evidence.', at: [-2.0, 1.6, -1.4] },
    ],
    camera: cam(-62, 28, 10.5), dependsOn: ['data-ingestion', 'cyfro-ai-engine'],
  },

  /* ───────────── Security operations ───────────── */
  {
    id: 'cyfro-compliance', class: 'feature', district: 'operations', grid: { x: 3, z: 2 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'cyfroCompliance', perfTier: 'standard', href: '/solutions/cyfro-compliance',
    copy: {
      name: 'CyfroCompliance',
      summary: 'Checks your environment against compliance controls using scan evidence.',
      details: 'After each correlated scan, or when you refresh, CyfroCompliance evaluates GDPR, SOC 2, NIST CSF and CCPA/CPRA controls. Deterministic checks run against the scan evidence, such as no critical CVEs, no admin ports exposed publicly and recent scan evidence. Each technical control is marked passing, partial or failing. Controls without usable evidence are marked not evaluable, and controls that need attestation are left for a person to review. The score is the average of the scored technical controls. It is not a certification.',
      depicts: 'Evidence arrives at the north intake and travels to an evidence station that sorts it by type; a check runner evaluates each framework’s control groups on four cabinets (tiles turn passing, partial, failing, not evaluable or needs review); a gauge settles on the technical-controls score; an audit workstation shows the results and an evaluation report comes out beside the gauge.',
      evidenceNote: 'The four framework catalogs, deterministic checks and scoring are implemented in the platform.',
    },
    ports: [{ id: 'in', side: 'n', offset: -0.3 }, { id: 'assistant', side: 'e' }],
    hotspots: [
      { id: 'frameworks', name: 'Frameworks', summary: 'GDPR, SOC 2, NIST CSF and CCPA/CPRA.', at: [-1.2, 2.6, -0.6] },
      { id: 'score', name: 'Technical Controls Score', summary: 'The average of the scored technical controls. Not a certification.', at: [1.95, 1.6, 0.75] },
      { id: 'evidence', name: 'Evidence Station', summary: 'Assets, services, vulnerabilities and agent test runs from the scan.', at: [-1.7, 1.3, 1.85] },
      { id: 'audit', name: 'Results & Review', summary: 'Results, missing evidence and controls that need a person’s review.', at: [-0.55, 1.5, 1.6] },
      { id: 'checks', name: 'Deterministic Checks', summary: 'Controls are evaluated from correlated scan evidence. AI does not decide any control.', at: [-0.75, 2.45, -1.0] },
    ],
    camera: cam(25, 33, 10.5), dependsOn: ['data-ingestion'],
  },
  {
    id: 'cyfro-topology', class: 'feature', district: 'operations', grid: { x: 4, z: 0 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'cyfroTopology', perfTier: 'standard', href: '/solutions/cyfro-topology',
    copy: {
      name: 'CyfroTopology',
      summary: 'Shows your agents, subnets and assets as an explorable network map.',
      details: 'CyfroTopology builds its graph when you open it, using the latest correlated scan results. Risk and agent-coverage overlays come from CyfroAI Insights. You can filter, search and export the map.',
      depicts: 'A holographic topology table where records from the latest snapshot become an agent → subnet → asset graph: data-feed racks and a relationship processor feed it, links draw in, the graph settles and an asset is inspected on a node-details terminal, with an Insights overlay pedestal, graph-status lamps, the topology monitor, a filter console and an export station.',
      evidenceNote: 'The on-demand graph, its node and edge types, and insight overlays are implemented in the platform.',
    },
    ports: [{ id: 'in', side: 's', offset: -0.3 }, { id: 'assistant', side: 's', offset: 0.3 }],
    hotspots: [
      { id: 'graph', name: 'Network Graph', summary: 'Agents, subnets and assets, and how they connect.', at: [-0.3, 2.2, 0.1] },
      { id: 'feeds', name: 'Snapshot Records', summary: 'Loaded from the latest correlated results when the map opens.', at: [-1.1, 1.5, 2.05] },
      { id: 'inspect', name: 'Node Details', summary: 'An asset with its subnet, agent and links.', at: [-2.15, 2.4, 0.4] },
      { id: 'overlays', name: 'Insight Overlays', summary: 'Risk and agent-coverage overlays from CyfroAI Insights.', at: [1.75, 1.6, 0.3] },
      { id: 'filters', name: 'Filters', summary: 'Filter by agent, subnet, date range or risk only.', at: [-1.95, 1.5, -1.4] },
      { id: 'export', name: 'Export', summary: 'Export the map as PNG, JPG or JSON.', at: [1.55, 1.2, 1.35] },
    ],
    camera: cam(25, 36, 10.5), dependsOn: ['data-ingestion'],
  },
  {
    id: 'cyfro-assistant', class: 'feature', district: 'operations', grid: { x: 4, z: 1 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'cyfroAssistant', perfTier: 'standard', href: '/solutions/cyfro-assistant',
    copy: {
      name: 'CyfroAssistant',
      summary: 'Answers questions using your security data, and asks before it acts.',
      details: 'CyfroAssistant reads findings, topology, compliance results, insights and code-security data through read tools. Any tool that would change something, such as starting a job, creating a remediation draft or inviting a user, waits until a person approves it. If the request is rejected, the action does not run.',
      depicts: 'An assistant console with a conversation screen and a person asking a question, a rack of read tools, a document library, and an orange approval checkpoint on its outbound lane.',
      evidenceNote: 'Read tools, mandatory approval for every tool that makes changes, and the approve and reject flow are implemented in the platform.',
    },
    ports: [{ id: 'reads', side: 'n' }, { id: 'ai', side: 'w', offset: -0.3 }, { id: 'insights', side: 'w', offset: 0.2 }, { id: 'reports', side: 's' }, { id: 'action', side: 'n', offset: -0.32 }],
    hotspots: [
      { id: 'chat', name: 'Conversation', summary: 'Answers grounded in your scan and code data.', at: [-0.4, 2.8, -0.5] },
      { id: 'approval', name: 'Human Approval', summary: 'Actions that change something wait for a person.', at: [1.1, 1.8, 1.3] },
      { id: 'tools', name: 'Read Tools', summary: 'Findings, topology, compliance, insights and code security.', at: [1.85, 1.65, -1.6] },
      { id: 'docs', name: 'Documents', summary: 'Searches your uploaded documents and the public documentation.', at: [-2.2, 1.6, 0.95] },
    ],
    camera: cam(25, 32, 10.5), dependsOn: ['cyfro-ai-engine'],
  },
  {
    id: 'reporting', class: 'feature', district: 'operations', grid: { x: 4, z: 2 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'reporting', perfTier: 'standard',
    copy: {
      name: 'Reporting & Dashboard',
      summary: 'Dashboards, a reporting workspace with Excel export, and notifications.',
      details: 'The dashboard and reporting workspace use the same correlated scan results: vulnerabilities, misconfigurations, secrets, network and assets. Reports can be exported to Excel. In-app notifications tell you when scans complete, and email is sent for critical events.',
      depicts: 'A dashboard wall and bar-chart sculpture, a KPI totem, a report printer producing a spreadsheet, an archive of report tabs, an in-app notification beacon and a mailbox for critical-event email.',
      evidenceNote: 'The reporting workspace, Excel export, dashboard and notifications are implemented in the platform.',
      short: 'Reporting',
    },
    ports: [{ id: 'in', side: 'n', offset: 0.32 }, { id: 'notify', side: 'w' }, { id: 'assistant', side: 'n', offset: -0.1 }],
    hotspots: [
      { id: 'dashboard', name: 'Dashboard', summary: 'Your security posture at a glance.', at: [-0.8, 3.0, -0.8] },
      { id: 'export', name: 'Excel Export', summary: 'Export reports as spreadsheets.', at: [1.3, 1.5, 1.2] },
      { id: 'archive', name: 'Report Tabs', summary: 'Vulnerabilities, misconfigurations, secrets, network and assets.', at: [-2.05, 2.15, -0.25] },
      { id: 'bell', name: 'Notifications', summary: 'In-app alerts, with email for critical events only.', at: [-1.6, 2.2, 1.55] },
    ],
    camera: cam(25, 33, 10.5), dependsOn: ['data-ingestion'],
  },

  /* ───────────── Edge: your team (approved teasers join it, see teasers.ts) ───────────── */
  {
    id: 'access-plaza', class: 'environment', district: 'edge', grid: { x: 5, z: 1 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'accessPlaza', perfTier: 'light',
    copy: {
      name: 'Your team',
      summary: 'Your people review findings and decide on protected actions. Approval is always a person’s decision.',
      details: 'Users sign in, and every action is checked against their role. Most findings are for review only. A person with the right permission must approve before CyfroAssistant runs an action that changes something, and before CyfroCode publishes a patch as a pull request. A rejected request does not run. Endpoint patch requests have separate permissions to propose, approve and dispatch.',
      depicts: 'A small security operations room: a sign-in gate, an analyst desk with monitors, a wall dashboard of findings and pending approvals, and an approval console with Pending, Approved and Rejected lamps for CyfroAssistant actions and CyfroCode pull requests.',
      evidenceNote: 'Sign-in, per-action permission checks, and the approve and reject flows for CyfroAssistant tools and CyfroCode patch publishing are implemented in the platform.',
    },
    ports: [{ id: 'w', side: 'w' }],
    hotspots: [
      { id: 'gate', name: 'Sign-In', summary: 'Identity and role checks on every action.', at: [-2.25, 2.15, 0] },
      { id: 'desk', name: 'Finding Review', summary: 'Most findings are reviewed without needing approval.', at: [-0.55, 2.2, -0.9] },
      { id: 'dashboard', name: 'Security Dashboard', summary: 'Findings under review and pending approvals.', at: [0, 2.6, -2.3] },
      { id: 'console', name: 'Approval Console', summary: 'A person approves or rejects each pending request.', at: [1.2, 1.95, 1.3] },
    ],
    camera: cam(25, 34, 10), dependsOn: [],
  },

  /* ───────────── External services (detached pads) ───────────── */
  {
    id: 'ai-providers', class: 'environment', district: 'external', grid: { x: 3, z: -1 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'aiProviders', perfTier: 'light',
    copy: {
      name: 'External AI Model Provider',
      summary: 'CyfroSec uses external AI providers to support CyfroAI Insights, CyfroAssistant and CyfroCode.',
      details: 'Requests are sent to the selected provider through the platform’s AI integration layer. The provider processes each request and returns a response. Because these requests leave the CyfroSec platform, this pad sits outside it.',
      depicts: 'A neutral, generic provider station: a request gateway where CyfroSec’s AI requests arrive and responses leave, compute racks that run the model, cooling and power, and a status panel. No specific provider, location or setup is shown.',
      evidenceNote: 'All AI calls in the platform go to external model providers through the shared AI library.',
      short: 'AI provider',
    },
    ports: [{ id: 's', side: 's' }],
    hotspots: [
      { id: 'gateway', name: 'Request Gateway', summary: 'Sends AI requests and receives responses.', at: [0, 2.1, 1.75] },
      { id: 'models', name: 'Provider Infrastructure', summary: 'Represents the external systems that process those requests.', at: [0, 2.75, -1.45] },
      { id: 'status', name: 'Request Status', summary: 'Shows the current stage of an AI request.', at: [-1.6, 2.45, 1.7] },
    ],
    camera: cam(20, 32, 10), dependsOn: [],
  },
  {
    id: 'git-hosting', class: 'environment', district: 'external', grid: { x: 1, z: 2 }, footprint: ONE,
    lifecycle: 'available', publicVisibility: 'full', builder: 'gitHosting', perfTier: 'light',
    copy: {
      name: 'Your code hosting',
      summary: 'The GitHub or Bitbucket repositories that CyfroCode scans.',
      details: 'A third-party service that you connect. CyfroCode reads repositories from here. It pushes a branch and opens a pull request only after a person approves a patch.',
      depicts: 'A separate neutral pad beside CyfroCode, outside both your environment’s wall and the CyfroSec platform, with repository servers and a switch, a Git graph wall (main, a merged branch, a feature branch), GitHub and Bitbucket provider badges, a repository console, a transfer gateway facing CyfroCode, a pull-request inbox and a PR status display.',
      evidenceNote: 'The GitHub App and Bitbucket integrations, cloning and approval-gated pull requests are implemented in the platform.',
      short: 'Code hosting',
    },
    ports: [{ id: 'e', side: 'e', offset: 0.25 }],
    hotspots: [
      { id: 'repos', name: 'Repositories', summary: 'Cloned by CyfroCode when a scan is requested.', at: [-1.2, 2.2, -1.4] },
      { id: 'prs', name: 'Pull Requests', summary: 'Opened, not merged, and only after a person approves a patch.', at: [1.75, 1.0, 1.35] },
      { id: 'graph', name: 'Git History', summary: 'Example branches and commits in the repository.', at: [-0.65, 2.0, 0.3] },
      { id: 'providers', name: 'GitHub · Bitbucket', summary: 'The two supported providers.', at: [-1.62, 2.0, 0.3] },
      { id: 'gateway', name: 'Clone Gateway', summary: 'Where CyfroCode clones the repository for a scan.', at: [2.35, 1.2, 1.35] },
    ],
    camera: cam(25, 34, 10), dependsOn: [],
  },
];

/** A mystery platform for each teaser that is BOTH in development AND approved (default deny). */
export function teaserChunks(list: Teaser[]): ChunkDefinition[] {
  return list.filter((t) => t.inDevelopment === true && t.teaserApproved === true).map((t) => ({
    id: t.id, class: 'reserved', district: 'edge', grid: { x: t.grid.x, z: t.grid.z }, footprint: ONE,
    lifecycle: 'planned', publicVisibility: 'mystery', builder: 'mystery', perfTier: 'light',
    copy: null, ports: [], hotspots: [], camera: cam(25, 32, 10, [0, 1.2, 0]), dependsOn: [],
  }));
}

/**
 * Everything the city shows: the released platforms plus a mystery platform per approved teaser.
 * (Composed in index.ts from teasers.ts; registry files stay import-free so `node --test` can load them.)
 */
export function composeCity(teasers: Teaser[]) {
  const mystery = teaserChunks(teasers);
  const districts = BASE_DISTRICTS.map((d) => (d.id === 'edge' && mystery.length
    ? { ...d, name: 'Your team & what comes next', summary: 'Where your people sign in, and where something new from CyfroSec will appear.' } : d));
  return { chunks: [...RELEASED_CHUNKS, ...mystery], districts };
}

