# Peek

Peek is a lightweight Windows tray application for seeing GitHub pull requests that need your review and open pull requests you authored.

## Current behavior

- Starts hidden with no taskbar entry and lives in the notification area.
- Left-clicking the tray icon toggles a compact popup; clicking elsewhere hides it.
- Authenticates with GitHub OAuth Device Flow and stores credentials in Windows Credential Manager.
- Fetches review-requested and authored PRs in one GraphQL request.
- Shows draft, review, CI/check, and last-updated information.
- Opens validated `https://github.com/<owner>/<repo>/pull/<number>` links in the default browser.
- Provides **Refresh**, **Open GitHub**, and **Quit** from the tray menu.

Persistent PR caching, scheduled refresh, tray attention state, and launch-at-startup belong to later phases.

## Screenshot

_Screenshot placeholder._

## Architecture

```text
React UI
   │
   ├── useGitHubAuth ── github/auth.ts ── Tauri invoke ── Credential Manager
   │                              │
   └── usePullRequests ── GitHub client/query/normalizer
                                  │
                                  ▼
                         Tauri HTTP plugin
                                  │
                                  ▼
                         GitHub OAuth/GraphQL
```

OAuth, token rotation, GitHub requests, response validation, PR normalization, and UI state are TypeScript responsibilities. Rust treats the credential bundle as an opaque string and contains no GitHub business logic or networking.

## Requirements

- Windows 10 or 11
- Node.js 20 or newer
- pnpm 10.15.1 (or Corepack)
- Stable Rust with the MSVC toolchain
- Microsoft C++ Build Tools and WebView2
- A GitHub OAuth App client ID

## GitHub OAuth setup

1. Create a GitHub OAuth App under **Settings → Developer settings → OAuth Apps**.
2. Enable **Device Flow** for the app. The callback URL is not used by Device Flow.
3. Copy `.env.example` to `.env.local`.
4. Set the public client ID:

```dotenv
VITE_GITHUB_CLIENT_ID=your_public_client_id
```

No client secret is used or distributed. `.env` files are ignored; OAuth tokens are never read from environment variables.

Device Flow is an intentional v1 tradeoff. GitHub recommends authorization-code flow with PKCE for GUI clients, but GitHub's token and refresh exchanges require a client secret. A public desktop binary cannot keep that secret confidential without a backend.

Peek requests the OAuth `repo` scope to include private repositories. GitHub OAuth Apps do not offer a pull-request-read-only scope for private repositories, so this permission is broader than Peek's functionality. A future broadly distributed release may migrate to a GitHub App or a backend-assisted flow.

## Credential security

Access and refresh tokens are held only inside the TypeScript authentication module while the process runs. The complete credential bundle is stored as one generic credential in Windows Credential Manager.

When GitHub rotates a refresh token, Peek validates the complete replacement and overwrites the credential bundle in one operation. It never stores access and refresh tokens separately. Signing out removes the local credential; users can revoke the OAuth authorization from GitHub settings.

## Local development

```powershell
corepack pnpm install
corepack pnpm tauri dev
```

The app starts in the notification area. Open the notification-area overflow if Windows hides the icon.

## Checks

```powershell
corepack pnpm lint
corepack pnpm test
corepack pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Build a Windows installer

Set `VITE_GITHUB_CLIENT_ID` for the release environment, then run:

```powershell
corepack pnpm tauri build
```

The NSIS installer is written under `src-tauri/target/release/bundle/nsis/`.

## Project structure

```text
src/
├── components/       Compact popup, authentication, and PR presentation
├── github/           OAuth, HTTP client, query, validation, and normalization
├── hooks/            Separate authentication and PR-data React hooks
├── native/tray.ts    Tray menu, popup positioning, and window lifecycle
└── types/            Small normalized PR model

src-tauri/
├── capabilities/     Narrow URL, HTTP, tray, and window permissions
└── src/
    ├── credentials.rs  Opaque Windows Credential Manager bridge
    ├── lib.rs          Tauri initialization and command registration
    └── main.rs         Executable entry point
```

## Why is Rust used?

Tauri requires a Rust host. Phase 4 also needs OS-backed credential storage, so a small native bridge calls Windows Credential Manager. TypeScript cannot securely access that store through a browser API, and Tauri does not provide an official Windows Credential Manager plugin.

The bridge exposes only `get_github_credentials`, `set_github_credentials`, and `delete_github_credentials`. Rust does not deserialize the stored JSON, inspect tokens, refresh OAuth sessions, make GitHub requests, or model pull requests.

## Rust code overview

- `main.rs` starts Peek and suppresses the extra console window in Windows release builds.
- `lib.rs` initializes Tauri, the official HTTP/opener plugins, the Windows credential store, and the three credential commands.
- `credentials.rs` stores, retrieves, or deletes one opaque string using Windows Credential Manager.
- `build.rs` is Tauri's standard build-time configuration hook.
