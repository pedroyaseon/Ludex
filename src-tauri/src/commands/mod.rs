#[tauri::command]
pub fn health_check() -> &'static str {
    "Arcadium native layer is ready"
}
