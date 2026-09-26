#[cfg(windows)]
mod credentials;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_| {
            #[cfg(windows)]
            keyring_core::set_default_store(windows_native_keyring_store::Store::new()?);

            Ok(())
        })
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            credentials::get_github_credentials,
            credentials::set_github_credentials,
            credentials::delete_github_credentials
        ])
        .run(tauri::generate_context!())
        .expect("error while running Peek");
}
