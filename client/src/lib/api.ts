import type { 
  User, 
  InsertUser, 
  UserTopic, 
  InsertUserTopic,
  UserPreferences,
  InsertUserPreferences,
  Article,
  SavedArticle
} from "@shared/schema";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

// User API
export const userApi = {
  create: (user: InsertUser) => 
    fetchApi<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),
  
  getById: (id: string) => 
    fetchApi<User>(`/api/users/${id}`),
  
  getByEmail: (email: string) => 
    fetchApi<User>(`/api/users/email/${email}`),
  
  updateOnboarding: (id: string, completed: boolean) => 
    fetchApi<{ success: boolean }>(`/api/users/${id}/onboarding`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }),
};

// Topics API
export const topicsApi = {
  create: (topic: InsertUserTopic) => 
    fetchApi<UserTopic>("/api/topics", {
      method: "POST",
      body: JSON.stringify(topic),
    }),
  
  getUserTopics: (userId: string) => 
    fetchApi<UserTopic[]>(`/api/users/${userId}/topics`),
  
  delete: (id: string) => 
    fetchApi<{ success: boolean }>(`/api/topics/${id}`, {
      method: "DELETE",
    }),
};

// Preferences API
export const preferencesApi = {
  create: (prefs: InsertUserPreferences) => 
    fetchApi<UserPreferences>("/api/preferences", {
      method: "POST",
      body: JSON.stringify(prefs),
    }),
  
  get: (userId: string) => 
    fetchApi<UserPreferences>(`/api/users/${userId}/preferences`),
  
  update: (userId: string, prefs: Partial<InsertUserPreferences>) => 
    fetchApi<{ success: boolean }>(`/api/users/${userId}/preferences`, {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
};

// Articles API
export const articlesApi = {
  getAll: (limit = 20) => 
    fetchApi<Article[]>(`/api/articles?limit=${limit}`),
  
  getById: (id: string) => 
    fetchApi<Article>(`/api/articles/${id}`),
};

// Saved Articles API
export const savedApi = {
  save: (userId: string, articleId: string, notes?: string) => 
    fetchApi<SavedArticle>("/api/saved", {
      method: "POST",
      body: JSON.stringify({ userId, articleId, notes }),
    }),
  
  getSaved: (userId: string) => 
    fetchApi<Array<SavedArticle & { article: Article }>>(`/api/users/${userId}/saved`),
  
  unsave: (userId: string, articleId: string) => 
    fetchApi<{ success: boolean }>(`/api/users/${userId}/saved/${articleId}`, {
      method: "DELETE",
    }),
  
  checkSaved: (userId: string, articleId: string) => 
    fetchApi<{ isSaved: boolean }>(`/api/users/${userId}/saved/${articleId}/check`),
};

// Interactions API
export const interactionsApi = {
  track: (userId: string, articleId: string, type: string, timeSpentSeconds?: number) => 
    fetchApi("/api/interactions", {
      method: "POST",
      body: JSON.stringify({ userId, articleId, interactionType: type, timeSpentSeconds }),
    }),
};

// Onboarding Chat API
export const onboardingApi = {
  start: (userId: string) =>
    fetchApi<{ message: string }>(`/api/onboarding/${userId}/start`),
  
  getConversation: (userId: string) =>
    fetchApi<{ messages: Array<{ role: string; content: string }>; isComplete: boolean }>(
      `/api/onboarding/${userId}/conversation`
    ),
  
  sendMessage: (userId: string, message: string) =>
    fetchApi<{ message: string; isComplete: boolean }>(
      `/api/onboarding/${userId}/message`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      }
    ),
  
  complete: (userId: string) =>
    fetchApi<{ success: boolean; message: string }>(
      `/api/onboarding/${userId}/complete`,
      { method: "POST" }
    ),
  
  getProfile: (userId: string) =>
    fetchApi<any>(`/api/users/${userId}/profile`),
};

// LLM Council API
export interface BriefArticle {
  title: string;
  summary: string;
  source: string;
  sourceType?: "local" | "regional" | "global";
  url: string;
  isPaywalled?: boolean;
  whyItMatters: string;
  foundByPerspectives: string[];
  verificationScore: number;
  publishedDate?: string;
}

export interface DailyBriefContent {
  briefDate: string;
  recipientName: string;
  greeting: string;
  executiveSummary: string;
  critical: BriefArticle[];
  important: BriefArticle[];
  background: BriefArticle[];
  councilAgreement: string;
  confidenceNote: string;
  modelsUsed?: string[];
}

export interface DailyBrief {
  id: string;
  userId: string;
  content: DailyBriefContent;
  councilMetadata: any;
  generatedAt: string;
}

// Subscription API
export interface SubscriptionStatus {
  isPremium: boolean;
  plan: string;
  validUntil?: string;
  features: {
    emailDelivery: boolean;
    breakingAlerts: boolean;
    archiveDays: number;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceIdr: number | null;
  priceUsd: string | null;
  features: any;
  isActive: boolean;
}

export const subscriptionApi = {
  getPlans: () => fetchApi<SubscriptionPlan[]>("/api/subscription/plans"),

  getStatus: (userId: string) =>
    fetchApi<SubscriptionStatus>(`/api/subscription/${userId}/status`),

  activate: (userId: string, planName: string) =>
    fetchApi<{ success: boolean }>(`/api/subscription/${userId}/activate`, {
      method: "POST",
      body: JSON.stringify({ planName }),
    }),

  cancel: (userId: string) =>
    fetchApi<{ success: boolean }>(`/api/subscription/${userId}/cancel`, {
      method: "POST",
    }),
};

// Email Settings API
export interface EmailSettings {
  emailAddress: string;
  deliveryTime: string;
  deliveryDays: number[];
  timezone: string;
  breakingAlerts: boolean;
}

export const emailApi = {
  getSettings: (userId: string) =>
    fetchApi<EmailSettings | { configured: false }>(`/api/email/${userId}/settings`),

  updateSettings: (userId: string, settings: Partial<EmailSettings>) =>
    fetchApi<{ success: boolean }>(`/api/email/${userId}/settings`, {
      method: "POST",
      body: JSON.stringify(settings),
    }),

  sendBrief: (userId: string) =>
    fetchApi<{ success: boolean; messageId?: string; error?: string }>(
      `/api/email/${userId}/send-brief`,
      { method: "POST" }
    ),
};

export const councilApi = {
  runCouncil: (userId: string) =>
    fetchApi<{
      success: boolean;
      councilSummary: Array<{
        model: string;
        provider: string;
        articlesFound: number;
        error?: string;
      }>;
      brief: DailyBriefContent;
    }>(`/api/council/${userId}/run`, { method: "POST" }),

  getLatestBrief: (userId: string) =>
    fetchApi<DailyBrief>(`/api/brief/${userId}/latest`),

  getBriefHistory: (userId: string, limit = 7) =>
    fetchApi<DailyBrief[]>(`/api/brief/${userId}/history?limit=${limit}`),

  sendFeedback: (userId: string, articleTitle: string, source: string, type: "save" | "not_relevant") =>
    fetchApi<{ success: boolean }>("/api/brief/feedback", {
      method: "POST",
      body: JSON.stringify({ userId, articleTitle, source, type }),
    }),
};
