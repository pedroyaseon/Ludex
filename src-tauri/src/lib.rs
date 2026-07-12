mod commands;
mod launcher;
mod metadata;
mod native_dialogs;
mod scanner;

use std::{fs, io, path::Path};
use tauri::Manager;

const LEGACY_APP_IDENTIFIER: &str = "com.ludex.desktop";

fn copy_missing_directory(source: &Path, destination: &Path, depth: u8) -> io::Result<()> {
    if depth > 16 {
        return Ok(());
    }

    fs::create_dir_all(destination)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        if file_type.is_symlink() {
            continue;
        }

        let target = destination.join(entry.file_name());
        if file_type.is_dir() {
            copy_missing_directory(&entry.path(), &target, depth + 1)?;
        } else if file_type.is_file() && !target.exists() {
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

fn migrate_legacy_app_data(app: &tauri::App) {
    let Ok(current_directory) = app.path().app_local_data_dir() else {
        return;
    };
    let Some(parent) = current_directory.parent() else {
        return;
    };
    let legacy_directory = parent.join(LEGACY_APP_IDENTIFIER);

    if legacy_directory.is_dir() {
        let _ = copy_missing_directory(&legacy_directory, &current_directory, 0);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(scanner::LibraryWatcherState::default())
        .manage(metadata::igdb::IgdbState::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            migrate_legacy_app_data(app);
            tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?.build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::health_check,
            scanner::scan_library_folder,
            scanner::watch_library_folder,
            launcher::launch_game,
            metadata::fetch_game_metadata,
            metadata::is_rawg_configured,
            metadata::igdb::fetch_igdb_metadata,
            metadata::igdb::is_igdb_configured,
            native_dialogs::pick_folder,
            native_dialogs::pick_executable
        ])
        .run(tauri::generate_context!())
        .expect("error while running Arcadium");
}
