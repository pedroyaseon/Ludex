use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::Serialize;
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Manager, State};

const DATABASE_FILE_NAME: &str = "arcadium.db";
const SCHEMA_VERSION: i64 = 1;
const MAX_RECORDS_PER_WRITE: usize = 10_000;
const MAX_JSON_BYTES: usize = 2 * 1024 * 1024;

pub struct DatabaseState {
    connection: Mutex<Connection>,
    path: PathBuf,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfo {
    schema_version: i64,
    journal_mode: String,
    game_count: i64,
    session_count: i64,
    size_bytes: u64,
    integrity_status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyMigrationReport {
    imported_games: usize,
    imported_sessions: usize,
    skipped: bool,
}

fn database_error(error: impl std::fmt::Display) -> String {
    format!("Falha no banco local do Arcadium: {error}")
}

fn required_string<'a>(
    record: &'a Value,
    field: &str,
    maximum_length: usize,
) -> Result<&'a str, String> {
    let value = record
        .get(field)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("Registro inválido: campo {field} ausente."))?;
    if value.is_empty() || value.len() > maximum_length {
        return Err(format!("Registro inválido: campo {field} fora do limite."));
    }
    Ok(value)
}

fn optional_string<'a>(
    record: &'a Value,
    field: &str,
    maximum_length: usize,
) -> Result<Option<&'a str>, String> {
    let Some(value) = record.get(field) else {
        return Ok(None);
    };
    if value.is_null() {
        return Ok(None);
    }
    let value = value
        .as_str()
        .ok_or_else(|| format!("Registro inválido: campo {field} deve ser texto."))?;
    if value.len() > maximum_length {
        return Err(format!("Registro inválido: campo {field} fora do limite."));
    }
    Ok(Some(value))
}

fn serialize_record(record: &Value) -> Result<String, String> {
    let json = serde_json::to_string(record).map_err(database_error)?;
    if json.len() > MAX_JSON_BYTES {
        return Err("Registro excede o limite seguro de 2 MB.".to_string());
    }
    Ok(json)
}

fn configure_connection(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
            PRAGMA temp_store = MEMORY;
            PRAGMA trusted_schema = OFF;
            ",
        )
        .map_err(database_error)
}

fn migrate_schema(connection: &mut Connection) -> Result<(), String> {
    let transaction = connection.transaction().map_err(database_error)?;
    transaction
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY NOT NULL,
                platform TEXT NOT NULL CHECK (platform IN ('PS2', 'PS3')),
                title TEXT NOT NULL,
                file_path TEXT NOT NULL UNIQUE COLLATE NOCASE,
                is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
                last_played_at TEXT,
                updated_at TEXT NOT NULL,
                data_json TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_games_platform_title
                ON games(platform, title COLLATE NOCASE);
            CREATE INDEX IF NOT EXISTS idx_games_favorite
                ON games(is_favorite, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_games_last_played
                ON games(last_played_at DESC);

            CREATE TABLE IF NOT EXISTS play_sessions (
                id TEXT PRIMARY KEY NOT NULL,
                game_id TEXT NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                is_active INTEGER NOT NULL CHECK (is_active IN (0, 1)),
                data_json TEXT NOT NULL,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_game_started
                ON play_sessions(game_id, started_at DESC);
            CREATE INDEX IF NOT EXISTS idx_sessions_active
                ON play_sessions(is_active, game_id);

            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY NOT NULL,
                value_json TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS metadata_cache (
                provider TEXT NOT NULL,
                cache_key TEXT NOT NULL,
                response_json TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (provider, cache_key)
            );

            CREATE INDEX IF NOT EXISTS idx_metadata_cache_expiry
                ON metadata_cache(expires_at);
            ",
        )
        .map_err(database_error)?;
    transaction
        .pragma_update(None, "user_version", SCHEMA_VERSION)
        .map_err(database_error)?;
    transaction.commit().map_err(database_error)?;
    connection
        .execute_batch("PRAGMA optimize;")
        .map_err(database_error)
}

pub fn initialize(app: &AppHandle) -> Result<DatabaseState, String> {
    let directory = app.path().app_local_data_dir().map_err(database_error)?;
    fs::create_dir_all(&directory).map_err(database_error)?;
    let path = directory.join(DATABASE_FILE_NAME);
    let mut connection = Connection::open(&path).map_err(database_error)?;
    configure_connection(&connection)?;
    migrate_schema(&mut connection)?;
    Ok(DatabaseState {
        connection: Mutex::new(connection),
        path,
    })
}

fn replace_games_in_transaction(
    transaction: &Transaction<'_>,
    games: &[Value],
) -> Result<(), String> {
    if games.len() > MAX_RECORDS_PER_WRITE {
        return Err("Quantidade de jogos excede o limite de segurança.".to_string());
    }
    transaction
        .execute_batch(
            "
            CREATE TEMP TABLE IF NOT EXISTS incoming_game_ids (
                id TEXT PRIMARY KEY NOT NULL
            );
            DELETE FROM incoming_game_ids;
            ",
        )
        .map_err(database_error)?;
    let mut id_statement = transaction
        .prepare_cached("INSERT INTO incoming_game_ids(id) VALUES (?1)")
        .map_err(database_error)?;
    let mut game_statement = transaction
        .prepare_cached(
            "
            INSERT INTO games (
                id, platform, title, file_path, is_favorite,
                last_played_at, updated_at, data_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(id) DO UPDATE SET
                platform = excluded.platform,
                title = excluded.title,
                file_path = excluded.file_path,
                is_favorite = excluded.is_favorite,
                last_played_at = excluded.last_played_at,
                updated_at = excluded.updated_at,
                data_json = excluded.data_json
            ",
        )
        .map_err(database_error)?;

    for game in games {
        let id = required_string(game, "id", 128)?;
        let platform = required_string(game, "platform", 8)?;
        if platform != "PS2" && platform != "PS3" {
            return Err("Plataforma inválida no catálogo.".to_string());
        }
        let title = required_string(game, "title", 512)?;
        let file_path = required_string(game, "filePath", 32_768)?;
        let updated_at = required_string(game, "updatedAt", 64)?;
        let last_played_at = optional_string(game, "lastPlayedAt", 64)?;
        let is_favorite = game
            .get("isFavorite")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let json = serialize_record(game)?;
        id_statement.execute([id]).map_err(database_error)?;
        game_statement
            .execute(params![
                id,
                platform,
                title,
                file_path,
                i64::from(is_favorite),
                last_played_at,
                updated_at,
                json
            ])
            .map_err(database_error)?;
    }
    drop(game_statement);
    drop(id_statement);
    transaction
        .execute(
            "DELETE FROM games WHERE id NOT IN (SELECT id FROM incoming_game_ids)",
            [],
        )
        .map_err(database_error)?;
    Ok(())
}

fn upsert_game_in_transaction(transaction: &Transaction<'_>, game: &Value) -> Result<(), String> {
    let id = required_string(game, "id", 128)?;
    let platform = required_string(game, "platform", 8)?;
    if platform != "PS2" && platform != "PS3" {
        return Err("Plataforma inválida no catálogo.".to_string());
    }
    let title = required_string(game, "title", 512)?;
    let file_path = required_string(game, "filePath", 32_768)?;
    let updated_at = required_string(game, "updatedAt", 64)?;
    let last_played_at = optional_string(game, "lastPlayedAt", 64)?;
    let is_favorite = game
        .get("isFavorite")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let json = serialize_record(game)?;
    transaction
        .execute(
            "
            INSERT INTO games (
                id, platform, title, file_path, is_favorite,
                last_played_at, updated_at, data_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(id) DO UPDATE SET
                platform = excluded.platform,
                title = excluded.title,
                file_path = excluded.file_path,
                is_favorite = excluded.is_favorite,
                last_played_at = excluded.last_played_at,
                updated_at = excluded.updated_at,
                data_json = excluded.data_json
            ",
            params![
                id,
                platform,
                title,
                file_path,
                i64::from(is_favorite),
                last_played_at,
                updated_at,
                json
            ],
        )
        .map_err(database_error)?;
    Ok(())
}

fn replace_sessions_in_transaction(
    transaction: &Transaction<'_>,
    sessions: &[Value],
    active: bool,
) -> Result<(), String> {
    if sessions.len() > MAX_RECORDS_PER_WRITE {
        return Err("Quantidade de sessões excede o limite de segurança.".to_string());
    }
    transaction
        .execute(
            "DELETE FROM play_sessions WHERE is_active = ?1",
            [i64::from(active)],
        )
        .map_err(database_error)?;
    let mut statement = transaction
        .prepare_cached(
            "
            INSERT INTO play_sessions (
                id, game_id, started_at, ended_at, is_active, data_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(id) DO UPDATE SET
                game_id = excluded.game_id,
                started_at = excluded.started_at,
                ended_at = excluded.ended_at,
                is_active = excluded.is_active,
                data_json = excluded.data_json
            ",
        )
        .map_err(database_error)?;

    for session in sessions {
        let id = required_string(session, "id", 128)?;
        let game_id = required_string(session, "gameId", 128)?;
        let started_at = required_string(session, "startedAt", 64)?;
        let ended_at = optional_string(session, "endedAt", 64)?;
        let json = serialize_record(session)?;
        statement
            .execute(params![
                id,
                game_id,
                started_at,
                ended_at,
                i64::from(active),
                json
            ])
            .map_err(database_error)?;
    }
    Ok(())
}

fn set_library_state_in_transaction(
    transaction: &Transaction<'_>,
    value: &Value,
) -> Result<(), String> {
    let json = serialize_record(value)?;
    transaction
        .execute(
            "
            INSERT INTO app_state(key, value_json, updated_at)
            VALUES ('library_state', ?1, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value_json = excluded.value_json,
                updated_at = CURRENT_TIMESTAMP
            ",
            [json],
        )
        .map_err(database_error)?;
    Ok(())
}

fn read_json_rows(
    connection: &Connection,
    query: &str,
    parameters: &[&dyn rusqlite::ToSql],
) -> Result<Vec<Value>, String> {
    let mut statement = connection.prepare_cached(query).map_err(database_error)?;
    let rows = statement
        .query_map(parameters, |row| row.get::<_, String>(0))
        .map_err(database_error)?;
    rows.map(|row| {
        let json = row.map_err(database_error)?;
        serde_json::from_str(&json).map_err(database_error)
    })
    .collect()
}

#[tauri::command]
pub fn database_list_games(state: State<'_, DatabaseState>) -> Result<Vec<Value>, String> {
    let connection = state.connection.lock().map_err(database_error)?;
    read_json_rows(
        &connection,
        "SELECT data_json FROM games ORDER BY updated_at DESC, title COLLATE NOCASE",
        &[],
    )
}

#[tauri::command]
pub fn database_get_game(
    id: String,
    state: State<'_, DatabaseState>,
) -> Result<Option<Value>, String> {
    if id.is_empty() || id.len() > 128 {
        return Err("Identificador de jogo inválido.".to_string());
    }
    let connection = state.connection.lock().map_err(database_error)?;
    let json = connection
        .query_row("SELECT data_json FROM games WHERE id = ?1", [id], |row| {
            row.get::<_, String>(0)
        })
        .optional()
        .map_err(database_error)?;
    json.map(|value| serde_json::from_str(&value).map_err(database_error))
        .transpose()
}

#[tauri::command]
pub fn database_replace_games(
    games: Vec<Value>,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    let mut connection = state.connection.lock().map_err(database_error)?;
    let transaction = connection.transaction().map_err(database_error)?;
    replace_games_in_transaction(&transaction, &games)?;
    transaction.commit().map_err(database_error)
}

#[tauri::command]
pub fn database_upsert_game(game: Value, state: State<'_, DatabaseState>) -> Result<(), String> {
    let mut connection = state.connection.lock().map_err(database_error)?;
    let transaction = connection.transaction().map_err(database_error)?;
    upsert_game_in_transaction(&transaction, &game)?;
    transaction.commit().map_err(database_error)
}

#[tauri::command]
pub fn database_list_sessions(
    active: bool,
    state: State<'_, DatabaseState>,
) -> Result<Vec<Value>, String> {
    let connection = state.connection.lock().map_err(database_error)?;
    read_json_rows(
        &connection,
        "
        SELECT data_json
        FROM play_sessions
        WHERE is_active = ?1
        ORDER BY started_at DESC
        ",
        &[&i64::from(active)],
    )
}

#[tauri::command]
pub fn database_replace_sessions(
    sessions: Vec<Value>,
    active: bool,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    let mut connection = state.connection.lock().map_err(database_error)?;
    let transaction = connection.transaction().map_err(database_error)?;
    replace_sessions_in_transaction(&transaction, &sessions, active)?;
    transaction.commit().map_err(database_error)
}

#[tauri::command]
pub fn database_get_library_state(
    state: State<'_, DatabaseState>,
) -> Result<Option<Value>, String> {
    let connection = state.connection.lock().map_err(database_error)?;
    let json = connection
        .query_row(
            "SELECT value_json FROM app_state WHERE key = 'library_state'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(database_error)?;
    json.map(|value| serde_json::from_str(&value).map_err(database_error))
        .transpose()
}

#[tauri::command]
pub fn database_set_library_state(
    value: Value,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    let mut connection = state.connection.lock().map_err(database_error)?;
    let transaction = connection.transaction().map_err(database_error)?;
    set_library_state_in_transaction(&transaction, &value)?;
    transaction.commit().map_err(database_error)
}

#[tauri::command]
pub fn database_clear_library(state: State<'_, DatabaseState>) -> Result<(), String> {
    let mut connection = state.connection.lock().map_err(database_error)?;
    let transaction = connection.transaction().map_err(database_error)?;
    transaction
        .execute("DELETE FROM games", [])
        .map_err(database_error)?;
    transaction
        .execute("DELETE FROM app_state WHERE key = 'library_state'", [])
        .map_err(database_error)?;
    transaction.commit().map_err(database_error)
}

#[tauri::command]
pub fn database_migrate_legacy(
    games: Vec<Value>,
    library_state: Option<Value>,
    sessions: Vec<Value>,
    active_sessions: Vec<Value>,
    state: State<'_, DatabaseState>,
) -> Result<LegacyMigrationReport, String> {
    let mut connection = state.connection.lock().map_err(database_error)?;
    let transaction = connection.transaction().map_err(database_error)?;
    let completed: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM app_state WHERE key = 'legacy_migration_v1')",
            [],
            |row| row.get(0),
        )
        .map_err(database_error)?;
    if completed {
        return Ok(LegacyMigrationReport {
            imported_games: 0,
            imported_sessions: 0,
            skipped: true,
        });
    }

    let game_count: i64 = transaction
        .query_row("SELECT COUNT(*) FROM games", [], |row| row.get(0))
        .map_err(database_error)?;
    let session_count: i64 = transaction
        .query_row("SELECT COUNT(*) FROM play_sessions", [], |row| row.get(0))
        .map_err(database_error)?;

    let imported_games = if game_count == 0 {
        replace_games_in_transaction(&transaction, &games)?;
        games.len()
    } else {
        0
    };
    let imported_sessions = if session_count == 0 {
        replace_sessions_in_transaction(&transaction, &sessions, false)?;
        replace_sessions_in_transaction(&transaction, &active_sessions, true)?;
        sessions.len() + active_sessions.len()
    } else {
        0
    };
    if let Some(value) = library_state {
        set_library_state_in_transaction(&transaction, &value)?;
    }
    transaction
        .execute(
            "
            INSERT INTO app_state(key, value_json)
            VALUES ('legacy_migration_v1', 'true')
            ",
            [],
        )
        .map_err(database_error)?;
    transaction.commit().map_err(database_error)?;

    Ok(LegacyMigrationReport {
        imported_games,
        imported_sessions,
        skipped: false,
    })
}

#[tauri::command]
pub fn database_info(state: State<'_, DatabaseState>) -> Result<DatabaseInfo, String> {
    let connection = state.connection.lock().map_err(database_error)?;
    let schema_version = connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(database_error)?;
    let journal_mode = connection
        .pragma_query_value(None, "journal_mode", |row| row.get(0))
        .map_err(database_error)?;
    let game_count = connection
        .query_row("SELECT COUNT(*) FROM games", [], |row| row.get(0))
        .map_err(database_error)?;
    let session_count = connection
        .query_row("SELECT COUNT(*) FROM play_sessions", [], |row| row.get(0))
        .map_err(database_error)?;
    let integrity_status = connection
        .pragma_query_value(None, "quick_check", |row| row.get(0))
        .map_err(database_error)?;
    let size_bytes = file_size(&state.path);
    Ok(DatabaseInfo {
        schema_version,
        journal_mode,
        game_count,
        session_count,
        size_bytes,
        integrity_status,
    })
}

fn file_size(path: &Path) -> u64 {
    fs::metadata(path)
        .map(|metadata| metadata.len())
        .unwrap_or(0)
}

#[tauri::command]
pub fn database_optimize(state: State<'_, DatabaseState>) -> Result<DatabaseInfo, String> {
    {
        let connection = state.connection.lock().map_err(database_error)?;
        connection
            .execute_batch(
                "
                PRAGMA optimize;
                PRAGMA wal_checkpoint(PASSIVE);
                ",
            )
            .map_err(database_error)?;
    }
    database_info(state)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn memory_database() -> Connection {
        let mut connection = Connection::open_in_memory().expect("database");
        configure_connection(&connection).expect("configure");
        migrate_schema(&mut connection).expect("migrate");
        connection
    }

    #[test]
    fn creates_schema_and_replaces_games_atomically() {
        let mut connection = memory_database();
        let game = serde_json::json!({
            "id": "game-1",
            "platform": "PS2",
            "title": "Black",
            "filePath": "F:\\ISOs PS2\\Black.iso",
            "updatedAt": "2026-07-23T00:00:00.000Z",
            "isFavorite": true
        });
        let transaction = connection.transaction().expect("transaction");
        replace_games_in_transaction(&transaction, &[game]).expect("replace");
        transaction.commit().expect("commit");
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM games", [], |row| row.get(0))
            .expect("count");
        assert_eq!(count, 1);
    }

    #[test]
    fn rejects_unknown_platforms() {
        let mut connection = memory_database();
        let game = serde_json::json!({
            "id": "game-1",
            "platform": "PS1",
            "title": "Unsupported",
            "filePath": "F:\\game.iso",
            "updatedAt": "2026-07-23T00:00:00.000Z"
        });
        let transaction = connection.transaction().expect("transaction");
        assert!(replace_games_in_transaction(&transaction, &[game]).is_err());
    }

    #[test]
    fn updating_the_catalog_preserves_existing_sessions() {
        let mut connection = memory_database();
        let game = serde_json::json!({
            "id": "game-1",
            "platform": "PS2",
            "title": "Black",
            "filePath": "F:\\ISOs PS2\\Black.iso",
            "updatedAt": "2026-07-23T00:00:00.000Z"
        });
        let session = serde_json::json!({
            "id": "session-1",
            "gameId": "game-1",
            "emulatorId": "pcsx2",
            "startedAt": "2026-07-23T00:00:00.000Z",
            "endedAt": "2026-07-23T00:10:00.000Z"
        });

        let transaction = connection.transaction().expect("transaction");
        replace_games_in_transaction(&transaction, std::slice::from_ref(&game))
            .expect("insert game");
        replace_sessions_in_transaction(&transaction, &[session], false).expect("insert session");
        transaction.commit().expect("commit");

        let transaction = connection.transaction().expect("transaction");
        replace_games_in_transaction(&transaction, &[game]).expect("update game");
        transaction.commit().expect("commit");

        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM play_sessions", [], |row| row.get(0))
            .expect("count");
        assert_eq!(count, 1);
    }
}
