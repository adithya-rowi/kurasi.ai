import { 
  type User, 
  type InsertUser,
  type UserTopic,
  type InsertUserTopic,
  type UserPreferences,
  type InsertUserPreferences,
  type Article,
  type InsertArticle,
  type UserInteraction,
  type InsertUserInteraction,
  type SavedArticle,
  type InsertSavedArticle,
  users,
  userTopics,
  userPreferences,
  articles,
  userInteractions,
  savedArticles
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserOnboarding(id: string, completed: boolean): Promise<void>;

  // User Topics
  createUserTopic(topic: InsertUserTopic): Promise<UserTopic>;
  getUserTopics(userId: string): Promise<UserTopic[]>;
  deleteUserTopic(id: string): Promise<void>;

  // User Preferences
  createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences>;
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<void>;

  // Articles
  createArticle(article: InsertArticle): Promise<Article>;
  getArticle(id: string): Promise<Article | undefined>;
  getRecentArticles(limit: number): Promise<Article[]>;
  getArticlesByTopics(topics: string[], limit: number): Promise<Article[]>;

  // User Interactions
  createInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  getUserInteractions(userId: string, articleId?: string): Promise<UserInteraction[]>;

  // Saved Articles
  saveArticle(saved: InsertSavedArticle): Promise<SavedArticle>;
  getSavedArticles(userId: string): Promise<Array<SavedArticle & { article: Article }>>;
  unsaveArticle(userId: string, articleId: string): Promise<void>;
  isSaved(userId: string, articleId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserOnboarding(id: string, completed: boolean): Promise<void> {
    await db.update(users).set({ onboardingCompleted: completed }).where(eq(users.id, id));
  }

  // User Topics
  async createUserTopic(topic: InsertUserTopic): Promise<UserTopic> {
    const [created] = await db.insert(userTopics).values(topic).returning();
    return created;
  }

  async getUserTopics(userId: string): Promise<UserTopic[]> {
    return db.select().from(userTopics).where(eq(userTopics.userId, userId));
  }

  async deleteUserTopic(id: string): Promise<void> {
    await db.delete(userTopics).where(eq(userTopics.id, id));
  }

  // User Preferences
  async createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    const [created] = await db.insert(userPreferences).values(prefs).returning();
    return created;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async updateUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<void> {
    await db.update(userPreferences).set(prefs).where(eq(userPreferences.userId, userId));
  }

  // Articles
  async createArticle(article: InsertArticle): Promise<Article> {
    const [created] = await db.insert(articles).values(article).returning();
    return created;
  }

  async getArticle(id: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article;
  }

  async getRecentArticles(limit: number): Promise<Article[]> {
    return db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(limit);
  }

  async getArticlesByTopics(topics: string[], limit: number): Promise<Article[]> {
    return db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(limit);
  }

  // User Interactions
  async createInteraction(interaction: InsertUserInteraction): Promise<UserInteraction> {
    const [created] = await db.insert(userInteractions).values(interaction).returning();
    return created;
  }

  async getUserInteractions(userId: string, articleId?: string): Promise<UserInteraction[]> {
    if (articleId) {
      return db.select().from(userInteractions)
        .where(and(eq(userInteractions.userId, userId), eq(userInteractions.articleId, articleId)));
    }
    return db.select().from(userInteractions).where(eq(userInteractions.userId, userId));
  }

  // Saved Articles
  async saveArticle(saved: InsertSavedArticle): Promise<SavedArticle> {
    const [created] = await db.insert(savedArticles).values(saved).returning();
    return created;
  }

  async getSavedArticles(userId: string): Promise<Array<SavedArticle & { article: Article }>> {
    const results = await db
      .select()
      .from(savedArticles)
      .innerJoin(articles, eq(savedArticles.articleId, articles.id))
      .where(eq(savedArticles.userId, userId))
      .orderBy(desc(savedArticles.createdAt));

    return results.map((r: any) => ({ ...r.saved_articles, article: r.articles }));
  }

  async unsaveArticle(userId: string, articleId: string): Promise<void> {
    await db.delete(savedArticles)
      .where(and(eq(savedArticles.userId, userId), eq(savedArticles.articleId, articleId)));
  }

  async isSaved(userId: string, articleId: string): Promise<boolean> {
    const [result] = await db.select().from(savedArticles)
      .where(and(eq(savedArticles.userId, userId), eq(savedArticles.articleId, articleId)));
    return !!result;
  }
}

export const storage = new DatabaseStorage();
