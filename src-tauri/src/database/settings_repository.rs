use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub minimize_to_tray: bool,
    pub check_for_updates: bool,
    pub emulator_paths: EmulatorPaths,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct EmulatorPaths {
    #[serde(rename = "PS2")]
    pub ps2: Option<String>,
    #[serde(rename = "PS3")]
    pub ps3: Option<String>,
}

pub fn ensure_defaults(connection: &Connection, discovered_pcsx2_path: Option<&str>) -> Result<()> {
    connection.execute(
        "INSERT OR IGNORE INTO app_settings(id, pcsx2_path) VALUES (1, ?1)",
        [discovered_pcsx2_path],
    )?;
    Ok(())
}

pub fn get(connection: &Connection) -> Result<AppSettings> {
    connection.query_row(
        "SELECT theme, language, minimize_to_tray, check_for_updates, pcsx2_path, rpcs3_path
         FROM app_settings WHERE id = 1",
        [],
        |row| {
            Ok(AppSettings {
                theme: row.get(0)?,
                language: row.get(1)?,
                minimize_to_tray: row.get::<_, i64>(2)? != 0,
                check_for_updates: row.get::<_, i64>(3)? != 0,
                emulator_paths: EmulatorPaths {
                    ps2: row.get(4)?,
                    ps3: row.get(5)?,
                },
            })
        },
    )
}

pub fn save(connection: &Connection, settings: &AppSettings) -> Result<()> {
    connection.execute(
        "UPDATE app_settings SET
            theme = ?1,
            language = ?2,
            minimize_to_tray = ?3,
            check_for_updates = ?4,
            pcsx2_path = ?5,
            rpcs3_path = ?6,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = 1",
        params![
            settings.theme,
            settings.language,
            settings.minimize_to_tray,
            settings.check_for_updates,
            settings.emulator_paths.ps2,
            settings.emulator_paths.ps3,
        ],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;

    #[test]
    fn persists_and_reads_settings() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        migrations::run(&connection).expect("migrations");
        ensure_defaults(&connection, Some("F:\\PCSX2\\pcsx2-qt.exe")).expect("defaults");

        let mut settings = get(&connection).expect("read defaults");
        assert_eq!(
            settings.emulator_paths.ps2.as_deref(),
            Some("F:\\PCSX2\\pcsx2-qt.exe")
        );

        settings.minimize_to_tray = true;
        settings.theme = "system".to_owned();
        save(&connection, &settings).expect("save settings");

        assert_eq!(get(&connection).expect("read settings"), settings);
    }
}
