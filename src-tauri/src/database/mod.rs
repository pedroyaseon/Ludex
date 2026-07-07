pub mod migrations;
pub mod settings_repository;

use std::{fmt, fs, path::PathBuf, sync::Mutex};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::emulators::pcsx2::{
    discover_pcsx2_executable, path_to_string, resolve_pcsx2_executable,
};

#[derive(Debug)]
pub enum DatabaseError {
    Io(std::io::Error),
    Sqlite(rusqlite::Error),
    Tauri(tauri::Error),
    LockPoisoned,
}

impl fmt::Display for DatabaseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "filesystem error: {error}"),
            Self::Sqlite(error) => write!(formatter, "sqlite error: {error}"),
            Self::Tauri(error) => write!(formatter, "tauri path error: {error}"),
            Self::LockPoisoned => formatter.write_str("database lock was poisoned"),
        }
    }
}

impl std::error::Error for DatabaseError {}

impl From<std::io::Error> for DatabaseError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<rusqlite::Error> for DatabaseError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Sqlite(error)
    }
}

impl From<tauri::Error> for DatabaseError {
    fn from(error: tauri::Error) -> Self {
        Self::Tauri(error)
    }
}

pub struct Database {
    connection: Mutex<Connection>,
    path: PathBuf,
}

impl Database {
    pub fn initialize(app: &AppHandle) -> Result<Self, DatabaseError> {
        let data_directory = app.path().app_data_dir()?;
        fs::create_dir_all(&data_directory)?;
        let path = data_directory.join("ludex.db");
        let connection = Connection::open(&path)?;

        migrations::run(&connection)?;

        let detected_path = discover_pcsx2_executable().map(|path| path_to_string(&path));
        settings_repository::ensure_defaults(&connection, detected_path.as_deref())?;
        normalize_stored_pcsx2_path(&connection)?;

        Ok(Self {
            connection: Mutex::new(connection),
            path,
        })
    }

    pub fn with_connection<T>(
        &self,
        operation: impl FnOnce(&Connection) -> Result<T, rusqlite::Error>,
    ) -> Result<T, DatabaseError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| DatabaseError::LockPoisoned)?;
        operation(&connection).map_err(DatabaseError::from)
    }

    pub fn path(&self) -> &PathBuf {
        &self.path
    }
}

fn normalize_stored_pcsx2_path(connection: &Connection) -> Result<(), DatabaseError> {
    let mut settings = settings_repository::get(connection)?;
    let Some(configured_path) = settings.emulator_paths.ps2.as_deref() else {
        return Ok(());
    };

    let Ok(resolved_path) = resolve_pcsx2_executable(configured_path.as_ref()) else {
        return Ok(());
    };

    let normalized_path = path_to_string(&resolved_path);
    if normalized_path != configured_path {
        settings.emulator_paths.ps2 = Some(normalized_path);
        settings_repository::save(connection, &settings)?;
    }

    Ok(())
}
