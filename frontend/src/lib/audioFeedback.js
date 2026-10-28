const PREFERENCES_KEY = "uao_a11y";

let audioContext;
let lastSpoken = "";
let lastSpokenAt = 0;

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
  } catch {
    return {};
  }
}

const SOUNDS = {
  click: [[720, 0.035, 0]],
  save: [[610, 0.055, 0], [850, 0.085, 0.075]],
  question: [[540, 0.07, 0], [760, 0.09, 0.085]],
  ai: [[520, 0.055, 0], [690, 0.065, 0.07], [880, 0.09, 0.15]],
  message: [[680, 0.05, 0], [900, 0.075, 0.08]],
};

function playTones(type) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    audioContext ||= new AudioContextClass();
    const now = audioContext.currentTime;
    for (const [frequency, duration, offset] of SOUNDS[type] || SOUNDS.click) {
      const start = now + offset;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.035, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    }
  } catch {
    // Sound is an optional enhancement; keep controls working if audio is unavailable.
  }
}

export function playUiSound(type = "click") {
  if (!readPreferences().sound_effects || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    audioContext ||= new AudioContextClass();
    if (audioContext.state === "suspended") {
      audioContext.resume().then(() => playTones(type)).catch(() => {});
      return;
    }
    playTones(type);
  } catch {
    // Some browser or device configurations do not expose Web Audio.
  }
}

export function speakUiLabel(text) {
  if (!readPreferences().spoken_labels || typeof window === "undefined" || !window.speechSynthesis) return;
  const label = String(text || "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!label) return;
  const now = Date.now();
  if (label === lastSpoken && now - lastSpokenAt < 700) return;
  lastSpoken = label;
  lastSpokenAt = now;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(label);
    utterance.lang = "es-CO";
    utterance.rate = 1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis varies by browser; it must never block navigation.
  }
}

export function getUiLabel(element) {
  if (!element) return "";
  const labelledBy = element.getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent || "")
    .join(" ");
  const label = element.getAttribute("aria-label")
    || labelledBy
    || element.closest("label")?.innerText
    || element.innerText
    || element.getAttribute("title")
    || element.getAttribute("placeholder");
  return String(label || "").replace(/\s+/g, " ").trim();
}
