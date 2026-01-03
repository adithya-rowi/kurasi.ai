import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Types matching llmCouncilV2.ts
interface EspressoStory {
  headline: string;
  body: string;
  whyItMatters: string;
  source: string;
  sourceType: "local" | "regional" | "global" | "social";
  url: string;
  verificationScore: number;
  category: "critical" | "important" | "background";
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  recencyLabel?: string;
  publishedDate?: string;
}

interface EspressoBrief {
  briefDate: string;
  edition: string;
  recipientName: string;
  greeting: string;
  executiveThesis?: string;
  theWorldInBrief: string;
  topStories: EspressoStory[];
  tokohInsights?: EspressoStory[];
  marketsSnapshot?: string;
  quotaOfTheDay?: {
    quote: string;
    source: string;
  };
  agendaAhead?: string[];
  councilConsensus: string;
  confidenceScore: number;
  sourcesUsed: {
    search: string[];
    analysis: string[];
  };
}

// Color palette matching the app
const colors = {
  midnight: "#0a1628",
  navy: "#2a3f5f",
  red: "#cc2936",
  pearl: "#f9fafb",
  silver: "#94a3b8",
  white: "#ffffff",
  border: "#e5e5e5",
  greenSuccess: "#059669",
  yellowWarning: "#d97706",
};

function getCategoryColor(category: string): string {
  switch (category) {
    case "critical":
      return colors.red;
    case "important":
      return "#f59e0b";
    default:
      return colors.silver;
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "critical":
      return "Kritis";
    case "important":
      return "Penting";
    default:
      return "Konteks";
  }
}

function getConfidenceColor(score: number): string {
  if (score >= 8) return colors.greenSuccess;
  if (score >= 6) return colors.yellowWarning;
  return colors.silver;
}

function generateStoryHTML(story: EspressoStory, isLast: boolean): string {
  return `
    <tr>
      <td style="padding: 0 0 ${isLast ? "0" : "32px"} 0; border-bottom: ${isLast ? "none" : `1px solid ${colors.border}`};">
        <!-- Category Badge -->
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
          <tr>
            <td style="width: 8px; height: 8px; background: ${getCategoryColor(story.category)}; border-radius: 50%;"></td>
            <td style="padding-left: 8px; font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${colors.silver};">
              ${getCategoryLabel(story.category)}
            </td>
          </tr>
        </table>

        <!-- Headline -->
        <h3 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; font-weight: 500; color: ${colors.midnight}; margin: 0 0 12px 0; line-height: 1.3;">
          ${story.headline}
        </h3>

        <!-- Body -->
        <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; color: ${colors.navy}; line-height: 1.7; margin: 0 0 16px 0;">
          ${story.body}
        </p>

        <!-- Why It Matters -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 12px;">
          <tr>
            <td style="background: ${colors.pearl}; border-left: 2px solid ${colors.red}; padding: 14px 16px;">
              <span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; font-weight: 600; color: ${colors.midnight};">Mengapa penting: </span>
              <span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; color: ${colors.navy}; line-height: 1.6;">${story.whyItMatters}</span>
            </td>
          </tr>
        </table>

        <!-- Source & Link -->
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${colors.silver};">
              ${story.recencyLabel || ''}${story.publishedDate ? ` · ${story.publishedDate}` : ''} · ${story.source || ''}
            </td>
            ${story.url ? `
            <td style="padding-left: 8px;">
              <a href="${story.url}" target="_blank" style="font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${colors.red}; text-decoration: none;">
                Baca selengkapnya →
              </a>
            </td>
            ` : ""}
          </tr>
        </table>
      </td>
    </tr>
    ${!isLast ? `<tr><td style="height: 32px;"></td></tr>` : ""}
  `;
}

function generateBriefEmailHTML(brief: EspressoBrief, userName?: string): string {
  const displayName = userName || brief.recipientName || "Eksekutif";
  const storiesHTML = brief.topStories
    .slice(0, 5)
    .map((story, idx) => generateStoryHTML(story, idx === Math.min(brief.topStories.length, 5) - 1))
    .join("");

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Loper Brief - ${brief.briefDate}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.pearl}; -webkit-font-smoothing: antialiased;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${colors.pearl};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: ${colors.white};">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid ${colors.border};">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background: ${colors.red}; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 14px; font-weight: 700; color: ${colors.white};">L</span>
                        </td>
                        <td style="padding-left: 10px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; font-weight: 700; color: ${colors.midnight}; letter-spacing: 0.02em;">
                          LOPER
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; color: ${colors.silver};">
                    ${brief.briefDate}<br>${brief.edition}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: ${colors.red}; margin: 0 0 16px 0;">
                Brief Harian Anda
              </p>
              <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 400; color: ${colors.midnight}; margin: 0 0 8px 0; line-height: 1.2;">
                ${brief.greeting}
              </h1>
              ${brief.executiveThesis ? `
              <p style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 1.05em; color: #1a2a3a; font-style: italic; margin: 16px 0; padding: 12px 16px; border-left: 3px solid #cc2936; background: #f8f9fa;">
                ${brief.executiveThesis}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Sekilas Brief (Dark Section) -->
          <tr>
            <td style="padding: 0 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: ${colors.midnight}; padding: 32px; position: relative;">
                    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: ${colors.red}; margin: 0 0 16px 0;">
                      Sekilas Brief
                    </p>
                    <p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18px; font-weight: 400; line-height: 1.8; color: #e2e8f0; margin: 0;">
                      ${brief.theWorldInBrief}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Stories -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: ${colors.navy}; margin: 0 0 24px 0; padding-bottom: 12px; border-bottom: 1px solid ${colors.border};">
                Berita Utama
              </p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${storiesHTML}
              </table>
            </td>
          </tr>

          <!-- Tokoh Insights -->
          ${brief.tokohInsights && brief.tokohInsights.length > 0 ? `
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: ${colors.navy}; margin: 0 0 24px 0; padding-bottom: 12px; border-bottom: 1px solid ${colors.border};">
                📚 Insight Tokoh
              </p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${brief.tokohInsights.map((story, idx) => `
                <tr>
                  <td style="padding: 0 0 ${idx === (brief.tokohInsights?.length || 1) - 1 ? '0' : '24px'} 0; border-bottom: ${idx === (brief.tokohInsights?.length || 1) - 1 ? 'none' : `1px solid ${colors.border}`};">
                    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${colors.silver}; margin: 0 0 8px 0;">
                      ${story.recencyLabel || 'Insight'}${story.publishedDate ? ` · ${story.publishedDate}` : ''} · ${story.source || 'Sumber tidak tersedia'}
                    </p>
                    <h3 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18px; font-weight: 500; color: ${colors.midnight}; margin: 0 0 8px 0; line-height: 1.3;">
                      ${story.headline}
                    </h3>
                    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${colors.navy}; line-height: 1.6; margin: 0 0 12px 0;">
                      ${story.body}
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 8px;">
                      <tr>
                        <td style="background: ${colors.pearl}; border-left: 2px solid ${colors.red}; padding: 12px 14px;">
                          <span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; font-weight: 600; color: ${colors.midnight};">Mengapa penting: </span>
                          <span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; color: ${colors.navy}; line-height: 1.5;">${story.whyItMatters}</span>
                        </td>
                      </tr>
                    </table>
                    ${story.url ? `
                    <a href="${story.url}" target="_blank" style="font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${colors.red}; text-decoration: none;">
                      Baca selengkapnya →
                    </a>
                    ` : ''}
                  </td>
                </tr>
                ${idx !== (brief.tokohInsights?.length || 1) - 1 ? `<tr><td style="height: 24px;"></td></tr>` : ''}
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Council Consensus -->
          ${brief.councilConsensus ? `
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: ${colors.pearl}; border-left: 3px solid ${colors.red}; padding: 24px;">
                    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: ${colors.navy}; margin: 0 0 12px 0;">
                      Konsensus Dewan AI
                    </p>
                    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; color: ${colors.navy}; line-height: 1.7; margin: 0 0 12px 0;">
                      ${brief.councilConsensus}
                    </p>
                    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${colors.silver}; margin: 0;">
                      Tingkat kepercayaan: <span style="font-weight: 600; color: ${getConfidenceColor(brief.confidenceScore)};">${brief.confidenceScore.toFixed(1)}/10</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="background: ${colors.midnight}; padding: 32px 40px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 24px; height: 24px; background: ${colors.red}; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 11px; font-weight: 700; color: ${colors.white};">L</span>
                        </td>
                        <td style="padding-left: 8px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18px; font-weight: 700; color: ${colors.white}; letter-spacing: 0.02em;">
                          LOPER
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; color: ${colors.silver}; margin: 0; line-height: 1.6;">
                      Anda sibuk. Satu brief, hanya yang penting.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 24px;">
                    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; color: #64748b; margin: 0;">
                      © ${new Date().getFullYear()} Loper · <a href="https://loper.id" style="color: ${colors.silver}; text-decoration: none;">loper.id</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendBriefEmail(
  to: string,
  brief: EspressoBrief,
  userName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const html = generateBriefEmailHTML(brief, userName);
    const displayName = userName || brief.recipientName || "Eksekutif";

    const { data, error } = await resend.emails.send({
      from: "Loper <brief@loper.id>",
      to: [to],
      subject: `Brief Harian Anda - ${brief.briefDate}`,
      html,
      headers: {
        "X-Entity-Ref-ID": `loper-brief-${Date.now()}`,
      },
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log(`Email sent to ${to}, messageId: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("Email send error:", err);
    return { success: false, error: err.message || "Failed to send email" };
  }
}

// Export for testing
export { generateBriefEmailHTML };
