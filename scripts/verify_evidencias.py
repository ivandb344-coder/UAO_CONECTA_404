#!/usr/bin/env python3
"""Verificación del módulo Evidencias DCU: imágenes sin enlaces rotos, carrusel
completo (con las nuevas vistas docente/monitor), pestaña de necesidades,
overflow a 360 px (RNF-03) y contraste WCAG 2.1 AA de la paleta."""
import json
import urllib.request

from playwright.sync_api import sync_playwright

BASE_WEB = "http://localhost:3000"
BASE_API = "http://localhost:8001/api"
CHROME = "/usr/bin/google-chrome"
IMGS = ["01-login.png", "02-verificacion.png", "03-inicio.png", "03-inicio-docente.png",
        "07-monitor.png", "04-asesorias.png", "05-dudas.png", "06-movil.png"]


def token(email, pw):
    req = urllib.request.Request(f"{BASE_API}/auth/login",
                                 data=json.dumps({"email": email, "password": pw}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["token"]


def rel_luminance(hexc):
    hexc = hexc.lstrip("#")
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (0, 2, 4))
    def f(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(fg, bg):
    l1, l2 = rel_luminance(fg), rel_luminance(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def main():
    tok = token("estudiante.demo@uao.edu.co", "UAOdemo2026!")

    # ---- Contraste WCAG (texto blanco sobre primario/secundario) ----
    pairs = [("blanco", "#FFFFFF", "sobre primario #A81B1E", "#A81B1E"),
             ("blanco", "#FFFFFF", "sobre secundario #1E293B", "#1E293B"),
             ("coral", "#FF836C", "sobre secundario #1E293B", "#1E293B"),
             ("texto #1E293B", "#1E293B", "sobre fondo #F8FAFC", "#F8FAFC")]
    print("== CONTRASTE WCAG 2.1 (AA exige >= 4.5 texto normal) ==")
    for fn, fv, bn, bv in pairs:
        ratio = contrast(fv, bv)
        level = "AAA" if ratio >= 7 else ("AA" if ratio >= 4.5 else ("AA-large" if ratio >= 3 else "FAIL"))
        print(f"  {fn} {bn}: {ratio:.2f}:1 -> {level}")

    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True, args=["--no-sandbox"])

        # ---- HTTP 200 de cada imagen (sin enlaces rotos) ----
        ctx = b.new_context()
        statuses = {n: ctx.request.get(f"{BASE_WEB}/assets/evidencias/{n}").status for n in IMGS}
        print("\n== HTTP status imágenes ==")
        print(" ", statuses)
        print("  ALL_200:", all(v == 200 for v in statuses.values()))
        ctx.close()

        # ---- Carrusel: cada diapositiva carga su imagen ----
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1.5)
        ctx.add_init_script(f"localStorage.setItem('uao_token','{tok}')")
        page = ctx.new_page()
        page.goto(f"{BASE_WEB}/#/evidencias-dcu", wait_until="domcontentloaded")
        page.wait_for_selector('[data-testid="flow-carousel"]', timeout=20000)
        page.wait_for_timeout(1500)
        dots = page.eval_on_selector_all('[data-testid^="flow-dot-"]', "els => els.map(e => e.getAttribute('data-testid'))")
        print("\n== Diapositivas del carrusel ==", len(dots))
        per = {}
        for d in dots:
            page.click(f'[data-testid="{d}"]')
            page.wait_for_timeout(400)
            ok = page.evaluate("() => { const i = document.querySelector('img[data-testid^=flow-image-]'); return i ? (i.complete && i.naturalWidth > 0) : false; }")
            per[d.replace("flow-dot-", "")] = ok
        print("  ", per)
        print("  ALL_SLIDES_OK:", all(per.values()))

        # ---- Pestaña Satisfacción de necesidades ----
        page.click('[data-testid="ev-tab-button-necesidades"]')
        page.wait_for_timeout(1200)
        needs = page.evaluate("() => Array.from(document.querySelectorAll('img')).filter(i => i.src.includes('evidencias')).map(i => ({n: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0}))")
        print("\n== Imágenes en pestaña Necesidades ==")
        for it in needs:
            print("  ", it["n"], "OK" if it["ok"] else "ROTA")
        print("  NEEDS_ALL_OK:", all(i["ok"] for i in needs) and len(needs) > 0)

        # ---- RNF-03: overflow horizontal a 360 px en /inicio ----
        mob = b.new_context(viewport={"width": 360, "height": 800}, device_scale_factor=2)
        mob.add_init_script(f"localStorage.setItem('uao_token','{tok}')")
        mp = mob.new_page()
        mp.goto(f"{BASE_WEB}/#/inicio", wait_until="domcontentloaded")
        mp.wait_for_selector('[data-testid="integration-layer"]', timeout=20000)
        mp.wait_for_timeout(1500)
        vw = mp.evaluate("document.documentElement.clientWidth")
        offenders = mp.evaluate("() => [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(e => e.className || e.tagName)")
        hscroll = mp.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        print("\n== RNF-03 · 360 px ==")
        print("  viewport:", vw, "| scroll horizontal:", hscroll, "| elementos desbordados:", offenders)

        # capturas finales de evidencias (desktop + móvil)
        page.screenshot(path="/tmp/ev_final_desktop.png", full_page=False)
        page.click('[data-testid="ev-tab-button-propuesta"]')
        mp.goto(f"{BASE_WEB}/#/evidencias-dcu", wait_until="domcontentloaded")
        mp.wait_for_selector('[data-testid="flow-carousel"]', timeout=20000)
        mp.wait_for_timeout(1200)
        mp.screenshot(path="/tmp/ev_final_mobile.png", full_page=False)
        b.close()
    print("\nDONE")


if __name__ == "__main__":
    main()
