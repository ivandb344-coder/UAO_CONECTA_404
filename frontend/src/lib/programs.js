export const DEFAULT_PROGRAMS = [
  { group: "Computación y Contenidos Digitales", name: "Ingeniería Informática" },
  { group: "Computación y Contenidos Digitales", name: "Ingeniería de Datos e Inteligencia Artificial" },
  { group: "Computación y Contenidos Digitales", name: "Ingeniería Multimedia" },
  { group: "Automatización e Industria", name: "Ingeniería Industrial" },
  { group: "Automatización e Industria", name: "Ingeniería Mecatrónica" },
  { group: "Automatización e Industria", name: "Ingeniería de Manufactura" },
  { group: "Ingenierías", name: "Ingeniería Mecánica" },
  { group: "Ingenierías", name: "Ingeniería Eléctrica" },
  { group: "Ingenierías", name: "Ingeniería Electrónica y Telecomunicaciones" },
  { group: "Ingenierías", name: "Ingeniería Biomédica" },
  { group: "Ingenierías", name: "Ingeniería Ambiental" },
  { group: "Ingenierías", name: "Ingeniería Empresarial" },
];

export const PROGRAM_NAMES = DEFAULT_PROGRAMS.map((program) => program.name);

export const SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1);
