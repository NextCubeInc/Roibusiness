#!/usr/bin/env python3
"""Gera um único HTML autocontido (CSS, JS, fontes e imagens embutidos) a partir de index.html.
Uso: python3 build-single.py [saida.html]"""
import base64, mimetypes, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "roinfluencer-apresentacao.html"
MIME = {".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml"}

def data_uri(path: Path) -> str:
    mime = MIME.get(path.suffix) or mimetypes.guess_type(path.name)[0]
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

def inline_assets(text: str, base: Path) -> str:
    # url(...) em CSS, relativo ao arquivo
    text = re.sub(r'url\("?(\.\./[^")]+)"?\)', lambda m: f'url("{data_uri((base / m.group(1)).resolve())}")', text)
    # caminhos "assets/img/..." em HTML e JS
    return re.sub(r'assets/img/[\w.-]+', lambda m: data_uri(ROOT / m.group(0)), text)

html = (ROOT / "index.html").read_text(encoding="utf-8")
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
              lambda m: "<style>\n" + inline_assets((ROOT / m.group(1)).read_text(encoding="utf-8"), (ROOT / m.group(1)).parent) + "\n</style>", html)
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: "<script>\n" + inline_assets((ROOT / m.group(1)).read_text(encoding="utf-8"), ROOT).replace("</script", "<\\/script") + "\n</script>", html)
html = inline_assets(html, ROOT)
OUT.write_text(html, encoding="utf-8")
print(f"{OUT} ({OUT.stat().st_size / 1024:.0f} KB)")
