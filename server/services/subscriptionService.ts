import { db } from "../db";
import { 
  subscriptionPlans, 
  userSubscriptions, 
  users,
  SubscriptionPlan
} from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

export interface SubscriptionStatus {
  isPremium: boolean;
  plan: string;
  validUntil?: Date;
  features: {
    emailDelivery: boolean;
    breakingAlerts: boolean;
    archiveDays: number;
  };
}

interface PlanFeatures {
  view_in_app?: boolean;
  email_delivery?: boolean;
  archive_days?: number;
  breaking_alerts?: boolean;
  api_access?: boolean;
  team_size?: string;
}

export async function seedSubscriptionPlans(): Promise<void> {
  const existingPlans = await db.select().from(subscriptionPlans);
  if (existingPlans.length > 0) return;

  console.log("Seeding subscription plans...");
  await db.insert(subscriptionPlans).values([
    {
      name: "free",
      priceIdr: 0,
      priceUsd: "0",
      features: { view_in_app: true, email_delivery: false, archive_days: 7 },
      isActive: true,
    },
    {
      name: "premium",
      priceIdr: 79000,
      priceUsd: "5",
      features: { view_in_app: true, email_delivery: true, archive_days: 90, breaking_alerts: true },
      isActive: true,
    },
    {
      name: "enterprise",
      priceIdr: null,
      priceUsd: null,
      features: { view_in_app: true, email_delivery: true, archive_days: 365, api_access: true, team_size: "unlimited" },
      isActive: true,
    },
  ]);
  console.log("Subscription plans seeded.");
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const [subscription] = await db
    .select({
      status: userSubscriptions.status,
      currentPeriodEnd: userSubscriptions.currentPeriodEnd,
      planName: subscriptionPlans.name,
      features: subscriptionPlans.features,
    })
    .from(userSubscriptions)
    .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, "active")
      )
    );

  if (!subscription || (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date())) {
    return {
      isPremium: false,
      plan: "free",
      features: {
        emailDelivery: false,
        breakingAlerts: false,
        archiveDays: 7,
      },
    };
  }

  const features = subscription.features as PlanFeatures;

  return {
    isPremium: subscription.planName !== "free",
    plan: subscription.planName,
    validUntil: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : undefined,
    features: {
      emailDelivery: features?.email_delivery || false,
      breakingAlerts: features?.breaking_alerts || false,
      archiveDays: features?.archive_days || 7,
    },
  };
}

export async function activateSubscription(
  userId: string,
  planName: string,
  paymentProvider: string,
  paymentId: string
): Promise<void> {
  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.name, planName));

  if (!plan) {
    throw new Error("Plan not found");
  }

  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const existingSub = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  if (existingSub.length > 0) {
    await db
      .update(userSubscriptions)
      .set({
        planId: plan.id,
        status: "active",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        paymentProvider,
        paymentId,
        cancelledAt: null,
      })
      .where(eq(userSubscriptions.userId, userId));
  } else {
    await db.insert(userSubscriptions).values({
      userId,
      planId: plan.id,
      status: "active",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      paymentProvider,
      paymentId,
    });
  }

  await db
    .update(users)
    .set({ subscriptionStatus: planName })
    .where(eq(users.id, userId));
}

export async function cancelSubscription(userId: string): Promise<void> {
  await db
    .update(userSubscriptions)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(userSubscriptions.userId, userId));

  await db
    .update(users)
    .set({ subscriptionStatus: "free" })
    .where(eq(users.id, userId));
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
}
