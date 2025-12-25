const SESSION_KEY = "curateai_user_id";

export const session = {
  setUserId: (userId: string) => {
    localStorage.setItem(SESSION_KEY, userId);
  },
  
  getUserId: (): string | null => {
    return localStorage.getItem(SESSION_KEY);
  },
  
  clear: () => {
    localStorage.removeItem(SESSION_KEY);
  },
};
