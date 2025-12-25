import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp, boolean, varchar, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Core users table - defined first since others reference it
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  organization: text("organization").notNull(),
  languagePreference: text("language_preference").notNull().default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
});

// Chat integration tables
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Onboarding conversations
export const onboardingConversations = pgTable("onboarding_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  messages: jsonb("messages").default([]).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  isComplete: boolean("is_complete").default(false).notNull(),
});

// User profiles generated from onboarding
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  personaSummary: text("persona_summary"),
  roleDescription: text("role_description"),
  organizationContext: text("organization_context"),
  primaryTopics: jsonb("primary_topics"),
  secondaryTopics: jsonb("secondary_topics"),
  keywordsToTrack: text("keywords_to_track").array(),
  entitiesToTrack: text("entities_to_track").array(),
  preferredSources: jsonb("preferred_sources"),
  avoidTopics: text("avoid_topics").array(),
  languagePreference: text("language_preference").default("id"),
  councilSystemPrompt: text("council_system_prompt"),
  successDefinition: text("success_definition"),
  decisionContext: text("decision_context"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  version: integer("version").default(1).notNull(),
});

export const userTopics = pgTable("user_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicName: text("topic_name").notNull(),
  priority: integer("priority").default(5).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  deliveryTime: text("delivery_time").default("06:00").notNull(),
  deliveryDays: integer("delivery_days").array().default([1, 2, 3, 4, 5]).notNull(),
  formatPreference: text("format_preference").default("brief").notNull(),
  maxItems: integer("max_items").default(10).notNull(),
  timezone: text("timezone").default("Asia/Jakarta").notNull(),
});

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  url: text("url").notNull(),
  source: text("source").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
  topics: text("topics").array().notNull(),
  category: text("category").notNull(),
  relevanceReason: text("relevance_reason"),
});

export const userInteractions = pgTable("user_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  interactionType: text("interaction_type").notNull(),
  timeSpentSeconds: integer("time_spent_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedArticles = pgTable("saved_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyBriefs = pgTable("daily_briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: jsonb("content").notNull(),
  councilMetadata: jsonb("council_metadata"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUserTopicSchema = createInsertSchema(userTopics).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  ingestedAt: true,
});

export const insertUserInteractionSchema = createInsertSchema(userInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertSavedArticleSchema = createInsertSchema(savedArticles).omit({
  id: true,
  createdAt: true,
});

export const insertOnboardingConversationSchema = createInsertSchema(onboardingConversations).omit({
  id: true,
  startedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  generatedAt: true,
  lastUpdated: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserTopic = z.infer<typeof insertUserTopicSchema>;
export type UserTopic = typeof userTopics.$inferSelect;

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type UserInteraction = typeof userInteractions.$inferSelect;

export type InsertSavedArticle = z.infer<typeof insertSavedArticleSchema>;
export type SavedArticle = typeof savedArticles.$inferSelect;

export type OnboardingConversation = typeof onboardingConversations.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type DailyBrief = typeof dailyBriefs.$inferSelect;
