pub(crate) mod settings;

#[tauri::command]
pub fn health_check() -> &'static str {
    "Ludex native layer is ready"
}
