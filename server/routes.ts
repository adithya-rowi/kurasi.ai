import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertUserTopicSchema, 
  insertUserPreferencesSchema,
  insertUserInteractionSchema,
  insertSavedArticleSchema,
  insertArticleSchema
} from "@shared/schema";
import {
  startOnboardingConversation,
  processOnboardingMessage,
  streamOnboardingMessage,
  generateUserProfile,
  getOrCreateOnboardingConversation,
} from "./onboarding-chat";
import {
  runCouncilForUser,
  getLatestBrief,
  getBriefHistory,
} from "./services/llmCouncil";
import { db } from "./db";
import { userProfiles, dailyBriefs, briefFeedback } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // User Routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/email/:email", async (req, res) => {
    try {
      const user = await storage.getUserByEmail(req.params.email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id/onboarding", async (req, res) => {
    try {
      await storage.updateUserOnboarding(req.params.id, req.body.completed);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User Topics Routes
  app.post("/api/topics", async (req, res) => {
    try {
      const topicData = insertUserTopicSchema.parse(req.body);
      const topic = await storage.createUserTopic(topicData);
      res.json(topic);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/topics", async (req, res) => {
    try {
      const topics = await storage.getUserTopics(req.params.userId);
      res.json(topics);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/topics/:id", async (req, res) => {
    try {
      await storage.deleteUserTopic(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User Preferences Routes
  app.post("/api/preferences", async (req, res) => {
    try {
      const prefsData = insertUserPreferencesSchema.parse(req.body);
      const prefs = await storage.createUserPreferences(prefsData);
      res.json(prefs);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/preferences", async (req, res) => {
    try {
      const prefs = await storage.getUserPreferences(req.params.userId);
      if (!prefs) {
        return res.status(404).json({ error: "Preferences not found" });
      }
      res.json(prefs);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:userId/preferences", async (req, res) => {
    try {
      await storage.updateUserPreferences(req.params.userId, req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Articles Routes
  app.post("/api/articles", async (req, res) => {
    try {
      const articleData = insertArticleSchema.parse(req.body);
      const article = await storage.createArticle(articleData);
      res.json(article);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const article = await storage.getArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/articles", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const articles = await storage.getRecentArticles(limit);
      res.json(articles);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User Interactions Routes
  app.post("/api/interactions", async (req, res) => {
    try {
      const interactionData = insertUserInteractionSchema.parse(req.body);
      const interaction = await storage.createInteraction(interactionData);
      res.json(interaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/interactions", async (req, res) => {
    try {
      const interactions = await storage.getUserInteractions(req.params.userId);
      res.json(interactions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Saved Articles Routes
  app.post("/api/saved", async (req, res) => {
    try {
      const savedData = insertSavedArticleSchema.parse(req.body);
      const saved = await storage.saveArticle(savedData);
      res.json(saved);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/saved", async (req, res) => {
    try {
      const saved = await storage.getSavedArticles(req.params.userId);
      res.json(saved);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:userId/saved/:articleId", async (req, res) => {
    try {
      await storage.unsaveArticle(req.params.userId, req.params.articleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/saved/:articleId/check", async (req, res) => {
    try {
      const isSaved = await storage.isSaved(req.params.userId, req.params.articleId);
      res.json({ isSaved });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Onboarding Chat Routes
  app.get("/api/onboarding/:userId/start", async (req, res) => {
    try {
      const welcomeMessage = await startOnboardingConversation(req.params.userId);
      res.json({ message: welcomeMessage });
    } catch (error: any) {
      console.error("Error starting onboarding:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/onboarding/:userId/conversation", async (req, res) => {
    try {
      const conversation = await getOrCreateOnboardingConversation(req.params.userId);
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/onboarding/:userId/message", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const result = await processOnboardingMessage(req.params.userId, message);
      res.json(result);
    } catch (error: any) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/onboarding/:userId/stream", async (req, res) => {
    const { message } = req.query;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      await streamOnboardingMessage(
        req.params.userId,
        message,
        (chunk) => {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        },
        (result) => {
          res.write(`data: ${JSON.stringify({ done: true, isComplete: result.isComplete })}\n\n`);
          res.end();
        }
      );
    } catch (error: any) {
      console.error("Error streaming message:", error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });

  app.post("/api/onboarding/:userId/complete", async (req, res) => {
    try {
      const success = await generateUserProfile(req.params.userId);
      if (success) {
        res.json({ success: true, message: "Profile generated successfully" });
      } else {
        res.status(500).json({ error: "Failed to generate profile" });
      }
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, req.params.userId));
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // LLM Council Routes
  app.post("/api/council/:userId/run", async (req, res) => {
    try {
      console.log(`Running council for user ${req.params.userId}...`);
      const result = await runCouncilForUser(req.params.userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({
        success: true,
        councilSummary: result.councilResults?.map((r) => ({
          perspective: r.perspective,
          articlesFound: r.articles.length,
          error: r.error,
        })),
        brief: result.finalBrief,
      });
    } catch (error: any) {
      console.error("Council error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/brief/:userId/latest", async (req, res) => {
    try {
      const brief = await getLatestBrief(req.params.userId);
      if (!brief) {
        return res.status(404).json({ 
          error: "No brief found",
          message: "Run the council to generate your first brief" 
        });
      }
      res.json(brief);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/brief/:userId/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 7;
      const briefs = await getBriefHistory(req.params.userId, limit);
      res.json(briefs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/brief/feedback", async (req, res) => {
    try {
      const { userId, articleTitle, source, type } = req.body;
      if (!userId || !type) {
        return res.status(400).json({ error: "userId and type are required" });
      }
      
      await db.insert(briefFeedback).values({
        userId,
        articleTitle: articleTitle || "Unknown",
        articleSource: source,
        feedbackType: type,
      });
      
      console.log(`Brief feedback saved: ${type} for "${articleTitle}" by user ${userId}`);
      res.json({ success: true, type, articleTitle });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
