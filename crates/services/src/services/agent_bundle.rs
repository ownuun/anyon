use std::{
    fs,
    path::{Path, PathBuf},
};

use thiserror::Error;

#[derive(Debug, Clone)]
pub struct AgentBundleSettings {
    pub version: String,
    pub url: Option<String>,
    pub sha256: Option<String>,
    pub cache_dir: PathBuf,
}

impl AgentBundleSettings {
    pub fn from_env() -> Self {
        let version = std::env::var("ANYON_AGENT_BUNDLE_VERSION")
            .unwrap_or_else(|_| utils::version::APP_VERSION.to_string());

        let url = std::env::var("ANYON_AGENT_BUNDLE_URL").ok();
        let sha256 = std::env::var("ANYON_AGENT_BUNDLE_SHA256").ok();

        let cache_dir = std::env::var("ANYON_AGENT_BUNDLE_CACHE_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                dirs::cache_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join("anyon")
                    .join("agent-bundle")
            });

        Self {
            version,
            url,
            sha256,
            cache_dir,
        }
    }

    pub fn url_for_version(&self, version: &str) -> String {
        if let Some(url) = &self.url {
            return url.replace("{version}", version);
        }

        format!(
            "https://registry.npmjs.org/@anyon/agent-bundle/-/agent-bundle-{}.tgz",
            version
        )
    }
}

#[derive(Debug, Error)]
pub enum AgentBundleError {
    #[error("Bundle version not provided")]
    MissingVersion,
    #[error("Bundle destination is missing or not a directory")]
    DestinationMissing,
    #[error("Failed to download bundle: {0}")]
    Download(String),
    #[error("Checksum mismatch (expected {expected}, found {found})")]
    ChecksumMismatch { expected: String, found: String },
    #[error("Failed to decompress bundle: {0}")]
    Decompression(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone)]
pub struct AgentBundleImportResult {
    pub copied_files: usize,
    pub removed_entries: usize,
    pub version: String,
    pub bundle_root: PathBuf,
}

#[derive(Clone)]
pub struct AgentBundleService {
    settings: AgentBundleSettings,
}

impl AgentBundleService {
    pub fn new(settings: AgentBundleSettings) -> Self {
        Self {
            settings,
        }
    }

    pub async fn import_into_project(
        &self,
        project_root: &Path,
        version_override: Option<String>,
    ) -> Result<AgentBundleImportResult, AgentBundleError> {
        if !project_root.exists() || !project_root.is_dir() {
            return Err(AgentBundleError::DestinationMissing);
        }

        // Run npx anyon-agent in the project root
        let output = std::process::Command::new("npx")
            .arg("anyon-agent")
            .current_dir(project_root)
            .output()
            .map_err(|e| AgentBundleError::Download(format!("Failed to run npx anyon-agent: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AgentBundleError::Download(format!(
                "npx anyon-agent failed: {}",
                stderr
            )));
        }

        // npx anyon-agent has already extracted files to the project root
        let version = version_override.unwrap_or_else(|| self.settings.version.clone());

        // Count the files that were created (approximate)
        let result = AgentBundleImportResult {
            copied_files: 0, // npx anyon-agent handles file creation
            removed_entries: 0,
            version: version.clone(),
            bundle_root: project_root.to_path_buf(),
        };

        Ok(result)
    }

}



fn copy_dir_filtered(
    src: &Path,
    dest: &Path,
    result: &mut AgentBundleImportResult,
) -> Result<(), AgentBundleError> {
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let name = entry.file_name();
        if name == ".serena" {
            continue;
        }

        let src_path = entry.path();
        let dest_path = dest.join(&name);
        let file_type = entry.file_type()?;

        if file_type.is_dir() {
            if !dest_path.exists() {
                fs::create_dir_all(&dest_path)?;
            } else if dest_path.is_file() {
                fs::remove_file(&dest_path)?;
                result.removed_entries += 1;
                fs::create_dir_all(&dest_path)?;
            }

            copy_dir_filtered(&src_path, &dest_path, result)?;
        } else if file_type.is_file() || file_type.is_symlink() {
            if dest_path.exists() {
                if dest_path.is_dir() {
                    fs::remove_dir_all(&dest_path)?;
                } else {
                    fs::remove_file(&dest_path)?;
                }
                result.removed_entries += 1;
            } else if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent)?;
            }

            fs::copy(&src_path, &dest_path)?;
            result.copied_files += 1;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    use super::*;

    #[tokio::test]
    async fn skips_serena_and_overwrites_files() {
        let tmp = TempDir::new().unwrap();
        let cache_dir = tmp.path().join("cache");
        let version = "v-test";

        let extraction_dir = cache_dir.join(version).join("extracted").join("package");
        fs::create_dir_all(&extraction_dir).unwrap();

        // Source bundle contents
        fs::create_dir_all(extraction_dir.join("a")).unwrap();
        fs::write(extraction_dir.join("a").join("file.txt"), "from bundle").unwrap();
        fs::create_dir_all(extraction_dir.join(".serena")).unwrap();
        fs::write(extraction_dir.join(".serena").join("hidden.txt"), "ignore").unwrap();
        fs::write(extraction_dir.join("root.txt"), "root bundle").unwrap();

        // Destination project with pre-existing files
        let project_root = tmp.path().join("project");
        fs::create_dir_all(project_root.join("a")).unwrap();
        fs::write(project_root.join("a").join("file.txt"), "old").unwrap();
        fs::write(project_root.join("keep.txt"), "stay").unwrap();

        let settings = AgentBundleSettings {
            version: version.to_string(),
            url: None,
            sha256: None,
            cache_dir: cache_dir.clone(),
        };

        let service = AgentBundleService::new(settings);
        let result = service
            .import_into_project(&project_root, None)
            .await
            .expect("import should succeed");

        assert_eq!(result.copied_files, 2); // root.txt and a/file.txt
        assert_eq!(result.removed_entries, 1); // old a/file.txt replaced
        assert_eq!(result.version, version);

        let contents = fs::read_to_string(project_root.join("a").join("file.txt")).unwrap();
        assert_eq!(contents, "from bundle");
        assert!(project_root.join("root.txt").exists());
        // .serena should not be copied
        assert!(!project_root.join(".serena").exists());
        // Existing unrelated file remains
        assert_eq!(
            fs::read_to_string(project_root.join("keep.txt")).unwrap(),
            "stay"
        );
    }
}
