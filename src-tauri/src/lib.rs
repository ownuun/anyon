mod keychain;
mod migration;
mod sidecar;
mod tray;

use tauri::Manager;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// Initialize logging
fn setup_logging() {
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    setup_logging();

    tracing::info!("Starting Anyon Desktop...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .manage(sidecar::SidecarState::default())
        .manage(keychain::KeychainService::new())
        .setup(|app| {
            let handle = app.handle().clone();
            let keychain = app.state::<keychain::KeychainService>();

            // Initialize system tray
            if let Err(e) = tray::init(&handle) {
                tracing::error!("Failed to initialize system tray: {}", e);
            }

            // Migrate credentials from file to keychain
            let keychain_for_migration = keychain.inner().clone();
            tauri::async_runtime::spawn(async move {
                match migration::migrate_credentials_to_keychain(&keychain_for_migration).await {
                    Ok(result) => {
                        if result.migrated {
                            tracing::info!("Credentials migration: {}", result.message);
                        } else {
                            tracing::debug!("Credentials migration: {}", result.message);
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to migrate credentials: {}", e);
                    }
                }
            });

            // Start sidecar on app launch
            tauri::async_runtime::spawn(async move {
                match sidecar::start_sidecar(&handle).await {
                    Ok(port) => {
                        tracing::info!("Sidecar started on port {}", port);
                    }
                    Err(e) => {
                        tracing::error!("Failed to start sidecar: {}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sidecar::get_sidecar_port,
            sidecar::restart_sidecar,
            keychain::keychain_set,
            keychain::keychain_get,
            keychain::keychain_delete,
            keychain::keychain_exists,
            migration::migrate_credentials,
            migration::get_oauth_credentials,
            migration::store_oauth_credentials,
            migration::clear_oauth_credentials,
            tray::toggle_window_visibility,
            tray::is_window_visible,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
