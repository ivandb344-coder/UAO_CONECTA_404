import { UAO_CURRICULA } from "../data/uaoCurricula";

const ROMAN_TO_ARABIC = new Map([
  ["i", "1"],
  ["ii", "2"],
  ["iii", "3"],
  ["iv", "4"],
  ["v", "5"],
  ["vi", "6"],
]);

const ALLOWED_CONSONANT_ACRONYMS = new Set([
  "ti",
  "ia",
  "ihc",
  "hci",
  "etl",
  "iot",
  "sql",
  "uml",
  "xml",
  "html",
  "http",
  "css",
  "php",
  "tcp",
  "udp",
  "ieee",
  "cad",
  "cam",
  "cnc",
  "erp",
  "crm",
  "ods",
  "bdd",
  "poo",
  "oop",
  "eda",
  "tda",
]);

const GARBAGE_PHRASES = [
  "xxjxjxj",
  "six seven",
  "sixseven",
  "seven six",
  "eso tilin",
  "eso tiltin",
  "esotilin",
  "esotiltin",
  "introduccion vr",
  "duda iii",
  "kadlksakdasd",
  "sdsdsd",
  "qedasda",
  "prueva",
  "hello world",
  "hola mundo",
  "lorem ipsum",
  "sin nombre",
  "sin titulo",
  "no sirve",
  "cualquier cosa",
  "asdf",
  "qwer",
  "qwerty",
  "zxcv",
  "hjkl",
  "jaja",
  "jeje",
];

const EXACT_FILLER_TEXTS = new Set([
  "hola",
  "ola",
  "olak",
  "duda",
  "tengo una duda",
  "soy nuevo",
  "dd",
  "chi",
  "appo",
  "prueva",
  "eso tilin",
  "eso tiltin",
  "introduccion vr",
  "duda iii",
  "dsdsd",
  "sdsdsd",
  "dwdw",
  "hgh",
  "kadlksakdasd",
  "qedasda343",
]);

const GARBAGE_WORDS = new Set([
  "xxjxjxj",
  "sixseven",
  "tilin",
  "tiltin",
  "prueva",
  "pruevas",
  "ola",
  "olak",
  "appo",
  "chi",
  "qedasda343",
  "kadlksakdasd",
  "sdsdsd",
  "dsdsd",
  "dwdw",
  "hgh",
  "dd",
  "xd",
  "test",
  "tests",
  "testing",
  "prueba",
  "pruebas",
  "mock",
  "mocks",
  "basura",
  "relleno",
  "sample",
  "dummy",
  "fake",
  "demo",
  "asdf",
  "asdfg",
  "qwerty",
  "zxcv",
  "zxcvb",
  "lorem",
  "ipsum",
  "foo",
  "bar",
  "baz",
  "ejemplo",
  "placeholder",
  "temporal",
  "temp",
  "borrar",
  "delete",
  "none",
  "null",
  "undefined",
  "nan",
  "aaa",
  "bbb",
  "ccc",
  "xxx",
  "zzz",
]);

const GARBAGE_CODES = new Set([
  "TEST",
  "TEST1",
  "TEST01",
  "PRUEBA",
  "MOCK",
  "DEMO",
  "FAKE",
  "DUMMY",
  "BASURA",
  "RELLENO",
  "ASDF",
  "ASDASD",
  "DADA",
  "PPO01",
  "3534SACASC",
  "QWERTY",
  "XXX",
  "XXJXJXJ",
  "SIX7",
  "000",
  "0000",
  "123",
  "1234",
  "12345",
  "2246487",
  "3401",
  "13123",
]);

function normalizeSubjectText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalCourseName(value) {
  const normalized = normalizeSubjectText(value);
  if (!normalized) return "";
  return normalized
    .split(" ")
    .map((word) => ROMAN_TO_ARABIC.get(word) || word)
    .join(" ");
}

const OFFICIAL_SUBJECT_NAMES = new Set([
  "calculo 1",
  "calculo 3",
  "programacion",
  "fisica 1",
  "fisica 3",
  "ingenieria de datos",
  "estructuras de datos",
  "bases de datos",
  "ecuaciones diferenciales",
  "algebra lineal",
  "programacion orientada a objetos",
  "inteligencia artificial",
  "interaccion humano computador",
  "ingenieria de software",
  ...UAO_CURRICULA.flatMap((curriculum) => [
    ...curriculum.courses,
    ...curriculum.electives,
    ...(curriculum.electiveOptions || []),
  ]).map((course) => canonicalCourseName(course.name)),
]);

export function isGarbageText(value) {
  const normalized = normalizeSubjectText(value);
  if (!normalized || normalized.length < 2) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (EXACT_FILLER_TEXTS.has(normalized)) return true;
  if (GARBAGE_PHRASES.some((phrase) => normalized.includes(phrase))) return true;

  const words = normalized.split(" ").filter(Boolean);
  if (!words.length) return true;

  // In multi-word phrases, allow valid technical words like "test" or "null" inside real sentences,
  // while rejecting phrases composed entirely of placeholder/garbage words or containing gibberish tokens.
  const hasHardGibberish = words.some((word) => {
    if (ROMAN_TO_ARABIC.has(word)) return false;
    if (/(.)\1{2,}/.test(word)) return true;
    if (/([a-z]{1,2})\1{2,}/.test(word)) return true;
    if (/[xzjqwk]{3,}/.test(word)) return true;
    const letters = word.replace(/[^a-z]/g, "");
    if (letters.length >= 4 && !ALLOWED_CONSONANT_ACRONYMS.has(letters)) {
      const vowels = (letters.match(/[aeiou]/g) || []).length;
      if (vowels === 0 || (letters.length >= 6 && vowels / letters.length < 0.18) || /[bcdfghjklmnpqrstvwxyz]{5,}/.test(letters)) {
        return true;
      }
    }
    return false;
  });
  if (hasHardGibberish) return true;

  if (words.every((word) => GARBAGE_WORDS.has(word) || /^\d+$/.test(word))) return true;

  // Detect meaningless filler number-word sequences like "six seven" or "one two three"
  const englishNumbers = new Set(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]);
  if (words.length >= 2 && words.every((word) => englishNumbers.has(word))) return true;

  return false;
}

export function isValidAcademicCode(code = "") {
  const upper = String(code || "").trim().toUpperCase();
  if (!upper || upper.length < 2) return false;
  if (GARBAGE_CODES.has(upper)) return false;
  if (/^\d+$/.test(upper)) return false;
  if (!/[A-Z]/.test(upper)) return false;
  if (/(.)\1{3,}/.test(upper)) return false;
  if (/^([A-Z]{2})\1+$/.test(upper)) return false;
  const lettersOnly = upper.replace(/[^A-Z]/g, "");
  if (lettersOnly.length >= 5 && isGarbageText(lettersOnly)) return false;
  return true;
}

export function isCoherentSubjectName(name, code = "") {
  const trimmedCode = String(code || "").trim();
  if (trimmedCode && !isValidAcademicCode(trimmedCode)) return false;

  const canonical = canonicalCourseName(name);
  if (!canonical || canonical.length < 2) return false;
  if (EXACT_FILLER_TEXTS.has(canonical)) return false;
  if (OFFICIAL_SUBJECT_NAMES.has(canonical)) return true;

  if (isGarbageText(name)) return false;

  const words = normalizeSubjectText(name).split(" ").filter(Boolean);
  if (words.some((word) => GARBAGE_WORDS.has(word))) return false;
  const meaningfulWords = words.filter((word) => /[a-z]{2,}/.test(word));
  return meaningfulWords.length > 0;
}

export function isCoherentSubject(subject) {
  if (!subject || typeof subject !== "object") return false;
  if (subject.status === "deleted" || subject.deleted_at) return false;
  if (!isValidAcademicCode(subject.code)) return false;
  const canonical = canonicalCourseName(subject.name);
  if (!canonical || EXACT_FILLER_TEXTS.has(canonical)) return false;
  return OFFICIAL_SUBJECT_NAMES.has(canonical);
}

export function filterCoherentSubjects(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(isCoherentSubject);
}

export function isCoherentQuestion(q) {
  if (!q || typeof q !== "object") return false;
  if (!isCoherentSubjectName(q.subject)) return false;
  const normTitle = normalizeSubjectText(q.title);
  if (!normTitle || normTitle.length < 4) return false;
  if (EXACT_FILLER_TEXTS.has(normTitle) || isGarbageText(q.title)) return false;
  if (q.description) {
    const normDesc = normalizeSubjectText(q.description);
    if (!normDesc || EXACT_FILLER_TEXTS.has(normDesc) || isGarbageText(q.description)) return false;
  }
  return true;
}

export function isCoherentAdvisory(a) {
  if (!a || typeof a !== "object") return false;
  return isCoherentSubjectName(a.subject) && !isGarbageText(a.topic);
}

export function cleanTestSubjectStorage() {
  if (typeof window === "undefined") return;

  const storages = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    if (!storage) continue;
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (!key) continue;

        if (key.startsWith("uao_recent_searches_")) {
          const parsed = JSON.parse(storage.getItem(key) || "[]");
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((item) => typeof item === "string" && !isGarbageText(item));
            if (cleaned.length !== parsed.length) {
              storage.setItem(key, JSON.stringify(cleaned));
            }
          }
        } else if (key.startsWith("uao_question_draft_")) {
          const draft = JSON.parse(storage.getItem(key) || "null");
          if (draft && typeof draft === "object") {
            if (isGarbageText(draft.title) && isGarbageText(draft.subject)) {
              storage.removeItem(key);
            } else if (draft.subject && isGarbageText(draft.subject)) {
              storage.setItem(key, JSON.stringify({ ...draft, subject: "Cálculo I" }));
            }
          }
        }
      }
    } catch {
      // Ignore storage access or JSON parsing errors in restricted environments.
    }
  }
}
