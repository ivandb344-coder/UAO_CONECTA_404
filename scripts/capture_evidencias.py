#!/usr/bin/env python3
"""Genera las capturas reales del Hub para el módulo Evidencias DCU.

Escribe PNG en frontend/public/assets/evidencias/ servidos por el dev server.
Cubre la dualidad de roles: estudiante, docente y estudiante en Modo Monitor.
"""
import json
import os
import urllib.request

from playwright.sync_api import sync_playwright

BASE_WEB = "http://localhost:3000"
BASE_API = "http://localhost:8001/api"
OUT_DIR = "/app/frontend/public/assets/evidencias"
CHROME = "/usr/bin/google-chrome"

ACCOUNTS = {
    "professor": ("pacastillo@uao.edu.co", "UAOdemo2026!"),
    "student": ("estudiante.demo@uao.edu.co", "UAOdemo2026!"),
}

DESKTOP = {"width": 1600, "height": 900}
MOBILE = {"width": 360, "height": 800}


def get_token(email: str, password: str) -> str:
    req = urllib.request.Request(
        f"{BASE_API}/auth/login",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["token"]


def settle(page, ms=1600):
    try:
        page.evaluate("() => document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true")
    except Exception:
        pass
    page.wait_for_timeout(ms)


def shot_page(page, name):
    path = os.path.join(OUT_DIR, name)
    page.screenshot(path=path, full_page=False)
    print("OK page ->", name)


def shot_el(page, selector, name):
    el = page.locator(selector).first
    el.scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    path = os.path.join(OUT_DIR, name)
    el.screenshot(path=path)
    print("OK elem ->", name)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    tokens = {role: get_token(*cred) for role, cred in ACCOUNTS.items()}
    print("tokens:", {k: bool(v) for k, v in tokens.items()})

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True, args=["--no-sandbox"])

        def ctx(token=None, monitor=False, viewport=DESKTOP, dsf=2):
            c = browser.new_context(viewport=viewport, device_scale_factor=dsf)
            init = ""
            if token:
                init += f"localStorage.setItem('uao_token', '{token}');"
            if monitor:
                init += "localStorage.setItem('uao_monitor_mode', '1');"
            if init:
                c.add_init_script(init)
            return c

        # ---------- 01 / 02 : Login (sin sesión) ----------
        c = ctx()
        page = c.new_page()
        page.goto(f"{BASE_WEB}/", wait_until="domcontentloaded")
        page.wait_for_selector('[data-testid="login-title"]', timeout=20000)
        settle(page)
        shot_page(page, "01-login.png")

        # Verificación de identidad: docente de la lista blanca (se dispara en onBlur)
        page.fill('[data-testid="auth-email-input"]', ACCOUNTS["professor"][0])
        page.locator('[data-testid="auth-password-input"]').click()  # blur email -> check
        page.wait_for_selector('[data-testid="identity-badge-ok"]', timeout=15000)
        settle(page, 700)
        shot_el(page, ".auth-form", "02-verificacion.png")
        c.close()

        # ---------- Estudiante ----------
        c = ctx(token=tokens["student"])
        page = c.new_page()
        page.goto(f"{BASE_WEB}/#/inicio", wait_until="domcontentloaded")
        page.wait_for_selector('[data-testid="integration-layer"]', timeout=20000)
        page.wait_for_selector('[data-testid="integration-mock-note"]', timeout=15000)
        settle(page)
        shot_el(page, '[data-testid="integration-layer"]', "03-inicio.png")

        page.goto(f"{BASE_WEB}/#/asesorias", wait_until="domcontentloaded")
        settle(page, 1800)
        shot_page(page, "04-asesorias.png")

        page.goto(f"{BASE_WEB}/#/dudas", wait_until="domcontentloaded")
        settle(page, 1800)
        shot_page(page, "05-dudas.png")
        c.close()

        # ---------- Docente (dualidad de roles) ----------
        c = ctx(token=tokens["professor"])
        page = c.new_page()
        page.goto(f"{BASE_WEB}/#/inicio", wait_until="domcontentloaded")
        page.wait_for_selector('[data-testid="integration-layer"]', timeout=20000)
        page.wait_for_selector('[data-testid="integration-mock-note"]', timeout=15000)
        settle(page)
        shot_el(page, '[data-testid="integration-layer"]', "03-inicio-docente.png")
        c.close()

        # ---------- Estudiante en Modo Monitor ----------
        c = ctx(token=tokens["student"], monitor=True)
        page = c.new_page()
        page.goto(f"{BASE_WEB}/#/inicio", wait_until="domcontentloaded")
        page.wait_for_selector('[data-testid="monitor-panel"]', timeout=20000)
        settle(page)
        shot_el(page, '[data-testid="monitor-panel"]', "07-monitor.png")
        c.close()

        # ---------- 06 : Prioridad móvil (360 px) ----------
        c = ctx(token=tokens["student"], viewport=MOBILE, dsf=2)
        page = c.new_page()
        page.goto(f"{BASE_WEB}/#/inicio", wait_until="domcontentloaded")
        page.wait_for_selector('[data-testid="integration-layer"]', timeout=20000)
        settle(page, 1800)
        shot_page(page, "06-movil.png")
        c.close()

        browser.close()

    print("DONE. Files:")
    for f in sorted(os.listdir(OUT_DIR)):
        print(" -", f, os.path.getsize(os.path.join(OUT_DIR, f)), "bytes")


if __name__ == "__main__":
    main()
