"""PyInstaller entry point.

Kept at the repo root so PyInstaller can resolve imports without
fiddling with the src-layout. Uses absolute imports only so the frozen
script does not depend on being part of a parent package. Referenced
by ``taskroot.spec`` and ``.github/workflows/release.yml``.
"""
from taskroot.app import run

if __name__ == "__main__":
    run()
