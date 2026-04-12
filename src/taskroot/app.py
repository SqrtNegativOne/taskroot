"""Application entry point — pywebview main window + pystray tray icon.

Threading model
---------------
- **Main thread**: ``pywebview`` event loop. pywebview 6+ enforces this
  with a runtime check and raises ``WebViewException`` if you try to
  start it from a worker.
- **Background thread**: ``pystray`` runs its own platform-native
  message pump (Win32 tray API on Windows). It is designed to run off
  the main thread and talks to pywebview through the thread-safe
  ``Window.show()`` / ``Window.hide()`` / ``Window.destroy()``
  operations.

Why not PyQt6 for the tray?
---------------------------
plan.txt suggests PyQt6 for tray and OS integrations. We started down
that path, but pywebview 6 requires the main thread, and Qt's
``QApplication.exec()`` does too — they cannot cooperate without the
``pywebview gui='qt'`` backend, which requires ``PyQt6-WebEngine`` (an
additional ~100 MB of Qt WebEngine binaries) and swaps a modern Edge
Chromium webview for an older QtWebEngine. ``pystray`` is a tiny
purpose-built tray wrapper that runs in a worker thread and leaves the
main thread entirely to pywebview. Net result: smaller bundle, cleaner
threading, and a better web view. We revisit the PyQt6 plan only if
and when we need Qt-specific APIs (idle detection via QAction, etc.),
at which point we can adopt ``plyer`` or raw ``ctypes`` instead.

Close semantics
---------------
The main window is frameless — there is no OS close button. Dismissing
it happens through the tray menu or through ``api.hide_window`` called
from the Svelte UI. ``Alt+F4`` still destroys the window; after that,
tray "Show" is a no-op until the user quits and relaunches. A future
pass can recreate the window on demand.

Not yet implemented (explicit deferrals):
- Startup-on-boot registration (Windows Registry Run key)
- OS notifications (50-minute check-in reminder, plan.txt §Do)
- Global summon/hide hotkey — plan.txt §Always-On marks this [OPEN]
- Idle detection — plan.txt §Do marks threshold and behaviour [OPEN]
- Floating widget (second frameless window during Do phase)
"""
from __future__ import annotations

import logging
import os
import sys
import threading
from pathlib import Path

import pystray
import webview
from PIL import Image, ImageDraw

from .api import Api
from .db import Database

log = logging.getLogger(__name__)


def default_db_path() -> Path:
    """Return the per-user database path, creating parent dirs if needed."""
    if sys.platform == "win32":
        root = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData/Local"))
        base = root / "TaskRoot"
    else:
        base = Path.home() / ".local/share/taskroot"
    base.mkdir(parents=True, exist_ok=True)
    return base / "taskroot.db"


def _find_ui_index() -> Path | None:
    """Locate the built SvelteKit ``index.html``.

    Checked in order:
    1. ``src/taskroot/data/ui/index.html`` — copied here for packaging
    2. ``<repo>/ui/build/index.html`` — SvelteKit dev build output

    Returns ``None`` if no bundle is found; the caller falls back to
    ``data/placeholder.html``.
    """
    here = Path(__file__).resolve().parent
    packaged = here / "data" / "ui" / "index.html"
    if packaged.exists():
        return packaged
    for parent in here.parents:
        dev = parent / "ui" / "build" / "index.html"
        if dev.exists():
            return dev
        if (parent / ".git").exists():
            break
    return None


def _find_widget_index() -> Path | None:
    """Locate the built widget route's ``index.html``.

    Mirrors :func:`_find_ui_index` but looks for ``widget/index.html``
    next to the main ``index.html``.
    """
    here = Path(__file__).resolve().parent
    packaged = here / "data" / "ui" / "widget" / "index.html"
    if packaged.exists():
        return packaged
    for parent in here.parents:
        dev = parent / "ui" / "build" / "widget" / "index.html"
        if dev.exists():
            return dev
        if (parent / ".git").exists():
            break
    return None


def _tray_image() -> Image.Image:
    """Draw the tray icon at runtime so we don't ship a binary asset."""
    size = 64
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.ellipse((8, 8, size - 8, size - 8), fill=(44, 44, 44, 255))
    return image


class _WindowController:
    """Thread-safe handle shared with the tray thread and the JS API.

    The widget window is independent of the main window — show/hide only
    affect the main window. The widget stays visible unless the user
    explicitly toggles it via the tray menu or quits the app.
    """

    def __init__(self) -> None:
        self._window: webview.Window | None = None
        self._widget: webview.Window | None = None
        self._icon: pystray.Icon | None = None
        self._widget_visible = True
        self._lock = threading.Lock()

    def bind_window(self, window: webview.Window) -> None:
        with self._lock:
            self._window = window

    def bind_widget(self, window: webview.Window) -> None:
        with self._lock:
            self._widget = window

    def bind_icon(self, icon: pystray.Icon) -> None:
        with self._lock:
            self._icon = icon

    def show(self) -> None:
        with self._lock:
            window = self._window
        if window is None:
            return
        try:
            window.show()
        except Exception as exc:  # noqa: BLE001
            log.warning("window.show failed: %s", exc)

    def hide(self) -> None:
        with self._lock:
            window = self._window
        if window is None:
            return
        try:
            window.hide()
        except Exception as exc:  # noqa: BLE001
            log.warning("window.hide failed: %s", exc)

    def toggle_widget(self) -> None:
        with self._lock:
            widget = self._widget
            visible = self._widget_visible
            self._widget_visible = not visible
        if widget is None:
            return
        try:
            if visible:
                widget.hide()
            else:
                widget.show()
        except Exception as exc:  # noqa: BLE001
            log.warning("widget.toggle failed: %s", exc)

    def quit(self) -> None:
        with self._lock:
            window = self._window
            widget = self._widget
            icon = self._icon
            self._window = None
            self._widget = None
        if icon is not None:
            try:
                icon.stop()
            except Exception:  # noqa: BLE001
                pass
        if widget is not None:
            try:
                widget.destroy()
            except Exception:  # noqa: BLE001
                pass
        if window is not None:
            try:
                window.destroy()
            except Exception:  # noqa: BLE001
                pass


def _run_tray(controller: _WindowController) -> None:
    """Entry point for the tray worker thread.

    pystray.Icon.run() installs a platform-native message loop and
    blocks this thread until icon.stop() is called.
    """
    menu = pystray.Menu(
        pystray.MenuItem("Show TaskRoot", lambda icon, item: controller.show(), default=True),
        pystray.MenuItem("Hide", lambda icon, item: controller.hide()),
        pystray.MenuItem("Toggle widget", lambda icon, item: controller.toggle_widget()),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit TaskRoot", lambda icon, item: controller.quit()),
    )
    icon = pystray.Icon("taskroot", _tray_image(), "TaskRoot", menu)
    controller.bind_icon(icon)
    try:
        icon.run()
    except Exception:  # noqa: BLE001
        log.exception("tray icon crashed")


def run() -> None:
    logging.basicConfig(level=logging.INFO)

    db = Database(default_db_path())
    api = Api(db)
    controller = _WindowController()

    # Hook the controller into the JS API so the Svelte UI can call
    # api.hide_window() / api.quit_app() from inside the webview.
    api.bind_controller(controller)

    ui_index = _find_ui_index()
    if ui_index is None:
        ui_index = (Path(__file__).parent / "data" / "placeholder.html").resolve()
        log.info("UI bundle not found; using placeholder at %s", ui_index)
    else:
        log.info("Loading UI bundle from %s", ui_index)

    window = webview.create_window(
        title="",  # titlebar-less per plan.txt §UI Principles
        url=ui_index.as_uri(),
        js_api=api,
        width=1100,
        height=720,
        frameless=True,
        easy_drag=True,
    )
    if window is None:
        raise RuntimeError("pywebview failed to create the main window")
    controller.bind_window(window)

    def _on_started() -> None:
        widget_index = _find_widget_index()
        if widget_index is None:
            log.info("Widget bundle not found; widget window skipped")
            return
        screens = webview.screens
        sw = screens[0].width if screens else 1920
        sh = screens[0].height if screens else 1080
        widget_window = webview.create_window(
            title="",
            url=widget_index.as_uri(),
            js_api=api,
            width=308,
            height=sh,
            x=sw - 308,
            y=0,
            frameless=True,
            on_top=True,
            transparent=True,
            easy_drag=False,
        )
        if widget_window is None:
            log.warning("pywebview failed to create the widget window")
            return
        controller.bind_widget(widget_window)
        log.info("Widget window created at x=%d, height=%d", sw - 308, sh)

    tray_thread = threading.Thread(
        target=_run_tray, args=(controller,), name="pystray", daemon=True
    )
    tray_thread.start()

    # Blocks on the main thread until the last window is destroyed.
    webview.start(func=_on_started, debug=False)

    # Once the webview exits, make sure the tray thread is torn down too.
    controller.quit()


if __name__ == "__main__":
    run()
