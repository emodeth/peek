# Peek

A lightweight Windows system tray application for monitoring GitHub pull requests, providing at-a-glance review and CI statuses with instant access to active PRs.

> Foundation status: Phases 1 and 2 are implemented with mocked pull request content. GitHub authentication and API access are intentionally not implemented yet.

## Screenshot

_Screenshot placeholder — add a capture after the foundation UI is reviewed._

## Current behavior

- Starts silently with no visible window or taskbar entry.
- Left-clicking the tray icon toggles a 380 × 510 pixel popup near the icon.
- Clicking elsewhere hides the popup without stopping the process.
- Right-clicking the tray icon shows **Refresh**, **Open GitHub**, and **Quit**.
- The popup shows mocked pull request data and follows the Windows light/dark preference.

## Architecture

```text
React + TypeScript (mock data, UI, tray, menu, window behavior)
                  │
                  ▼
       Official Tauri JavaScript APIs
                  │
                  ▼
Small Rust entry point (Tauri host and plugin registration only)
```

The frontend owns UI state, presentation, tray behavior, and window lifecycle. Future GitHub models, requests, categorization, caching, and refresh rules will also stay in TypeScript.

## Requirements

- Windows 10 or 11
- Node.js 20 or newer
- Rust stable with the MSVC toolchain
- Microsoft C++ Build Tools and WebView2 (normally present on current Windows systems)

## Local development

```powershell
pnpm install
pnpm tauri dev
```

The application starts in the notification area. If the tray icon is hidden by Windows, open the notification-area overflow.

## Checks

```powershell
pnpm lint
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Build a Windows installer

```powershell
pnpm install
pnpm tauri build
```

Tauri writes the NSIS installer under `src-tauri/target/release/bundle/nsis/`.

## Authentication

Authentication is not part of the foundation phase. A later phase will use a GitHub-supported desktop flow and OS-backed credential storage. Tokens will not be stored in localStorage, source files, distributed `.env` files, or the normal data cache.

## Project structure

```text
peek/
├── src/
│   ├── native/tray.ts       Tray, menu, positioning, and window lifecycle
│   └── ...                  React popup and styles
├── src-tauri/
│   ├── capabilities/        Minimal Tauri window permission set
│   ├── icons/               Application and tray icon assets
│   ├── src/lib.rs           Tauri initialization and plugin registration
│   ├── src/main.rs          Small executable entry point
│   ├── build.rs             Standard Tauri build hook
│   ├── Cargo.toml           Rust dependencies
│   └── tauri.conf.json      Hidden popup/window and bundle config
├── index.html
├── package.json
└── vite.config.ts
```

## Why is Rust used?

Tauri itself is a Rust host application, so a tiny Rust entry point is required to start it and register the official URL opener plugin. Tauri's official JavaScript APIs cleanly support the tray, native menu, window position, focus events, hiding, and taskbar exclusion, so all of that behavior remains in TypeScript.

All data and UI behavior that can reasonably live in TypeScript remains there. No pull request, GitHub, cache, authentication, or status logic is implemented in Rust.

## Rust code overview

- `src-tauri/src/main.rs` starts the application by calling the library's `run` function. Its only extra line suppresses a console window in Windows release builds.
- `src-tauri/src/lib.rs` creates the standard Tauri application and registers the official URL opener plugin. It contains no tray, window, GitHub, or UI logic.
- `src-tauri/build.rs` runs Tauri's standard build-time configuration generator.

The Rust is deliberately limited to a few initialization statements and uses no custom state, asynchronous runtime, GitHub types, tray behavior, or business logic. `src/native/tray.ts` contains the readable TypeScript implementation of the native shell behavior.
