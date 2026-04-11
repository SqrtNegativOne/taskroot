@echo off
REM TaskRoot dev loop — rebuild the Svelte bundle, then launch the
REM Python app which picks it up via app.py::_find_ui_index().
REM
REM Run from Explorer (double-click) or from any shell at repo root:
REM     dev
REM
REM For fast UI-only iteration without Python in the loop, run
REM `npm run dev` inside ui\ — it serves the SPA against the fixture
REM mock API (src\lib\api\mock.ts) with Vite hot reload.

setlocal
pushd "%~dp0"

echo [dev] Building Svelte bundle...
pushd ui
call npm run build
if errorlevel 1 (
    echo [dev] Svelte build failed, aborting.
    popd
    popd
    exit /b 1
)
popd

echo [dev] Launching TaskRoot...
uv run python -m taskroot
set EXITCODE=%ERRORLEVEL%

popd
endlocal & exit /b %EXITCODE%
