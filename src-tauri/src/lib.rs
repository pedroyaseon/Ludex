mod commands;
mod launcher;
mod scanner;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::health_check,
            scanner::scan_library_folder,
            launcher::launch_game
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ludex");
}
