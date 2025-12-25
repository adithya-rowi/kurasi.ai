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
