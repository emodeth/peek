mod commands;
mod platform;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|_| {
            platform::credential_store::initialize()?;
            Ok(())
        })
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::credentials::get_github_credentials,
            commands::credentials::set_github_credentials,
            commands::credentials::delete_github_credentials
        ])
        .run(tauri::generate_context!())
        .expect("error while running Peek");
}
