<p align="center">
  <img src="src-tauri/icons/128x128.png" width="96" height="96" alt="Peek logo">
</p>

<h1 align="center">Peek</h1>

<p align="center">
  Your GitHub pull requests, one click away from the Windows tray.
</p>

<p align="center">
  <a href="https://github.com/emodeth/peek/releases/latest"><strong>Download Peek for Windows</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/emodeth/peek/releases">All releases</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/emodeth/peek/issues">Report an issue</a>
</p>

## What is Peek?

Peek is a lightweight Windows tray app that keeps the pull requests needing your attention close at hand. Instead of repeatedly opening GitHub and searching through notifications, click the Peek icon to see the PRs waiting for your review and the open PRs you authored.

Peek stays out of the way when you do not need it: there is no permanent taskbar window, and the compact panel closes when you click elsewhere.

## At a glance

- See review requests and your authored pull requests in one place.
- Check draft, review, CI, and last-updated status without opening GitHub.
- Open any pull request directly in your default browser.
- Refresh, open GitHub, or quit from the tray menu.
- Sign in through GitHub's Device Flow; credentials are stored in Windows Credential Manager.

## Getting started

1. [Download the latest Windows release](https://github.com/emodeth/peek/releases/latest).
2. Run the installer and launch Peek.
3. Find the Peek icon in the notification area. Windows may place it in the overflow menu.
4. Click the icon and follow the GitHub sign-in instructions.

Peek currently supports Windows 10 and Windows 11. Persistent PR caching, scheduled refresh, tray attention states, and launch at startup are planned for later releases.

## Privacy and permissions

Peek communicates directly with GitHub and does not use a separate Peek account or backend. Access and refresh tokens are stored as a single credential bundle in Windows Credential Manager and are kept in memory only while Peek is running.

Peek requests GitHub's `repo` OAuth scope so it can show pull requests from private repositories. GitHub OAuth Apps do not provide a pull-request-read-only scope for private repositories, so this permission is broader than the actions Peek performs. Peek reads pull-request information; it does not edit repositories or pull requests.

Signing out removes the locally stored credential. You can also revoke Peek's authorization at any time from your GitHub settings.

---

## For contributors

Peek is built with React, TypeScript, Vite, Tauri, and a small Rust host. GitHub authentication, API requests, response validation, pull-request normalization, and UI state live in TypeScript. Rust handles the native application lifecycle and provides a narrow bridge to Windows Credential Manager.

### Requirements

- Windows 10 or 11
- Node.js 20 or newer
- pnpm 10.15.1, or Corepack
- Stable Rust with the MSVC toolchain
- Microsoft C++ Build Tools and WebView2
- A GitHub OAuth App client ID

### GitHub OAuth setup

1. Create a GitHub OAuth App under **Settings -> Developer settings -> OAuth Apps**.
2. Enable **Device Flow** for the app. Device Flow does not use the callback URL.
3. Copy `.env.example` to `.env.local`.
4. Add the public client ID:

```dotenv
VITE_GITHUB_CLIENT_ID=your_public_client_id
```

No client secret is used or distributed. Environment files are ignored by Git, and OAuth tokens are never read from environment variables.

Device Flow is an intentional early-release tradeoff. GitHub recommends authorization-code flow with PKCE for GUI clients, but its token and refresh exchanges require a client secret. A public desktop binary cannot keep that secret confidential without a backend. A future release may move to a GitHub App or a backend-assisted flow.

### Local development

```powershell
corepack pnpm install
corepack pnpm tauri dev
```

The app starts in the notification area. Open the notification-area overflow if Windows hides the icon.

### Checks

```powershell
corepack pnpm lint
corepack pnpm test
corepack pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

### Build the Windows installer

Set `VITE_GITHUB_CLIENT_ID` for the release environment, then run:

```powershell
corepack pnpm tauri build
```

The NSIS installer is written to `src-tauri/target/release/bundle/nsis/`.

## Architecture

```text
React UI
  |
  |-- useGitHubAuth ---- github/auth.ts ---- Tauri invoke ---- Credential Manager
  |                            |
  `-- usePullRequests ---- GitHub client/query/normalizer
                               |
                               v
                       Tauri HTTP plugin
                               |
                               v
                       GitHub OAuth/GraphQL
```

OAuth, token rotation, GitHub requests, response validation, PR normalization, and UI state are TypeScript responsibilities. Rust treats the credential bundle as an opaque string and contains no GitHub business logic or networking.

### Project structure

```text
src/
|-- components/       Compact popup, authentication, and PR presentation
|-- github/           OAuth, HTTP client, query, validation, and normalization
|-- hooks/            Separate authentication and PR-data React hooks
|-- native/tray.ts    Tray menu, popup positioning, and window lifecycle
`-- types/            Small normalized PR model

src-tauri/
|-- capabilities/       Narrow URL, HTTP, tray, and window permissions
`-- src/
    |-- commands/        Frontend-facing Tauri IPC commands
    |-- platform/        Windows and other OS-specific adapters
    |-- lib.rs           Tauri setup and dependency composition
    `-- main.rs          Minimal executable entry point
```

### Why Rust?

Tauri requires a Rust host. Peek also needs OS-backed credential storage, so a small native bridge calls Windows Credential Manager. TypeScript cannot securely access that store through a browser API, and Tauri does not provide an official Windows Credential Manager plugin.

The bridge exposes only `get_github_credentials`, `set_github_credentials`, and `delete_github_credentials`. Rust does not deserialize the stored JSON, inspect tokens, refresh OAuth sessions, make GitHub requests, or model pull requests.

### Rust code overview

- `main.rs` starts Peek and suppresses the extra console window in Windows release builds.
- `lib.rs` composes Tauri, the official HTTP/opener plugins, the platform adapter, and command registration.
- `commands/` defines the narrow IPC boundary used by the frontend.
- `platform/credential_store.rs` stores, retrieves, or deletes one opaque string using Windows Credential Manager.
- `build.rs` is Tauri's standard build-time configuration hook.
