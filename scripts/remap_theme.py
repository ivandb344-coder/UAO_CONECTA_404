"""Remapea la paleta heredada (teal) a la identidad UAO 2026 en los CSS existentes. Uso único."""
import pathlib
import re

ROOT = pathlib.Path("/app/frontend/src/styles")
COLOR_MAP = {
    # teal → rojo institucional
    "#0d9488": "#A81B1E",
    "#087f74": "#8A1428",
    "#005f56": "#8A1428",
    "#67d9cc": "#FF836C",
    "#9ad7cf": "#E3B3B4",
    "#a7ded7": "#E3B3B4",
    "#b7e4dd": "#E3B3B4",
    "#e9f8f5": "#FBECEC",
    "#e8f7f4": "#FBECEC",
    "#e5f7f3": "#FBECEC",
    "#eef8f6": "#FBECEC",
    "#eefaf8": "#FBECEC",
    "#f4fbfa": "#FDF5F5",
    "#d6f4ed": "#F5D0D0",
    # ink → navy secundario
    "#0f172a": "#1E293B",
    # azul → navy
    "#3b82f6": "#1E293B",
    "#2563eb": "#1E293B",
    "#1d4ed8": "#1E293B",
    "#e9f1ff": "#E2E8F0",
    # rojo de tarjetas → granate del manual
    "#d9503c": "#8A1428",
}
TEXT_MAP = {
    "var(--teal)": "var(--primary)",
    "--teal:": "--primary:",
    "rgba(13,148,136,": "rgba(168,27,30,",
    "'Plus Jakarta Sans'": "'DM Sans'",
    "Plus Jakarta Sans": "DM Sans",
    "font-family: Outfit": "font-family: 'DM Sans'",
    "font-family:Outfit": "font-family:'DM Sans'",
    "Outfit,sans-serif": "'DM Sans',sans-serif",
    "Outfit, sans-serif": "'DM Sans', sans-serif",
    "font:italic 16px Outfit": "font:italic 16px 'DM Sans'",
    "font:700 20px Outfit": "font:700 20px 'DM Sans'",
    "font-family: Outfit;": "font-family: 'DM Sans';",
}

for css in ROOT.glob("*.css"):
    text = css.read_text(encoding="utf-8")
    original = text
    for old, new in TEXT_MAP.items():
        text = text.replace(old, new)
    for old, new in COLOR_MAP.items():
        text = re.sub(re.escape(old), new, text, flags=re.IGNORECASE)
    if text != original:
        css.write_text(text, encoding="utf-8")
        print("remapeado", css.name)
