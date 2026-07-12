//! Native library scanner boundary.
//!
//! The scanner only indexes file references. It does not mutate, execute or
//! inspect game file contents.

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::Instant,
};
use tauri::{AppHandle, Emitter, State};

const MAX_SCANNED_FILES: usize = 5_000;
const MAX_RECURSION_DEPTH: usize = 24;
const PS2_EXTENSIONS: [&str; 4] = [".iso", ".chd", ".bin", ".cue"];

pub struct LibraryWatcherState(pub Mutex<Option<RecommendedWatcher>>);

impl Default for LibraryWatcherState {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

#[tauri::command]
pub fn watch_library_folder(
    app: AppHandle,
    state: State<'_, LibraryWatcherState>,
    folder_path: String,
    recursive: bool,
) -> Result<(), String> {
    let requested_path = folder_path.trim();
    if requested_path.is_empty() {
        return Err("Informe uma pasta válida para monitorar.".into());
    }

    let canonical_root = PathBuf::from(requested_path)
        .canonicalize()
        .map_err(|_| "A pasta informada não existe ou não pode ser acessada.".to_string())?;

    if !canonical_root.is_dir() {
        return Err("O caminho monitorado precisa ser uma pasta.".into());
    }

    let event_app = app.clone();
    let mut watcher = notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
        let Ok(event) = result else { return };
        if matches!(
            event.kind,
            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
        ) {
            let _ = event_app.emit("library://changed", ());
        }
    })
    .map_err(|error| format!("Não foi possível iniciar o monitoramento: {error}"))?;

    watcher
        .watch(
            &canonical_root,
            if recursive {
                RecursiveMode::Recursive
            } else {
                RecursiveMode::NonRecursive
            },
        )
        .map_err(|error| format!("Não foi possível monitorar a pasta: {error}"))?;

    let mut active_watcher = state
        .0
        .lock()
        .map_err(|_| "O monitor da biblioteca está indisponível.".to_string())?;
    *active_watcher = Some(watcher);
    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRequestSnapshot {
    folder_path: String,
    platform: String,
    recursive: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedFile {
    path: String,
    file_name: String,
    extension: String,
    platform: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    request: ScanRequestSnapshot,
    files: Vec<ScannedFile>,
    ignored_count: usize,
    duration_milliseconds: u128,
    mocked: bool,
}

#[tauri::command]
pub fn scan_library_folder(
    folder_path: String,
    platform: String,
    recursive: bool,
) -> Result<ScanResult, String> {
    let started_at = Instant::now();
    let platform = platform.trim().to_uppercase();

    if platform != "PS2" {
        return Err("Scanner real disponível apenas para PS2 nesta versão.".into());
    }

    let requested_path = folder_path.trim();
    if requested_path.is_empty() {
        return Err("Informe uma pasta válida para escanear.".into());
    }

    let root = PathBuf::from(requested_path);
    let canonical_root = root
        .canonicalize()
        .map_err(|_| "A pasta informada não existe ou não pode ser acessada.".to_string())?;

    if !canonical_root.is_dir() {
        return Err("O caminho informado precisa ser uma pasta.".into());
    }

    let mut files = Vec::new();
    let mut ignored_count = 0;

    scan_directory(
        &canonical_root,
        &platform,
        recursive,
        0,
        &mut files,
        &mut ignored_count,
    )?;

    files.sort_by(|left, right| left.file_name.cmp(&right.file_name));

    Ok(ScanResult {
        request: ScanRequestSnapshot {
            folder_path: canonical_root.to_string_lossy().to_string(),
            platform,
            recursive,
        },
        files,
        ignored_count,
        duration_milliseconds: started_at.elapsed().as_millis(),
        mocked: false,
    })
}

fn scan_directory(
    directory: &Path,
    platform: &str,
    recursive: bool,
    depth: usize,
    files: &mut Vec<ScannedFile>,
    ignored_count: &mut usize,
) -> Result<(), String> {
    if depth > MAX_RECURSION_DEPTH {
        return Ok(());
    }

    let entries = fs::read_dir(directory)
        .map_err(|_| format!("Não foi possível ler a pasta: {}", directory.display()))?;

    for entry in entries {
        if files.len() >= MAX_SCANNED_FILES {
            break;
        }

        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => {
                *ignored_count += 1;
                continue;
            }
        };

        let path = entry.path();
        let metadata = match fs::symlink_metadata(&path) {
            Ok(metadata) => metadata,
            Err(_) => {
                *ignored_count += 1;
                continue;
            }
        };

        if metadata.file_type().is_symlink() {
            *ignored_count += 1;
            continue;
        }

        if metadata.is_dir() {
            if recursive {
                scan_directory(&path, platform, recursive, depth + 1, files, ignored_count)?;
            }
            continue;
        }

        if !metadata.is_file() {
            *ignored_count += 1;
            continue;
        }

        let Some(extension) = normalized_extension(&path) else {
            *ignored_count += 1;
            continue;
        };

        if !is_supported_extension(platform, &extension) {
            *ignored_count += 1;
            continue;
        }

        let file_name = path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string_lossy().to_string());

        files.push(ScannedFile {
            path: path.to_string_lossy().to_string(),
            file_name,
            extension,
            platform: platform.to_string(),
        });
    }

    Ok(())
}

fn normalized_extension(path: &Path) -> Option<String> {
    path.extension()
        .map(|extension| format!(".{}", extension.to_string_lossy().to_lowercase()))
}

fn is_supported_extension(platform: &str, extension: &str) -> bool {
    match platform {
        "PS2" => PS2_EXTENSIONS.contains(&extension),
        _ => false,
    }
}
