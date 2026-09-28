import { Linkedin, MessageCircle, Send, Video, Users, Mail, Globe, GraduationCap, Phone, BookOpen } from "lucide-react";

// Icon and label mapping for supported networks/platforms
export const PLATFORMS = [
  { key: "moodle", label: "Moodle", icon: GraduationCap, placeholder: "https://moodle.uao.edu.co/..." },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "https://wa.me/57..." },
  { key: "discord", label: "Discord", icon: Users, placeholder: "https://discord.gg/..." },
  { key: "meet", label: "Google Meet", icon: Video, placeholder: "https://meet.google.com/..." },
  { key: "teams", label: "Microsoft Teams", icon: Video, placeholder: "https://teams.microsoft.com/..." },
  { key: "piazza", label: "Piazza", icon: BookOpen, placeholder: "https://piazza.com/..." },
  { key: "telegram", label: "Telegram", icon: Send, placeholder: "https://t.me/..." },
  { key: "email", label: "Correo electrónico", icon: Mail, placeholder: "mailto:tu@correo.com" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/..." },
  { key: "custom", label: "Otro enlace", icon: Globe, placeholder: "https://..." },
];

export const platformMeta = (key) => PLATFORMS.find((p) => p.key === key) || PLATFORMS[PLATFORMS.length - 1];
export const platformIcon = (key) => platformMeta(key).icon;

export { Phone };
