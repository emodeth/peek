use keyring_core::{Entry, Error};

const SERVICE: &str = "dev.emode.peek";
const ACCOUNT: &str = "github-oauth";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT)
        .map_err(|_| "Could not access Windows Credential Manager.".to_string())
}

// Rust deliberately treats this value as opaque. OAuth parsing and refresh
// behavior belong to the TypeScript authentication module.
#[tauri::command]
pub fn get_github_credentials() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(credentials) => Ok(Some(credentials)),
        Err(Error::NoEntry) => Ok(None),
        Err(_) => Err("Could not read GitHub credentials.".to_string()),
    }
}

#[tauri::command]
pub fn set_github_credentials(credentials: String) -> Result<(), String> {
    entry()?
        .set_password(&credentials)
        .map_err(|_| "Could not save GitHub credentials.".to_string())
}

#[tauri::command]
pub fn delete_github_credentials() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(_) => Err("Could not delete GitHub credentials.".to_string()),
    }
}
