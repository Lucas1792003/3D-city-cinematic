// English dictionary — single source of truth for all landing page text.
// Arabic (ar.ts) must satisfy: typeof en

export const en = {
  nav: {
    home: "Home",
    product: "Product",
    solutions: "Solutions",
    documentation: "Documentation",
    about: "About",
    company: "Company",
    subscriptions: "Subscriptions",
    productSubmenu: [
      { label: "3D City Overview", description: "Explore the platform as an interactive 3D city" },
      { label: "Platform Overview", description: "What CyfroSec is and how it works" },
      {
        label: "Features",
        description: "Discover, assess, prioritize, remediate",
      },
      {
        label: "CyfroAI Engine",
        description: "AI-powered detection & remediation",
      },
      { label: "Architecture", description: "How the platform’s components connect" },
      {
        label: "CyfroCompliance & Security",
        description: "CyfroCompliance tool & Data Residency",
      },
    ],
    solutionsSubmenu: [
      { label: "Network Discovery", description: "Find reachable hosts and services" },
      {
        label: "Asset Discovery",
        description: "Discover assets across your network",
      },
      {
        label: "Service Fingerprinting",
        description: "Identify vulnerable services and versions",
      },
      {
        label: "CyfroAI Insights",
        description: "Prioritize findings with exposure context",
      },
      {
        label: "CyfroAssistant",
        description: "Turn security questions into next steps",
      },
      {
        label: "CyfroCode",
        description: "Find code vulnerabilities and review AI patches",
      },
      { label: "CyfroAgent", description: "Collect security evidence from your hosts" },
      { label: "CyfroTopology", description: "Explore assets, connections and risk" },
      { label: "CyfroCompliance", description: "Assess controls using scan evidence" },
    ],
    aboutSubmenu: [
      { label: "About Us", description: "Our mission, team, and values" },
      {
        label: "Subscription Tiers",
        description: "Plans, pricing, and feature comparison",
      },
    ],
    signIn: "Sign In",
    getStarted: "Get Started",
    contactSales: "Contact Sales",
  },

  hero: {
    headline:
      "CyfroSec is an enterprise cybersecurity platform that protects infrastructure, applications and AI systems from modern vulnerabilities and AI‑driven attacks, with built‑in safeguards against risks introduced by AI‑generated code.",
    rotatingPrefix: "AI-Powered Cybersecurity That",
    rotatingPhrases: [
      "Finds Vulnerabilities Before Attackers Exploit Them",
      "Stops Threats Before They Disrupt Your Business",
      "Simplifies Fixes Before Small Weaknesses Become Major Incidents",
      "Explains Risks Before Critical Decisions Are Missed",
    ],
    tagline: "Understand your environment better than an attacker ever could.",
    description:
      "CyfroSec delivers code‑security SAST, continuous asset and network discovery, deep service fingerprinting, compliance checks and AI‑powered risk prioritization and remediation, so leaders get high‑level insights and security teams have the technical detail they need to act.",
    bookDemo: "Book a Demo",
    stats: {
      deployment: { value: "SaaS & On-Prem", label: "Deployment Options" },
      aiPowered: { value: "AI-Powered", label: "Prioritization" },
      agenticAI: { value: "Agentic AI", label: "Remediation" },
    },
  },

  learning: {
    title: "Learn about",
    subtitle: "Rethinking Cybersecurity for the AI Era",
    ceoMessage: `Today's cybersecurity tools operate in silos, securing code, cloud, endpoints, and infrastructure independently, creating noise, blind spots, and unclear priorities.

At CyfroSec, we take a different approach. We combine network visibility, asset discovery, and deep fingerprinting with code security across SaaS and on-prem environments to deliver AI-driven insights that show you exactly what matters and what to fix first.

We secure modern AI-driven infrastructure from development to deployment and beyond.

Our vision is to build a unified code-to-cloud security platform that protects the entire ecosystem, across everything in between.`,
    mission: {
      title: "Our Mission",
      description:
        "Make AI-driven security simple, actionable, and accessible so every team can focus on what truly matters.",
    },
    team: {
      title: "Who We Are",
      description:
        "AI researchers, software engineers, and security experts building intelligent systems that turn complexity into clear, actionable decisions.",
    },
    approach: {
      title: "Our Approach",
      description:
        "An AI-native approach that cuts through noise, prioritizes risk, and delivers clear, actionable decisions.",
    },
  },

  problem: {
    heading: {
      pre: "Why Traditional Security Platforms",
      highlight: "Fall Behind",
      post: "",
    },
    subtitle:
      "Built for Yesterday's Infrastructure. Not Today's AI-Driven Threats. Here's what teams are struggling with:",
    cards: [
      {
        eyebrow: "Business Context",
        name: "Security Data Without Business Context",
        description:
          "Teams chase CVSS scores, not exploitability, and routine decisions get escalated to multiple experts, causing delays.",
        impact:
          "Security findings arrive without the business and exposure context teams need, so critical fixes get delayed while experts re-interpret what matters.",
        metricLabel: "Decision Drag",
        metricValue: "Experts pulled into routine triage",
        cta: "See how CyfroSec's AI-driven context filters exposures",
        href: "/products/ai-insights",
      },
      {
        eyebrow: "Alert Fatigue",
        name: "Alert Fatigue Without Risk Intelligence",
        description:
          "Teams drown in thousands of low-value alerts, burying the critical fixes. There were 23667 CVEs in H1-2025, with only 161 exploited, yet most were treated equally.",
        impact:
          "Without risk intelligence, teams spend time sorting noise instead of acting on the narrow set of exposures attackers can realistically exploit.",
        metricLabel: "H1 2025 Signal",
        metricValue: "23,667 CVEs, 161 exploited",
        cta: "See how CyfroSec prioritizes what attackers can exploit",
        href: "/products/ai-insights",
      },
      {
        eyebrow: "Visibility Gaps",
        name: "Fragmented Visibility Across Code and Infrastructure",
        description:
          "Legacy tools focus on either web apps, infrastructure or code - never all three - creating blind spots.",
        impact:
          "Security teams lose time pivoting between disconnected tools, which makes it harder to see how code-level issues turn into real infrastructure risk.",
        metricLabel: "Coverage Split",
        metricValue: "Code, apps, and infra in separate tools",
        cta: "See how CyfroSec unifies code-to-cloud visibility",
        href: "/solutions",
      },
      {
        eyebrow: "AI Code Risk",
        name: "AI-Generated Code Introduces New Attack Surfaces",
        description:
          "Traditional scanners cannot detect or understand AI-generated vulnerabilities.",
        impact:
          "Teams adopting AI-assisted development introduce new classes of flaws that older scanners miss or fail to explain in a way developers can remediate quickly.",
        metricLabel: "New Surface",
        metricValue: "AI-generated code and model risk",
        cta: "See how CyfroSec secures AI-generated code and models.",
        href: "/solutions/cyfrocode",
      },
    ],
    brings: {
      titlePre: "",
      titleBrand: "CyfroSec",
      titleMid: " Brings ",
      titlePost: "Together",
      items: [
        {
          title: "Unified code-to-cloud intelligence",
          description:
            "Continuous visibility from development to deployment in production.",
        },
        {
          title: "AI-native prioritization and remediation",
          description:
            "Context-aware triage, PR-ready patches and one-click fixes.",
        },
        {
          title: "AI-assistant and AI-insights for all users",
          description: "Plain-language explanations and executive summaries.",
        },
        {
          title: "Sovereign deployment",
          description:
            " SaaS, on-prem or hybrid, with built-in GDPR and NIS2 compliance checks.",
        },
      ],
    },
  },

  solution: {
    badge: "Vulnerability Assessment as a Service",
    titlePre: "The",
    titleBrand: "CyfroSec",
    titlePost: "Platform",
    description:
      "A complete VaaS platform covering AI servers, networks, and infrastructure with AI-driven remediation.",
    tapHint: "Tap any node to explore.",
    items: [
      {
        title: "CyfroAgent",
        date: "Agent",
        content:
          "Lightweight agent that acts as your infrastructure's eyes and ears, executing scans, collecting host telemetry, and inventorying assets with outbound-only connectivity.",
        capabilities: [
          "Executes Network Discovery, Asset Discovery, and Service Fingerprinting scans",
          "Collects local host inventory including processes, services, routes, and ARP cache data",
          "Provides minimal-footprint telemetry and scan orchestration from monitored hosts",
          "Uses outbound-only connections so no inbound firewall openings are required",
        ],
        keyBenefits: [
          {
            title: "Lightweight by design",
            description:
              "Minimal CPU and memory overhead makes it safe to run continuously on production hosts.",
          },
          {
            title: "Secure transport",
            description:
              "Outbound-only connectivity keeps your firewall closed while the platform still receives scan data.",
          },
          {
            title: "Central to every scan",
            description:
              "Agents provide the execution layer for discovery, fingerprinting, and downstream AI analysis.",
          },
        ],
      },
      {
        title: "CyfroAI Insights",
        date: "AI Insights",
        content:
          "Automated post-scan analysis that produces an executive summary, re-ranks findings by effective risk, and recommends the next remediation action.",
        capabilities: [
          "Executive summaries generated automatically after scan intervals complete",
          "Prioritized risk lists that factor in exposure, reachability, and correlation",
          "Per-finding reasoning, report links, and recommended actions",
          "OS remediation commands where available",
        ],
        keyBenefits: [
          {
            title: "Less noise, faster triage",
            description:
              "High-volume findings are condensed into the issues most likely to reduce real risk first.",
          },
          {
            title: "Reachability-aware prioritization",
            description:
              "Effective risk accounts for exposure and network context, not just base CVSS severity.",
          },
          {
            title: "Actionable output",
            description:
              "Engineers get a clear summary, prioritized risks, and remediation guidance without manual analysis.",
          },
        ],
      },
      {
        title: "Asset Discovery",
        date: "Discovery",
        content:
          "Discovers hosts and devices with ARP sweeps, local inventory, and MAC vendor resolution to build an enriched picture of assets across your environment.",
        capabilities: [
          "ARP sweeps to identify active hosts on local networks",
          "Local process, service, route, and connection enumeration on agent hosts",
          "MAC vendor lookup for device classification and anomaly detection",
          "SMB/NetBIOS plus DHCP or LDAP enrichment where available",
        ],
        keyBenefits: [
          {
            title: "Inventory that reflects reality",
            description:
              "Compare documented assets against what the network and hosts actually reveal.",
          },
          {
            title: "Low-impact collection",
            description:
              "Discovery reads host and network signals with minimal overhead on monitored systems.",
          },
          {
            title: "Unexpected device detection",
            description:
              "Unrecognized hosts and anomalous MAC vendors surface quickly for follow-up.",
          },
        ],
      },
      {
        title: "CyfroAssistant",
        date: "Assistant",
        content:
          "AI-powered security analyst that answers natural-language questions about your scans, agents, vulnerabilities, and platform workflows.",
        capabilities: [
          "Natural-language queries over scan results, agents, findings, and AI insights",
          "Answers grounded in your actual account-group data and product documentation",
          "Conversational help for triage, summaries, and platform how-to questions",
          "Human-in-the-loop approvals for higher-risk actions",
        ],
        keyBenefits: [
          {
            title: "24/7 analyst access",
            description:
              "Teams can ask questions at any time without waiting for a specialist to respond.",
          },
          {
            title: "Faster investigations",
            description:
              "Get answers across agents, scans, and findings without hopping between pages and filters.",
          },
          {
            title: "Useful across roles",
            description:
              "Engineers, operators, and managers all get explanations in language they can act on.",
          },
        ],
      },
      {
        title: "Network Discovery",
        date: "Network",
        content:
          "Identifies open ports and services to drive downstream vulnerability detection and analysis across the infrastructure each agent can reach.",
        capabilities: [
          "Open port scanning in quick or full modes",
          "Service identification and TLS metadata collection",
          "Scheduled execution with support for multiple agents per scan",
          "Feeds service and exposure data into fingerprinting and AI insight pipelines",
        ],
        keyBenefits: [
          {
            title: "Continuous visibility",
            description:
              "Recurring scans surface newly opened ports and services as your environment changes.",
          },
          {
            title: "Service-level context",
            description:
              "Port data is enriched with protocol and TLS details to improve downstream analysis.",
          },
          {
            title: "Useful across segments",
            description:
              "Multi-agent execution helps validate reachability and firewall behavior from different vantage points.",
          },
        ],
      },
      {
        title: "Service Fingerprinting",
        date: "Fingerprint",
        content:
          "Assesses security posture by identifying known CVEs in installed packages and services, detecting common misconfigurations, and scanning for exposed secrets.",
        capabilities: [
          "Known CVE mapping for installed packages and detected services",
          "Misconfiguration checks covering TLS, storage, permissions, and default credentials",
          "Targeted secret scanning for API keys, private keys, tokens, and configuration leaks",
          "Evidence-backed findings with clear remediation guidance",
        ],
        keyBenefits: [
          {
            title: "Broad security coverage",
            description:
              "One scan surfaces vulnerabilities, misconfigurations, and exposed secrets together.",
          },
          {
            title: "Evidence with every finding",
            description:
              "Results include package details, file paths, or command output to support verification.",
          },
          {
            title: "Remediation-ready guidance",
            description:
              "Teams get the next patch, configuration, or credential-rotation action to take.",
          },
        ],
      },
      {
        title: "CyfroCompliance",
        date: "CyfroCompliance",
        content:
          "Assess controls using scan evidence that evaluates recent scan evidence against versioned control catalogs for frameworks such as GDPR, CCPA/CPRA, NIST CSF and SOC 2, and summarizes your posture by account group.",
        capabilities: [
          "Builds account-group compliance reports from recent Network Discovery, Asset Discovery, and Service Fingerprinting submissions",
          "Scores framework categories with finding counts, severity breakdowns, and evidence coverage",
          "Shows report metadata such as catalog provenance, evaluation mode, and scan data window",
          "Supports manual refresh and deeper drill-down from the full compliance page",
        ],
        keyBenefits: [
          {
            title: "Audit-ready visibility",
            description:
              "Category-level findings and catalog provenance make compliance reviews easier to verify and explain.",
          },
          {
            title: "Prioritized remediation",
            description:
              "Critical and high-severity issues surface clearly so teams can work from the most urgent compliance gaps first.",
          },
          {
            title: "Transparent scoring",
            description:
              "Evidence coverage and not-evaluable controls help distinguish real gaps from missing scan evidence.",
          },
        ],
      },
      {
        title: "CyfroCode",
        date: "Code Security",
        content:
          "Embedded SAST code-security workspace that connects your GitHub repositories, runs automated vulnerability scans, and generates AI-driven remediation patches ready for pull request review.",
        capabilities: [
          "GitHub App integration to sync repositories with auto-detected languages, frameworks, and tech indicators",
          "Queued scans per default branch with real-time status tracking from queued through completed",
          "Grouped issues and raw matches views with severity filters from Critical to Low",
          "One-click patch generation that exports an approved code change directly to a new GitHub branch",
        ],
        keyBenefits: [
          {
            title: "Fix code without leaving the platform",
            description:
              "Scan, review, and push remediation patches to GitHub from a single embedded workspace.",
          },
          {
            title: "AI context on every finding",
            description:
              "CyfroAssistant explains each vulnerability in plain language so any team member can understand and act on it.",
          },
          {
            title: "Precise, reviewable patches",
            description:
              "Generated diffs are scoped to the affected lines and land on a dedicated branch, ready for a standard pull request review.",
          },
        ],
      },
      {
        title: "CyfroTopology",
        date: "Topology",
        content:
          "An interactive map of your agents, assets, subnets and open ports, built from correlated discovery and fingerprinting evidence, so you can see how your environment connects and where risk sits.",
        capabilities: [
          "Maps agents, assets, subnets and open ports from Network Discovery, Asset Discovery and Service Fingerprinting results",
          "Filters by agent, subnet, time window or risk to focus on what matters",
          "Opens an asset to show its port evidence, fingerprint, AI insights and top risks",
          "Offers ring and force-directed layouts with full-screen exploration",
        ],
        keyBenefits: [
          {
            title: "See the whole environment",
            description:
              "One view of every discovered host and how it connects, instead of separate lists per scan.",
          },
          {
            title: "Risk in context",
            description:
              "Critical and AI-enriched assets stand out on the map, with their evidence one click away.",
          },
          {
            title: "Faster investigation",
            description:
              "Move from a node to its ports, services and insights without switching tools.",
          },
        ],
      },
    ],
  },

  platformArch: {
    badge: "Unified Architecture",
    titlePre: "One platform.",
    titleHighlight: "Every layer.",
    description:
      "Stop stitching together fragmented tools. CyfroSec ingests data from your entire environment and CyfroCode adds SAST code-security coverage, then analyzes it with our CyfroAI engine and outputs autonomous remediation and suggestions through CyfroAI Insight.",
    steps: [
      {
        title: "Continuous Discovery",
        description:
          "CyfroAgent scans across AI servers, network, and infrastructure assets in real time, while CyfroCode covers SAST code security in connected repositories.",
      },
      {
        title: "CyfroAI Engine",
        description:
          "Correlates CVEs, Misconfigurations and Secrets with actual exploitability and asset criticality to prioritize risk.",
      },
      {
        title: "Versatile Defense",
        description:
          "Generates clear, actionable remediation guidance and step-by-step suggestions that any team member can understand and act on to eliminate threats.",
      },
    ],
  },

  aiEngine: {
    badge: "CyfroAI Engine",
    titlePre: "Doesn't just detect.",
    titleHighlight: "Explains and recommends fixes.",
    description:
      "The CyfroAI Engine doesn't just find vulnerabilities, it explains why they matter, tells you what to fix first, and shows you exactly how to fix it.",
    capabilities: [
      {
        title: "Contextual Analysis and Correlation",
        description:
          "Goes beyond CVE scores. Correlates exploitability, asset criticality, and exposure to determine real-world risk.",
      },
      {
        title: "AI-Powered Explanations and Prioritization",
        description:
          "Every finding comes with an easy to understand explanation of why it matters, who is affected, and what to prioritize.",
      },
      {
        title: "Remediation Plans",
        description:
          "Generates step-by-step remediation guidance tailored to your environment. Includes commands, config changes, and clean steps.",
      },
      {
        title: "CyfroAssistant",
        description:
          "Ask questions in natural language and get instant answers about your security posture, scan settings, reports, or agents.",
      },
    ],
    chat: {
      assistantName: "CyfroAssistant",
      online: "Online",
      userMessage: "Analyze latest security scan.",
      analysisTitle:
        "Analysis: Latest Security Scan (Fingerprint + Asset Discovery)",
      scanWindowLabel: "Scan window",
      keyFindingsLabel: "Key findings",
      topVulnsLabel:
        "Top vulnerabilities (sampled highlights from the latest scan)",
      fixesLabel: "Notes on fixes and mitigations observed",
      totalVulns: "Total vulnerabilities (fingerprint): 1748",
      vuln1:
        "CVE-2023-6879 | CRITICAL | libaom3 | 3.6.0-1+deb12u2 | Title: aom: heap-buffer-overflow on frame size change",
      vuln2:
        "CVE-2025-7458 | CRITICAL | libsqlite3-0 | 3.40.1-2+deb12u2 | Title: sqlite: SQLite integer overflow",
      fix1: "Some critical/high CVEs show a fixed package version available (e.g., OpenSSL 3.0.18-1~deb12u2; libpng fixes for certain entries; h11 fixed to 0.16.0).",
      fix2: "Several high/severe issues in glibc family components (memalign overflow) and several Linux libc-dev entries currently have no listed fixes in this scan, indicating urgent patch-tracking is needed.",
    },
  },

  personas: {
    titlePre: "Who",
    titleHighlight: "CyfroSec",
    titlePost: "is for",
    subtitle:
      "Built for the people who actually manage infrastructure not just the security team.",
    items: [
      {
        title: "Network & IT Engineers",
        description:
          "Simple, actionable exposure insights without needing deep cybersecurity expertise. Fix issues with clear, step-by-step guidance.",
        highlight: "Actionable and easily understandable guidance",
      },
      {
        title: "IT Managers",
        description:
          "Executive summaries, compliance reports, and dynamic dashboards. Get visibility into your security posture at a glance.",
        highlight: "Correlation and summaries",
      },
      {
        title: "Security Teams",
        description:
          "Robust agent scanning, Infrastructure and Network coverage along with powerful CyfroAI Engine.",
        highlight: "Robust agent, CyfroAI Insights",
      },
      {
        title: "Decision Makers",
        description:
          "Cost-effective security ecosystem that scales with your business. Flexible licensing, easy deployment, and no vendor lock-in.",
        highlight: "Affordable, flexible deployment modes",
      },
    ],
  },

  outcomes: {
    title: "Security outcomes that matter",
    descriptionLine1: "Stop chasing every alert and finding.",
    descriptionLine2:
      "Start fixing the ones that actually put your business at risk.",
    items: [
      {
        title: "See Everything",
        description:
          "Get complete visibility across your attack surface. Discover code-security risks, assets, vulnerabilities, misconfigurations, and secrets across AI servers, network, and infrastructure assets.",
      },
      {
        title: "Prioritize What Matters",
        description:
          "Focus on the vulnerabilities that actually pose risk. Context-aware prioritization and correlation based on exploitability and impact (not just CVSS scores).",
      },
      {
        title: "Understand & Remediate Faster",
        description:
          "Accelerate your response with AI-powered remediation guidance, which could be understood from management executives to engineers.",
      },
    ],
  },

  highlights: {
    titlePre: "See the platform",
    titleHighlight: "in action",
    subtitle:
      "Powerful, purpose-built tools that give you the right information at the right time which are easily understandable and actionable for both security teams and IT operators.",
    clickToExpand: "Click to expand",
    items: [
      {
        title: "Contextual Findings & Prioritization",
        description:
          "Every finding comes with context: exploitability, exposure, affected assets, and remediation guidance along with prioritization.",
      },
      {
        title: "Dashboard",
        description:
          "Real-time visibility into security posture. Track your infrastructure security, and compliance status at a glance.",
      },
      {
        title: "Executive Summary",
        description:
          "An easily understandable summary of who is affected and what matters the most at a glance.",
      },
    ],
  },

  security: {
    titlePre: "Security &",
    titleHighlight: "CyfroCompliance",
    subtitle:
      "Built with security-first principles to protect your infrastructure and keep it updated.",
    items: [
      {
        title: "CyfroCompliance Tool",
        description:
          "Assess your infrastructure and its configurations against frameworks such as GDPR, CCPA/CPRA, NIST CSF and SOC 2.",
      },
      {
        title: "Data Residency",
        description:
          "Choose where your data lives between EU data protection compliant servers and On premise deployments.",
      },
      {
        title: "Role-Based Access Control",
        description:
          "Granular permissions and control according to user roles so that you know who has access to what.",
      },
      {
        title: "Audit",
        description:
          "User actions can be tracked to ensure strict guidelines and compliance within the organization.",
      },
      {
        title: "Flexibility for On Prem Deployment",
        description:
          "CyfroSec can be easily setup in your On Prem environment so that you have maximum control over the secure deployment.",
      },
      {
        title: "Reputable Data Sources",
        description:
          "The results from CyfroSec solutions have been referenced from reputable databases like NIST and other security data sources.",
      },
    ],
  },

  // Owl mascot speech in the homepage showcase, keyed by item title. Each line restates
  // the item's original description (kept above and archived in
  // work/docs/landing-page/showcase-copy.md); no new claims.
  showcase: {
    /** What the owl says after landing, before any icon is picked. */
    greeting: "Pick an icon, I'll explain it!",
    owlLines: {
      "Unified code-to-cloud intelligence":
        "Hoo! I keep watch from the first line of code all the way to production.",
      "AI-native prioritization and remediation":
        "I sort issues by context, then hand you PR-ready patches and one-click fixes.",
      "AI-assistant and AI-insights for all users":
        "Ask me about your security. I'll explain it in plain language, or give your executives the summary.",
      "Sovereign deployment":
        "Run me as SaaS, on-prem or hybrid, with GDPR and NIS2 checks built in.",
      "See Everything":
        "These big eyes see your whole attack surface: code, assets, vulnerabilities, misconfigurations and secrets across AI servers, network, and infrastructure assets.",
      "Prioritize What Matters":
        "Not every alert deserves a hoot. I rank by exploitability and impact, not just CVSS scores.",
      "Understand & Remediate Faster":
        "My AI-powered remediation guidance is clear for everyone, from executives to engineers, so you can act faster.",
      "CyfroCompliance Tool":
        "I check your infrastructure against frameworks like GDPR, CCPA/CPRA, NIST CSF and SOC 2.",
      "Data Residency":
        "Your data, your nest: keep it on EU data-protection compliant servers or on premise.",
      "Role-Based Access Control":
        "Every owl has a role. Granular permissions show exactly who has access to what.",
      "Audit":
        "I keep a record of user actions, so your guidelines and compliance stay on track.",
      "Reputable Data Sources":
        "My findings are referenced from reputable databases like NIST and other security data sources.",
    } as Record<string, string>,
  },

  archDetail: {
    exploreCity: "Explore the Full 3D City",
    exploreCityNote: "See how CyfroSec’s security capabilities connect in an interactive 3D city.",
    titlePre: "Platform",
    titleHighlight: "Architecture",
    subtitle:
      "A modern, scalable architecture designed for security at every layer.",
    sourceLabel: "Data Sources",
    processingLabel: "Processing",
    outputLabel: "Outputs",
    dataSources: [
      { label: "AI Infrastructure", sub: "Servers, Workstations, Containers" },
      { label: "Network", sub: "Assets, Subnets, Services" },
      {
        label: "CyfroCode",
        sub: "SAST code security for connected repositories",
      },
    ],
    processingSteps: [
      { title: "CyfroAgent", subtitle: "Lightweight Robust Agent" },
      { title: "Data Ingestion", subtitle: "Data Normalization & Cleaning" },
      {
        title: "CyfroAI Engine",
        subtitle: "Analysis Correlation & Prioritization",
      },
    ],
    outputs: [
      {
        label: "CyfroAI Insights",
        sub: "Explain, Prioritize, Correlate, Remediate",
      },
      {
        label: "CyfroAssistant",
        sub: "Convenient conversational AI bot with function calling",
      },
      {
        label: "CyfroCode",
        sub: "SAST scanning, AI explanations, and approval-gated patches",
      },
      {
        label: "CyfroCompliance",
        sub: "Run compliance checks on your infrastructure",
      },
      {
        label: "Dashboards, CyfroTopology diagram & Reports",
        sub: "Dynamic visualizations & audit ready reporting",
      },
    ],
  },

  finalCta: {
    titlePre: "Secure everything from Code to Cloud.",
    titleHighlight: "From Exposure Discovery to Remediation.",
    description:
      "See CyfroSec in action with a live demo, or talk to our team about your specific needs.",
    cta: "Contact Sales",
  },

  footer: {
    categories: {
      product: "Product",
      solutions: "Solutions",
      company: "Company",
      trustLegal: "Trust & Legal",
    },
    contactEmail: "Contact",
    legalEmail: "Legal enquiries",
    madeIn: "Made in the EU",
    allRightsReserved: "All rights reserved.",
  },

  pages: {
    solutionsLabel: "Solutions",
    problemLabel: "The problem",
    capabilitiesLabel: "Capabilities",
    howItWorksLabel: "How it works",
    useCasesLabel: "Use Cases",
    sourceTypesLabel: "Source Types",
    coverageLabel: "Coverage",
    detectionProcessLabel: "Detection Process",
    gettingStartedLabel: "Getting Started",
    findingsLabel: "Findings & AI Explanations",
    whatYouGetLabel: "What you get",
    learnMore: "Learn more",
    clickToExpand: "Click to expand",
    exampleQuery: "Example query",

    networkDiscovery: {
      heroTitle: "Network Discovery",
      heroSubtitle:
        "Identifies open ports and services across your infrastructure to drive vulnerability detection and analysis.",
      problemTitle: "You can't secure what you can't see",
      problemP1:
        "Most security teams have a partial picture of their network at best. Infrastructure changes constantly. New services are spun up, ports are opened, and configurations drift. By the time a quarterly scan runs, the attack surface has already changed.",
      problemP2:
        "CyfroSec Network Discovery runs continuously, so your port and service inventory is always current. Every new exposure is detected and fed into the vulnerability pipeline automatically, not weeks later.",
      problemScenarios: [
        {
          label: "New port opened without a change ticket",
          impact: "Detected within the next scan interval",
        },
        {
          label: "Service version updated mid-cycle",
          impact: "Fingerprinting pipeline re-evaluates automatically",
        },
        {
          label: "Firewall rule misconfigured",
          impact: "Multi-agent scans reveal the asymmetry",
        },
      ],
      capabilitiesTitle: "What Network Discovery does",
      capabilities: [
        {
          title: "Open Port Detection",
          description:
            "Fast scanning for open ports across your network with reduced noise and high performance. Choose Full mode for comprehensive coverage or Quick mode for targeted, low-overhead runs.",
        },
        {
          title: "Service Identification",
          description:
            "Maps open ports to known services and protocols, providing the service layer context needed to drive downstream vulnerability detection and analysis.",
        },
        {
          title: "Pipeline Integration",
          description:
            "Automatically feeds discovered port and service data into the Service Fingerprinting and Vulnerability pipelines so every finding is enriched without manual handoff.",
        },
        {
          title: "Scheduled Scanning",
          description:
            "Runs on a configurable recurring schedule (hourly to daily) for detailed visibility.",
        },
        {
          title: "Multi-Agent Support",
          description:
            "Assign multiple CyfroAgents to a single scan to cover different network segments or provide redundancy if one agent goes offline.",
        },
      ],
      howItWorksTitle: "From trigger to insight in one pipeline",
      howItWorksBody:
        "Every scan follows the same automated path from the initial trigger through port sweeping, service detection, and finally AI-powered prioritization. No manual steps required.",
      pipeline: [
        {
          step: "01",
          title: "Scan Trigger",
          body: "The scan fires on its configured schedule. One or more CyfroAgents can run the scan.",
        },
        {
          step: "02",
          title: "Port Sweep",
          body: "Agents sweep the target host or CIDR range across the selected port range. Full mode scans all common ports; Quick mode targets a specific protocol for faster results.",
        },
        {
          step: "03",
          title: "Service Detection",
          body: "Open ports are matched to known services. Protocol probing provides additional service context.",
        },
        {
          step: "04",
          title: "Pipeline Feed",
          body: "Enriched findings are passed automatically to the Service Fingerprinting and vulnerability analysis pipelines for deeper assessment.",
        },
        {
          step: "05",
          title: "AI Insights",
          body: "Cyfro AI Insights generates a prioritized risk summary from the scan results, highlighting the most impactful exposed services.",
        },
      ],
      useCasesTitle: "When teams rely on Network Discovery",
      useCases: [
        {
          title: "Continuous Attack Surface Monitoring",
          body: "Run Network Discovery on a recurring schedule to detect new services the moment they appear, before attackers do.",
        },
        {
          title: "Change Detection",
          body: "Compare scan snapshots over time to catch unauthorized port openings, newly exposed services, or unexpected topology changes.",
        },
        {
          title: "Pre-Deployment Verification",
          body: "Run a Quick scan after infrastructure changes to confirm that only intended ports and services are reachable from the network.",
        },
        {
          title: "Firewall Rule Validation",
          body: "Assign agents across different network segments to verify that firewall rules are enforced and detect asymmetry between what should be blocked and what is reachable.",
        },
      ],
      // Redesign (Oct 2026): interface labels and the illustration. Product copy above is unchanged.
      heroVisualCaption: "Scan Status in the CyfroSec dashboard: port scans running and completed.",
      logTitle: "Scenario log",
      logEvent: "Change",
      logResult: "CyfroSec",
      capabilityDetails: [
        "Full mode · Quick mode",
        "Port → service · Protocol context",
        "→ Service Fingerprinting · → Vulnerability pipeline",
        "Hourly to daily",
        "Network segments · Redundancy",
      ],
      pipelineNavLabel: "Pipeline stages",
      vizLabel: "Illustration",
      vizTitle: "Schedule a scan in a few fields",
      vizBody:
        "A working copy of Scans Setup. Choose Full or Quick (Quick adds a TCP or UDP protocol), set the host or subnet, pick one or more agents and an interval from hourly to daily. Scans then run on that schedule.",
      vizAgent: "CyfroAgent",
      vizRange: "Port sweep · 192.0.2.0/24",
      vizNoPorts: "No open ports",
      vizNew: "New since last run",
      vizSummaryTitle: "Run summary",
      vizSummary: ["Hosts swept", "Open ports", "Services identified", "New since last run"],
      vizHandoff: "Passed to Service Fingerprinting and vulnerability analysis",
      vizCaption: "Illustration. Example scan and agents; creating a scan here only adds an example row.",
    },

    assetDiscovery: {
      heroTitle: "Asset Discovery",
      heroSubtitle:
        "Performs ARP sweeps, local process enumeration, and MAC vendor lookups to build a complete, enriched inventory of every device across your environment, with minimal overhead and continuous updates.",
      problemTitle: "Unknown assets are unmanaged risks",
      problemP1:
        "Every asset register becomes stale the moment infrastructure changes. Devices join the network, containers spin up, and legacy hosts linger.",
      problemP2:
        "These unknown assets may carry vulnerabilities that never get patched because nobody knows they exist.",
      problemP3:
        "Asset Discovery continuously sweeps your network using multiple discovery methods so your inventory reflects reality, not what was documented six months ago.",
      problemScenarios: [
        {
          label: "Unregistered device connects to network",
          impact: "Discovered in next ARP sweep",
        },
        {
          label: "Legacy server missed in CMDB audit",
          impact: "MAC vendor + SMB enumeration surfaces it",
        },
        {
          label: "Container workload spins up on new subnet",
          impact: "Process enumeration captures it locally",
        },
      ],
      capabilitiesTitle: "Multiple methods, one complete inventory",
      capabilities: [
        {
          title: "ARP Discovery",
          description:
            "Crafted ARP probes sweep your network to identify all active hosts across subnets, catching devices that don't respond to ICMP or DNS queries.",
        },
        {
          title: "Local Host Inventory",
          description:
            "Enumerates running processes, active services, local connections, routing tables, and ARP caches directly on the host for a complete low-overhead inventory.",
        },
        {
          title: "MAC Vendor Resolution",
          description:
            "Looks up MAC address vendor prefixes to classify device and flag unrecognized hardware.",
        },
        {
          title: "SMB / NetBIOS Enumeration",
          description:
            "Discovers hostnames, and metadata across the network for full environment visibility.",
        },
        {
          title: "DHCP & AD Enrichment",
          description:
            "Enriches discovered assets with data from DHCP logs and Active Directory / LDAP for richer host identity, ownership, and classification context.",
        },
        {
          title: "Low-Impact Design",
          description:
            "Reads local connections, running services, routing tables, and ARP caches with minimal CPU and memory overhead so that they are safe to run continuously on production hosts.",
        },
      ],
      howItWorksTitle: "From sweep to enriched inventory",
      howItWorksBody:
        "Asset Discovery combines active network probing with local host telemetry and external enrichment sources to produce the most complete asset picture possible automatically, on every scan run.",
      pipeline: [
        {
          step: "01",
          title: "ARP Sweep",
          body: "Sends crafted ARP probes across the target subnet to build an initial map of active hosts, including those invisible to standard ping sweeps.",
        },
        {
          step: "02",
          title: "Host Inventory",
          body: "Enumerates processes, services, routing tables, and ARP caches on the agent host for a complete local inventory picture.",
        },
        {
          step: "03",
          title: "Name & Vendor Resolution",
          body: "Resolves MAC address vendors and performs SMB/NetBIOS enumeration to assign device classifications and hostnames to discovered IPs.",
        },
        {
          step: "04",
          title: "Enrichment",
          body: "Pulls additional context from DHCP lease history and Active Directory / LDAP where configured, adding owner, department, and hostname metadata.",
        },
        {
          step: "05",
          title: "AI Insights",
          body: "Asset Discovery findings feed into Cyfro AI Insights, which flags unrecognized devices, MAC anomalies, and unexpected hosts with prioritized risk context.",
        },
      ],
      useCasesTitle: "When teams rely on Asset Discovery",
      useCases: [
        {
          title: "Shadow IT Detection",
          body: "Discover devices on your network that were never registered like rogue access points, personal devices, or forgotten servers that create hidden exposure.",
        },
        {
          title: "Inventory Accuracy",
          body: "Reconcile your CMDB or asset register against what Asset Discovery actually finds. Gaps represent unmanaged, potentially vulnerable hosts.",
        },
        {
          title: "Subnet Segmentation Validation",
          body: "Verify that network segmentation is working as intended by comparing what hosts are visible from each agent's vantage point.",
        },
        {
          title: "Device Classification",
          body: "MAC vendor resolution and SMB enumeration give you device type context which are useful for scoping vulnerability assessments and patch management.",
        },
      ],
      // Redesign (Oct 2026): interface labels and illustrations. Product copy above is unchanged.
      heroVisualCaption: "The Asset Discovery panel in the CyfroSec dashboard.",
      problemColSituation: "Situation",
      problemColResult: "How Asset Discovery surfaces it",
      pipelineNavLabel: "Discovery stages",
      illustrationNote: "Illustration. Example hosts and addresses (documentation ranges), not real scan data.",
      stageViz: {
        subnet: "192.0.2.0/24",
        activeHosts: "active hosts",
        noReply: "no reply",
        agentHost: "Agent host",
        hostInventory: ["Processes", "Services", "Routes", "ARP cache"],
        hostname: "Hostname",
        vendor: "MAC vendor",
        resolvedVia: "Resolved via",
        owner: "Owner",
        department: "Department",
        whereConfigured: "Added where DHCP or Active Directory / LDAP is configured",
        feedsInto: "Feeds Cyfro AI Insights",
        insightTypes: ["Unrecognized devices", "MAC anomalies", "Unexpected hosts"],
      },
      showcaseLabel: "Asset inventory",
      showcaseTitle: "Every discovered device, in your report and on the map",
      showcaseBody:
        "Working copies of the Report \u201cAssets\u201d tab and the CyfroTopology map. Open a row to see its asset evidence, or switch to Topology to see how hosts connect to subnets and agents.",
      viewsLabel: "Inventory view",
      viewInventory: "Inventory",
      viewTopology: "Topology",
      columns: ["Host", "IP address", "Vendor", "Status"],
      fields: {
        hostname: "Hostname",
        ip: "IP address",
        mac: "MAC address",
        vendor: "Vendor",
        type: "Device type",
        services: "Services",
        resolvedVia: "Discovered via",
        owner: "Owner",
        status: "Status",
      },
      statusIdentified: "Identified",
      statusReview: "Review",
      unresolved: "Not resolved",
      notEnriched: "Not enriched",
      noServices: "Collected on agent hosts only",
      selectedAsset: "Selected asset",
      ctaTitle: "Know what's connected.",
      ctaTitleAccent: "Understand what's exposed.",
    },

    // Solution pages added Oct 2026 for CyfroAgent, CyfroTopology and CyfroCompliance. Product copy comes
    // from solution.items (homepage); these are interface labels and clearly marked illustrations only.
    cyfroAgentPage: {
      heroVisualCaption: "The Agent Status panel in the CyfroSec dashboard.",
      capabilitiesLabel: "What it does",
      designLabel: "Designed for production hosts",
      diagramLabel: "Deploy an agent",
      diagramTitle: "One Docker command per host",
      diagramBody:
        "A working copy of the CyfroAgent page. Generate a one-time token, name the agent and its location, and the install command updates as you type. The encryption key is mounted from a protected file, never passed on the command line.",
      diagramNote: "Illustration. Example agents and values; no token or key is generated here.",
      yourNetwork: "Your network",
      hostLabel: "Host with CyfroAgent",
      platformLabel: "CyfroSec platform",
      outbound: "Outbound only",
      inbound: "No inbound ports opened",
      localInventory: "Local host inventory",
      scansLabel: "Scan types",
      learnMore: "Learn more",
    },
    cyfroTopologyPage: {
      mapLabel: "Illustration",
      mapTitle: "Explore the map",
      mapBody:
        "A working copy of the CyfroTopology workspace. Search, filter by agent, subnet, risk or time window, switch between the four layouts, and open an asset to see its port evidence, fingerprint, AI insights and top risks. Hosts, addresses and findings are examples, not real scan data.",
      mapNote: "Illustration. Example agents, subnets, assets and findings (documentation address ranges).",
      filtersLabel: "Filters",
      agentFilter: "Agent",
      subnetFilter: "Subnet",
      riskFilter: "Risk",
      all: "All",
      criticalOnly: "Critical only",
      layoutLabel: "Layout",
      ring: "Ring",
      force: "Force-directed",
      openPorts: "Open ports",
      fingerprint: "Fingerprint",
      aiInsight: "AI insight",
      topRisks: "Top risks",
      noRisks: "None in this example",
      selectHint: "Select an asset on the map.",
      sourcesLabel: "Built from",
      capabilitiesLabel: "Capabilities",
      capabilitiesTitle: "What CyfroTopology does",
      benefitsLabel: "Why it helps",
      benefitsTitle: "When teams rely on CyfroTopology",
    },
    cyfroCompliancePage: {
      reportLabel: "Illustration",
      reportTitle: "A report you can verify",
      reportBody:
        "A working copy of the CyfroCompliance page. Switch frameworks, then expand a category to see its safeguards: each control is scored as passing, partial or failing against recent scan evidence, or flagged for review when evidence is missing. Controls are the platform's own technical catalog; results are examples, not a real assessment.",
      reportNote:
        "Illustration. Example results against the real technical catalog; not a real assessment, audit opinion or certification.",
      frameworksLabel: "Framework",
      category: "Category",
      score: "Score",
      findings: "Findings",
      coverage: "Evidence coverage",
      notEvaluable: "Not evaluable: no scan evidence in the data window",
      severity: ["Critical", "High", "Medium", "Low"],
      meta: { catalog: "Control catalog", mode: "Evaluation mode", window: "Scan data window", group: "Account group" },
      metaValues: { catalog: "Versioned catalog (example)", mode: "Evidence-based (example)", window: "Recent submissions (example)", group: "Production (example)" },
      capabilitiesLabel: "Capabilities",
      capabilitiesTitle: "What CyfroCompliance does",
      benefitsLabel: "Why it helps",
      benefitsTitle: "When teams rely on CyfroCompliance",
      sourcesLabel: "Evidence from",
    },

    serviceFingerprinting: {
      heroTitle: "Service Fingerprinting",
      heroSubtitle:
        "Assesses your security posture by identifying known CVEs in installed packages and services, detecting common misconfigurations, and scanning for exposed secrets along with evidence and actionable remediation steps for every finding.",
      problemTitle: "Open ports don't tell the whole story",
      problemP1:
        "Knowing that port 443 is open tells you almost nothing about your actual risk. The real questions are: What version is running? Is it patched? Are there secrets in the config? Are the TLS settings secure?",
      problemP2:
        "Service Fingerprinting goes beneath the network layer to assess what is actually installed and configured on your hosts, turning raw port data into actionable vulnerability intelligence.",
      problemScenarios: [
        {
          label: "Outdated package with known CVE",
          impact: "Mapped to CVSS score and remediation step",
        },
        {
          label: "Hardcoded API key in config file",
          impact: "Detected with file path as evidence",
        },
        {
          label: "Weak TLS cipher on HTTPS service",
          impact: "Flagged in misconfiguration audit",
        },
      ],
      coverageTitle: "What gets checked",
      whatIsChecked: [
        {
          title: "Known CVEs",
          description:
            "Maps installed package and service versions against vulnerability databases and advisories to surface known exposures with CVSS scores and remediation guidance.",
        },
        {
          title: "Misconfigurations",
          description:
            "Detects weak TLS ciphers, overly permissive storage buckets, default credentials, and other infrastructure configuration issues that expose risk.",
        },
        {
          title: "Exposed Secrets",
          description:
            "Scans code and configuration files for hardcoded API keys, private keys, tokens, and other sensitive credentials using targeted detectors and regex patterns.",
        },
        {
          title: "Package Inventory",
          description:
            "Collects a complete software bill of materials (SBOM) from hosts and images which are the foundation for accurate CVE mapping and dependency tracking.",
        },
        {
          title: "TLS & Certificate Checks",
          description:
            "Validates certificate expiry, cipher strength, and protocol version across all detected HTTPS and TLS-secured services.",
        },
        {
          title: "Configuration Audits",
          description:
            "Runs structured configuration checks against common services such as databases, web servers, SSH to identify insecure default settings.",
        },
      ],
      detectionTitle: "From collection to prioritized finding",
      detectionBody:
        "Every Service Fingerprinting scan follows a structured pipeline from collecting raw software inventory through vulnerability mapping and misconfiguration checks, all the way to AI-prioritized findings your team can act on immediately.",
      detectionSteps: [
        {
          step: "01",
          title: "Fingerprinting",
          body: "Collects package lists, service versions, and signatures from hosts and container images to build a complete software inventory.",
        },
        {
          step: "02",
          title: "Vulnerability Mapping",
          body: "Matches every package and service version against CVE databases and security advisories. Each match produces a finding with CVSS score and description when available.",
        },
        {
          step: "03",
          title: "Misconfiguration Checks",
          body: "Runs configuration audits and TLS/certificate checks. Findings cover cipher suites, certificate expiry, permission settings, and default credentials.",
        },
        {
          step: "04",
          title: "Secrets Scanning",
          body: "Runs targeted detectors and regex checks across code and configuration artifacts. Matches are reported with the file path and surrounding context as evidence.",
        },
        {
          step: "05",
          title: "Evidence & Remediation",
          body: "Every finding includes clear evidence like file path, package details, or command output alongside actionable remediation steps like patch, config change, or credential rotation.",
        },
        {
          step: "06",
          title: "AI Prioritization",
          body: "Cyfro AI Insights re-ranks findings by effective risk using exposure correlation and reachability, so your team focuses on what matters most, not just the highest CVSS score.",
        },
      ],
      useCasesTitle: "When teams rely on Service Fingerprinting",
      useCases: [
        {
          title: "Vulnerability Management",
          body: "Get a continuous, up-to-date view of CVEs in your installed packages and services, mapped to real assets, not just a theoretical software list.",
        },
        {
          title: "Secret Sprawl Detection",
          body: "Find hardcoded credentials before attackers do. Service Fingerprinting scans configuration files, environment files, and code artifacts across your fleet.",
        },
        {
          title: "CyfroCompliance Hardening",
          body: "Identify configuration drift against security baselines (weak TLS, default credentials, overly permissive settings) and produce evidence for compliance audits.",
        },
        {
          title: "Patch Prioritization",
          body: "Know which CVEs are exploitable and reachable from outside your network, so patch schedules are driven by actual risk rather than scanner severity alone.",
        },
      ],
    },

    cyfroAiInsights: {
      heroTitle: "Cyfro AI Insights",
      heroSubtitle:
        "The Cyfro AI Engine receives raw findings alongside network topology context to produce prioritized, actionable security intelligence your team can act on immediately.",
      problemTitle: "CVSS scores don't reflect your environment",
      problemP1:
        "Traditional security tools produce long lists of findings sorted by CVSS, a static score that knows nothing about your network topology, which services are actually reachable, or which assets are business-critical.",
      problemP2:
        "Cyfro AI Insights re-ranks every finding using your actual infrastructure context like exposure, reachability, and correlation, so engineers spend time on what genuinely reduces risk, not what scores highest on paper.",
      problemScenarios: [
        {
          label: "High CVSS score on isolated internal server",
          impact: "Effective Risk downgraded, not reachable",
        },
        {
          label: "Medium CVSS score on internet-facing service",
          impact: "Effective Risk elevated, confirmed exposed",
        },
        {
          label: "200+ raw findings from service fingerprinting scan",
          impact: "AI surfaces top 5 that actually matter",
        },
      ],
      outputsTitle: "Two outputs, every scan",
      outputs: [
        {
          title: "Executive Summary",
          description:
            "An easily understandable overview of the most important findings from each scan run, written for both engineers and executives.",
          details: [
            "Overall security posture in plain language",
            "Most significant findings and their real-world impact",
            "Patterns and correlations across multiple findings",
            "CVE IDs linked directly to the full report entry",
          ],
        },
        {
          title: "Prioritized Risk List",
          description:
            "Vulnerabilities re-ranked using exposure correlation and network reachability and not just raw CVSS score, so your team always knows what to fix first.",
          details: [
            "AI-assigned priority rank per finding (1 = highest)",
            "Effective risk adjusted for exposure and reachability",
            "Reachability confidence score shown as a bar from 0 to 100%",
            "OS-specific remediation commands ready to run",
          ],
        },
      ],
      riskCardTitle: "Every finding, fully explained",
      riskCardSubtitle:
        "Each prioritized risk card gives you complete context, not just a severity badge.",
      riskCardFields: [
        {
          field: "Rank",
          desc: "AI-assigned priority order: 1 is the highest risk finding in this scan.",
        },
        {
          field: "Base Severity",
          desc: "Original scanner severity: Critical / High / Medium / Low.",
        },
        {
          field: "Effective Risk",
          desc: "AI-adjusted severity after factoring in network exposure and reachability.",
        },
        {
          field: "Reachable badge",
          desc: "Animated badge shown when the finding is confirmed reachable from outside your local network.",
        },
        {
          field: "Exposure status",
          desc: "Exposed (red), Local Only (amber), or Unconfirmed (blue).",
        },
        {
          field: "Reasoning & Context",
          desc: "AI explanation of why this finding was prioritized, including infrastructure-specific context.",
        },
        {
          field: "Recommended Action",
          desc: "The single most important remediation step, in plain language.",
        },
        {
          field: "OS Remediation Commands",
          desc: "Ready-to-run shell commands for patching, broken out by OS where available.",
        },
      ],
      sourcesTitle: "Insights across all scan types",
      sources: [
        {
          type: "Network Discovery",
          description:
            "Insights on exposed services, open ports, and CVEs mapped to detected service versions and network topology.",
        },
        {
          type: "Asset Discovery",
          description:
            "Insights from host and device discovery: unrecognized devices, MAC vendor anomalies, and unexpected hosts on the network.",
        },
        {
          type: "Service Fingerprinting",
          description:
            "Insights from package versions, host-level CVEs, misconfigurations, TLS issues, and detected secrets.",
        },
      ],
      useCasesTitle: "When teams rely on Cyfro AI Insights",
      useCases: [
        {
          title: "Triage Without the Noise",
          body: "Instead of reviewing hundreds of raw scan findings, start with the AI-ranked top risks. The most impactful, reachable issues surface immediately.",
        },
        {
          title: "Executive Reporting",
          body: "The Executive Summary gives non-technical stakeholders a clear picture of security posture after every scan with no manual report writing required.",
        },
        {
          title: "Reachability-Aware Patching",
          body: "Know which CVEs are actually reachable from outside your network before scheduling patch windows. Focus engineering time where it reduces real exposure.",
        },
        {
          title: "Faster MTTR",
          body: "OS-specific remediation commands are included with every prioritized finding so that engineers can act immediately without research or context switching.",
        },
      ],
    },

    cyfroAssistant: {
      heroTitle: "CyfroAssistant",
      heroSubtitle:
        "Your AI-powered security analyst, available 24/7 inside the CyfroSec Portal. Understands your specific infrastructure: agents, scan results, vulnerabilities, topology and lets you query it all in natural language.",
      betaBadge: "Beta ",
      problemTitle: "Security data exists. Getting answers is hard.",
      problemP1:
        "Your scan results, agent telemetry, and vulnerability findings are all there but getting a specific answer means navigating dashboards, applying filters, and cross-referencing reports. That takes time which most teams don't have.",
      problemP2:
        "CyfroAssistant turns your security data into a conversational interface. Ask any question in plain English and get an answer grounded in your actual infrastructure instantly.",
      problemScenarios: [
        {
          label: '"Which hosts have critical CVEs?"',
          impact: "Answer in seconds from your scan data",
        },
        {
          label: '"Summarise this week\'s security posture"',
          impact: "Executive summary generated automatically",
        },
        {
          label: '"How do I register a new agent?"',
          impact: "Answered from product docs instantly",
        },
      ],
      suggestionsTitle: "Start with a suggestion or ask anything",
      suggestionsBody:
        "When you open CyfroAssistant, four quick-start cards are ready to go. Click any card to start function immediately, or type your own question in the chat box.",
      suggestionCards: [
        {
          label: "Analyze latest security scan",
          desc: "Retrieves and summarises your most recent scan results",
        },
        {
          label: "Show security insights",
          desc: "Summarises AI-generated insights from recent scans",
        },
        {
          label: "List active agents",
          desc: "Shows all currently online CyfroAgents in your account group",
        },
        {
          label: "Get scan summary",
          desc: "Provides a high-level overview of scan coverage and findings",
        },
      ],
      featuresTitle: "Built for how security teams actually work",
      features: [
        {
          title: "Real-time Streaming",
          description:
            "Responses stream token-by-token as the assistant thinks, works, and generates. Live status badges: Thinking, Working, Generating show exactly what is happening.",
        },
        {
          title: "Human-in-the-Loop Approvals",
          description:
            "For higher-risk or write operations, the assistant pauses and presents an approval card with risk level, what will happen, and Approve / Deny controls before proceeding.",
        },
        {
          title: "Workspace Panel",
          description:
            "A collapsible side panel shows live task progress, generated artifacts, and raw tool outputs. Full auditability of every action the assistant took in your conversation.",
        },
        {
          title: "Multi-language Support",
          description:
            "Ask questions and receive guidance in the language your team uses while keeping the same infrastructure context, scan awareness, and approval flow.",
        },
        {
          title: "Plan Mode",
          description:
            "For multi-step requests, CyfroAssistant can break the work into an ordered plan, explain what it will do next, and execute each task only after user approval.",
        },
      ],
      useCasesTitle: "When teams rely on CyfroAssistant",
      useCases: [
        {
          title: "Fleet-Wide Queries in Seconds",
          body: 'Ask "Show me all servers with open SSH ports" and get a result across your entire agent fleet no dashboards to navigate, no filters to configure.',
        },
        {
          title: "Instant Executive Summaries",
          body: "Ask for a security posture summary and get a plain-language report suitable for stakeholders which are generated from your actual scan data, not a template.",
        },
        {
          title: "Guided Triage",
          body: "Walk through your highest-risk findings interactively. Ask follow-up questions, drill into specific hosts, and get remediation steps without leaving the conversation.",
        },
        {
          title: "On-Demand How-To",
          body: "Ask questions like how to create a scan, what permissions a role has, how to register an agent and get accurate answers from the product instantly.",
        },
      ],
    },

    cyfroCode: {
      heroTitle: "CyfroCode",
      heroSubtitle:
        "A comprehensive SAST code-security workspace embedded directly within CyfroSec. Connect your GitHub repositories, run automated security scans, and generate AI-driven remediation patches, all without leaving the platform.",
      problemTitle: "Code vulnerabilities found late cost the most to fix",
      problemP1:
        "Most teams scan code in separate, disconnected tools, or not at all. Findings are emailed in reports, triaged in spreadsheets, and patched weeks after introduction. By then, the code is in production.",
      problemP2:
        "CyfroCode brings repository scanning, AI-powered analysis, and patch generation into the same platform you already use for infrastructure and endpoint security. One platform, one workflow, zero context-switching.",
      problemP3:
        "Developers and security teams share a single source of truth, from the moment a vulnerability is detected to the moment a fix is merged.",
      problemScenarios: [
        {
          label: "Vulnerability introduced in a dependency update",
          impact: "Detected on next queued scan",
        },
        {
          label: "Critical finding buried in a long report",
          impact: "Surfaced with AI context and severity filter",
        },
        {
          label:
            "Development code needs a fix but the team lacks security expertise",
          impact:
            "Patch generated by CyfroAI Engine, ready for human review before GitHub push",
        },
      ],
      capabilitiesTitle: "Everything from repository to remediation",
      capabilities: [
        {
          title: "GitHub App Integration",
          description:
            "Connect your organisation's GitHub account in a single authorisation flow. CyfroSec installs as a GitHub App and automatically syncs every repository you grant access to.",
        },
        {
          title: "Programming Languages Support",
          description:
            "Python, JavaScript, TypeScript, Java, Go, and C# are supported for CyfroCode SAST security scanning.",
        },
        {
          title: "Rich Repository Metadata",
          description:
            "Each synced repository surfaces its default branch, auto-detected languages and frameworks, and tech indicators for Docker, Terraform, and GitHub Actions. No manual tagging required.",
        },
        {
          title: "One-Click Security Scans",
          description:
            "Queue a scan against any repository's default branch with a single click. Scans progress through queued → running → completed states and are tracked in the Recent Scans panel.",
        },
        {
          title: "Grouped Issues & Raw Matches",
          description:
            "View findings as deduplicated grouped issues by vulnerability type, or switch to raw matches to inspect every affected line of code individually. Both views are available side by side.",
        },
        {
          title: "AI Explanations & Remediation",
          description:
            "CyfroAssistant automatically explains each vulnerability in plain language, providing contextual reasoning for why it is a risk and step-by-step remediation guidance on demand.",
        },
        {
          title: "Automated Patch Proposals",
          description:
            "For supported vulnerabilities, generate an AI-driven code patch, review the diff in-browser, and approve it to push a ready-to-merge branch directly back to GitHub.",
        },
        {
          title: "Dead-Code Detection",
          description:
            "Surface unused code paths and code-health blind spots during repository analysis so teams can reduce maintenance risk alongside security remediation.",
        },
        {
          title: "Logic Map & Mind Map",
          description:
            "Visualize how files, functions, classes, endpoints, and workflows connect, with AI-authored endpoint summaries layered on top for faster understanding.",
        },
      ],
      howItWorksTitle: "From GitHub connection to merged fix",
      howItWorksBody:
        "CyfroCode handles the entire lifecycle through a single, unified workflow inside CyfroSec: connecting your repositories, running scans, surfacing AI-explained findings, and pushing approved patches back to GitHub.",
      pipeline: [
        {
          step: "01",
          title: "Connect GitHub",
          body: "Authorise the CyfroSec GitHub App from the CyfroCode dashboard. Repositories are synced automatically once the app is installed on your organisation.",
        },
        {
          step: "02",
          title: "Sync Repositories",
          body: "CyfroSec reads your repository list and enriches each entry with language detection, framework identification, and tech stack badges for Docker, Terraform, and GitHub Actions.",
        },
        {
          step: "03",
          title: "Queue a Scan",
          body: "Select any repository and click Queue Scan. The scan targets the default branch and is processed by the CyfroAI Engine, which checks for known vulnerability patterns.",
        },
        {
          step: "04",
          title: "Review Findings",
          body: "Once complete, open the scan detail page to explore metrics, apply severity filters, and drill into individual findings with source file, affected lines, and AI-generated context.",
        },
        {
          step: "05",
          title: "Generate & Approve a Patch",
          body: "Click Generate Patch on any supported finding. Review the proposed diff, approve to push a remediation branch to GitHub, or suppress false positives to keep your results clean.",
        },
      ],
      findingsTitle: "Deep context for every vulnerability",
      findingsP1:
        "Each scan result goes beyond a list of CVEs. CyfroCode presents findings in two complementary views: grouped issues deduplicated by vulnerability type, and raw matches showing every specific line of code affected.",
      findingsP2:
        "Severity filters let you focus on what matters. Every finding card includes the source file and line reference, an AI-generated explanation of the vulnerability in plain language, and expandable remediation guidance for manual mitigation.",
      findingsRows: [
        {
          label: "Metrics Overview",
          desc: "Total findings, risk scores, and scan duration at a glance",
        },
        {
          label: "Grouped Issues",
          desc: "Deduplicated by vulnerability type for efficient triage",
        },
        {
          label: "Raw Matches",
          desc: "Every affected file and line, unfiltered",
        },
        {
          label: "Severity Filters",
          desc: "Narrow from Critical to Low in one click",
        },
        {
          label: "AI Explanation",
          desc: "Plain-language summary of why each issue is a risk",
        },
        {
          label: "Remediation Guidance",
          desc: "Expandable manual mitigation steps per finding",
        },
      ],
      useCasesTitle: "When teams rely on CyfroCode",
      useCases: [
        {
          title: "Shift-Left Security",
          body: "Surface vulnerabilities during development rather than post-deployment. Developers get actionable findings and AI-generated fixes without leaving the CyfroSec portal.",
        },
        {
          title: "Continuous Repository Audits",
          body: "Re-queue scans after every major merge or release to maintain a continuously updated picture of your code security posture across all connected repositories.",
        },
        {
          title: "Friction-Free Remediation",
          body: "Approved patches are pushed directly to a new GitHub branch, ready for a Pull Request review. No context-switching, no manual patch authoring, no copy-pasting diffs.",
        },
        {
          title: "False Positive Management",
          body: "Suppress findings that represent accepted risk or known false positives. Suppressed issues are excluded from future scan results to keep noise low and signal high.",
        },
      ],
    },

    productsOverview: {
      overviewLabel: "Platform Overview",
      heroTitle: "One platform.",
      heroTitleAccent: "Complete security visibility.",
      heroSubtitle:
        "CyfroSec continuously discovers assets, analyzes vulnerabilities, misconfigurations, and secrets, and provides AI-driven remediation guidance across your infrastructure.",
      capabilitiesLabel: "Core Capabilities",
      capabilitiesTitle: "Four pillars of the platform.",
      capabilitiesSubtitle:
        "Agents collect, scans assess, CyfroCode secures repositories with SAST, and CyfroAssistant answers. Each layer is designed to work independently and better together.",
      pillars: [
        {
          num: "01: Agents",
          title: "Collect security evidence from your hosts.",
          body: "Lightweight agents run on your hosts and perform all scan operations.",
          items: [
            {
              label: "Lightweight",
              detail:
                "Minimal CPU and memory usage, safe to run continuously on production hosts.",
            },
            {
              label: "Secure",
              detail:
                "Outbound-only connections, ensuring your firewall stays closed.",
            },
          ],
        },
        {
          num: "02: Scans",
          title: "Automated security checks by agents.",
          body: "Three scan types cover your full attack surface from open ports to installed packages, device inventory, and hidden secrets.",
          scanNames: [
            "Network Discovery",
            "Service Fingerprinting",
            "Asset Discovery",
          ],
        },
        {
          num: "03: CyfroAI Insights",
          title: "Risk ranked by what actually matters.",
          body: "AI re-ranks every finding using network exposure and reachability, not just raw CVSS score, so your team always knows what to fix first.",
          items2: [
            "Exposure-aware prioritization",
            "Executive summaries",
            "OS-specific remediation",
          ],
        },
        {
          num: "04: CyfroAssistant",
          title: "Your personal security analyst, 24/7.",
          body: "Ask questions in plain English and get instant answers grounded in your actual scan data, agent status, and vulnerability findings.",
          exampleQueryLabel: "Example query",
          exampleQuery: '"Show me all servers with open SSH ports"',
          exampleResult: "→ Queries your entire fleet in seconds",
        },
      ],
      scanTypesLabel: "Scan Types",
      scanTypesTitle: "Three scans. Full coverage.",
      scanTypesSubtitle:
        "Each scan type targets a different layer of your infrastructure. Together they give you a complete picture of exposure, risk, and asset inventory.",
      scanTypes: [
        {
          title: "Network Discovery",
          description:
            "Identifies open ports and services to drive vulnerability detection and analysis.",
        },
        {
          title: "Service Fingerprinting",
          description:
            "Assesses security posture by identifying known CVEs in installed packages and services, detecting common misconfigurations and scanning for exposed secrets.",
        },
        {
          title: "Asset Discovery",
          description:
            "Does ARP sweeps, local process enumeration and MAC vendor lookup to build a complete, enriched inventory of every device across your environment.",
        },
      ],
      aiInsightsLabel: "CyfroAI Insights",
      aiInsightsTitle: "Triage Without the Noise.",
      aiInsightsBody:
        "Cyfro AI Engine receives raw findings alongside network topology context to produce prioritized, actionable security intelligence your team can act on immediately.",
      dashboardLabel: "Dashboard",
      dashboardTitle: "Central view of your infrastructure's security health.",
      dashboardBody:
        "Dashboard brings together scan status, vulnerability findings, agent health, asset discovery, GDPR compliance, and a snapshot of AI-generated insights into a single, customisable page.",
      // Redesign (Oct 2026): short labels only, each taken from the copy above
      heroCtaSecondary: "Contact Sales",
      pillarsNavLabel: "Platform pillars",
      assistantNoScreenshot: "Example",
      scanDetails: ["Open ports · Services", "CVEs · Misconfigurations · Secrets", "ARP sweeps · Processes · MAC vendors"],
      insightsCallouts: [
        { title: "Exposure-aware prioritization", detail: "Base severity next to risk, with reachability and exposure." },
        { title: "Reasoning & context", detail: "Why the finding matters, with a recommended action and correlation evidence." },
        { title: "OS-specific remediation", detail: "Remediation commands for Linux, macOS and Windows." },
      ],
      insightsSummaryCaption: "Executive summaries",
      dashboardViews: ["Overview", "Asset discovery", "Scan status", "Vulnerability findings", "AI insights", "Agent health"],
    },

    documentsLanding: {
      badge: "Documentation",
      title: "Everything you need to operate CyfroSec with confidence.",
      description:
        "CyfroSec continuously discovers assets, analyzes vulnerabilities, misconfigurations, secrets and provides AI-driven remediation guidance across your infrastructure. Browse by topic or search below to find the guide you need.",
      searchPlaceholder: "Search the docs by topic, product area, or workflow",
      tags: {
        gettingStarted: "Getting Started",
        cyfroAgentSetup: "CyfroAgent Setup",
        cyfroAiInsights: "CyfroAI Insights",
        cyfroAssistant: "CyfroAssistant",
      },
      fullDocumentation: {
        label: "Full Documentation",
        title: "Read the complete Platform Overview",
        description:
          "The Platform Overview article covers core capabilities, getting started in five steps, RBAC, dashboard metric semantics, and the full sidebar-driven documentation flow.",
        button: "Open full docs",
      },
      startHere: {
        eyebrow: "Start Here",
        title: "Follow these steps to get up and running in minutes.",
        description:
          "Most teams start with organization setup, deploy CyfroAgent on a host, then create their first scan. This is that path.",
      },
      startCards: [
        {
          eyebrow: "Start here",
          label: "Create your organization",
          description:
            "Sign up at app.cyfrosec.com, verify your email, and complete your organization setup. The first user in a new organization must be an admin.",
        },
        {
          eyebrow: "Install",
          label: "Register and install CyfroAgent",
          description:
            "Generate a registration token and fernet key from the CyfroAgent tab, then run the provided Docker command on your host. Lightweight, outbound-only, and minimal resource usage.",
        },
        {
          eyebrow: "Scan",
          label: "Create your first scan",
          description:
            "Create a Network Discovery, Asset Discovery, or Service Fingerprinting scan. Scans run automatically on a recurring schedule: hourly, every 6 hours, 12 hours, or daily.",
        },
      ],
      openArticle: "Open article",
      popularArticles: {
        eyebrow: "Popular Articles",
        title: "Frequently referenced guides.",
        description:
          "Reference guides across the platform, from scan workflows and agent setup to AI insights and compliance tooling.",
      },
      readArticle: "Read article",
      browseCategory: {
        eyebrow: "Browse By Category",
        title: "Browse the full documentation by product area.",
        description:
          "Every section maps directly to the sidebar structure. Select a category to explore its guides, or use the search above to find a specific topic.",
      },
      browseSection: "Browse section",
      support: {
        eyebrow: "Support",
        title: "Need help? We're here.",
        description:
          "Use the support form in the CyfroSec portal to submit issues, attach logs or screenshots, and receive help from the support team.",
        button: "Contact support",
      },
      categoryMeta: {
        gettingStarted: {
          title: "Getting Started",
          description:
            "Sign up, create your organization and account groups, register your first agent, and understand the three-role permission model.",
        },
        platformGuide: {
          title: "Platform Guide",
          description:
            "Dashboard, notifications, reports, the CyfroCode SAST code-security workspace, and the interactive asset topology diagram.",
        },
        cyfroagent: {
          title: "CyfroAgent",
          description:
            "Lightweight daemon for asset inventory, telemetry, and scan execution. Covers single-host and multi-container Docker deployments.",
        },
        scans: {
          title: "Scans",
          description:
            "Create recurring scans targeting a host or subnet. Covers Network Discovery, Asset Discovery, and Service Fingerprinting scan types.",
        },
        cyfroaiEngine: {
          title: "CyfroAI Engine",
          description:
            "CyfroAI Engine generates executive summaries and prioritized risk lists after each scan. CyfroAssistant lets you query your infrastructure in natural language.",
        },
        securityCompliance: {
          title: "Security & CyfroCompliance",
          description:
            "Automated GDPR compliance scoring by article category with trend tracking, plus a full searchable audit trail for governance.",
        },
        adminPanel: {
          title: "Admin Panel",
          description:
            "Organization records, account groups, user management, subscription status, and usage statistics, restricted to admin roles.",
        },
      },
    },

    documentsFull: {
      sidebar: {
        backToSite: "Back to site",
        title: "CyfroSec Documentation",
        searchPlaceholder: "Search docs…",
        noResults: "No results for",
        sections: {
          gettingStarted: "GETTING STARTED",
          platformGuide: "PLATFORM GUIDE",
          cyfroAiEngine: "CYFROAI ENGINE",
          cyfroAgent: "CYFROAGENT",
          scans: "SCANS",
          securityCompliance: "SECURITY & CYFROCOMPLIANCE",
          adminPanel: "ADMIN PANEL",
        },
        links: {
          platformOverview: "Platform Overview",
          roleBasedAccessControl: "Role Based Access Control",
          support: "Support",
          dashboard: "Dashboard",
          notifications: "Notifications",
          report: "Report",
          topology: "Asset CyfroTopology Diagram",
          deployAgent: "CyfroAgent and Setup",
          dockerScanning: "Multi Container Scanning (Apps, Services)",
          deleteAgent: "Deleting CyfroAgent",
          firstScan: "Creating Scans",
          networkDiscovery: "Network Discovery Scan",
          assetDiscovery: "Asset Discovery Scan",
          serviceFingerprinting: "Service Fingerprinting Scan",
          gdpr: "CyfroCompliance Tool",
          audit: "Audit",
          admin: "Admin Panel",
        },
      },
      pageToc: {
        title: "On this page",
        platformOverview: "Platform Overview",
        coreCapabilities: "Core Capabilities",
        dashboardMetricSemantics: "Dashboard Metric Semantics",
        gettingStartedGuide: "Getting Started Guide",
        step1: "Step 1: Sign Up",
        step2: "Step 2: Account Group",
        step3: "Step 3: Register Agent",
        step4: "Step 4: Install Agent",
        step5: "Step 5: Verify",
        provisioningNote: "Provisioning Note",
        contactSupport: "Contact support",
      },
      content: {
        category: "Getting Started",
        title: "Platform Overview",
        intro:
          "CyfroSec continuously discovers assets, analyzes vulnerabilities, misconfigurations, secrets and provides AI-driven remediation guidance across your infrastructure.",
        coreCapabilitiesTitle: "Core Capabilities",
        agentsTitle: "1. Agents",
        agentsDescription:
          'Agents act as your infrastructure\'s "eyes and ears".',
        agentsItems: [
          "Lightweight: Minimal resource usage.",
          "Secure: Outbound-only connections.",
        ],
        scansTitle: "2. Scans",
        scansDescription:
          "They are automated security checks performed by Agents.",
        scansItems: [
          "Network Discovery: Identifies open ports and services in your server, network, or infrastructure to drive vulnerability detection and analysis.",
          "Service Fingerprinting: Assesses security posture by signature matching of CVEs in installed packages and services, detecting common misconfigurations and scanning for exposed secrets.",
          "Asset Discovery: Does ARP sweeps, local process enumeration and MAC vendor lookup.",
        ],
        dashboardMetricSemanticsTitle: "Dashboard Metric Semantics",
        metricTable: {
          metric: "Metric",
          meaning: "Meaning",
        },
        metricRows: [
          [
            "Completed Scans",
            "Scans currently in completed state (not a historical event count).",
          ],
          ["Active Scans", "Scans currently running or pending."],
          ["Failed Scans", "Scans currently in failed state."],
          [
            "Scan Progress",
            "Based on terminal states: (completed + failed) / total scans.",
          ],
        ] as [string, string][],
        cyfroAssistantTitle: "3. CyfroAssistant",
        cyfroAssistantDescription:
          "Your personal security analyst, available 24/7.",
        cyfroAssistantItems: [
          'Natural Language Queries: Ask queries like "Summarise the findings from yesterday\'s scan." or "List active agents" effectively querying your entire fleet in seconds.',
          "Accessibility: Helps to explain, understand, analyze and take action on your data, designed for not just Cybersecurity experts but also for non-Cybersecurity teams and Executives.",
        ],
        gettingStartedTitle: "Getting Started Guide",
        gettingStartedIntro:
          "Follow these steps to get your first Agent up and running in minutes.",
        prerequisitesTitle: "Prerequisites",
        prerequisitesItems: [
          "An active CyfroSec user account.",
          "Admin access to the machine you wish to monitor.",
          "Docker",
        ],
        needHelpText: "Need Help? Contact our Support Team at",
        step1Title: "Step 1: Sign Up and Create Organization",
        step1Saas: "SaaS (Cloud-Hosted)",
        step1GoTo: "Go to the CyfroSec Portal -",
        step1SignUpPage: "sign-up page.",
        step1RestItems: [
          "Enter your email and password.",
          "Fill in your Organization Details (Company Name, etc.) when prompted.",
          "Complete the email verification process.",
        ],
        importantNote:
          "Important: The first user in a new organization/account group must be an admin (Organization admin or Account group admin). Other users can use non-admin roles.",
        step2Title: "Step 2: Create an Account Group",
        step2Description:
          'Agents are organized into Account Groups (e.g., "DevOps", "AI Datacenter", "Production", "Staging"). You must have at least one group to register an agent.',
        step2Items: [
          "Go to Settings > Account Groups.",
          "Click Create Group.",
          'Name it logically (e.g., "Web App Production Server").',
        ],
        step3Title: "Step 3: Register an Agent",
        step3Description:
          "We use a secure One-Time Token to link your server to the cloud.",
        step3Items: [
          "Navigate to CyfroAgent in the sidebar.",
          "Ensure you are assigned an Account Group.",
          "Click Generate Registration Token. You'll need this token in the next step.",
          "Copy the token string immediately (it is only shown once).",
        ],
        step4Title: "Step 4: Install the Agent",
        step4Text: "Please follow the steps in",
        step4LinkText: "CyfroAgent and Setup",
        step4TextSuffix: "section.",
        step5Title: "Step 5: Verify",
        step5Items: [
          "Wait about 30 seconds for the Agent to initialize.",
          "Refresh the Agents page in the Portal.",
          "You should see your new Agent listed as Online.",
        ],
        provisioningNoteTitle: "Provisioning Consistency Note",
        provisioningNoteDescription:
          "When organizations, account groups, or users are created from the main admin backend, provisioning behavior is aligned:",
        provisioningNoteItems: [
          "Account group creation bootstraps a default Network Discovery scan.",
          "User creation triggers onboarding notification flows.",
          "Plan quotas are enforced consistently.",
        ],
      },
    },

    contact: {
      contactLabel: "Contact",
      heroTitle: "Plan your rollout with CyfroSec experts.",
      heroSubtitle:
        "Share your environment, goals, and deployment model. We will help map the fastest path from first scan to measurable risk reduction.",
      whatHappensNext: "What happens next?",
      steps: [
        {
          title: "Review",
          body: "We review your message within one business day.",
        },
        {
          title: "Scoping call",
          body: "A CyfroSec solutions engineer schedules a call.",
        },
        {
          title: "Deployment plan",
          body: "Together we design a tailored onboarding plan.",
        },
        {
          title: "First report",
          body: "You receive your first risk surface report within hours of deployment.",
        },
      ],
      otherWays: "Other ways to reach us",
      emailLabel: "Email",
    },
  },

  chatbot: {
    greeting: "Hello, I'm here to help",
    botName: "Cyfrosec FAQ Bot",
    online: "Online",
    frequentlyAsked: "Frequently asked",
    openChat: "Open chat",
    welcome:
      "Welcome! I'm Cyfrosec FAQ Bot, your assistant. Click any question below to learn more about how CyfroSec can help secure your infrastructure.",
    defaultResponse:
      "I can help you with information about CyfroSec. Click any question below to get started.",
    questions: [
      {
        q: "What value does CyfroAI Insights provide?",
        a: "It accelerates your response with easily understandable AI-powered remediation guidance and correlation which can be understood from management executives to security engineers.\n\nIt helps in context-aware prioritization to focus on the issues that actually pose risk.\n\nFrequent scans flood teams with thousands of low value alerts, burying the impacting issues that actually need immediate action.",
      },
      {
        q: "What are some of the core benefits of CyfroSec?",
        a: "CyfroAI Engine helps in generating insights and remediation guidelines which can be easily understood by executives as well as security engineers.\n\nReduces time to detect with continuous scans and AI Insights.\n\nReduces time to fix with prioritised findings and remediation steps.\n\nReduces risk with risk scores and the CyfroCompliance tool.\n\nImproves audit readiness with exportable compliance ready report of scans.",
      },
      {
        q: "What does Service Fingerprinting do?",
        a: "It helps in uncovering system vulnerabilities, misconfigurations and secrets.\n\nEach finding includes a clear description and evidence like file, package details or command output would be provided.\n\nActionable remediation steps like upgrades, configuration change or credential rotation.",
      },
      {
        q: "What are some of the Dashboard visualisations which can be handy for executives?",
        a: "The Dashboard is your central view of the security health of your infrastructure.\n\nIt brings together scan status, vulnerability findings, agent health, asset discovery, GDPR compliance, and AI-generated insights into a single page.\n\nThe dashboards are customisable and they update dynamically when you switch between account groups as well.",
      },
      {
        q: "What is the executive summary generated by CyfroAI Engine?",
        a: "It is an easily understandable natural language overview of the most important security findings along with correlation.\n\nVulnerabilities are re-ranked using exposure correlation, not just CVSS severity alone.\n\nIt prevents impacting issues from getting buried since they are the ones which actually need immediate action.",
      },
      {
        q: "How often does CyfroSec scan for vulnerabilities?",
        a: "You can schedule scans to run automatically for every 1, 6, 12 or 24 hours depending on your usecase.",
      },
      {
        q: "What would be the content of Reports?",
        a: "Provides an unified, auditable record of discovery, open ports/services, fingerprints, vulnerabilities, misconfigurations, and secrets found during scans.\n\nThe scan results can be filtered using data ranges and the various other data fields available for easy viewing.\n\nA structured CSV file can also be downloaded for deeper analysis. The CSV file would contain the results of all the scans in different sheets.",
      },
    ],
  },

  announcement: {
    title: "Scheduled Maintenance",
    message: "CyfroSec will undergo scheduled maintenance.",
    windowLabel: "Maintenance window:",
    yourLocalTime: "your local time.",
    imminentTitle: "Maintenance Starting Soon:",
    imminentShort: "Starts in",
    imminentLong: "CyfroSec maintenance begins in",
    imminentWindow: "· Window:",
    inProgressTitle: "Maintenance in Progress:",
    inProgressShort: "Service may be interrupted.",
    inProgressLong: "CyfroSec is currently undergoing maintenance.",
    windowSuffix: "your local time.",
    windowLabel2: "Window:",
    closeLabel: "Close announcement",
    mobileShortWindow: "Window:",
    fullTimeTitle: "Maintenance in Progress:",
    fullTimeMessage:
      "CyfroSec is currently under maintenance. Please check back later.",
  },
};

export type Dictionary = typeof en;
