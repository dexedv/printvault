use std::process::Command;
use std::sync::Mutex;
use tauri::State;

struct BackendState {
    process: Option<std::process::Child>,
    port: u16,
}

impl Default for BackendState {
    fn default() -> Self {
        Self {
            process: None,
            port: 8000,
        }
    }
}

#[tauri::command]
fn start_backend(state: State<'_, Mutex<BackendState>>) -> Result<String, String> {
    let mut backend_state = state.lock().map_err(|e| e.to_string())?;

    // Check if already running
    if backend_state.process.is_some() {
        return Ok(format!("http://localhost:{}", backend_state.port));
    }

    // Try multiple possible locations for backend
    let possible_paths = vec![
        std::path::PathBuf::from("C:\\Users\\domin\\Desktop\\Hompages\\stl-dashboard\\backend"),
        std::path::PathBuf::from(".\\backend"),
        std::path::PathBuf::from("../backend"),
    ];

    let mut backend_main: Option<std::path::PathBuf> = None;
    for path in &possible_paths {
        let main_py = path.join("main.py");
        if main_py.exists() {
            backend_main = Some(path.clone());
            break;
        }
    }

    // If not found, try to find it relative to executable
    if backend_main.is_none() {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let potential = parent.join("backend").join("main.py");
                if potential.exists() {
                    backend_main = Some(parent.join("backend"));
                }
            }
        }
    }

    // Start the backend process
    let current_dir = backend_main.as_deref().unwrap_or(std::path::Path::new("."));

    let child = Command::new("python")
        .arg("-m")
        .arg("uvicorn")
        .arg("main:app")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(backend_state.port.to_string())
        .current_dir(current_dir)
        .spawn();

    match child {
        Ok(process) => {
            backend_state.process = Some(process);
            Ok(format!("http://localhost:{}", backend_state.port))
        }
        Err(e) => Err(format!("Failed to start backend: {}", e))
    }
}

#[tauri::command]
fn stop_backend(state: State<'_, Mutex<BackendState>>) -> Result<(), String> {
    let mut backend_state = state.lock().map_err(|e| e.to_string())?;

    if let Some(mut process) = backend_state.process.take() {
        let _ = process.kill();
    }

    Ok(())
}

#[tauri::command]
fn check_backend(state: State<'_, Mutex<BackendState>>) -> Result<bool, String> {
    let backend_state = state.lock().map_err(|e| e.to_string())?;

    if backend_state.process.is_none() {
        return Ok(false);
    }

    // Try to connect to check if running
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build();

    match client {
        Ok(c) => {
            let url = format!("http://localhost:{}/health", backend_state.port);
            match c.get(&url).send() {
                Ok(resp) => Ok(resp.status().is_success()),
                Err(_) => Ok(false),
            }
        }
        Err(_) => Ok(false),
    }
}

#[tauri::command]
fn get_backend_url() -> String {
    "http://localhost:8000".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(BackendState::default()))
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            check_backend,
            get_backend_url
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
