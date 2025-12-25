import { storage } from "./storage";
import type { InsertArticle } from "@shared/schema";

const sampleArticles: InsertArticle[] = [
  {
    title: "Bank Indonesia Holds Rates Steady Amidst Rupiah Volatility",
    content: "Bank Indonesia decided to keep the 7-Day Reverse Repo Rate at 6.00%, citing the need to stabilize the Rupiah against external pressures while supporting sustainable economic growth. The central bank emphasized its commitment to maintaining price stability while monitoring global economic developments.",
    summary: "BI decided to keep the 7-Day Reverse Repo Rate at 6.00%, citing the need to stabilize the Rupiah against external pressures while supporting sustainable economic growth.",
    source: "Bisnis Indonesia",
    url: "https://example.com/article1",
    publishedAt: new Date("2024-12-25T08:00:00Z"),
    topics: ["Monetary Policy", "Central Banking"],
    category: "Critical",
    relevanceReason: "Direct impact on your portfolio's currency exposure and interest rate sensitivity.",
  },
  {
    title: "New Export Levies on Downstream Nickel Products Proposed",
    content: "The Ministry of Energy and Mineral Resources is finalizing a regulation to impose progressive levies on NPI and ferronickel exports to encourage further domestic processing. This move aims to boost value-added manufacturing in Indonesia's strategic nickel industry.",
    summary: "The Ministry of Energy and Mineral Resources is finalizing a regulation to impose progressive levies on NPI and ferronickel exports to encourage further domestic processing.",
    source: "Reuters",
    url: "https://example.com/article2",
    publishedAt: new Date("2024-12-25T09:30:00Z"),
    topics: ["Commodities", "Regulation"],
    category: "Critical",
    relevanceReason: "Critical for your mining sector holdings; expect short-term volatility in nickel miners.",
  },
  {
    title: "Tech Giants Announce New Data Center Investments in West Java",
    content: "A consortium of global tech firms has unveiled plans for a $2B data center park in Cikarang, boosting the digital economy infrastructure outlook. The project is expected to create thousands of jobs and position Indonesia as a regional data hub.",
    summary: "A consortium of global tech firms has unveiled plans for a $2B data center park in Cikarang, boosting the digital economy infrastructure outlook.",
    source: "Tech in Asia",
    url: "https://example.com/article3",
    publishedAt: new Date("2024-12-24T14:15:00Z"),
    topics: ["Technology", "Infrastructure"],
    category: "Important",
    relevanceReason: "Signals strong growth in digital infrastructure, relevant for your tech fund allocation.",
  },
  {
    title: "ASEAN Summit Concludes with Digital Trade Framework Agreement",
    content: "Leaders agreed on a new framework to facilitate cross-border digital payments and trade documentation, aiming to boost intra-regional trade by 15% by 2026. The agreement includes provisions for data privacy and cybersecurity cooperation.",
    summary: "Leaders agreed on a new framework to facilitate cross-border digital payments and trade documentation, aiming to boost intra-regional trade by 15% by 2026.",
    source: "The Jakarta Post",
    url: "https://example.com/article4",
    publishedAt: new Date("2024-12-24T18:00:00Z"),
    topics: ["ASEAN", "Trade"],
    category: "Important",
    relevanceReason: "Enhances regional trade efficiency; positive for logistics and fintech portfolio companies.",
  },
  {
    title: "Pertamina Geothermal Energy Expands Capacity in North Sulawesi",
    content: "PGE has commissioned a new 20MW binary cycle power plant, marking a significant step in their renewable energy expansion roadmap. The facility utilizes advanced geothermal technology to provide clean baseload power.",
    summary: "PGE has commissioned a new 20MW binary cycle power plant, marking a significant step in their renewable energy expansion roadmap.",
    source: "Kontan",
    url: "https://example.com/article5",
    publishedAt: new Date("2024-12-25T07:45:00Z"),
    topics: ["Energy", "ESG"],
    category: "Background",
    relevanceReason: "Aligns with your ESG investment targets; monitor for potential green bond issuance.",
  }
];

export async function seedDatabase() {
  console.log("Seeding database with sample articles...");
  
  for (const article of sampleArticles) {
    try {
      await storage.createArticle(article);
      console.log(`✓ Created article: ${article.title}`);
    } catch (error) {
      console.error(`✗ Failed to create article: ${article.title}`, error);
    }
  }
  
  console.log("Database seeding complete!");
}
