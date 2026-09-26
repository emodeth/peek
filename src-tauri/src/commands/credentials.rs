use crate::platform::credential_store;

/// Returns the opaque GitHub credential bundle stored by the frontend.
#[tauri::command]
pub fn get_github_credentials() -> Result<Option<String>, String> {
    credential_store::get()
}

/// Persists the opaque GitHub credential bundle in the platform credential store.
#[tauri::command]
pub fn set_github_credentials(credentials: String) -> Result<(), String> {
    credential_store::set(&credentials)
}

/// Removes the GitHub credential bundle from the platform credential store.
#[tauri::command]
pub fn delete_github_credentials() -> Result<(), String> {
    credential_store::delete()
}
