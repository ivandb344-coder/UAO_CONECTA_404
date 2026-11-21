import {
  filterCoherentSubjects,
  isCoherentQuestion,
  isCoherentSubject,
  isGarbageText,
} from "./validSubjects";
import { DEFAULT_LINKS, LINKS_KEY, loadLinks, normalizeExternalUrl } from "./integrationLinks";

describe("validSubjects cleanup filters", () => {
  it("filters out all live test/garbage subjects including eso tilin, six seven, xxjxjxj and numerical codes", () => {
    const raw = [
      { id: "1", code: "MAT101", name: "Cálculo I" },
      { id: "2", code: "INF201", name: "Programación" },
      { id: "3", code: "FIS101", name: "Física I" },
      { id: "4", code: "DAT301", name: "Ingeniería de Datos" },
      { id: "5", code: "DADA", name: "ola" },
      { id: "6", code: "INF301", name: "CHI" },
      { id: "7", code: "ASDASD", name: "prueva" },
      { id: "8", code: "2246487", name: "eso tilin" },
      { id: "9", code: "PPO01", name: "appo" },
      { id: "10", code: "3534SACASC", name: "qedasda343" },
      { id: "11", code: "3401", name: "introduccion VR" },
      { id: "12", code: "13123", name: "introduccion VR" },
      { id: "13", code: "TEST1", name: "eso tiltin" },
      { id: "14", code: "SIX7", name: "six seven" },
      { id: "15", code: "XXJXJXJ", name: "xxjxjxj" },
    ];

    const kept = filterCoherentSubjects(raw);
    expect(kept.map((s) => s.name)).toEqual([
      "Cálculo I",
      "Programación",
      "Física I",
      "Ingeniería de Datos",
    ]);
  });

  it("keeps official UAO curriculum courses and standard roman numeral variants", () => {
    expect(isCoherentSubject({ code: "MAT301", name: "Cálculo III" })).toBe(true);
    expect(isCoherentSubject({ code: "IHC201", name: "Interacción humano-computador" })).toBe(true);
    expect(isCoherentSubject({ code: "INF301", name: "Ingeniería de software 1" })).toBe(true);
  });

  it("rejects test/filler questions while keeping genuine student questions", () => {
    const garbageQuestions = [
      { subject: "Cálculo I", title: "dd", description: "sdsdsd" },
      { subject: "Cálculo I", title: "Hola", description: "kadlksakdasd" },
      { subject: "Duda III", title: "Duda", description: "Tengo una duda" },
      { subject: "Cálculo I", title: "Hola ", description: "Tengo una duda " },
      { subject: "Cálculo I", title: "hola?", description: "soy nuevo" },
    ];
    for (const q of garbageQuestions) {
      expect(isCoherentQuestion(q)).toBe(false);
    }

    const realQuestions = [
      { subject: "Modelado ", title: "problema con modelado de casa en blender", description: "hola tengo muchos ngons y no se como solucionarlo" },
      { subject: "Algreba Lineal 1", title: "Álgebra lineal", description: "Necesito ayuda con matrices no entiendo bien" },
      { subject: "Cálculo I", title: "Duda sobre derivadas parciales", description: "Tengo una duda sobre la regla de la cadena." },
      { subject: "Cálculo I", title: "TEST_regression_question", description: "TEST description" },
    ];
    for (const q of realQuestions) {
      expect(isCoherentQuestion(q)).toBe(true);
    }
    expect(isGarbageText("Cálculo III")).toBe(false);
  });
});

describe("integrationLinks normalization", () => {
  afterEach(() => {
    localStorage.removeItem(LINKS_KEY);
  });

  it("upgrades broken institutional domains and malformed Google Meet links", () => {
    expect(normalizeExternalUrl("https://moodle.uao.edu.co")).toBe(DEFAULT_LINKS.moodle);
    expect(normalizeExternalUrl("https://moodle.uao.edu.co/course/demo")).toBe(DEFAULT_LINKS.moodle);
    expect(normalizeExternalUrl("https://sinu.uao.edu.co")).toBe(DEFAULT_LINKS.banner);
    expect(normalizeExternalUrl("https://banner.uao.edu.co")).toBe(DEFAULT_LINKS.banner);
    expect(normalizeExternalUrl("https://meet.google.com/meet/szk-jacb-zhe")).toBe("https://meet.google.com/szk-jacb-zhe");
    expect(normalizeExternalUrl("https://meet.google.com/uao-calculo")).toBe("https://meet.google.com/");
  });

  it("auto-normalizes legacy URLs stored in localStorage", () => {
    localStorage.setItem(LINKS_KEY, JSON.stringify({
      moodle: "https://moodle.uao.edu.co",
      banner: "https://sinu.uao.edu.co",
      support: "mailto:",
    }));
    const loaded = loadLinks();
    expect(loaded.moodle).toBe("https://campus.uaovirtual.edu.co");
    expect(loaded.banner).toBe("https://www.uao.edu.co/ingreso-a-portales/");
    expect(loaded.support).toBe(DEFAULT_LINKS.support);
  });
});
