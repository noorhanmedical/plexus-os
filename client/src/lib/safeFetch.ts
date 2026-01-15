type CacheEntry = {
  data: unknown;
  timestamp: number;
  ttl: number;
};

const memoryCache = new Map<string, CacheEntry>();
const STORAGE_PREFIX = 'emr_cache_';

const requestQueue: Array<() => void> = [];
let activeRequests = 0;
let lastRequestTime = 0;
const MAX_CONCURRENT = 1;  // Ultra-conservative: one request at a time
const MIN_INTERVAL_MS = 3000;  // 3 seconds between requests to avoid blocks

function processQueue() {
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT) return;
  
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_INTERVAL_MS) {
    setTimeout(processQueue, MIN_INTERVAL_MS - timeSinceLastRequest);
    return;
  }
  
  const next = requestQueue.shift();
  if (next) {
    lastRequestTime = Date.now();
    activeRequests++;
    next();
  }
}

function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        activeRequests--;
        processQueue();
      }
    });
    processQueue();
  });
}

function getFromCache(key: string): unknown | null {
  const memEntry = memoryCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
    return memEntry.data;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    if (stored) {
      const entry: CacheEntry = JSON.parse(stored);
      if (Date.now() - entry.timestamp < entry.ttl) {
        memoryCache.set(key, entry);
        return entry.data;
      }
      localStorage.removeItem(STORAGE_PREFIX + key);
    }
  } catch {
    // localStorage not available or parse error
  }
  
  memoryCache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  const entry: CacheEntry = { data, timestamp: Date.now(), ttl: ttlMs };
  memoryCache.set(key, entry);
  
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or not available
  }
}

export function clearCache(keyPattern?: string) {
  if (keyPattern) {
    const keys = Array.from(memoryCache.keys());
    keys.forEach(key => {
      if (key.includes(keyPattern)) {
        memoryCache.delete(key);
        try { localStorage.removeItem(STORAGE_PREFIX + key); } catch {}
      }
    });
  } else {
    memoryCache.clear();
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }
}

export interface SafeFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cacheTtlMs?: number;
  skipCache?: boolean;
  signal?: AbortSignal;
}

const BACKOFF_DELAYS = [3000, 6000];  // Slower backoff, max 1 retry

async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  attempt = 0
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    
    if (res.status === 401 || res.status === 403) {
      console.error(`[safeFetch] Auth error ${res.status} for ${url}`);
      throw new Error(`Auth error: ${res.status}`);
    }
    
    if (res.status >= 500 && attempt < BACKOFF_DELAYS.length) {
      const delay = BACKOFF_DELAYS[attempt];
      console.warn(`[safeFetch] 5xx error, retrying in ${delay}ms (attempt ${attempt + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithBackoff(url, options, attempt + 1);
    }
    
    return res;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Auth error')) {
      throw err;
    }
    
    if (attempt < BACKOFF_DELAYS.length) {
      const delay = BACKOFF_DELAYS[attempt];
      console.warn(`[safeFetch] Network error, retrying in ${delay}ms (attempt ${attempt + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithBackoff(url, options, attempt + 1);
    }
    
    throw err;
  }
}

export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    cacheTtlMs = 0,
    skipCache = false,
    signal,
  } = options;
  
  const cacheKey = `${method}:${url}`;
  
  if (method === 'GET' && !skipCache && cacheTtlMs > 0) {
    const cached = getFromCache(cacheKey);
    if (cached !== null) {
      return cached as T;
    }
  }
  
  const requestFn = async (): Promise<T> => {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...headers,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal,
    };
    
    const res = await fetchWithBackoff(url, fetchOptions);
    
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
    
    const data = await res.json() as T;
    
    if (method === 'GET' && cacheTtlMs > 0) {
      setCache(cacheKey, data, cacheTtlMs);
    }
    
    return data;
  };
  
  return enqueueRequest(requestFn);
}

export const CACHE_TTL = {
  PATIENT_LIST: 15 * 60 * 1000,   // 15 min - extended to reduce API calls
  PATIENT_DETAIL: 10 * 60 * 1000, // 10 min
  BILLING_LIST: 15 * 60 * 1000,   // 15 min - extended to reduce API calls
  BILLING_DETAIL: 10 * 60 * 1000, // 10 min
  CATALOG: 30 * 60 * 1000,        // 30 min - rarely changes
} as const;

export async function safeFetchWithStaleWhileRevalidate<T>(
  url: string,
  options: SafeFetchOptions & { onStaleData?: (data: T) => void } = {}
): Promise<T> {
  const { onStaleData, ...fetchOptions } = options;
  const cacheKey = `GET:${url}`;
  
  const cached = getFromCache(cacheKey);
  if (cached !== null && onStaleData) {
    onStaleData(cached as T);
  }
  
  return safeFetch<T>(url, { ...fetchOptions, skipCache: true });
}
