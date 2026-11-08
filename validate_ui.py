from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"

class Validator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "link" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "script" and attrs.get("src"):
            self.scripts.append(attrs["src"])


def main():
    source = HTML.read_text(encoding="utf-8")
    parser = Validator()
    parser.feed(source)
    duplicates = [key for key, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        raise SystemExit("Duplicate HTML IDs: " + ", ".join(duplicates))
    for path in parser.links + parser.scripts:
        if path.startswith(("http://", "https://", "data:")):
            continue
        if not (ROOT / path).is_file():
            raise SystemExit("Missing local asset: " + path)
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("name") != "NexaBuild":
        raise SystemExit("PWA identity changed unexpectedly")
    for js in (ROOT / "app.js", ROOT / "sw.js"):
        result = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
        if result.returncode:
            raise SystemExit(result.stderr)
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    if css.count("{") != css.count("}"):
        raise SystemExit("CSS brace count mismatch")
    print("UI validation passed: unique IDs, local assets, manifest identity, JavaScript syntax, CSS braces.")

if __name__ == "__main__":
    main()
