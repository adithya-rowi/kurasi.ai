import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Article = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: "Critical" | "Important" | "Background";
  topics: string[];
  relevanceReason: string;
  imageUrl?: string;
};

export type User = {
  name: string;
  role: string;
  organization: string;
  email: string;
};

export const MOCK_USER: User = {
  name: "Pak Halim",
  role: "Chief Investment Officer",
  organization: "Nusantara Capital",
  email: "halim@nusantara.cap",
};

export const MOCK_TOPICS = [
  { id: "1", name: "Monetary Policy & Central Banking", image: "https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&q=80&w=800" },
  { id: "2", name: "Indonesian Politics & Regulation", image: "https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&q=80&w=800" },
  { id: "3", name: "ASEAN Geopolitics", image: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&q=80&w=800" },
  { id: "4", name: "Commodities (Palm Oil, Coal, Nickel)", image: "https://images.unsplash.com/photo-1595834898235-517865612338?auto=format&fit=crop&q=80&w=800" },
  { id: "5", name: "Technology & Digital Economy", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800" },
  { id: "6", name: "Energy Transition & ESG", image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=800" },
];

export const MOCK_BRIEF: Article[] = [
  {
    id: "a1",
    title: "Bank Indonesia Holds Rates Steady Amidst Rupiah Volatility",
    summary: "BI decided to keep the 7-Day Reverse Repo Rate at 6.00%, citing the need to stabilize the Rupiah against external pressures while supporting sustainable economic growth.",
    source: "Bisnis Indonesia",
    url: "#",
    publishedAt: "2024-05-22T08:00:00Z",
    category: "Critical",
    topics: ["Monetary Policy"],
    relevanceReason: "Direct impact on your portfolio's currency exposure and interest rate sensitivity.",
  },
  {
    id: "a2",
    title: "New Export Levies on Downstream Nickel Products Proposed",
    summary: "The Ministry of Energy and Mineral Resources is finalizing a regulation to impose progressive levies on NPI and ferronickel exports to encourage further domestic processing.",
    source: "Reuters",
    url: "#",
    publishedAt: "2024-05-22T09:30:00Z",
    category: "Critical",
    topics: ["Commodities", "Regulation"],
    relevanceReason: "Critical for your mining sector holdings; expect short-term volatility in nickel miners.",
  },
  {
    id: "a3",
    title: "Tech Giants Announce New Data Center Investments in West Java",
    summary: "A consortium of global tech firms has unveiled plans for a $2B data center park in Cikarang, boosting the digital economy infrastructure outlook.",
    source: "Tech in Asia",
    url: "#",
    publishedAt: "2024-05-21T14:15:00Z",
    category: "Important",
    topics: ["Technology", "Infrastructure"],
    relevanceReason: "Signals strong growth in digital infrastructure, relevant for your tech fund allocation.",
  },
  {
    id: "a4",
    title: "ASEAN Summit Concludes with Digital Trade Framework Agreement",
    summary: "Leaders agreed on a new framework to facilitate cross-border digital payments and trade documentation, aiming to boost intra-regional trade by 15% by 2026.",
    source: "The Jakarta Post",
    url: "#",
    publishedAt: "2024-05-21T18:00:00Z",
    category: "Important",
    topics: ["ASEAN", "Trade"],
    relevanceReason: "Enhances regional trade efficiency; positive for logistics and fintech portfolio companies.",
  },
  {
    id: "a5",
    title: "Pertamina Geothermal Energy Expands Capacity in North Sulawesi",
    summary: "PGE has commissioned a new 20MW binary cycle power plant, marking a significant step in their renewable energy expansion roadmap.",
    source: "Kontan",
    url: "#",
    publishedAt: "2024-05-22T07:45:00Z",
    category: "Background",
    topics: ["Energy", "ESG"],
    relevanceReason: "Aligns with your ESG investment targets; monitor for potential green bond issuance.",
  }
];
