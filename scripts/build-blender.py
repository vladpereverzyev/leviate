# SPDX-License-Identifier: AGPL-3.0-only
# Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

"""Packs the Blender add-on into dist/leviate-blender-<version>.zip.

The version comes from js/version.js, so the add-on always matches the app.
Usage: python scripts/build-blender.py
"""

import pathlib
import re
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "integrations" / "blender" / "leviate"
DIST = ROOT / "dist"


def main():
    version = re.search(r"VERSION = '([\d.]+)'", (ROOT / "js" / "version.js").read_text()).group(1)
    DIST.mkdir(exist_ok=True)
    out = DIST / f"leviate-blender-{version}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(SOURCE.rglob("*")):
            if path.is_dir() or "__pycache__" in path.parts or path.suffix == ".pyc":
                continue
            name = path.relative_to(SOURCE).as_posix()
            data = path.read_text(encoding="utf-8")
            if name == "blender_manifest.toml":
                data = re.sub(r'^version = ".*"$', f'version = "{version}"', data, count=1, flags=re.M)
            zf.writestr(name, data)
        zf.write(SOURCE.parent / "LICENSE", "LICENSE")
    print(out)


if __name__ == "__main__":
    main()
