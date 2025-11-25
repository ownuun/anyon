/**
 * OS Keychain Integration for Frontend
 *
 * This module provides a convenient API for storing and retrieving
 * credentials securely in the OS-native keychain via Tauri.
 *
 * Features:
 * - Secure credential storage in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 * - Automatic fallback to localStorage in browser mode
 * - TypeScript-friendly API with error handling
 */

import { isTauri } from './tauri';

// Lazy load Tauri API
let tauriCore: typeof import('@tauri-apps/api/core') | null = null;

const getTauriCore = async () => {
  if (!tauriCore && isTauri()) {
    tauriCore = await import('@tauri-apps/api/core');
  }
  return tauriCore;
};

/**
 * Error class for keychain operations
 */
export class KeychainError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'KeychainError';
  }
}

/**
 * Keychain service for secure credential storage
 */
export class KeychainService {
  private useFallback: boolean;

  constructor() {
    this.useFallback = !isTauri();
  }

  /**
   * Store a credential securely
   *
   * In Tauri mode: Stores in OS keychain
   * In browser mode: Falls back to localStorage (less secure, for development only)
   *
   * @param key - Unique identifier for the credential
   * @param value - Credential value to store
   * @throws {KeychainError} If storage fails
   *
   * @example
   * ```ts
   * const keychain = new KeychainService();
   * await keychain.set('github_token', 'ghp_xxxxxxxxxxxx');
   * ```
   */
  async set(key: string, value: string): Promise<void> {
    if (this.useFallback) {
      return this.setFallback(key, value);
    }

    const tauri = await getTauriCore();
    if (!tauri) {
      throw new KeychainError('Tauri not available');
    }

    try {
      await tauri.invoke('keychain_set', { key, value });
    } catch (error) {
      throw new KeychainError(`Failed to store credential: ${key}`, error);
    }
  }

  /**
   * Retrieve a credential
   *
   * @param key - Unique identifier for the credential
   * @returns The credential value
   * @throws {KeychainError} If credential not found or retrieval fails
   *
   * @example
   * ```ts
   * const keychain = new KeychainService();
   * const token = await keychain.get('github_token');
   * ```
   */
  async get(key: string): Promise<string> {
    if (this.useFallback) {
      return this.getFallback(key);
    }

    const tauri = await getTauriCore();
    if (!tauri) {
      throw new KeychainError('Tauri not available');
    }

    try {
      return await tauri.invoke<string>('keychain_get', { key });
    } catch (error) {
      throw new KeychainError(`Failed to retrieve credential: ${key}`, error);
    }
  }

  /**
   * Delete a credential
   *
   * @param key - Unique identifier for the credential to delete
   * @throws {KeychainError} If deletion fails
   *
   * @example
   * ```ts
   * const keychain = new KeychainService();
   * await keychain.delete('github_token');
   * ```
   */
  async delete(key: string): Promise<void> {
    if (this.useFallback) {
      return this.deleteFallback(key);
    }

    const tauri = await getTauriCore();
    if (!tauri) {
      throw new KeychainError('Tauri not available');
    }

    try {
      await tauri.invoke('keychain_delete', { key });
    } catch (error) {
      throw new KeychainError(`Failed to delete credential: ${key}`, error);
    }
  }

  /**
   * Check if a credential exists
   *
   * @param key - Unique identifier for the credential
   * @returns `true` if the credential exists, `false` otherwise
   *
   * @example
   * ```ts
   * const keychain = new KeychainService();
   * if (await keychain.exists('github_token')) {
   *   console.log('Token exists!');
   * }
   * ```
   */
  async exists(key: string): Promise<boolean> {
    if (this.useFallback) {
      return this.existsFallback(key);
    }

    const tauri = await getTauriCore();
    if (!tauri) {
      return false;
    }

    try {
      return await tauri.invoke<boolean>('keychain_exists', { key });
    } catch (error) {
      console.error('Failed to check credential existence:', error);
      return false;
    }
  }

  /**
   * Store a JSON-serializable value
   *
   * @param key - Unique identifier for the value
   * @param value - Any JSON-serializable value
   * @throws {KeychainError} If serialization or storage fails
   *
   * @example
   * ```ts
   * const keychain = new KeychainService();
   * await keychain.setJSON('user_config', { theme: 'dark', lang: 'en' });
   * ```
   */
  async setJSON<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      await this.set(key, json);
    } catch (error) {
      throw new KeychainError(
        `Failed to serialize and store JSON: ${key}`,
        error
      );
    }
  }

  /**
   * Retrieve a JSON-serializable value
   *
   * @param key - Unique identifier for the value
   * @returns The deserialized value
   * @throws {KeychainError} If retrieval or deserialization fails
   *
   * @example
   * ```ts
   * const keychain = new KeychainService();
   * const config = await keychain.getJSON<UserConfig>('user_config');
   * ```
   */
  async getJSON<T>(key: string): Promise<T> {
    try {
      const json = await this.get(key);
      return JSON.parse(json) as T;
    } catch (error) {
      throw new KeychainError(
        `Failed to retrieve and parse JSON: ${key}`,
        error
      );
    }
  }

  // Fallback methods for browser mode (localStorage)
  // These are less secure and should only be used for development

  private setFallback(key: string, value: string): void {
    try {
      localStorage.setItem(`anyon_keychain_${key}`, value);
    } catch (error) {
      throw new KeychainError(
        `Failed to store in localStorage: ${key}`,
        error
      );
    }
  }

  private getFallback(key: string): string {
    const value = localStorage.getItem(`anyon_keychain_${key}`);
    if (value === null) {
      throw new KeychainError(`Credential not found: ${key}`);
    }
    return value;
  }

  private deleteFallback(key: string): void {
    localStorage.removeItem(`anyon_keychain_${key}`);
  }

  private existsFallback(key: string): boolean {
    return localStorage.getItem(`anyon_keychain_${key}`) !== null;
  }
}

// Singleton instance for convenience
let keychainInstance: KeychainService | null = null;

/**
 * Get the singleton keychain service instance
 *
 * @example
 * ```ts
 * import { getKeychain } from './lib/keychain';
 *
 * const keychain = getKeychain();
 * await keychain.set('token', 'secret');
 * ```
 */
export const getKeychain = (): KeychainService => {
  if (!keychainInstance) {
    keychainInstance = new KeychainService();
  }
  return keychainInstance;
};

// Convenience functions for direct use

/**
 * Store a credential in the keychain
 */
export const keychainSet = async (
  key: string,
  value: string
): Promise<void> => {
  return getKeychain().set(key, value);
};

/**
 * Retrieve a credential from the keychain
 */
export const keychainGet = async (key: string): Promise<string> => {
  return getKeychain().get(key);
};

/**
 * Delete a credential from the keychain
 */
export const keychainDelete = async (key: string): Promise<void> => {
  return getKeychain().delete(key);
};

/**
 * Check if a credential exists in the keychain
 */
export const keychainExists = async (key: string): Promise<boolean> => {
  return getKeychain().exists(key);
};

/**
 * Store a JSON value in the keychain
 */
export const keychainSetJSON = async <T>(
  key: string,
  value: T
): Promise<void> => {
  return getKeychain().setJSON(key, value);
};

/**
 * Retrieve a JSON value from the keychain
 */
export const keychainGetJSON = async <T>(key: string): Promise<T> => {
  return getKeychain().getJSON<T>(key);
};
