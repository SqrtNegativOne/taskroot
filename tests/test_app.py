from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Stub out platform modules that require a graphical environment.
# These must be injected before taskroot.app is first imported so that
# the module-level `import webview` / `import pystray` don't fail on
# headless Linux runners.
for _mod in ("webview", "pystray"):
    sys.modules.setdefault(_mod, MagicMock())

from taskroot.app import _WindowController, _find_ui_index, _tray_image, default_db_path  # noqa: E402


# -- default_db_path ---------------------------------------------------------

def test_default_db_path_windows(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.setattr(sys, "platform", "win32")
    path = default_db_path()
    assert path.name == "taskroot.db"
    assert "TaskRoot" in str(path)
    assert path.parent.is_dir()


def test_default_db_path_unix(tmp_path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "linux")
    with patch.object(Path, "home", return_value=tmp_path):
        path = default_db_path()
    assert path.name == "taskroot.db"
    assert "taskroot" in str(path).lower()
    assert path.parent.is_dir()


def test_default_db_path_creates_parent_dirs(tmp_path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "linux")
    with patch.object(Path, "home", return_value=tmp_path):
        path = default_db_path()
    assert path.parent.exists()
    assert path.parent.is_dir()


def test_default_db_path_windows_fallback_when_no_env(tmp_path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.delenv("LOCALAPPDATA", raising=False)
    with patch.object(Path, "home", return_value=tmp_path):
        path = default_db_path()
    assert path.name == "taskroot.db"
    assert path.parent.is_dir()


# -- _find_ui_index ----------------------------------------------------------

def test_find_ui_index_returns_packaged_first(tmp_path, monkeypatch):
    import taskroot.app as app_module
    packaged = tmp_path / "data" / "ui"
    packaged.mkdir(parents=True)
    index = packaged / "index.html"
    index.write_text("<html/>")
    monkeypatch.setattr(app_module, "__file__", str(tmp_path / "app.py"))
    result = _find_ui_index()
    assert result == index


def test_find_ui_index_returns_none_when_absent(tmp_path, monkeypatch):
    import taskroot.app as app_module
    # Build a fake repo with a .git dir so the parent-walk terminates
    fake_repo = tmp_path / "repo"
    fake_repo.mkdir()
    (fake_repo / ".git").mkdir()
    fake_src = fake_repo / "src" / "taskroot"
    fake_src.mkdir(parents=True)
    monkeypatch.setattr(app_module, "__file__", str(fake_src / "app.py"))
    result = _find_ui_index()
    assert result is None


def test_find_ui_index_finds_dev_build(tmp_path, monkeypatch):
    import taskroot.app as app_module
    # Fake repo root with a dev build but no packaged bundle
    fake_repo = tmp_path / "repo"
    fake_repo.mkdir()
    (fake_repo / ".git").mkdir()
    dev_build = fake_repo / "ui" / "build"
    dev_build.mkdir(parents=True)
    index = dev_build / "index.html"
    index.write_text("<html/>")
    fake_src = fake_repo / "src" / "taskroot"
    fake_src.mkdir(parents=True)
    monkeypatch.setattr(app_module, "__file__", str(fake_src / "app.py"))
    result = _find_ui_index()
    assert result == index


# -- _tray_image -------------------------------------------------------------

def test_tray_image_size_and_mode():
    img = _tray_image()
    assert img.size == (64, 64)
    assert img.mode == "RGBA"


# -- _WindowController -------------------------------------------------------

def test_show_with_no_window_does_not_raise():
    ctrl = _WindowController()
    ctrl.show()  # no window bound — must be a no-op


def test_hide_with_no_window_does_not_raise():
    ctrl = _WindowController()
    ctrl.hide()


def test_quit_with_no_window_does_not_raise():
    ctrl = _WindowController()
    ctrl.quit()


def test_show_delegates_to_window():
    ctrl = _WindowController()
    mock_window = MagicMock()
    ctrl.bind_window(mock_window)
    ctrl.show()
    mock_window.show.assert_called_once()


def test_hide_delegates_to_window():
    ctrl = _WindowController()
    mock_window = MagicMock()
    ctrl.bind_window(mock_window)
    ctrl.hide()
    mock_window.hide.assert_called_once()


def test_quit_destroys_window_and_stops_icon():
    ctrl = _WindowController()
    mock_window = MagicMock()
    mock_icon = MagicMock()
    ctrl.bind_window(mock_window)
    ctrl.bind_icon(mock_icon)
    ctrl.quit()
    mock_window.destroy.assert_called_once()
    mock_icon.stop.assert_called_once()


def test_quit_idempotent_window_destroyed_only_once():
    ctrl = _WindowController()
    mock_window = MagicMock()
    ctrl.bind_window(mock_window)
    ctrl.quit()
    ctrl.quit()  # second call: window reference already cleared
    mock_window.destroy.assert_called_once()


def test_show_swallows_exception():
    ctrl = _WindowController()
    mock_window = MagicMock()
    mock_window.show.side_effect = RuntimeError("window gone")
    ctrl.bind_window(mock_window)
    ctrl.show()  # must not propagate


def test_hide_swallows_exception():
    ctrl = _WindowController()
    mock_window = MagicMock()
    mock_window.hide.side_effect = RuntimeError("window gone")
    ctrl.bind_window(mock_window)
    ctrl.hide()  # must not propagate


def test_quit_swallows_icon_exception():
    ctrl = _WindowController()
    mock_icon = MagicMock()
    mock_icon.stop.side_effect = RuntimeError("icon gone")
    ctrl.bind_icon(mock_icon)
    ctrl.quit()  # must not propagate
