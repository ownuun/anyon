/**
 * Tauri Integration Utilities
 *
 * This module provides utilities for detecting and interacting with Tauri
 * when the app is running as a desktop application.
 */

// Check if we're running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Lazy load Tauri API only when needed
let tauriCore: typeof import('@tauri-apps/api/core') | null = null;

const getTauriCore = async () => {
  if (!tauriCore && isTauri()) {
    tauriCore = await import('@tauri-apps/api/core');
  }
  return tauriCore;
};

/**
 * Get the sidecar port from Tauri
 * Returns null if not running in Tauri or if sidecar is not ready
 */
export const getSidecarPort = async (): Promise<number | null> => {
  const tauri = await getTauriCore();
  if (!tauri) return null;

  try {
    const port = await tauri.invoke<number | null>('get_sidecar_port');
    return port;
  } catch (error) {
    console.error('Failed to get sidecar port:', error);
    return null;
  }
};

/**
 * Restart the sidecar process
 */
export const restartSidecar = async (): Promise<number | null> => {
  const tauri = await getTauriCore();
  if (!tauri) return null;

  try {
    const port = await tauri.invoke<number>('restart_sidecar');
    return port;
  } catch (error) {
    console.error('Failed to restart sidecar:', error);
    return null;
  }
};

/**
 * Get the API base URL
 * In Tauri, this will be the sidecar's localhost URL
 * In browser, this returns empty string (uses relative URLs with proxy)
 */
export const getApiBaseUrl = async (): Promise<string> => {
  if (!isTauri()) {
    // In browser mode, use relative URLs (vite proxy handles it)
    return '';
  }

  const port = await getSidecarPort();
  if (port) {
    return `http://localhost:${port}`;
  }

  // Fallback: wait for sidecar to be ready
  console.warn('Sidecar port not available yet, using default');
  return '';
};

// Lazy load updater plugin
let updaterPlugin: typeof import('@tauri-apps/plugin-updater') | null = null;

const getUpdaterPlugin = async () => {
  if (!updaterPlugin && isTauri()) {
    updaterPlugin = await import('@tauri-apps/plugin-updater');
  }
  return updaterPlugin;
};

/**
 * Update information
 */
export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  body?: string;
  date?: string;
}

/**
 * Check for updates (Tauri only)
 *
 * @returns Update information or null if no update available
 */
export const checkForUpdates = async (): Promise<UpdateInfo | null> => {
  const updater = await getUpdaterPlugin();
  if (!updater) {
    console.warn('Updater plugin not available');
    return null;
  }

  try {
    const update = await updater.check();

    if (update && update.available) {
      return {
        available: true,
        currentVersion: update.currentVersion,
        latestVersion: update.version,
        body: update.body,
        date: update.date,
      };
    }

    // No update available
    return {
      available: false,
      currentVersion: update?.currentVersion || 'unknown',
    };
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
};

/**
 * Download and install available update (Tauri only)
 *
 * @param onProgress Optional callback for download progress (0-100)
 * @returns true if update was successfully downloaded and will be installed on restart
 */
export const installUpdate = async (
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  const updater = await getUpdaterPlugin();
  if (!updater) {
    console.error('Updater plugin not available');
    return false;
  }

  try {
    const update = await updater.check();

    if (!update || !update.available) {
      console.log('No update available');
      return false;
    }

    // Download and install the update
    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0;
          console.log(`Update download started. Size: ${contentLength} bytes`);
          if (onProgress) onProgress(0);
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          const progress = contentLength > 0
            ? Math.round((downloaded / contentLength) * 100)
            : 0;
          console.log(`Update download progress: ${progress}%`);
          if (onProgress) onProgress(progress);
          break;
        case 'Finished':
          console.log('Update download finished');
          if (onProgress) onProgress(100);
          break;
      }
    });

    console.log('Update installed successfully. Restart to apply.');
    return true;
  } catch (error) {
    console.error('Failed to install update:', error);
    return false;
  }
};

/**
 * Restart the application (to apply updates)
 */
export const restartApp = async (): Promise<void> => {
  const tauri = await getTauriCore();
  if (!tauri) {
    console.error('Tauri not available');
    return;
  }

  try {
    await tauri.invoke('restart_app');
  } catch (error) {
    console.error('Failed to restart app:', error);
    // Fallback: reload the window
    window.location.reload();
  }
};
