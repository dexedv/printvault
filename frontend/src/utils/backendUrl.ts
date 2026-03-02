// Utility to get backend URL - works in both Tauri and browser
let cachedUrl: string | null = null;

export async function getBackendUrl(): Promise<string> {
  if (cachedUrl) return cachedUrl;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    cachedUrl = await invoke<string>('get_backend_url');
    return cachedUrl;
  } catch {
    cachedUrl = 'http://localhost:8000';
    return cachedUrl;
  }
}

export function clearBackendUrlCache() {
  cachedUrl = null;
}
