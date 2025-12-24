const API_BASE = '/api';

// Token management
const TOKEN_KEY = 'trendpulse_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// API helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle blob responses for exports
  if (response.headers.get('content-type')?.includes('text/csv') ||
      response.headers.get('content-type')?.includes('text/html')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  async signup(email: string, password: string, name?: string) {
    const data = await apiRequest<{ user: User; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setToken(data.token);
    return data;
  },

  async login(email: string, password: string) {
    const data = await apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      removeToken();
    }
  },

  async getMe() {
    return apiRequest<{ user: User }>('/auth/me');
  },
};

// Brands API
export const brandsApi = {
  async list() {
    return apiRequest<Brand[]>('/brands');
  },

  async create(name: string, color?: string) {
    return apiRequest<Brand>('/brands', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  },

  async delete(id: string) {
    return apiRequest(`/brands?id=${id}`, { method: 'DELETE' });
  },
};

// Keywords API
export const keywordsApi = {
  async list() {
    return apiRequest<Keyword[]>('/keywords');
  },

  async create(keyword: string, brandId: string, category?: string) {
    return apiRequest<Keyword>('/keywords', {
      method: 'POST',
      body: JSON.stringify({ keyword, brandId, category }),
    });
  },

  async delete(id: string) {
    return apiRequest(`/keywords?id=${id}`, { method: 'DELETE' });
  },
};

// Analyze API
export const analyzeApi = {
  async analyze(keyword: string, values: number[]) {
    return apiRequest<AnalysisResult>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ keyword, values }),
    });
  },

  async batchAnalyze(trends: Array<{ keyword: string; values: number[]; brand?: string }>) {
    return apiRequest<{ results: AnalysisResult[]; count: number }>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ trends }),
    });
  },
};

// Data Sources API
export const dataApi = {
  async getNews(keyword: string) {
    return apiRequest<NewsResult>(`/data/news?keyword=${encodeURIComponent(keyword)}`);
  },

  async getReddit(keyword: string) {
    return apiRequest<RedditResult>(`/data/reddit?keyword=${encodeURIComponent(keyword)}`);
  },

  async getGoogleTrends(keyword: string) {
    return apiRequest<GoogleTrendsResult>(`/data/google-trends?keyword=${encodeURIComponent(keyword)}`);
  },

  async aggregate(keywords: string[] | Array<{ keyword: string; brand?: string; brandColor?: string }>) {
    return apiRequest<{ results: AggregatedTrend[]; count: number; summary?: any }>('/data/aggregate', {
      method: 'POST',
      body: JSON.stringify({ keywords }),
    });
  },

  async analyzeUserKeywords() {
    return apiRequest<{ results: AggregatedTrend[]; count: number; summary: any }>('/data/aggregate', {
      method: 'POST',
      body: JSON.stringify({ analyzeUserKeywords: true }),
    });
  },
};

// History API
export const historyApi = {
  async get(keywordId: string, days = 90) {
    return apiRequest<{ history: TrendHistoryEntry[]; stats: any }>(`/history?keywordId=${keywordId}&days=${days}`);
  },

  async record(keywordId: string, data: Partial<TrendHistoryEntry>) {
    return apiRequest<TrendHistoryEntry>('/history', {
      method: 'POST',
      body: JSON.stringify({ keywordId, ...data }),
    });
  },
};

// Export API
export const exportApi = {
  async export(format: 'csv' | 'json' | 'html' | 'pdf', trends?: any[], filters?: any) {
    return apiRequest<Blob>('/export', {
      method: 'POST',
      body: JSON.stringify({ format, trends, filters }),
    });
  },

  async list() {
    return apiRequest<ExportRecord[]>('/export');
  },
};

// Alerts API
export const alertsApi = {
  async getSettings() {
    return apiRequest<AlertSettings>('/alerts');
  },

  async updateSettings(settings: Partial<AlertSettings>) {
    return apiRequest<AlertSettings>('/alerts', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async triggerAlert(trends: any[], testMode = false) {
    return apiRequest<{ sent: boolean; results: any }>('/alerts', {
      method: 'POST',
      body: JSON.stringify({ trends, testMode }),
    });
  },
};

// AI Recommendations API
export const aiApi = {
  async getRecommendations(trends?: any[]) {
    if (trends) {
      return apiRequest<AIAnalysis>('/ai/recommendations', {
        method: 'POST',
        body: JSON.stringify({ trends }),
      });
    }
    return apiRequest<AIAnalysis>('/ai/recommendations');
  },
};

// Teams API
export const teamsApi = {
  async get() {
    return apiRequest<{ currentTeam: Team | null; ownedTeams: Team[]; isTeamOwner: boolean }>('/teams');
  },

  async create(name: string) {
    return apiRequest<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async rename(teamId: string, name: string) {
    return apiRequest<Team>('/teams', {
      method: 'PUT',
      body: JSON.stringify({ teamId, action: 'rename', name }),
    });
  },

  async invite(teamId: string, email: string) {
    return apiRequest<Team>('/teams', {
      method: 'PUT',
      body: JSON.stringify({ teamId, action: 'invite', email }),
    });
  },

  async remove(teamId: string, email: string) {
    return apiRequest<Team>('/teams', {
      method: 'PUT',
      body: JSON.stringify({ teamId, action: 'remove', email }),
    });
  },

  async leave(teamId: string) {
    return apiRequest(`/teams?teamId=${teamId}&action=leave`, { method: 'DELETE' });
  },

  async delete(teamId: string) {
    return apiRequest(`/teams?teamId=${teamId}`, { method: 'DELETE' });
  },
};

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  teamId?: string;
}

export interface Brand {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: {
    keywords: number;
  };
}

export interface Keyword {
  id: string;
  userId: string;
  brandId: string;
  keyword: string;
  category?: string;
  createdAt: string;
  brand?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface AnalysisResult {
  keyword: string;
  phase: string;
  priority: string;
  r0: number;
  snr: number;
  velocity: number;
  peak_days: number;
  first_mover_days: number;
  confidence: number;
  urgency: string;
  recommendations: Array<{ type: string; deadline: string; priority: string }>;
}

export interface NewsResult {
  keyword: string;
  articles: Array<{
    title: string;
    description: string;
    source: { name: string };
    publishedAt: string;
    url: string;
    sentiment?: number;
  }>;
  totalResults: number;
  trendScore: number;
  velocity: number;
  sentiment: number;
  sources: string[];
}

export interface RedditResult {
  keyword: string;
  posts: Array<{
    title: string;
    subreddit: string;
    score: number;
    numComments: number;
    createdAt: string;
    url: string;
  }>;
  totalMentions: number;
  trendScore: number;
  velocity: number;
  topSubreddits: Array<{ name: string; count: number }>;
  engagement: number;
}

export interface GoogleTrendsResult {
  keyword: string;
  interestOverTime: Array<{ date: string; value: number }>;
  relatedQueries: Array<{ query: string; value: number }>;
  relatedTopics: Array<{ topic: string; value: number }>;
  trendScore: number;
  velocity: number;
  peakDate: string | null;
  isRising: boolean;
}

export interface AggregatedTrend {
  keyword: string;
  brand?: string;
  brandColor?: string;
  r0: number;
  snr: number;
  velocity: number;
  phase: string;
  priority: string;
  peakDays: number;
  firstMoverDays: number;
  confidence: number;
  urgency: string;
  sources: {
    news: { score: number; velocity: number; articles: number };
    reddit: { score: number; velocity: number; mentions: number };
    google: { score: number; velocity: number; interest: number };
  };
  historicalData: Array<{ date: string; value: number }>;
  recommendations: Array<{ type: string; deadline: string; priority: string }>;
}

export interface TrendHistoryEntry {
  id: string;
  keywordId: string;
  date: string;
  r0: number;
  snr: number;
  velocity: number;
  phase: string;
  priority: string;
  newsVolume?: number;
  redditVolume?: number;
  googleVolume?: number;
}

export interface AlertSettings {
  id: string;
  userId: string;
  emailEnabled: boolean;
  emailAddress?: string;
  criticalAlerts: boolean;
  highAlerts: boolean;
  mediumAlerts: boolean;
  lowAlerts: boolean;
  digestFrequency: string;
  slackEnabled: boolean;
  slackWebhook?: string;
}

export interface ExportRecord {
  id: string;
  userId: string;
  type: string;
  status: string;
  fileName?: string;
  createdAt: string;
}

export interface AIAnalysis {
  summary: string;
  recommendations: Array<{
    type: 'content' | 'timing' | 'strategy' | 'risk';
    title: string;
    description: string;
    priority: string;
    actionItems: string[];
    relatedTrends: string[];
  }>;
  contentIdeas: string[];
  riskAlerts: string[];
  opportunityScore: number;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  owner?: { id: string; email: string; name?: string };
  members?: Array<{ id: string; email: string; name?: string }>;
  createdAt: string;
}
