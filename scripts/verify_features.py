#!/usr/bin/env python3
"""Verificación funcional de las nuevas features (frontend)."""
import json
import urllib.request
from playwright.sync_api import sync_playwright

WEB = "http://localhost:3000"
API = "http://localhost:8001/api"
CHROME = "/usr/bin/google-chrome"


def token(email, pw):
    req = urllib.request.Request(f"{API}/auth/login",
                                 data=json.dumps({"email": email, "password": pw}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["token"]


def main():
    tok = token("estudiante.demo@uao.edu.co", "UAOdemo2026!")
    results = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True, args=["--no-sandbox"])

        # ---------- TASK 2: Forgot password modal (sin sesión) ----------
        c = b.new_context(viewport={"width": 1440, "height": 900})
        pg = c.new_page()
        pg.goto(f"{WEB}/", wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="forgot-password-button"]', timeout=20000)
        pg.click('[data-testid="forgot-password-button"]')
        pg.wait_for_selector('[data-testid="forgot-modal"]', timeout=5000)
        # correo inválido -> error en tiempo real
        pg.fill('[data-testid="forgot-email-input"]', "test@gmail.com")
        pg.wait_for_timeout(300)
        err = pg.query_selector('[data-testid="forgot-email-error"]')
        submit_disabled = pg.get_attribute('[data-testid="forgot-submit"]', "disabled") is not None
        results["t2_invalid_shows_error"] = err is not None and submit_disabled
        # correo válido -> enviar -> vista previa
        pg.fill('[data-testid="forgot-email-input"]', "daniel@uao.edu.co")
        pg.wait_for_timeout(300)
        pg.click('[data-testid="forgot-submit"]')
        pg.wait_for_selector('[data-testid="forgot-email-preview"]', timeout=5000)
        token_txt = pg.inner_text('[data-testid="forgot-preview-token"]')
        recipient = pg.inner_text('[data-testid="forgot-preview-recipient"]')
        results["t2_preview_token"] = "UAO-2026-RESTORE-SECURE" in token_txt
        results["t2_preview_recipient"] = "daniel@uao.edu.co" in recipient
        pg.screenshot(path="/tmp/f_forgot.png")
        c.close()

        # ---------- TASK 5 + Dashboard: ecosystem cards ----------
        c = b.new_context(viewport={"width": 1440, "height": 1000})
        c.add_init_script(f"localStorage.setItem('uao_token','{tok}')")
        pg = c.new_page()
        pg.goto(f"{WEB}/#/inicio", wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="ecosystem-layer"]', timeout=20000)
        results["t5_gmail"] = pg.query_selector('[data-testid="eco-card-gmail"]') is not None
        results["t5_piazza"] = pg.query_selector('[data-testid="eco-card-piazza"]') is not None
        results["t5_whatsapp"] = pg.query_selector('[data-testid="eco-card-whatsapp"]') is not None
        cats = pg.eval_on_selector_all('[data-testid^="eco-category-"]', "els => els.map(e => e.textContent)")
        results["t5_categories"] = sorted(cats)
        # Conectar Piazza -> cambia a Sincronizado
        before = pg.inner_text('[data-testid="eco-status-piazza"]')
        pg.click('[data-testid="eco-connect-piazza"]')
        pg.wait_for_timeout(400)
        after = pg.inner_text('[data-testid="eco-status-piazza"]')
        results["t5_connect_toggles"] = "Disponible" in before and "Sincronizado" in after
        pg.screenshot(path="/tmp/f_ecosystem.png")
        c.close()

        # ---------- TASK 1: Lightbox en Evidencias ----------
        c = b.new_context(viewport={"width": 1440, "height": 1000})
        c.add_init_script(f"localStorage.setItem('uao_token','{tok}')")
        pg = c.new_page()
        pg.goto(f"{WEB}/#/evidencias-dcu", wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="flow-carousel"]', timeout=20000)
        pg.wait_for_timeout(1000)
        # abrir lightbox desde el carrusel
        pg.click('[data-testid="flow-zoom-login"]')
        pg.wait_for_selector('[data-testid="lightbox"]', timeout=5000)
        img_ok = pg.evaluate("() => { const i = document.querySelector('[data-testid=lightbox-image]'); return i && i.complete && i.naturalWidth > 0; }")
        results["t1_lightbox_opens"] = img_ok
        pg.screenshot(path="/tmp/f_lightbox.png")
        # cerrar con botón X
        pg.click('[data-testid="lightbox-close"]')
        pg.wait_for_timeout(400)
        results["t1_lightbox_closes"] = pg.query_selector('[data-testid="lightbox"]') is None
        # pestaña necesidades: "Ver" NO abre lightbox, navega
        pg.click('[data-testid="ev-tab-button-necesidades"]')
        pg.wait_for_timeout(800)
        pg.click('[data-testid="ev-need-open-N1"]')
        pg.wait_for_timeout(800)
        results["t1_ver_navigates"] = "/asignaturas" in pg.url and pg.query_selector('[data-testid="lightbox"]') is None
        c.close()

        # ---------- TASK 4: AI sessionStorage + nueva conversación ----------
        c = b.new_context(viewport={"width": 1440, "height": 1000})
        c.add_init_script(f"localStorage.setItem('uao_token','{tok}')")
        pg = c.new_page()
        pg.goto(f"{WEB}/#/asistente-ia", wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="ai-message-input"]', timeout=20000)
        pg.fill('[data-testid="ai-message-input"]', "Hola, prueba de persistencia")
        pg.click('[data-testid="send-ai-message"]')
        pg.wait_for_timeout(1500)
        hist = pg.evaluate("() => sessionStorage.getItem('uao_chat_history')")
        results["t4_saved_session"] = hist is not None and "persistencia" in hist
        # navegar a otra vista y volver -> restaura
        pg.goto(f"{WEB}/#/configuracion", wait_until="domcontentloaded")
        pg.wait_for_timeout(600)
        pg.goto(f"{WEB}/#/asistente-ia", wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="ai-message-input"]', timeout=20000)
        pg.wait_for_timeout(600)
        restored = pg.evaluate("() => Array.from(document.querySelectorAll('.ai-bubble')).map(e => e.textContent)")
        results["t4_restored"] = any("persistencia" in t for t in restored)
        # nueva conversación limpia
        pg.click('[data-testid="ai-new-conversation"]')
        pg.wait_for_timeout(500)
        after_reset = pg.evaluate("() => Array.from(document.querySelectorAll('.ai-bubble')).map(e => e.textContent)")
        hist_after = pg.evaluate("() => sessionStorage.getItem('uao_chat_history')")
        results["t4_reset_clears"] = not any("persistencia" in t for t in after_reset)
        pg.screenshot(path="/tmp/f_ai.png")
        c.close()
        b.close()

    print(json.dumps(results, ensure_ascii=False, indent=2))
    fails = [k for k, v in results.items() if v is False]
    print("\nFAILS:", fails if fails else "NONE")


if __name__ == "__main__":
    main()
