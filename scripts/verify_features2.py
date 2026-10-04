#!/usr/bin/env python3
"""Verificación funcional de las 3 nuevas features (frontend)."""
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
    tok_prof = token("pacastillo@uao.edu.co", "UAOdemo2026!")
    tok_stu = token("estudiante.demo@uao.edu.co", "UAOdemo2026!")
    results = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True, args=["--no-sandbox"])

        # ---------- TASK 1: 6 tarjetas en 3 categorías + URLs + target=_blank ----------
        c = b.new_context(viewport={"width": 1440, "height": 1100})
        c.add_init_script(f"localStorage.setItem('uao_token','{tok_prof}')")
        pg = c.new_page()
        pg.goto(f"{WEB}/#/inicio", wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="ecosystem-layer"]', timeout=20000)
        pg.wait_for_timeout(600)
        groups = pg.eval_on_selector_all('[data-testid^="eco-group-"]', "els => els.map(e => e.getAttribute('data-testid'))")
        cards = pg.eval_on_selector_all('[data-testid^="eco-card-"]', "els => els.map(e => e.getAttribute('data-testid'))")
        results["t1_groups"] = sorted(groups)
        results["t1_card_count"] = len(cards)
        # URLs por defecto + atributos de seguridad
        link_attrs = pg.eval_on_selector_all(
            '[data-testid^="eco-open-"]',
            "els => els.map(e => ({k:e.getAttribute('data-testid'), href:e.getAttribute('href'), target:e.getAttribute('target'), rel:e.getAttribute('rel')}))"
        )
        amap = {a["k"]: a for a in link_attrs}
        exp = {
            "eco-open-moodle": "https://moodle.uao.edu.co",
            "eco-open-banner": "https://sinu.uao.edu.co",
            "eco-open-gmail": "https://mail.google.com",
            "eco-open-teams": "https://teams.microsoft.com",
            "eco-open-piazza": "https://piazza.com",
            "eco-open-whatsapp": "https://web.whatsapp.com",
        }
        results["t1_urls_ok"] = all(amap.get(k, {}).get("href") == v for k, v in exp.items())
        results["t1_target_blank"] = all(amap.get(k, {}).get("target") == "_blank" for k in exp)
        results["t1_rel_noopener"] = all("noopener" in (amap.get(k, {}).get("rel") or "") and "noreferrer" in (amap.get(k, {}).get("rel") or "") for k in exp)

        # ---------- TASK 2: editar enlaces (profesor) + persistencia localStorage ----------
        results["t2_edit_btn_professor"] = pg.query_selector('[data-testid="integration-edit-links"]') is not None
        pg.click('[data-testid="integration-edit-links"]')
        pg.wait_for_selector('[data-testid="edit-links-modal"]', timeout=5000)
        # modificar WhatsApp
        pg.fill('[data-testid="edit-link-whatsapp"]', "https://chat.whatsapp.com/DEMOGRUPO404")
        # URL inválida deshabilita guardar
        pg.fill('[data-testid="edit-link-moodle"]', "notaurl")
        pg.wait_for_timeout(200)
        save_disabled = pg.get_attribute('[data-testid="edit-links-save"]', "disabled") is not None
        results["t2_invalid_blocks_save"] = save_disabled
        # corregir moodle y guardar
        pg.fill('[data-testid="edit-link-moodle"]', "https://moodle.uao.edu.co/course/demo404")
        pg.wait_for_timeout(150)
        pg.click('[data-testid="edit-links-save"]')
        pg.wait_for_timeout(500)
        stored = pg.evaluate("() => localStorage.getItem('uao_integration_links')")
        results["t2_saved_localstorage"] = stored is not None and "DEMOGRUPO404" in stored and "course/demo404" in stored
        # la tarjeta refleja la nueva URL sin recargar
        wa_href = pg.get_attribute('[data-testid="eco-open-whatsapp"]', "href")
        results["t2_card_reflects"] = wa_href == "https://chat.whatsapp.com/DEMOGRUPO404"
        # persiste tras recarga
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="eco-open-whatsapp"]', timeout=20000)
        results["t2_persists_reload"] = pg.get_attribute('[data-testid="eco-open-whatsapp"]', "href") == "https://chat.whatsapp.com/DEMOGRUPO404"
        # Restablecer por defecto
        pg.click('[data-testid="integration-edit-links"]')
        pg.wait_for_selector('[data-testid="edit-links-modal"]', timeout=5000)
        pg.click('[data-testid="edit-links-reset"]')
        pg.wait_for_timeout(200)
        results["t2_reset_fields"] = pg.input_value('[data-testid="edit-link-whatsapp"]') == "https://web.whatsapp.com"
        pg.click('[data-testid="edit-links-save"]')
        pg.wait_for_timeout(400)
        results["t2_reset_persists"] = pg.get_attribute('[data-testid="eco-open-whatsapp"]', "href") == "https://web.whatsapp.com"
        pg.screenshot(path="/tmp/g_ecosystem.png")
        c.close()

        # El estudiante NO debe ver el botón editar
        c = b.new_context(viewport={"width": 1440, "height": 1000})
        c.add_init_script(f"localStorage.setItem('uao_token','{tok_stu}')")
        pg = c.new_page()
        pg.goto(f"{WEB}/#/inicio", wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="ecosystem-layer"]', timeout=20000)
        results["t2_hidden_for_student"] = pg.query_selector('[data-testid="integration-edit-links"]') is None
        c.close()

        # ---------- TASK 3: Modo Presentación (5 pasos) ----------
        c = b.new_context(viewport={"width": 1440, "height": 1000})
        c.add_init_script(f"localStorage.setItem('uao_token','{tok_stu}')")
        pg = c.new_page()
        pg.goto(f"{WEB}/#/inicio", wait_until="domcontentloaded")
        pg.wait_for_selector('[data-testid="presentation-mode-button"]', timeout=20000)
        pg.click('[data-testid="presentation-mode-button"]')
        pg.wait_for_selector('[data-testid="presentation-banner"]', timeout=5000)
        titles = []
        routes = []
        # paso 1
        pg.wait_for_timeout(900)
        titles.append(pg.inner_text('[data-testid="tour-step-title"]'))
        routes.append(pg.url)
        results["t3_step1_highlight"] = pg.query_selector('.tour-highlight') is not None
        # avanzar hasta el paso 5
        for _ in range(4):
            pg.click('[data-testid="tour-next"]')
            pg.wait_for_timeout(1100)
            titles.append(pg.inner_text('[data-testid="tour-step-title"]'))
            routes.append(pg.url)
        results["t3_titles"] = titles
        results["t3_reached_5"] = "5 de 5" in pg.inner_text('[data-testid="presentation-banner"]')
        # paso 5 abre el modal de recuperación
        results["t3_step5_forgot"] = pg.query_selector('[data-testid="forgot-modal"]') is not None
        pg.screenshot(path="/tmp/g_tour5.png")
        # anterior funciona
        pg.click('[data-testid="tour-prev"]')
        pg.wait_for_timeout(900)
        results["t3_prev_works"] = "4 de 5" in pg.inner_text('[data-testid="presentation-banner"]')
        # salir
        pg.click('[data-testid="tour-exit"]')
        pg.wait_for_timeout(400)
        results["t3_exit"] = pg.query_selector('[data-testid="presentation-banner"]') is None and pg.query_selector('.tour-highlight') is None
        c.close()
        b.close()

    print(json.dumps(results, ensure_ascii=False, indent=2))
    fails = [k for k, v in results.items() if v is False]
    print("\nFAILS:", fails if fails else "NONE")


if __name__ == "__main__":
    main()
