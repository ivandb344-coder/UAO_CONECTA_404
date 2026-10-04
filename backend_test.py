#!/usr/bin/env python3
"""
Batería rápida de regresión para UAO Conecta 404 (Hub de Integración Estudiantil)
Verifica el fix de arranque del backend y funcionalidad core.

Base URL: http://localhost:8001/api
Credenciales: /app/memory/test_credentials.md
"""
import requests
import sys

BASE_URL = "http://localhost:8001/api"
PASSWORD = "UAOdemo2026!"

# Colores para output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def log_pass(msg):
    print(f"{GREEN}✓ PASS{RESET}: {msg}")

def log_fail(msg):
    print(f"{RED}✗ FAIL{RESET}: {msg}")

def log_info(msg):
    print(f"{YELLOW}ℹ INFO{RESET}: {msg}")

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.failures = []
    
    def add_pass(self, msg):
        self.passed += 1
        log_pass(msg)
    
    def add_fail(self, msg):
        self.failed += 1
        self.failures.append(msg)
        log_fail(msg)
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*70}")
        print(f"RESUMEN: {self.passed}/{total} pruebas pasaron")
        if self.failures:
            print(f"\nFALLOS ({len(self.failures)}):")
            for i, failure in enumerate(self.failures, 1):
                print(f"  {i}. {failure}")
        print(f"{'='*70}\n")
        return self.failed == 0

results = TestResults()

def test_health():
    """1. GET /api/health → 200 con {"status":"ok","database":true}"""
    log_info("Test 1: GET /api/health")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=10)
        if resp.status_code != 200:
            results.add_fail(f"Health endpoint retornó {resp.status_code}, esperado 200")
            return
        
        data = resp.json()
        if data.get("status") != "ok":
            results.add_fail(f"Health status es '{data.get('status')}', esperado 'ok'")
            return
        
        if data.get("database") is not True:
            results.add_fail(f"Health database es {data.get('database')}, esperado true")
            return
        
        results.add_pass("Health endpoint OK: status=ok, database=true")
    except Exception as e:
        results.add_fail(f"Health endpoint error: {e}")

def test_login_professor():
    """2. POST /api/auth/login con pacastillo@uao.edu.co → 200, role="professor", name="Paola Andrea Castillo"""
    log_info("Test 2: POST /api/auth/login (docente)")
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "pacastillo@uao.edu.co", "password": PASSWORD},
            timeout=10
        )
        if resp.status_code != 200:
            results.add_fail(f"Login docente retornó {resp.status_code}, esperado 200. Response: {resp.text}")
            return None
        
        data = resp.json()
        token = data.get("token")
        user = data.get("user", {})
        
        if not token:
            results.add_fail("Login docente no retornó token")
            return None
        
        if user.get("role") != "professor":
            results.add_fail(f"Login docente role es '{user.get('role')}', esperado 'professor'")
            return None
        
        if user.get("name") != "Paola Andrea Castillo":
            results.add_fail(f"Login docente name es '{user.get('name')}', esperado 'Paola Andrea Castillo'")
            return None
        
        results.add_pass(f"Login docente OK: role=professor, name={user.get('name')}")
        return token
    except Exception as e:
        results.add_fail(f"Login docente error: {e}")
        return None

def test_login_student():
    """3. POST /api/auth/login con estudiante.demo@uao.edu.co → 200, role="student"""
    log_info("Test 3: POST /api/auth/login (estudiante)")
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "estudiante.demo@uao.edu.co", "password": PASSWORD},
            timeout=10
        )
        if resp.status_code != 200:
            results.add_fail(f"Login estudiante retornó {resp.status_code}, esperado 200. Response: {resp.text}")
            return None
        
        data = resp.json()
        token = data.get("token")
        user = data.get("user", {})
        
        if not token:
            results.add_fail("Login estudiante no retornó token")
            return None
        
        if user.get("role") != "student":
            results.add_fail(f"Login estudiante role es '{user.get('role')}', esperado 'student'")
            return None
        
        results.add_pass(f"Login estudiante OK: role=student, name={user.get('name')}")
        return token
    except Exception as e:
        results.add_fail(f"Login estudiante error: {e}")
        return None

def test_institutional_check_professor():
    """4. GET /api/auth/institutional-check?email=pacastillo@uao.edu.co → institutional:true, role:"professor"""
    log_info("Test 4: GET /api/auth/institutional-check (docente)")
    try:
        resp = requests.get(
            f"{BASE_URL}/auth/institutional-check",
            params={"email": "pacastillo@uao.edu.co"},
            timeout=10
        )
        if resp.status_code != 200:
            results.add_fail(f"Institutional check docente retornó {resp.status_code}, esperado 200")
            return
        
        data = resp.json()
        if data.get("institutional") is not True:
            results.add_fail(f"Institutional check docente institutional={data.get('institutional')}, esperado true")
            return
        
        if data.get("role") != "professor":
            results.add_fail(f"Institutional check docente role='{data.get('role')}', esperado 'professor'")
            return
        
        verified_by = data.get("verified_by", "")
        if "directorio" not in verified_by.lower() and "docente" not in verified_by.lower():
            results.add_fail(f"Institutional check docente verified_by no menciona directorio docente: '{verified_by}'")
            return
        
        results.add_pass(f"Institutional check docente OK: institutional=true, role=professor, verified_by menciona directorio")
    except Exception as e:
        results.add_fail(f"Institutional check docente error: {e}")

def test_institutional_check_student():
    """5. GET /api/auth/institutional-check?email=estudiante.demo@uao.edu.co → role:"student"""
    log_info("Test 5: GET /api/auth/institutional-check (estudiante)")
    try:
        resp = requests.get(
            f"{BASE_URL}/auth/institutional-check",
            params={"email": "estudiante.demo@uao.edu.co"},
            timeout=10
        )
        if resp.status_code != 200:
            results.add_fail(f"Institutional check estudiante retornó {resp.status_code}, esperado 200")
            return
        
        data = resp.json()
        if data.get("institutional") is not True:
            results.add_fail(f"Institutional check estudiante institutional={data.get('institutional')}, esperado true")
            return
        
        if data.get("role") != "student":
            results.add_fail(f"Institutional check estudiante role='{data.get('role')}', esperado 'student'")
            return
        
        results.add_pass(f"Institutional check estudiante OK: institutional=true, role=student")
    except Exception as e:
        results.add_fail(f"Institutional check estudiante error: {e}")

def test_institutional_check_external():
    """6. GET /api/auth/institutional-check?email=x@gmail.com → institutional:false (filtro de dominio)"""
    log_info("Test 6: GET /api/auth/institutional-check (correo externo)")
    try:
        resp = requests.get(
            f"{BASE_URL}/auth/institutional-check",
            params={"email": "x@gmail.com"},
            timeout=10
        )
        if resp.status_code != 200:
            results.add_fail(f"Institutional check externo retornó {resp.status_code}, esperado 200")
            return
        
        data = resp.json()
        if data.get("institutional") is not False:
            results.add_fail(f"Institutional check externo institutional={data.get('institutional')}, esperado false")
            return
        
        results.add_pass(f"Institutional check externo OK: institutional=false (filtro de dominio)")
    except Exception as e:
        results.add_fail(f"Institutional check externo error: {e}")

def test_integrations_summary_professor(token):
    """7a. GET /api/integrations/summary con Bearer token docente → 200, mock:true, systems contiene moodle/teams/banner, contenido docente"""
    log_info("Test 7a: GET /api/integrations/summary (docente)")
    if not token:
        results.add_fail("Integrations summary docente: no hay token disponible")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/integrations/summary",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if resp.status_code != 200:
            results.add_fail(f"Integrations summary docente retornó {resp.status_code}, esperado 200. Response: {resp.text}")
            return
        
        data = resp.json()
        if data.get("mock") is not True:
            results.add_fail(f"Integrations summary docente mock={data.get('mock')}, esperado true")
            return
        
        systems = data.get("systems", [])
        system_keys = [s.get("key") for s in systems]
        
        if "moodle" not in system_keys:
            results.add_fail("Integrations summary docente: falta sistema 'moodle'")
            return
        if "teams" not in system_keys:
            results.add_fail("Integrations summary docente: falta sistema 'teams'")
            return
        if "banner" not in system_keys:
            results.add_fail("Integrations summary docente: falta sistema 'banner'")
            return
        
        # Verificar contenido específico de docente
        moodle = next((s for s in systems if s.get("key") == "moodle"), {})
        moodle_items = moodle.get("items", [])
        moodle_labels = [item.get("label", "").lower() for item in moodle_items]
        
        has_entregas = any("entreg" in label and "calificar" in label for label in moodle_labels)
        if not has_entregas:
            results.add_fail("Integrations summary docente: Moodle no contiene 'Entregas por calificar'")
            return
        
        banner = next((s for s in systems if s.get("key") == "banner"), {})
        banner_items = banner.get("items", [])
        banner_labels = [item.get("label", "").lower() for item in banner_items]
        
        has_cursos = any("curso" in label and "asignado" in label for label in banner_labels)
        if not has_cursos:
            results.add_fail("Integrations summary docente: Banner no contiene 'Cursos asignados'")
            return
        
        results.add_pass("Integrations summary docente OK: mock=true, systems=[moodle,teams,banner], contenido docente verificado")
    except Exception as e:
        results.add_fail(f"Integrations summary docente error: {e}")

def test_integrations_summary_student(token):
    """7b. GET /api/integrations/summary con Bearer token estudiante → 200, mock:true, systems contiene moodle/teams/banner, contenido estudiante"""
    log_info("Test 7b: GET /api/integrations/summary (estudiante)")
    if not token:
        results.add_fail("Integrations summary estudiante: no hay token disponible")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/integrations/summary",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if resp.status_code != 200:
            results.add_fail(f"Integrations summary estudiante retornó {resp.status_code}, esperado 200. Response: {resp.text}")
            return
        
        data = resp.json()
        if data.get("mock") is not True:
            results.add_fail(f"Integrations summary estudiante mock={data.get('mock')}, esperado true")
            return
        
        systems = data.get("systems", [])
        system_keys = [s.get("key") for s in systems]
        
        if "moodle" not in system_keys:
            results.add_fail("Integrations summary estudiante: falta sistema 'moodle'")
            return
        if "teams" not in system_keys:
            results.add_fail("Integrations summary estudiante: falta sistema 'teams'")
            return
        if "banner" not in system_keys:
            results.add_fail("Integrations summary estudiante: falta sistema 'banner'")
            return
        
        # Verificar contenido específico de estudiante
        banner = next((s for s in systems if s.get("key") == "banner"), {})
        banner_items = banner.get("items", [])
        banner_labels = [item.get("label", "").lower() for item in banner_items]
        
        has_promedio = any("promedio" in label and "acumulado" in label for label in banner_labels)
        if not has_promedio:
            results.add_fail("Integrations summary estudiante: Banner no contiene 'Promedio acumulado'")
            return
        
        has_matricula = any("estado" in label and "matr" in label for label in banner_labels)
        if not has_matricula:
            results.add_fail("Integrations summary estudiante: Banner no contiene 'Estado de matrícula'")
            return
        
        results.add_pass("Integrations summary estudiante OK: mock=true, systems=[moodle,teams,banner], contenido estudiante verificado")
    except Exception as e:
        results.add_fail(f"Integrations summary estudiante error: {e}")

def main():
    print("\n" + "="*70)
    print("BATERÍA DE REGRESIÓN: UAO Conecta 404 - Fix de arranque backend")
    print("="*70 + "\n")
    
    # Test 1: Health
    test_health()
    
    # Test 2-3: Login
    professor_token = test_login_professor()
    student_token = test_login_student()
    
    # Test 4-6: Institutional check
    test_institutional_check_professor()
    test_institutional_check_student()
    test_institutional_check_external()
    
    # Test 7: Integrations summary
    test_integrations_summary_professor(professor_token)
    test_integrations_summary_student(student_token)
    
    # Summary
    success = results.summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
