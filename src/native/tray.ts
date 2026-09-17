import { defaultWindowIcon } from "@tauri-apps/api/app";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { emit } from "@tauri-apps/api/event";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon, type TrayIconEvent } from "@tauri-apps/api/tray";
import {
  availableMonitors,
  getCurrentWindow,
  type Theme,
} from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import darkModeIconUrl from "../../src-tauri/icons/icon-dark.png?inline";
import lightModeIconUrl from "../../src-tauri/icons/icon-light.png?inline";

const POPUP_GAP = 8;
const GITHUB_PULLS_URL = "https://github.com/pulls";

let initialization: Promise<void> | null = null;
let focusLossTimer: ReturnType<typeof setTimeout> | null = null;
let isTrayLeftButtonDown = false;

function decodeDataUrl(dataUrl: string) {
  const encodedBytes = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = window.atob(encodedBytes);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

const trayIconBytes = {
  light: decodeDataUrl(lightModeIconUrl),
  dark: decodeDataUrl(darkModeIconUrl),
};

function getTrayIcon(theme: Theme) {
  return trayIconBytes[theme];
}

function cancelFocusLossHide() {
  if (focusLossTimer === null) return;

  clearTimeout(focusLossTimer);
  focusLossTimer = null;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum));
}

async function positionPopupNearTray(trayRect: TrayIconEvent["rect"]) {
  const popupWindow = getCurrentWindow();
  const popupSize = await popupWindow.outerSize();
  const monitors = await availableMonitors();
  const trayCenterX = trayRect.position.x + trayRect.size.width / 2;
  const trayCenterY = trayRect.position.y + trayRect.size.height / 2;
  const monitor = monitors.find(({ position, size }) =>
    trayCenterX >= position.x &&
    trayCenterX < position.x + size.width &&
    trayCenterY >= position.y &&
    trayCenterY < position.y + size.height,
  );

  let x = Math.round(trayCenterX - popupSize.width / 2);
  let y = trayRect.position.y - popupSize.height - POPUP_GAP;

  if (monitor) {
    const { position, size } = monitor.workArea;
    const right = position.x + size.width;
    const bottom = position.y + size.height;

    x = clamp(x, position.x + POPUP_GAP, right - popupSize.width - POPUP_GAP);

    if (y < position.y) {
      y = trayRect.position.y + trayRect.size.height + POPUP_GAP;
    }

    y = clamp(y, position.y + POPUP_GAP, bottom - popupSize.height - POPUP_GAP);
  }

  await popupWindow.setPosition(new PhysicalPosition(x, y));
}

async function togglePopup(event: TrayIconEvent) {
  if (event.type !== "Click" || event.button !== "Left") {
    return;
  }

  if (event.buttonState === "Down") {
    isTrayLeftButtonDown = true;
    cancelFocusLossHide();
    return;
  }

  if (event.buttonState !== "Up") return;

  isTrayLeftButtonDown = false;
  cancelFocusLossHide();

  const popupWindow = getCurrentWindow();

  if (await popupWindow.isVisible()) {
    await popupWindow.hide();
    return;
  }

  await positionPopupNearTray(event.rect);
  await popupWindow.show();
  await popupWindow.setFocus();
}

async function setupNativeShell() {
  const popupWindow = getCurrentWindow();

  // Reapply the native window flags before creating the tray to avoid a
  // startup flash even if Windows ignores the initial configuration hint.
  await popupWindow.hide();
  await popupWindow.setSkipTaskbar(true);

  await popupWindow.onFocusChanged(({ payload: isFocused }) => {
    cancelFocusLossHide();

    if (isFocused || isTrayLeftButtonDown) return;

    // Windows moves focus away from the popup before delivering the tray click.
    // Defer the hide so that click can cancel it and perform the toggle itself.
    focusLossTimer = setTimeout(() => {
      focusLossTimer = null;
      if (!isTrayLeftButtonDown) void popupWindow.hide();
    }, 150);
  });

  await popupWindow.onCloseRequested((event) => {
    event.preventDefault();
    void popupWindow.hide();
  });

  const menu = await Menu.new({
    items: [
      {
        id: "refresh",
        text: "Refresh",
        action: () => void emit("refresh-requested"),
      },
      {
        id: "open-github",
        text: "Open GitHub",
        action: () => void openUrl(GITHUB_PULLS_URL),
      },
      { item: "Separator" },
      { item: "Quit", text: "Quit" },
    ],
  });

  const fallbackIcon = await defaultWindowIcon();

  const tray = await TrayIcon.new({
    id: "peek",
    icon: fallbackIcon ?? undefined,
    menu,
    showMenuOnLeftClick: false,
    tooltip: "Peek",
    action: (event) => void togglePopup(event),
  });

  try {
    const initialTheme =
      (await popupWindow.theme()) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    await tray.setIcon(getTrayIcon(initialTheme));

    await popupWindow.onThemeChanged(({ payload: theme }) => {
      void tray.setIcon(getTrayIcon(theme)).catch((error: unknown) => {
        console.error("Could not update the tray icon theme.", error);
      });
    });
  } catch (error) {
    console.error("Could not apply the themed tray icon.", error);
  }
}

export function initializeNativeShell() {
  initialization ??= setupNativeShell().catch((error: unknown) => {
    console.error("Could not initialize the native tray shell.", error);
  });

  return initialization;
}
