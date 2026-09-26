use keyring_core::{Entry, Error, Result as KeyringResult};

const SERVICE: &str = "dev.emode.peek";
const ACCOUNT: &str = "github-oauth";

/// Installs the Windows Credential Manager implementation before any entries are used.
pub(crate) fn initialize() -> KeyringResult<()> {
    let store = windows_native_keyring_store::Store::new()?;
    keyring_core::set_default_store(store);
    Ok(())
}

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT)
        .map_err(|_| "Could not access Windows Credential Manager.".to_string())
}

pub(crate) fn get() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(credentials) => Ok(Some(credentials)),
        Err(Error::NoEntry) => Ok(None),
        Err(_) => Err("Could not read GitHub credentials.".to_string()),
    }
}

pub(crate) fn set(credentials: &str) -> Result<(), String> {
    entry()?
        .set_password(credentials)
        .map_err(|_| "Could not save GitHub credentials.".to_string())
}

pub(crate) fn delete() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(_) => Err("Could not delete GitHub credentials.".to_string()),
    }
}
