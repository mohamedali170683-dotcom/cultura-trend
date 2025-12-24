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

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
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
