//! Native desktop dialogs and safe local reveal helpers.
//!
//! These commands keep file-system choices local to the machine. They do not
//! read game contents, upload paths, or execute anything.

use std::path::PathBuf;

#[tauri::command]
pub fn pick_folder(default_path: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();

    if let Some(path) = default_path.and_then(|value| existing_directory(&value)) {
        dialog = dialog.set_directory(path);
    }

    Ok(dialog
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn pick_executable(default_path: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new().add_filter("Windows executable", &["exe"]);

    if let Some(path) = default_path.as_deref().and_then(existing_dialog_directory) {
        dialog = dialog.set_directory(path);
    }

    let selected = dialog.pick_file();

    if let Some(path) = selected.as_ref() {
        let extension = path
            .extension()
            .map(|value| value.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        if extension != "exe" {
            return Err("Selecione um executável .exe.".into());
        }
    }

    Ok(selected.map(|path| path.to_string_lossy().to_string()))
}

fn existing_directory(path: &str) -> Option<PathBuf> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return None;
    }

    let path = PathBuf::from(trimmed_path);
    if path.is_dir() {
        return Some(path);
    }

    None
}

fn existing_dialog_directory(path: &str) -> Option<PathBuf> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return None;
    }

    let path = PathBuf::from(trimmed_path);
    if path.is_dir() {
        return Some(path);
    }

    path.parent()
        .filter(|parent| parent.is_dir())
        .map(|parent| parent.to_path_buf())
}
