import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { safeFetch, CACHE_TTL, clearCache } from "./safeFetch";

export { safeFetch, CACHE_TTL, clearCache } from "./safeFetch";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

function getCacheTtl(url: string): number {
  if (url.includes('/api/patients') && !url.includes('/detail')) return CACHE_TTL.PATIENT_LIST;
  if (url.includes('/detail')) return CACHE_TTL.PATIENT_DETAIL;
  if (url.includes('/api/billing/list')) return CACHE_TTL.BILLING_LIST;
  if (url.includes('/api/billing/') && !url.includes('/list')) return CACHE_TTL.BILLING_DETAIL;
  if (url.includes('/api/ancillary/catalog')) return CACHE_TTL.CATALOG;
  return CACHE_TTL.PATIENT_LIST;
}

export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  return async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const cacheTtl = getCacheTtl(url);
    
    try {
      return await safeFetch<T>(url, { cacheTtlMs: cacheTtl });
    } catch (err) {
      if (options.on401 === "returnNull" && 
          err instanceof Error && err.message.includes('401')) {
        return null as T;
      }
      throw err;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000,
      gcTime: 600000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
