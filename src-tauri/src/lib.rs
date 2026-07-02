mod commands;
mod database;
mod emulators;
mod launcher;
mod scanner;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let database = database::Database::initialize(&app.handle())?;
            println!("Ludex database ready at {}", database.path().display());
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::health_check,
            commands::settings::get_settings,
            commands::settings::save_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ludex");
}
