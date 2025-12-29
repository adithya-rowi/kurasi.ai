import { db } from "../db";
import { 
  emailDeliverySettings, 
  emailDeliveryLog,
  users,
  dailyBriefs,
  userSubscriptions,
  subscriptionPlans 
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSubscriptionStatus } from "./subscriptionService";

interface EmailSettings {
  emailAddress: string;
  deliveryTime: string;
  deliveryDays: number[];
  timezone: string;
  breakingAlerts: boolean;
}

export async function getEmailSettings(userId: string): Promise<EmailSettings | null> {
  const [settings] = await db
    .select()
    .from(emailDeliverySettings)
    .where(and(eq(emailDeliverySettings.userId, userId), eq(emailDeliverySettings.isActive, true)));

  if (!settings) return null;

  return {
    emailAddress: settings.emailAddress,
    deliveryTime: settings.deliveryTime,
    deliveryDays: settings.deliveryDays,
    timezone: settings.timezone,
    breakingAlerts: settings.breakingAlerts,
  };
}

export async function updateEmailSettings(
  userId: string,
  settings: Partial<EmailSettings>
): Promise<void> {
  const subscription = await getSubscriptionStatus(userId);

  if (!subscription.features.emailDelivery) {
    throw new Error("Email delivery requires Premium subscription");
  }

  const existing = await db
    .select()
    .from(emailDeliverySettings)
    .where(eq(emailDeliverySettings.userId, userId));

  if (existing.length > 0) {
    await db
      .update(emailDeliverySettings)
      .set({
        emailAddress: settings.emailAddress,
        deliveryTime: settings.deliveryTime,
        deliveryDays: settings.deliveryDays,
        timezone: settings.timezone,
        breakingAlerts: settings.breakingAlerts,
      })
      .where(eq(emailDeliverySettings.userId, userId));
  } else {
    if (!settings.emailAddress) {
      throw new Error("Email address is required");
    }
    await db.insert(emailDeliverySettings).values({
      userId,
      emailAddress: settings.emailAddress,
      deliveryTime: settings.deliveryTime || "06:00",
      deliveryDays: settings.deliveryDays || [1, 2, 3, 4, 5],
      timezone: settings.timezone || "Asia/Jakarta",
      breakingAlerts: settings.breakingAlerts ?? true,
    });
  }
}

function generateBriefEmailHTML(brief: any, userName: string): string {
  const formatItem = (item: any) => `
    <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1e40af;">
      <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
        ${item.title}
      </h3>
      <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px; line-height: 1.6;">
        ${item.summary}
      </p>
      <div style="background: #dbeafe; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
        <p style="margin: 0; color: #1e40af; font-size: 13px;">
          ✨ <strong>Why this matters to you:</strong> ${item.whyItMatters}
        </p>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #64748b; font-size: 12px;">${item.source}</span>
        ${item.url && item.url !== "search required" ? `<a href="${item.url}" style="color: #2563eb; font-size: 12px; text-decoration: none;">Read full article</a>` : ""}
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Loper</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Your Personal Intelligence Brief</p>
    </div>
    
    <div style="padding: 24px 32px; border-bottom: 1px solid #e2e8f0;">
      <p style="color: #1e293b; font-size: 18px; margin: 0;">
        ${brief.greeting}
      </p>
      <p style="color: #64748b; font-size: 14px; margin: 8px 0 0 0;">
        ${brief.briefDate}
      </p>
    </div>
    
    <div style="padding: 24px 32px; background: #eff6ff; border-bottom: 1px solid #bfdbfe;">
      <h2 style="color: #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">
        Executive Summary
      </h2>
      <p style="color: #1e293b; font-size: 16px; line-height: 1.6; margin: 0;">
        ${brief.executiveSummary}
      </p>
      
      <div style="display: flex; gap: 16px; margin-top: 20px;">
        <div style="flex: 1; background: #fef2f2; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${brief.critical?.length || 0}</div>
          <div style="font-size: 12px; color: #991b1b;">Critical</div>
        </div>
        <div style="flex: 1; background: #fefce8; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #ca8a04;">${brief.important?.length || 0}</div>
          <div style="font-size: 12px; color: #854d0e;">Important</div>
        </div>
        <div style="flex: 1; background: #f0fdf4; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${brief.background?.length || 0}</div>
          <div style="font-size: 12px; color: #166534;">Background</div>
        </div>
      </div>
    </div>
    
    ${
      brief.critical?.length > 0
        ? `
    <div style="padding: 24px 32px;">
      <h2 style="color: #dc2626; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px 0;">
        REQUIRES YOUR ATTENTION
      </h2>
      ${brief.critical.map(formatItem).join("")}
    </div>
    `
        : ""
    }
    
    ${
      brief.important?.length > 0
        ? `
    <div style="padding: 24px 32px; background: #fffbeb;">
      <h2 style="color: #ca8a04; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px 0;">
        WORTH KNOWING
      </h2>
      ${brief.important.map(formatItem).join("")}
    </div>
    `
        : ""
    }
    
    ${
      brief.background?.length > 0
        ? `
    <div style="padding: 24px 32px;">
      <h2 style="color: #16a34a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px 0;">
        ON YOUR RADAR
      </h2>
      ${brief.background
        .map(
          (item: any) => `
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #1e293b; font-size: 14px;">
            <strong>${item.title}</strong> 
            <span style="color: #64748b; font-size: 12px;">(${item.source})</span>
          </p>
        </div>
      `
        )
        .join("")}
    </div>
    `
        : ""
    }
    
    <div style="padding: 24px 32px; background: #0f172a; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Powered by AI Council - Multiple Perspectives for Better Intelligence
      </p>
      <p style="color: #64748b; font-size: 11px; margin: 12px 0 0 0;">
        Loper - Intelijen Bisnis untuk Eksekutif Indonesia
      </p>
    </div>
    
  </div>
</body>
</html>`;
}

export async function sendDailyBriefEmail(
  userId: string,
  briefId: string,
  brief: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const subscription = await getSubscriptionStatus(userId);
    if (!subscription.features.emailDelivery) {
      return { success: false, error: "Email delivery requires Premium subscription" };
    }

    const settings = await getEmailSettings(userId);
    if (!settings) {
      return { success: false, error: "Email settings not configured" };
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const userName = user?.fullName || "there";

    const emailHtml = generateBriefEmailHTML(brief, userName);

    if (!process.env.RESEND_API_KEY) {
      console.log(`[Email Mock] Would send brief to ${settings.emailAddress}`);
      await db.insert(emailDeliveryLog).values({
        userId,
        briefId,
        emailAddress: settings.emailAddress,
        status: "mock_sent",
      });
      return { success: true, messageId: "mock-" + Date.now() };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "Loper <brief@loper.id>",
      to: settings.emailAddress,
      subject: `Your Daily Brief - ${brief.briefDate} | ${brief.critical?.length || 0} critical, ${brief.important?.length || 0} important`,
      html: emailHtml,
    });

    if (error) {
      await db.insert(emailDeliveryLog).values({
        userId,
        briefId,
        emailAddress: settings.emailAddress,
        status: "failed",
      });
      return { success: false, error: error.message };
    }

    await db.insert(emailDeliveryLog).values({
      userId,
      briefId,
      emailAddress: settings.emailAddress,
      status: "sent",
      resendMessageId: data?.id,
    });

    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("Email delivery error:", err);
    return { success: false, error: err.message };
  }
}

export { generateBriefEmailHTML };
