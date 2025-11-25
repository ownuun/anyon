/**
 * Credentials Migration Module
 *
 * Handles migration of credentials from the legacy file-based storage
 * (credentials.json) to the OS-native keychain.
 */

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::keychain::{KeychainResult, KeychainService};

/// Key used to store migrated credentials in keychain
const OAUTH_CREDENTIALS_KEY: &str = "oauth_credentials";

/// Key used to track migration status
const MIGRATION_STATUS_KEY: &str = "migration_completed";

/// Stored credentials format (matches backend's StoredCredentials)
#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredCredentials {
    refresh_token: String,
}

/// Migration result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationResult {
    pub migrated: bool,
    pub message: String,
}

/// Get the credentials file path
///
/// This matches the backend's credentials_path() function
fn get_credentials_path() -> PathBuf {
    let path = if cfg!(debug_assertions) {
        // Development mode: use dev_assets directory
        std::env::current_dir()
            .expect("Failed to get current directory")
            .join("../../dev_assets/credentials.json")
    } else {
        // Production mode: use platform-specific app data directory
        #[cfg(target_os = "macos")]
        {
            dirs::data_dir()
                .expect("Failed to get data directory")
                .join("ai.slit.anyon/credentials.json")
        }
        #[cfg(target_os = "windows")]
        {
            dirs::data_dir()
                .expect("Failed to get data directory")
                .join("ai/slit/anyon/credentials.json")
        }
        #[cfg(target_os = "linux")]
        {
            dirs::data_dir()
                .expect("Failed to get data directory")
                .join("anyon/credentials.json")
        }
    };

    path
}

/// Check if migration has already been completed
async fn is_migration_completed(keychain: &KeychainService) -> bool {
    keychain.exists(MIGRATION_STATUS_KEY)
}

/// Mark migration as completed
async fn mark_migration_completed(keychain: &KeychainService) -> KeychainResult<()> {
    keychain.set(MIGRATION_STATUS_KEY, "true")
}

/// Migrate credentials from file to keychain
///
/// This function:
/// 1. Checks if migration was already completed (idempotent)
/// 2. Looks for credentials.json file
/// 3. Reads and parses the credentials
/// 4. Stores them in the OS keychain
/// 5. Removes or clears the credentials file
/// 6. Marks migration as completed
///
/// # Returns
/// - `Ok(MigrationResult)` with details about the migration
pub async fn migrate_credentials_to_keychain(
    keychain: &KeychainService,
) -> Result<MigrationResult, String> {
    // Check if already migrated
    if is_migration_completed(keychain).await {
        tracing::debug!("Credentials migration already completed, skipping");
        return Ok(MigrationResult {
            migrated: false,
            message: "Migration already completed".to_string(),
        });
    }

    let creds_path = get_credentials_path();

    // Check if credentials file exists
    if !creds_path.exists() {
        tracing::info!("No credentials file found, marking migration as complete");
        mark_migration_completed(keychain)
            .await
            .map_err(|e| format!("Failed to mark migration as complete: {}", e))?;

        return Ok(MigrationResult {
            migrated: false,
            message: "No credentials file to migrate".to_string(),
        });
    }

    tracing::info!("Found credentials file, starting migration: {:?}", creds_path);

    // Read credentials file
    let content = match std::fs::read_to_string(&creds_path) {
        Ok(content) => content,
        Err(e) => {
            let msg = format!("Failed to read credentials file: {}", e);
            tracing::error!("{}", msg);
            return Err(msg);
        }
    };

    // Parse credentials
    let stored_creds: StoredCredentials = match serde_json::from_str(&content) {
        Ok(creds) => creds,
        Err(e) => {
            let msg = format!("Failed to parse credentials file: {}", e);
            tracing::error!("{}", msg);
            // Rename the bad file
            let bad_path = creds_path.with_extension("bad");
            if let Err(e) = std::fs::rename(&creds_path, &bad_path) {
                tracing::warn!("Failed to rename bad credentials file: {}", e);
            }
            return Err(msg);
        }
    };

    // Store in keychain as JSON
    match keychain.set_json(OAUTH_CREDENTIALS_KEY, &stored_creds) {
        Ok(_) => {
            tracing::info!("Successfully migrated credentials to keychain");
        }
        Err(e) => {
            let msg = format!("Failed to store credentials in keychain: {}", e);
            tracing::error!("{}", msg);
            return Err(msg);
        }
    }

    // Clear the credentials file (overwrite with empty JSON for security)
    match std::fs::write(&creds_path, "{}") {
        Ok(_) => {
            tracing::info!("Cleared credentials file");
        }
        Err(e) => {
            tracing::warn!("Failed to clear credentials file: {}", e);
            // This is not a fatal error - credentials are already in keychain
        }
    }

    // Mark migration as completed
    match mark_migration_completed(keychain).await {
        Ok(_) => {
            tracing::info!("Marked migration as completed");
        }
        Err(e) => {
            tracing::warn!("Failed to mark migration as completed: {}", e);
            // This is not a fatal error - migration succeeded
        }
    }

    Ok(MigrationResult {
        migrated: true,
        message: "Successfully migrated credentials to keychain".to_string(),
    })
}

/// Retrieve migrated OAuth credentials from keychain
///
/// This should be called by the backend to get credentials from the keychain
pub async fn get_oauth_credentials_from_keychain(
    keychain: &KeychainService,
) -> KeychainResult<Option<StoredCredentials>> {
    if !keychain.exists(OAUTH_CREDENTIALS_KEY) {
        return Ok(None);
    }

    match keychain.get_json::<StoredCredentials>(OAUTH_CREDENTIALS_KEY) {
        Ok(creds) => Ok(Some(creds)),
        Err(e) => {
            tracing::error!("Failed to retrieve credentials from keychain: {}", e);
            Err(e)
        }
    }
}

/// Store OAuth credentials in keychain
///
/// This can be called by the backend to store new credentials
pub async fn store_oauth_credentials_in_keychain(
    keychain: &KeychainService,
    refresh_token: String,
) -> KeychainResult<()> {
    let creds = StoredCredentials { refresh_token };
    keychain.set_json(OAUTH_CREDENTIALS_KEY, &creds)
}

/// Clear OAuth credentials from keychain
pub async fn clear_oauth_credentials_from_keychain(
    keychain: &KeychainService,
) -> KeychainResult<()> {
    keychain.delete(OAUTH_CREDENTIALS_KEY)
}

// ============================================================================
// Tauri IPC Commands
// ============================================================================

/// Migrate credentials from file to keychain (IPC command)
#[tauri::command]
pub async fn migrate_credentials(
    service: tauri::State<'_, KeychainService>,
) -> Result<MigrationResult, String> {
    migrate_credentials_to_keychain(&service).await
}

/// Get OAuth credentials from keychain (IPC command)
#[tauri::command]
pub async fn get_oauth_credentials(
    service: tauri::State<'_, KeychainService>,
) -> Result<Option<String>, String> {
    match get_oauth_credentials_from_keychain(&service).await {
        Ok(Some(creds)) => Ok(Some(creds.refresh_token)),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Store OAuth credentials in keychain (IPC command)
#[tauri::command]
pub async fn store_oauth_credentials(
    service: tauri::State<'_, KeychainService>,
    refresh_token: String,
) -> Result<(), String> {
    store_oauth_credentials_in_keychain(&service, refresh_token)
        .await
        .map_err(|e| e.to_string())
}

/// Clear OAuth credentials from keychain (IPC command)
#[tauri::command]
pub async fn clear_oauth_credentials(
    service: tauri::State<'_, KeychainService>,
) -> Result<(), String> {
    clear_oauth_credentials_from_keychain(&service)
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_migration_idempotent() {
        let keychain = KeychainService::with_service("ai.anyon.desktop.test.migration");

        // Clean up
        let _ = keychain.delete(MIGRATION_STATUS_KEY);
        let _ = keychain.delete(OAUTH_CREDENTIALS_KEY);

        // First migration should succeed (no file found)
        let result1 = migrate_credentials_to_keychain(&keychain).await.unwrap();
        assert!(!result1.migrated);

        // Second migration should skip
        let result2 = migrate_credentials_to_keychain(&keychain).await.unwrap();
        assert!(!result2.migrated);
        assert!(result2.message.contains("already completed"));

        // Clean up
        let _ = keychain.delete(MIGRATION_STATUS_KEY);
        let _ = keychain.delete(OAUTH_CREDENTIALS_KEY);
    }

    #[tokio::test]
    async fn test_oauth_credentials_storage() {
        let keychain = KeychainService::with_service("ai.anyon.desktop.test.oauth");
        let test_token = "test_refresh_token_12345";

        // Clean up
        let _ = clear_oauth_credentials_from_keychain(&keychain).await;

        // Should not exist initially
        let result = get_oauth_credentials_from_keychain(&keychain).await.unwrap();
        assert!(result.is_none());

        // Store credentials
        store_oauth_credentials_in_keychain(&keychain, test_token.to_string())
            .await
            .unwrap();

        // Retrieve credentials
        let result = get_oauth_credentials_from_keychain(&keychain).await.unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().refresh_token, test_token);

        // Clear credentials
        clear_oauth_credentials_from_keychain(&keychain).await.unwrap();

        // Should not exist after clear
        let result = get_oauth_credentials_from_keychain(&keychain).await.unwrap();
        assert!(result.is_none());
    }
}
