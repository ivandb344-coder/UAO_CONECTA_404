"""
Backend Testing Suite - Iteración 9: 5 features nuevas
Prueba SOLO los cambios de backend recién implementados:
1. POST /api/ai con EMERGENT_LLM_KEY + fallback Mock AI (NUNCA 500)
2. GET /api/integrations/summary con ecosystem (gmail/piazza/whatsapp)
"""
import requests
import json

BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

# Credenciales de test_credentials.md
STUDENT_EMAIL = "estudiante.demo@uao.edu.co"
PROFESSOR_EMAIL = "pacastillo@uao.edu.co"
PASSWORD = "UAOdemo2026!"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log_pass(msg):
    print(f"{Colors.GREEN}✓ PASS{Colors.RESET}: {msg}")

def log_fail(msg):
    print(f"{Colors.RED}✗ FAIL{Colors.RESET}: {msg}")

def log_info(msg):
    print(f"{Colors.BLUE}ℹ INFO{Colors.RESET}: {msg}")

def log_section(msg):
    print(f"\n{Colors.YELLOW}{'='*80}{Colors.RESET}")
    print(f"{Colors.YELLOW}{msg}{Colors.RESET}")
    print(f"{Colors.YELLOW}{'='*80}{Colors.RESET}\n")

def login(email, password):
    """Login y retorna token Bearer"""
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code == 200:
        data = response.json()
        token = data.get("token")
        user = data.get("user", {})
        log_pass(f"Login exitoso: {email} (role={user.get('role')})")
        return token
    else:
        log_fail(f"Login falló: {response.status_code} - {response.text}")
        return None

def test_ai_endpoint(token):
    """
    Prueba POST /api/ai:
    - Con varios mensajes distintos → 200 con texto no vacío
    - Con mensaje vacío → 400
    - Sin Authorization → 401/403
    - NUNCA debe devolver 500 (robustez del fallback)
    """
    log_section("TEST 1: POST /api/ai - Asistente IA con fallback Mock AI")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Mensajes de prueba (variados para cubrir diferentes keywords del mock)
    test_messages = [
        "¿Dónde encuentro asesorías de Cálculo?",
        "¿Cuál es mi horario?",
        "¿cómo veo mis notas?",
        "hola",
        "¿Qué es UAO Conecta?",
        "ayuda con matrícula",
    ]
    
    all_passed = True
    
    for i, message in enumerate(test_messages, 1):
        log_info(f"Mensaje {i}: '{message}'")
        response = requests.post(
            f"{API_BASE}/ai",
            headers=headers,
            json={"message": message}
        )
        
        if response.status_code == 200:
            content = response.text
            content_type = response.headers.get("Content-Type", "")
            
            if content and len(content.strip()) > 0:
                log_pass(f"  → 200 OK, texto no vacío ({len(content)} chars), Content-Type: {content_type}")
                log_info(f"  → Respuesta: {content[:100]}...")
            else:
                log_fail(f"  → 200 pero respuesta vacía")
                all_passed = False
        elif response.status_code == 500:
            log_fail(f"  → CRÍTICO: 500 Internal Server Error (debe usar fallback Mock AI)")
            log_fail(f"  → Response: {response.text}")
            all_passed = False
        else:
            log_fail(f"  → {response.status_code}: {response.text}")
            all_passed = False
    
    # Test: mensaje vacío → 400
    log_info("Test: mensaje vacío")
    response = requests.post(
        f"{API_BASE}/ai",
        headers=headers,
        json={"message": ""}
    )
    if response.status_code == 400:
        detail = response.json().get("detail", "")
        if "mensaje" in detail.lower():
            log_pass(f"  → 400 con detalle correcto: '{detail}'")
        else:
            log_fail(f"  → 400 pero detalle inesperado: '{detail}'")
            all_passed = False
    else:
        log_fail(f"  → Esperaba 400, obtuvo {response.status_code}")
        all_passed = False
    
    # Test: sin Authorization → 401/403
    log_info("Test: sin Authorization")
    response = requests.post(
        f"{API_BASE}/ai",
        json={"message": "test"}
    )
    if response.status_code in [401, 403]:
        log_pass(f"  → {response.status_code} (no autenticado)")
    else:
        log_fail(f"  → Esperaba 401/403, obtuvo {response.status_code}")
        all_passed = False
    
    return all_passed

def test_integrations_summary(token, role_name):
    """
    Prueba GET /api/integrations/summary:
    - Debe incluir "ecosystem" con exactamente 3 items (gmail, piazza, whatsapp)
    - Cada item debe tener: key, category_label, status, description, cta
    - Debe incluir "systems" con moodle, teams, banner
    """
    log_section(f"TEST 2: GET /api/integrations/summary ({role_name})")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/integrations/summary", headers=headers)
    
    if response.status_code != 200:
        log_fail(f"Status code: {response.status_code}")
        return False
    
    data = response.json()
    all_passed = True
    
    # Verificar "systems"
    systems = data.get("systems", [])
    system_keys = [s.get("key") for s in systems]
    
    log_info(f"Systems encontrados: {system_keys}")
    
    expected_systems = ["moodle", "teams", "banner"]
    if set(system_keys) == set(expected_systems):
        log_pass(f"  → 'systems' contiene {expected_systems}")
    else:
        log_fail(f"  → 'systems' esperaba {expected_systems}, obtuvo {system_keys}")
        all_passed = False
    
    # Verificar "ecosystem"
    ecosystem = data.get("ecosystem", [])
    
    if not ecosystem:
        log_fail("  → 'ecosystem' no existe o está vacío")
        return False
    
    log_info(f"Ecosystem encontrado con {len(ecosystem)} items")
    
    if len(ecosystem) != 3:
        log_fail(f"  → 'ecosystem' debe tener exactamente 3 items, tiene {len(ecosystem)}")
        all_passed = False
    
    ecosystem_keys = [e.get("key") for e in ecosystem]
    expected_keys = ["gmail", "piazza", "whatsapp"]
    
    if set(ecosystem_keys) == set(expected_keys):
        log_pass(f"  → 'ecosystem' contiene {expected_keys}")
    else:
        log_fail(f"  → 'ecosystem' esperaba {expected_keys}, obtuvo {ecosystem_keys}")
        all_passed = False
    
    # Verificar estructura de cada item del ecosystem
    required_fields = ["key", "category_label", "status", "description", "cta"]
    
    for item in ecosystem:
        key = item.get("key")
        log_info(f"Verificando item '{key}'")
        
        missing_fields = [f for f in required_fields if f not in item]
        if missing_fields:
            log_fail(f"  → '{key}' falta campos: {missing_fields}")
            all_passed = False
        else:
            log_pass(f"  → '{key}' tiene todos los campos requeridos")
            
            # Verificar valores específicos
            category_label = item.get("category_label", "")
            status = item.get("status", "")
            cta = item.get("cta", {})
            
            log_info(f"    - category_label: '{category_label}'")
            log_info(f"    - status: '{status}'")
            log_info(f"    - cta: {cta}")
            
            # Verificar que cta tenga label, action, url
            if not all(k in cta for k in ["label", "action", "url"]):
                log_fail(f"  → '{key}' cta incompleto: {cta}")
                all_passed = False
    
    # Verificar category_label específicos
    expected_categories = {
        "gmail": "Comunicación oficial",
        "piazza": "Foros académicos",
        "whatsapp": "Soporte & contacto directo"
    }
    
    for item in ecosystem:
        key = item.get("key")
        if key in expected_categories:
            expected = expected_categories[key]
            actual = item.get("category_label", "")
            if actual == expected:
                log_pass(f"  → '{key}' category_label correcto: '{actual}'")
            else:
                log_fail(f"  → '{key}' category_label esperaba '{expected}', obtuvo '{actual}'")
                all_passed = False
    
    return all_passed

def main():
    print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
    print(f"{Colors.BLUE}Backend Testing Suite - Iteración 9: 5 features nuevas{Colors.RESET}")
    print(f"{Colors.BLUE}Base URL: {BASE_URL}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*80}{Colors.RESET}\n")
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
    
    # Login como estudiante
    log_section("SETUP: Login como estudiante")
    student_token = login(STUDENT_EMAIL, PASSWORD)
    
    if not student_token:
        log_fail("No se pudo obtener token de estudiante, abortando tests")
        return
    
    # Login como profesor
    log_section("SETUP: Login como profesor")
    professor_token = login(PROFESSOR_EMAIL, PASSWORD)
    
    if not professor_token:
        log_fail("No se pudo obtener token de profesor, abortando tests")
        return
    
    # Test 1: POST /api/ai (con token de estudiante)
    results["total"] += 1
    if test_ai_endpoint(student_token):
        results["passed"] += 1
        log_pass("TEST 1 COMPLETADO: POST /api/ai funciona correctamente")
    else:
        results["failed"] += 1
        log_fail("TEST 1 FALLÓ: POST /api/ai tiene problemas")
    
    # Test 2: GET /api/integrations/summary (estudiante)
    results["total"] += 1
    if test_integrations_summary(student_token, "estudiante"):
        results["passed"] += 1
        log_pass("TEST 2 COMPLETADO: GET /api/integrations/summary (estudiante) funciona")
    else:
        results["failed"] += 1
        log_fail("TEST 2 FALLÓ: GET /api/integrations/summary (estudiante) tiene problemas")
    
    # Test 3: GET /api/integrations/summary (profesor)
    results["total"] += 1
    if test_integrations_summary(professor_token, "profesor"):
        results["passed"] += 1
        log_pass("TEST 3 COMPLETADO: GET /api/integrations/summary (profesor) funciona")
    else:
        results["failed"] += 1
        log_fail("TEST 3 FALLÓ: GET /api/integrations/summary (profesor) tiene problemas")
    
    # Resumen final
    log_section("RESUMEN FINAL")
    print(f"Total tests: {results['total']}")
    print(f"{Colors.GREEN}Passed: {results['passed']}{Colors.RESET}")
    print(f"{Colors.RED}Failed: {results['failed']}{Colors.RESET}")
    
    if results["failed"] == 0:
        print(f"\n{Colors.GREEN}{'='*80}{Colors.RESET}")
        print(f"{Colors.GREEN}✓ TODOS LOS TESTS PASARON{Colors.RESET}")
        print(f"{Colors.GREEN}{'='*80}{Colors.RESET}\n")
    else:
        print(f"\n{Colors.RED}{'='*80}{Colors.RESET}")
        print(f"{Colors.RED}✗ ALGUNOS TESTS FALLARON{Colors.RESET}")
        print(f"{Colors.RED}{'='*80}{Colors.RESET}\n")

if __name__ == "__main__":
    main()
