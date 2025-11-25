/**
 * OS Keychain Integration Module
 *
 * This module provides secure credential storage using the OS-native keychain:
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service (libsecret)
 */

use keyring::Entry;
use tauri::State;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fmt;

/// Service name for keychain entries
const SERVICE_NAME: &str = "ai.anyon.desktop";

#[derive(Debug)]
pub enum KeychainError {
    /// Entry not found in keychain
    NotFound,
    /// Access denied or permission error
    AccessDenied,
    /// Platform-specific keychain error
    PlatformError(String),
    /// Invalid key or value
    InvalidInput(String),
}

impl fmt::Display for KeychainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            KeychainError::NotFound => write!(f, "Credential not found in keychain"),
            KeychainError::AccessDenied => write!(f, "Access denied to keychain"),
            KeychainError::PlatformError(msg) => write!(f, "Keychain error: {}", msg),
            KeychainError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}

impl Error for KeychainError {}

impl From<keyring::Error> for KeychainError {
    fn from(err: keyring::Error) -> Self {
        match err {
            keyring::Error::NoEntry => KeychainError::NotFound,
            keyring::Error::PlatformFailure(msg) => KeychainError::PlatformError(msg.to_string()),
            _ => KeychainError::PlatformError(err.to_string()),
        }
    }
}

/// Result type for keychain operations
pub type KeychainResult<T> = Result<T, KeychainError>;

/// Keychain service for secure credential storage
#[derive(Debug, Clone)]
pub struct KeychainService {
    service: String,
}

impl KeychainService {
    /// Create a new keychain service with default service name
    pub fn new() -> Self {
        Self {
            service: SERVICE_NAME.to_string(),
        }
    }

    /// Create a new keychain service with custom service name
    pub fn with_service(service: impl Into<String>) -> Self {
        Self {
            service: service.into(),
        }
    }

    /// Get entry for a key
    fn get_entry(&self, key: &str) -> KeychainResult<Entry> {
        Entry::new(&self.service, key).map_err(KeychainError::from)
    }

    /// Store a credential in the keychain
    ///
    /// # Arguments
    /// * `key` - Unique identifier for the credential
    /// * `value` - Credential value to store (will be stored securely)
    ///
    /// # Example
    /// ```
    /// let keychain = KeychainService::new();
    /// keychain.set("github_token", "ghp_xxxxxxxxxxxx")?;
    /// ```
    pub fn set(&self, key: &str, value: &str) -> KeychainResult<()> {
        if key.is_empty() {
            return Err(KeychainError::InvalidInput("Key cannot be empty".to_string()));
        }

        let entry = self.get_entry(key)?;
        entry.set_password(value).map_err(KeychainError::from)?;

        tracing::info!("Stored credential in keychain: {}", key);
        Ok(())
    }

    /// Retrieve a credential from the keychain
    ///
    /// # Arguments
    /// * `key` - Unique identifier for the credential
    ///
    /// # Returns
    /// The credential value if found, or `KeychainError::NotFound` if not present
    ///
    /// # Example
    /// ```
    /// let keychain = KeychainService::new();
    /// let token = keychain.get("github_token")?;
    /// ```
    pub fn get(&self, key: &str) -> KeychainResult<String> {
        if key.is_empty() {
            return Err(KeychainError::InvalidInput("Key cannot be empty".to_string()));
        }

        let entry = self.get_entry(key)?;
        let password = entry.get_password().map_err(KeychainError::from)?;

        tracing::debug!("Retrieved credential from keychain: {}", key);
        Ok(password)
    }

    /// Delete a credential from the keychain
    ///
    /// # Arguments
    /// * `key` - Unique identifier for the credential to delete
    ///
    /// # Example
    /// ```
    /// let keychain = KeychainService::new();
    /// keychain.delete("github_token")?;
    /// ```
    pub fn delete(&self, key: &str) -> KeychainResult<()> {
        if key.is_empty() {
            return Err(KeychainError::InvalidInput("Key cannot be empty".to_string()));
        }

        let entry = self.get_entry(key)?;
        entry.delete_credential().map_err(KeychainError::from)?;

        tracing::info!("Deleted credential from keychain: {}", key);
        Ok(())
    }

    /// Check if a credential exists in the keychain
    ///
    /// # Arguments
    /// * `key` - Unique identifier for the credential
    ///
    /// # Returns
    /// `true` if the credential exists, `false` otherwise
    pub fn exists(&self, key: &str) -> bool {
        if key.is_empty() {
            return false;
        }

        match self.get_entry(key) {
            Ok(entry) => entry.get_password().is_ok(),
            Err(_) => false,
        }
    }

    /// Store a JSON-serializable value in the keychain
    ///
    /// # Arguments
    /// * `key` - Unique identifier for the value
    /// * `value` - Any serializable value to store
    pub fn set_json<T: Serialize>(&self, key: &str, value: &T) -> KeychainResult<()> {
        let json = serde_json::to_string(value)
            .map_err(|e| KeychainError::InvalidInput(format!("Failed to serialize: {}", e)))?;
        self.set(key, &json)
    }

    /// Retrieve a JSON-serializable value from the keychain
    ///
    /// # Arguments
    /// * `key` - Unique identifier for the value
    ///
    /// # Returns
    /// The deserialized value if found and valid
    pub fn get_json<T: for<'de> Deserialize<'de>>(&self, key: &str) -> KeychainResult<T> {
        let json = self.get(key)?;
        serde_json::from_str(&json)
            .map_err(|e| KeychainError::InvalidInput(format!("Failed to deserialize: {}", e)))
    }
}

impl Default for KeychainService {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Tauri IPC Commands
// ============================================================================

/// Store a credential in the OS keychain
///
/// # Arguments
/// * `key` - Unique identifier for the credential
/// * `value` - Credential value to store securely
#[tauri::command]
pub fn keychain_set(
    service: State<KeychainService>,
    key: String,
    value: String,
) -> Result<(), String> {
    service.set(&key, &value).map_err(|e| e.to_string())
}

/// Retrieve a credential from the OS keychain
///
/// # Arguments
/// * `key` - Unique identifier for the credential
///
/// # Returns
/// The credential value or an error if not found
#[tauri::command]
pub fn keychain_get(service: State<KeychainService>, key: String) -> Result<String, String> {
    service.get(&key).map_err(|e| e.to_string())
}

/// Delete a credential from the OS keychain
///
/// # Arguments
/// * `key` - Unique identifier for the credential to delete
#[tauri::command]
pub fn keychain_delete(service: State<KeychainService>, key: String) -> Result<(), String> {
    service.delete(&key).map_err(|e| e.to_string())
}

/// Check if a credential exists in the OS keychain
///
/// # Arguments
/// * `key` - Unique identifier for the credential
///
/// # Returns
/// `true` if the credential exists, `false` otherwise
#[tauri::command]
pub fn keychain_exists(service: State<KeychainService>, key: String) -> bool {
    service.exists(&key)
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_KEY: &str = "anyon_test_key";
    const TEST_VALUE: &str = "test_secret_value";

    fn get_test_service() -> KeychainService {
        KeychainService::with_service("ai.anyon.desktop.test")
    }

    fn cleanup(service: &KeychainService, key: &str) {
        let _ = service.delete(key);
    }

    #[test]
    fn test_set_and_get() {
        let service = get_test_service();
        cleanup(&service, TEST_KEY);

        // Set a value
        service.set(TEST_KEY, TEST_VALUE).expect("Failed to set value");

        // Get the value back
        let retrieved = service.get(TEST_KEY).expect("Failed to get value");
        assert_eq!(retrieved, TEST_VALUE);

        // Cleanup
        cleanup(&service, TEST_KEY);
    }

    #[test]
    fn test_delete() {
        let service = get_test_service();
        cleanup(&service, TEST_KEY);

        // Set a value
        service.set(TEST_KEY, TEST_VALUE).expect("Failed to set value");

        // Verify it exists
        assert!(service.exists(TEST_KEY));

        // Delete it
        service.delete(TEST_KEY).expect("Failed to delete value");

        // Verify it's gone
        assert!(!service.exists(TEST_KEY));
    }

    #[test]
    fn test_get_nonexistent() {
        let service = get_test_service();
        cleanup(&service, "nonexistent_key");

        // Try to get a non-existent key
        let result = service.get("nonexistent_key");
        assert!(matches!(result, Err(KeychainError::NotFound)));
    }

    #[test]
    fn test_exists() {
        let service = get_test_service();
        cleanup(&service, TEST_KEY);

        // Should not exist initially
        assert!(!service.exists(TEST_KEY));

        // Set a value
        service.set(TEST_KEY, TEST_VALUE).expect("Failed to set value");

        // Should exist now
        assert!(service.exists(TEST_KEY));

        // Cleanup
        cleanup(&service, TEST_KEY);
    }

    #[test]
    fn test_empty_key() {
        let service = get_test_service();

        // Empty key should fail
        let result = service.set("", TEST_VALUE);
        assert!(matches!(result, Err(KeychainError::InvalidInput(_))));

        let result = service.get("");
        assert!(matches!(result, Err(KeychainError::InvalidInput(_))));

        let result = service.delete("");
        assert!(matches!(result, Err(KeychainError::InvalidInput(_))));
    }

    #[test]
    fn test_json_storage() {
        #[derive(Debug, Serialize, Deserialize, PartialEq)]
        struct TestData {
            token: String,
            expires_at: u64,
        }

        let service = get_test_service();
        let test_key = "anyon_test_json";
        cleanup(&service, test_key);

        let data = TestData {
            token: "ghp_test123".to_string(),
            expires_at: 1234567890,
        };

        // Store JSON
        service.set_json(test_key, &data).expect("Failed to set JSON");

        // Retrieve JSON
        let retrieved: TestData = service.get_json(test_key).expect("Failed to get JSON");
        assert_eq!(retrieved, data);

        // Cleanup
        cleanup(&service, test_key);
    }

    #[test]
    fn test_overwrite() {
        let service = get_test_service();
        cleanup(&service, TEST_KEY);

        // Set initial value
        service.set(TEST_KEY, "value1").expect("Failed to set value1");
        assert_eq!(service.get(TEST_KEY).unwrap(), "value1");

        // Overwrite with new value
        service.set(TEST_KEY, "value2").expect("Failed to set value2");
        assert_eq!(service.get(TEST_KEY).unwrap(), "value2");

        // Cleanup
        cleanup(&service, TEST_KEY);
    }
}
