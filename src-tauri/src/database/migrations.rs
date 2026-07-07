use rusqlite::{Connection, Result};

const MIGRATION_001: &str = r#"
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'system')),
    language TEXT NOT NULL DEFAULT 'pt-BR' CHECK (language IN ('pt-BR', 'en-US')),
    minimize_to_tray INTEGER NOT NULL DEFAULT 0 CHECK (minimize_to_tray IN (0, 1)),
    check_for_updates INTEGER NOT NULL DEFAULT 1 CHECK (check_for_updates IN (0, 1)),
    pcsx2_path TEXT,
    rpcs3_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emulators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('PS2', 'PS3')),
    executable_path TEXT,
    default_args TEXT,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emulators_default_platform
ON emulators(platform)
WHERE is_default = 1;

CREATE TABLE IF NOT EXISTS library_folders (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('PS2', 'PS3')),
    folder_path TEXT NOT NULL,
    recursive_scan INTEGER NOT NULL DEFAULT 1 CHECK (recursive_scan IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, folder_path)
);

CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('PS2', 'PS3')),
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    cover_url TEXT,
    cover_local_path TEXT,
    description TEXT,
    release_year INTEGER,
    genre TEXT,
    region TEXT,
    serial TEXT,
    last_played_at TEXT,
    playtime_seconds INTEGER NOT NULL DEFAULT 0 CHECK (playtime_seconds >= 0),
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_platform_title ON games(platform, title);
CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played_at DESC);

CREATE TABLE IF NOT EXISTS launch_profiles (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    emulator_id TEXT NOT NULL REFERENCES emulators(id) ON DELETE RESTRICT,
    fullscreen INTEGER NOT NULL DEFAULT 1 CHECK (fullscreen IN (0, 1)),
    custom_args TEXT,
    resolution_preset TEXT,
    controller_profile TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, emulator_id)
);

CREATE TABLE IF NOT EXISTS play_sessions (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    emulator_id TEXT NOT NULL REFERENCES emulators(id) ON DELETE RESTRICT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    exit_code INTEGER
);

CREATE INDEX IF NOT EXISTS idx_play_sessions_game_started
ON play_sessions(game_id, started_at DESC);

INSERT OR IGNORE INTO schema_migrations(version, name)
VALUES (1, 'initial_library_schema');
"#;

pub fn run(connection: &Connection) -> Result<()> {
    connection.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;",
    )?;
    connection.execute_batch(MIGRATION_001)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_the_initial_schema_idempotently() {
        let connection = Connection::open_in_memory().expect("in-memory database");

        run(&connection).expect("first migration run");
        run(&connection).expect("second migration run");

        let version: i64 = connection
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .expect("schema version");
        assert_eq!(version, 1);

        let table_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'table' AND name IN (
                   'app_settings', 'emulators', 'library_folders', 'games',
                   'launch_profiles', 'play_sessions'
                 )",
                [],
                |row| row.get(0),
            )
            .expect("domain tables");
        assert_eq!(table_count, 6);
    }
}
