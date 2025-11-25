use std::sync::Mutex;
use tauri::AppHandle;
use tauri_plugin_shell::{process::CommandChild, ShellExt};

/// State for managing the sidecar process
pub struct SidecarState {
    pub child: Mutex<Option<CommandChild>>,
    pub port: Mutex<Option<u16>>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
            port: Mutex::new(None),
        }
    }
}

/// Start the anyon-core sidecar process
pub async fn start_sidecar(app: &AppHandle) -> Result<u16, String> {
    let state = app.state::<SidecarState>();

    // Check if already running
    if state.port.lock().unwrap().is_some() {
        return Err("Sidecar is already running".to_string());
    }

    tracing::info!("Starting anyon-core sidecar...");

    let sidecar = app
        .shell()
        .sidecar("anyon-core")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;

    let (mut rx, child) = sidecar
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    // Parse port from stdout
    let port = parse_port_from_output(&mut rx).await?;

    // Store state
    *state.child.lock().unwrap() = Some(child);
    *state.port.lock().unwrap() = Some(port);

    tracing::info!("Sidecar started successfully on port {}", port);
    Ok(port)
}

/// Parse the port number from sidecar stdout
async fn parse_port_from_output(
    rx: &mut tauri_plugin_shell::process::CommandEvents,
) -> Result<u16, String> {
    use tauri_plugin_shell::process::CommandEvent;

    let timeout = tokio::time::Duration::from_secs(30);
    let start = tokio::time::Instant::now();

    while start.elapsed() < timeout {
        match tokio::time::timeout(tokio::time::Duration::from_millis(100), rx.recv()).await {
            Ok(Some(event)) => match event {
                CommandEvent::Stdout(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    tracing::debug!("Sidecar stdout: {}", line_str);

                    // Look for port in output (e.g., "Server running on port 12345")
                    if let Some(port) = extract_port(&line_str) {
                        return Ok(port);
                    }
                }
                CommandEvent::Stderr(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    tracing::debug!("Sidecar stderr: {}", line_str);

                    // Also check stderr for port info
                    if let Some(port) = extract_port(&line_str) {
                        return Ok(port);
                    }
                }
                CommandEvent::Error(e) => {
                    return Err(format!("Sidecar error: {}", e));
                }
                CommandEvent::Terminated(status) => {
                    return Err(format!("Sidecar terminated unexpectedly: {:?}", status));
                }
                _ => {}
            },
            Ok(None) => {
                return Err("Sidecar output channel closed".to_string());
            }
            Err(_) => {
                // Timeout on recv, continue waiting
                continue;
            }
        }
    }

    Err("Timeout waiting for sidecar to report port".to_string())
}

/// Extract port number from a line of output
fn extract_port(line: &str) -> Option<u16> {
    // Try to find "port" followed by a number
    let line_lower = line.to_lowercase();

    if line_lower.contains("port") {
        // Find digits after "port"
        if let Some(idx) = line_lower.find("port") {
            let after_port = &line[idx..];
            for word in after_port.split_whitespace() {
                if let Ok(port) = word.trim_matches(|c: char| !c.is_ascii_digit()).parse::<u16>() {
                    if port > 1000 {
                        return Some(port);
                    }
                }
            }
        }
    }

    // Also try to find "localhost:" or "127.0.0.1:" followed by port
    for prefix in ["localhost:", "127.0.0.1:", "0.0.0.0:"] {
        if let Some(idx) = line.find(prefix) {
            let after_prefix = &line[idx + prefix.len()..];
            if let Some(port_str) = after_prefix.split_whitespace().next() {
                if let Ok(port) = port_str.trim_matches(|c: char| !c.is_ascii_digit()).parse::<u16>() {
                    if port > 1000 {
                        return Some(port);
                    }
                }
            }
        }
    }

    None
}

/// Stop the sidecar process
pub fn stop_sidecar(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<SidecarState>();

    if let Some(child) = state.child.lock().unwrap().take() {
        tracing::info!("Stopping sidecar...");
        child.kill().map_err(|e| format!("Failed to kill sidecar: {}", e))?;
        *state.port.lock().unwrap() = None;
        tracing::info!("Sidecar stopped");
    }

    Ok(())
}

/// Tauri command: Get the current sidecar port
#[tauri::command]
pub fn get_sidecar_port(state: tauri::State<SidecarState>) -> Option<u16> {
    *state.port.lock().unwrap()
}

/// Tauri command: Restart the sidecar
#[tauri::command]
pub async fn restart_sidecar(app: AppHandle) -> Result<u16, String> {
    // Stop existing sidecar
    stop_sidecar(&app)?;

    // Start new sidecar
    start_sidecar(&app).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_port() {
        assert_eq!(extract_port("Server running on port 12345"), Some(12345));
        assert_eq!(extract_port("Listening on localhost:3000"), Some(3000));
        assert_eq!(extract_port("Started at 127.0.0.1:8080"), Some(8080));
        assert_eq!(extract_port("No port here"), None);
        assert_eq!(extract_port("PORT=5000 is set"), Some(5000));
    }
}
