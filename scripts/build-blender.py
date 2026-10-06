# SPDX-License-Identifier: AGPL-3.0-only
# Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

"""Packs Leviate for Blender into one zip per platform in dist/.

Each zip holds the add-on, the MediaPipe hand model and the Python wheels the
hand tracking needs (MediaPipe, OpenCV, absl-py, flatbuffers) plus the ones the
phone camera needs (aiortc for WebRTC with its dependencies, websockets, qrcode).
Blender installs the wheels itself; numpy comes with Blender. The version comes from
js/version.js.

With --extensions the zips go to dist/extensions/ for extensions.blender.org, which takes
only CC0 assets: they leave the hand model out and the add-on downloads the same file
from Google on the first start.

Usage: python scripts/build-blender.py [--extensions] [platform ...]
Platforms: windows-x64, macos-arm64, linux-x64 (all by default).
"""

import pathlib
import re
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "integrations" / "blender" / "leviate"
MODEL = ROOT / "models" / "hand_landmarker.task"
DIST = ROOT / "dist"
CACHE = DIST / "wheels"

PACKAGES = [
    "mediapipe==1.0.1", "opencv-python-headless==5.0.0.93", "absl-py==2.5.0", "flatbuffers==25.12.19",
    "aiortc==1.15.0", "aioice==0.10.2", "av==17.1.0", "cffi==2.1.1", "cryptography==50.0.2",
    "dnspython==2.8.0", "google-crc32c==1.9.0", "ifaddr==0.2.0", "pycparser==3.0", "pyee==13.0.1",
    "pylibsrtp==1.0.0", "pyopenssl==26.4.0", "typing-extensions==4.16.0", "websockets==17.2",
    "qrcode==8.2",
]
# Blender 4.2 to 4.5 run Python 3.11, Blender 5 runs Python 3.13. Blender installs only
# the wheels that match its own Python, so one zip serves both.
PYTHONS = ["3.11", "3.13"]
PLATFORMS = {
    "windows-x64": ["win_amd64"],
    "macos-arm64": ["macosx_14_0_arm64"],
    "linux-x64": ["manylinux_2_28_x86_64", "manylinux_2_17_x86_64", "manylinux2014_x86_64"],
}


def wheels_for(platform):
    names = {re.split(r"[=<>~]", p)[0].replace("-", "_").lower() for p in PACKAGES}
    wheels = {}
    for python in PYTHONS:
        folder = CACHE / platform / python
        folder.mkdir(parents=True, exist_ok=True)
        subprocess.run([
            sys.executable, "-m", "pip", "download", "--quiet", "--only-binary=:all:", "--no-deps",
            *(arg for tag in PLATFORMS[platform] for arg in ("--platform", tag)),
            "--python-version", python, "--dest", str(folder), *PACKAGES,
        ], check=True)
        found = [w for w in sorted(folder.glob("*.whl")) if w.name.split("-")[0].lower() in names]
        if len(found) != len(PACKAGES):
            raise SystemExit(f"{platform} Python {python}: expected {len(PACKAGES)} wheels, "
                             f"found {[w.name for w in found]}")
        # Wheels for any Python 3 (py3, abi3) are the same file for every version, kept once.
        for w in found:
            wheels.setdefault(w.name, w)
    return [wheels[name] for name in sorted(wheels)]


def build(platform, version, extensions=False):
    wheels = wheels_for(platform)
    folder = DIST / "extensions" if extensions else DIST
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / f"leviate-blender-{version}-{platform}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(SOURCE.rglob("*")):
            if path.is_dir() or "__pycache__" in path.parts or path.suffix == ".pyc":
                continue
            name = path.relative_to(SOURCE).as_posix()
            if name == "blender_manifest.toml":
                text = path.read_text(encoding="utf-8")
                text = re.sub(r'^version = ".*"$', f'version = "{version}"', text, count=1, flags=re.M)
                listed = ",\n  ".join(f'"./wheels/{w.name}"' for w in wheels)
                text = text.replace("# platforms = []\n# wheels = []\n",
                                    f'platforms = ["{platform}"]\nwheels = [\n  {listed},\n]\n')
                zf.writestr(name, text)
            else:
                zf.write(path, name)
        if not extensions:
            zf.write(MODEL, "models/hand_landmarker.task")
        for w in wheels:
            zf.write(w, f"wheels/{w.name}")
        zf.write(SOURCE.parent / "LICENSE", "LICENSE")
    print(out, f"{out.stat().st_size / 1e6:.1f} MB")


def main():
    version = re.search(r"VERSION = '([\d.]+)'", (ROOT / "js" / "version.js").read_text()).group(1)
    args = sys.argv[1:]
    extensions = "--extensions" in args
    platforms = [a for a in args if a != "--extensions"] or list(PLATFORMS)
    DIST.mkdir(exist_ok=True)
    for platform in platforms:
        build(platform, version, extensions)


if __name__ == "__main__":
    main()
