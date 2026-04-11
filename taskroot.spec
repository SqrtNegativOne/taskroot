# PyInstaller spec for TaskRoot (onedir, Windows).
#
# Run from the repo root:
#     uv run pyinstaller taskroot.spec --clean --noconfirm
#
# Why onedir instead of onefile:
# - Cold start is ~3x faster (no extraction into a temp dir on every launch).
# - Easier to inspect/debug the frozen bundle.
# - Smaller release zip once zstd-compressed by the workflow.
#
# Data files: we vendor the built SvelteKit bundle into
# ``src/taskroot/data/ui/`` before invoking PyInstaller, so a single
# ``src/taskroot/data`` include covers the HTML UI + placeholder.
# pylint: disable=undefined-variable
from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

ROOT = Path(SPECPATH).resolve()  # noqa: F821  (SPECPATH injected by PyInstaller)
PACKAGE = ROOT / "src" / "taskroot"

datas = [(str(PACKAGE / "data"), "taskroot/data")]

# pywebview loads its platform backend lazily via importlib, so PyInstaller's
# static analysis can miss them. collect_submodules pulls the whole tree.
hiddenimports = collect_submodules("webview")

a = Analysis(
    [str(ROOT / "pyinstaller_entry.py")],
    pathex=[str(ROOT / "src")],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Qt is not a runtime dep — pystray + pywebview cover tray + webview.
        "PyQt5",
        "PyQt6",
        "PySide2",
        "PySide6",
        "tkinter",
    ],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="TaskRoot",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,  # frameless tray app — no console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="TaskRoot",
)
