use std::path::PathBuf;

use chrono::{DateTime, Duration as ChronoDuration, Utc};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

/// OAuth credentials containing the JWT tokens issued by the remote OAuth service.
/// The `access_token` is short-lived; `refresh_token` allows minting a new pair.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credentials {
    pub access_token: Option<String>,
    pub refresh_token: String,
    pub expires_at: Option<DateTime<Utc>>,
}

impl Credentials {
    pub fn expires_soon(&self, leeway: ChronoDuration) -> bool {
        match (self.access_token.as_ref(), self.expires_at.as_ref()) {
            (Some(_), Some(exp)) => Utc::now() + leeway >= *exp,
            _ => true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredCredentials {
    refresh_token: String,
}

impl From<StoredCredentials> for Credentials {
    fn from(value: StoredCredentials) -> Self {
        Self {
            access_token: None,
            refresh_token: value.refresh_token,
            expires_at: None,
        }
    }
}

/// Service for managing OAuth credentials (JWT tokens) in memory and persistent storage.
/// The token is loaded into memory on startup and persisted to disk/keychain on save.
pub struct OAuthCredentials {
    backend: Backend,
    inner: RwLock<Option<Credentials>>,
}

impl OAuthCredentials {
    pub fn new(path: PathBuf) -> Self {
        Self {
            backend: Backend::detect(path),
            inner: RwLock::new(None),
        }
    }

    pub async fn load(&self) -> std::io::Result<()> {
        let creds = self.backend.load().await?.map(Credentials::from);
        *self.inner.write().await = creds;
        Ok(())
    }

    pub async fn save(&self, creds: &Credentials) -> std::io::Result<()> {
        let stored = StoredCredentials {
            refresh_token: creds.refresh_token.clone(),
        };
        self.backend.save(&stored).await?;
        *self.inner.write().await = Some(creds.clone());
        Ok(())
    }

    pub async fn clear(&self) -> std::io::Result<()> {
        self.backend.clear().await?;
        *self.inner.write().await = None;
        Ok(())
    }

    pub async fn get(&self) -> Option<Credentials> {
        self.inner.read().await.clone()
    }
}

trait StoreBackend {
    async fn load(&self) -> std::io::Result<Option<StoredCredentials>>;
    async fn save(&self, creds: &StoredCredentials) -> std::io::Result<()>;
    async fn clear(&self) -> std::io::Result<()>;
}

enum Backend {
    File(FileBackend),
    #[cfg(target_os = "macos")]
    Keychain(KeychainBackend),
    Keyring(KeyringBackend),
}

impl Backend {
    fn detect(path: PathBuf) -> Self {
        let backend_choice = std::env::var("OAUTH_CREDENTIALS_BACKEND")
            .ok()
            .map(|v| v.to_lowercase());

        match backend_choice.as_deref() {
            Some("file") => {
                tracing::info!("OAuth credentials backend: file (forced by env)");
                Backend::File(FileBackend { path })
            }
            Some("keyring") => {
                tracing::info!("OAuth credentials backend: keyring (forced by env)");
                Backend::Keyring(KeyringBackend)
            }
            #[cfg(target_os = "macos")]
            Some("keychain") => {
                tracing::info!("OAuth credentials backend: macos keychain (forced by env)");
                Backend::Keychain(KeychainBackend)
            }
            _ => {
                // Default behavior: use keyring in production, file in debug
                if cfg!(debug_assertions) {
                    tracing::info!("OAuth credentials backend: file (debug mode)");
                    Backend::File(FileBackend { path })
                } else {
                    tracing::info!("OAuth credentials backend: keyring (production mode)");
                    Backend::Keyring(KeyringBackend)
                }
            }
        }
    }
}

impl StoreBackend for Backend {
    async fn load(&self) -> std::io::Result<Option<StoredCredentials>> {
        match self {
            Backend::File(b) => b.load().await,
            #[cfg(target_os = "macos")]
            Backend::Keychain(b) => b.load().await,
            Backend::Keyring(b) => b.load().await,
        }
    }

    async fn save(&self, creds: &StoredCredentials) -> std::io::Result<()> {
        match self {
            Backend::File(b) => b.save(creds).await,
            #[cfg(target_os = "macos")]
            Backend::Keychain(b) => b.save(creds).await,
            Backend::Keyring(b) => b.save(creds).await,
        }
    }

    async fn clear(&self) -> std::io::Result<()> {
        match self {
            Backend::File(b) => b.clear().await,
            #[cfg(target_os = "macos")]
            Backend::Keychain(b) => b.clear().await,
            Backend::Keyring(b) => b.clear().await,
        }
    }
}

struct FileBackend {
    path: PathBuf,
}

impl FileBackend {
    async fn load(&self) -> std::io::Result<Option<StoredCredentials>> {
        if !self.path.exists() {
            return Ok(None);
        }

        let bytes = std::fs::read(&self.path)?;
        match Self::parse_credentials(&bytes) {
            Ok(creds) => Ok(Some(creds)),
            Err(e) => {
                tracing::warn!(?e, "failed to parse credentials file, renaming to .bad");
                let bad = self.path.with_extension("bad");
                let _ = std::fs::rename(&self.path, bad);
                Ok(None)
            }
        }
    }

    fn parse_credentials(bytes: &[u8]) -> Result<StoredCredentials, serde_json::Error> {
        serde_json::from_slice::<StoredCredentials>(bytes)
    }

    async fn save(&self, creds: &StoredCredentials) -> std::io::Result<()> {
        let tmp = self.path.with_extension("tmp");

        let file = {
            let mut opts = std::fs::OpenOptions::new();
            opts.create(true).truncate(true).write(true);

            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                opts.mode(0o600);
            }

            opts.open(&tmp)?
        };

        serde_json::to_writer_pretty(&file, creds)?;
        file.sync_all()?;
        drop(file);

        std::fs::rename(&tmp, &self.path)?;
        Ok(())
    }

    async fn clear(&self) -> std::io::Result<()> {
        let _ = std::fs::remove_file(&self.path);
        Ok(())
    }
}

#[cfg(target_os = "macos")]
struct KeychainBackend;

#[cfg(target_os = "macos")]
impl KeychainBackend {
    const SERVICE_NAME: &'static str = concat!(env!("CARGO_PKG_NAME"), ":oauth");
    const ACCOUNT_NAME: &'static str = "default";
    const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;

    async fn load(&self) -> std::io::Result<Option<StoredCredentials>> {
        use security_framework::passwords::get_generic_password;

        match get_generic_password(Self::SERVICE_NAME, Self::ACCOUNT_NAME) {
            Ok(bytes) => match serde_json::from_slice::<StoredCredentials>(&bytes) {
                Ok(creds) => Ok(Some(creds)),
                Err(error) => {
                    tracing::warn!(
                        ?error,
                        "failed to parse keychain credentials; ignoring entry and requiring re-login"
                    );
                    Ok(None)
                }
            },
            Err(e) if e.code() == Self::ERR_SEC_ITEM_NOT_FOUND => Ok(None),
            Err(e) => Err(std::io::Error::other(e)),
        }
    }

    async fn save(&self, creds: &StoredCredentials) -> std::io::Result<()> {
        use security_framework::passwords::set_generic_password;

        let bytes = serde_json::to_vec_pretty(creds).map_err(std::io::Error::other)?;
        set_generic_password(Self::SERVICE_NAME, Self::ACCOUNT_NAME, &bytes)
            .map_err(std::io::Error::other)
    }

    async fn clear(&self) -> std::io::Result<()> {
        use security_framework::passwords::delete_generic_password;

        match delete_generic_password(Self::SERVICE_NAME, Self::ACCOUNT_NAME) {
            Ok(()) => Ok(()),
            Err(e) if e.code() == Self::ERR_SEC_ITEM_NOT_FOUND => Ok(()),
            Err(e) => Err(std::io::Error::other(e)),
        }
    }
}

/// Cross-platform keyring backend using keyring-rs
///
/// This backend uses the OS-native credential storage:
/// - macOS: Keychain
/// - Windows: Credential Manager
/// - Linux: Secret Service (libsecret)
struct KeyringBackend;

impl KeyringBackend {
    const SERVICE_NAME: &'static str = "ai.anyon.desktop";
    const ACCOUNT_NAME: &'static str = "oauth_credentials";

    fn get_entry(&self) -> Result<keyring::Entry, std::io::Error> {
        keyring::Entry::new(Self::SERVICE_NAME, Self::ACCOUNT_NAME)
            .map_err(|e| std::io::Error::other(format!("Failed to create keyring entry: {}", e)))
    }

    async fn load(&self) -> std::io::Result<Option<StoredCredentials>> {
        let entry = self.get_entry()?;

        match entry.get_password() {
            Ok(json) => match serde_json::from_str::<StoredCredentials>(&json) {
                Ok(creds) => Ok(Some(creds)),
                Err(error) => {
                    tracing::warn!(
                        ?error,
                        "failed to parse keyring credentials; ignoring entry and requiring re-login"
                    );
                    Ok(None)
                }
            },
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(std::io::Error::other(format!(
                "Failed to load from keyring: {}",
                e
            ))),
        }
    }

    async fn save(&self, creds: &StoredCredentials) -> std::io::Result<()> {
        let entry = self.get_entry()?;
        let json =
            serde_json::to_string_pretty(creds).map_err(|e| std::io::Error::other(e.to_string()))?;

        entry
            .set_password(&json)
            .map_err(|e| std::io::Error::other(format!("Failed to save to keyring: {}", e)))
    }

    async fn clear(&self) -> std::io::Result<()> {
        let entry = self.get_entry()?;

        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(std::io::Error::other(format!(
                "Failed to delete from keyring: {}",
                e
            ))),
        }
    }
}
