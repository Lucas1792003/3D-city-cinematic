import {
  Bot,
  ClipboardCheck,
  Cpu,
  Share2,
  Brain,
  Building2,
  Code2,
  CreditCard,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Network,
  Radar,
  ScanSearch,
  Shield,
  ShieldCheck,
} from "lucide-react";

import type { NavItem } from "./ui/dropdown-navigation";

export interface FooterLink {
  label: string;
  href: string;
  /** Index link ("More solutions", "All policies") — styled as a link with an arrow. */
  more?: boolean;
}

export const LANDING_NAV_ITEMS: NavItem[] = [
  { id: 0, label: "Home", link: "/", isNav: true },
  {
    id: 1,
    label: "Product",
    link: "#",
    subMenus: [
      {
        title: "Product",
        items: [
          {
            label: "3D City Overview",
            href: "/platform-city",
            description: "Explore the platform as an interactive 3D city",
            icon: Building2,
            isNav: true,
          },
          {
            label: "Platform Overview",
            href: "/products/overview",
            description: "What CyfroSec is and how it works",
            icon: LayoutDashboard,
            isNav: true,
          },
          {
            label: "Features",
            href: "#solutions",
            description: "Discover, assess, prioritize, remediate",
            icon: Shield,
          },
          {
            label: "CyfroAI Engine",
            href: "#ai-engine",
            description: "AI-powered detection & remediation",
            icon: Bot,
          },
          {
            label: "Architecture",
            href: "#architecture-detail",
            description: "How the platform’s components connect",
            icon: Layers,
          },
          {
            label: "CyfroCompliance & Security",
            href: "#security",
            description: "CyfroCompliance tool & Data Residency",
            icon: ShieldCheck,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Solutions",
    link: "#",
    subMenus: [
      {
        title: "Solutions",
        items: [
          {
            label: "Network Discovery",
            href: "/solutions/network-discovery",
            description: "Find reachable hosts and services",
            isNav: true,
            icon: Network,
          },
          {
            label: "Asset Discovery",
            href: "/solutions/asset-discovery",
            description: "Discover assets across your network",
            isNav: true,
            icon: Radar,
          },
          {
            label: "Service Fingerprinting",
            href: "/solutions/service-fingerprinting",
            description: "Identify vulnerable services and versions",
            isNav: true,
            icon: ScanSearch,
          },
          {
            label: "CyfroAI Insights",
            href: "/solutions/cyfro-ai-insights",
            description: "Prioritize findings with exposure context",
            isNav: true,
            icon: Brain,
          },
          {
            label: "CyfroAssistant",
            href: "/solutions/cyfro-assistant",
            description: "Turn security questions into next steps",
            isNav: true,
            icon: MessageSquare,
          },
          {
            label: "CyfroCode",
            href: "/solutions/cyfrocode",
            description: "Code scanning & AI-driven patches",
            isNav: true,
            icon: Code2,
          },
          {
            label: "CyfroAgent",
            href: "/solutions/cyfro-agent",
            description: "Collect security evidence from your hosts",
            isNav: true,
            icon: Cpu,
          },
          {
            label: "CyfroTopology",
            href: "/solutions/cyfro-topology",
            description: "Explore assets, connections and risk",
            isNav: true,
            icon: Share2,
          },
          {
            label: "CyfroCompliance",
            href: "/solutions/cyfro-compliance",
            description: "Assess controls using scan evidence",
            isNav: true,
            icon: ClipboardCheck,
          },
        ],
      },
    ],
  },
  { id: 4, label: "Documentation", link: "https://docs.cyfrosec.com" },
  { id: 6, label: "Subscriptions", link: "/subscriptions", isNav: true },
  { id: 5, label: "About", link: "/about", isNav: true },
];

// Scrolled (compact) navbar — collapses About + Subscriptions into a Company dropdown
export const LANDING_NAV_ITEMS_SCROLLED: NavItem[] = [
  ...LANDING_NAV_ITEMS.slice(0, 5).filter(
    (item) => item.id !== 5 && item.id !== 6,
  ),
  {
    id: 5,
    label: "Company",
    link: "#",
    subMenus: [
      {
        title: "Company",
        items: [
          {
            label: "About Us",
            href: "/about",
            description: "Our mission, team, and values",
            icon: Building2,
            isNav: true,
          },
          {
            label: "Subscription Tiers",
            href: "/subscriptions",
            description: "Plans, pricing, and feature comparison",
            icon: CreditCard,
            isNav: true,
          },
        ],
      },
    ],
  },
];

// Footer columns. Destinations not listed directly stay reachable through an index
// page: every policy and security document is linked from the Trust Centre (/trust),
// which "All policies" points to. Legal labels follow the approved legal copy.
// Homepage sections use "/#id" so the links also work from other pages.
export const LANDING_FOOTER_LINKS = {
  product: [
    { label: "Overview", href: "/products/overview" },
    { label: "Features", href: "/#solutions" },
    { label: "CyfroAI Engine", href: "/#ai-engine" },
    { label: "Architecture", href: "/#architecture-detail" },
    { label: "CyfroCompliance & Security", href: "/#security" },
  ],
  solutions: [
    { label: "Network Discovery", href: "/solutions/network-discovery" },
    { label: "Asset Discovery", href: "/solutions/asset-discovery" },
    { label: "Service Fingerprinting", href: "/solutions/service-fingerprinting" },
    { label: "CyfroAI Insights", href: "/solutions/cyfro-ai-insights" },
    { label: "CyfroAssistant", href: "/solutions/cyfro-assistant" },
    { label: "CyfroCode", href: "/solutions/cyfrocode" },
    { label: "CyfroAgent", href: "/solutions/cyfro-agent" },
    { label: "CyfroTopology", href: "/solutions/cyfro-topology" },
    { label: "CyfroCompliance", href: "/solutions/cyfro-compliance" },
    { label: "More solutions", href: "/solutions", more: true },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Documentation", href: "https://docs.cyfrosec.com" },
    { label: "Subscription tiers", href: "/subscriptions" },
  ],
  trustLegal: [
    { label: "Trust Centre", href: "/trust" },
    { label: "Legal Notice", href: "/legal-notice" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Report a Vulnerability", href: "/security/vulnerability-disclosure" },
    { label: "All policies", href: "/trust", more: true },
  ],
} satisfies Record<string, FooterLink[]>;
