use std::path::Path;

use tauri::State;

use crate::{
    database::{settings_repository, Database},
    emulators::pcsx2::{path_to_string, resolve_pcsx2_executable},
};

pub use settings_repository::AppSettings;

#[tauri::command]
pub fn get_settings(database: State<'_, Database>) -> Result<AppSettings, String> {
    database
        .with_connection(settings_repository::get)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_settings(
    database: State<'_, Database>,
    mut settings: AppSettings,
) -> Result<AppSettings, String> {
    settings.emulator_paths.ps2 = normalize_pcsx2_path(settings.emulator_paths.ps2.as_deref())?;

    database
        .with_connection(|connection| settings_repository::save(connection, &settings))
        .map_err(|error| error.to_string())?;

    Ok(settings)
}

fn normalize_pcsx2_path(path: Option<&str>) -> Result<Option<String>, String> {
    let Some(path) = path.map(str::trim).filter(|path| !path.is_empty()) else {
        return Ok(None);
    };

    resolve_pcsx2_executable(Path::new(path)).map(|path| Some(path_to_string(&path)))
}
