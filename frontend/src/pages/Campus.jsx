import { ArrowUpRight, CalendarDays, Newspaper, BookOpen, LifeBuoy } from "lucide-react";
import { DEFAULT_LINKS } from "@/lib/integrationLinks";

const LINKS = [
  { title: "Eventos UAO", description: "Consulta actividades, encuentros y eventos de la Universidad.", href: "https://www.uao.edu.co/evento/", icon: CalendarDays },
  { title: "Noticias UAO", description: "Lee novedades e información institucional publicada por la UAO.", href: "https://www.uao.edu.co/noticias/", icon: Newspaper },
  { title: "Biblioteca UAO", description: "Encuentra servicios, recursos y espacios de la Biblioteca.", href: "https://www.uao.edu.co/biblioteca/", icon: BookOpen },
];

export default function Campus() {
  return <section className="page campus-page" data-testid="campus-page"><div className="page-head"><div><p className="eyebrow">CONECTAR · VIDA UNIVERSITARIA</p><h1>Vida UAO</h1><p className="lede">Novedades, eventos y recursos universitarios desde un solo lugar.</p></div></div><div className="campus-grid">{LINKS.map(({title,description,href,icon:Icon})=><a className="campus-card" href={href} target="_blank" rel="noopener noreferrer" key={title}><span className="campus-card-icon"><Icon size={22} aria-hidden="true"/></span><span className="campus-card-copy"><strong>{title}</strong><small>{description}</small></span><ArrowUpRight size={17} aria-hidden="true"/></a>)}</div><section className="campus-support" aria-labelledby="campus-support-title"><LifeBuoy size={21} aria-hidden="true"/><div><h2 id="campus-support-title">¿Necesitas ayuda con UAO Conecta?</h2><p>Reporta un error o envía una sugerencia. Describe qué pasó y cómo podemos reproducirlo; no incluyas contraseñas. El correo de contacto es opcional.</p><a href={DEFAULT_LINKS.support} target="_blank" rel="noopener noreferrer">Abrir formulario de soporte <ArrowUpRight size={14} aria-hidden="true"/></a></div></section></section>;
}
