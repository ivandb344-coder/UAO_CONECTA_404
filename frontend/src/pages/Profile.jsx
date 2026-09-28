import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Edit3, ArrowRight, Mail, Phone as PhoneIcon, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { StarsDisplay } from "@/components/ui/Stars";
import { Loading } from "@/components/ui/states";
import { PLATFORMS, platformMeta } from "@/lib/platforms";

const roleLabel = (r) => (r === "professor" ? "Profesor" : r === "monitor" ? "Monitor" : "Estudiante");

export default function Profile({ me }) {
  const { uid } = useParams();
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const targetId = uid || me?.id;

  useEffect(() => {
    if (!targetId) return;
    setUser(null);
    api
      .get(`/profiles/${targetId}`)
      .then((r) => setUser(r.data))
      .catch(() => setError("No pudimos cargar este perfil."));
  }, [targetId]);

  if (error) return <div className="page"><div className="error">{error}</div></div>;
  if (!user) return <Loading label="Cargando perfil…" />;

  const isMe = me && user.id === me.id;
  const visibleLinks = (user.links || []).filter((l) => l.visible !== false);

  return (
    <section className="page profile-page" data-testid="profile-page">
      <div className="profile-hero">
        <div className="profile-avatar">
          {user.picture ? (
            <img src={user.picture} alt={user.name} />
          ) : (
            <span>{(user.name || "?")[0]}</span>
          )}
        </div>
        <div className="profile-head">
          <p className="eyebrow">{roleLabel(user.role)} · {user.program || "Sin programa"}</p>
          <h1 data-testid="profile-name">{user.name}</h1>
          <p className="lede">@{user.username}{user.semester ? ` · ${user.semester}° semestre` : ""}</p>
          <div className="profile-rating" data-testid="profile-rating">
            <StarsDisplay value={user.rating || 0} count={user.rating_count || 0} />
          </div>
        </div>
        {isMe && (
          <button className="primary" onClick={() => nav("/perfil/editar")} data-testid="edit-profile-button">
            <Edit3 size={15} /> Editar perfil
          </button>
        )}
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <h3>Sobre {isMe ? "mí" : user.name.split(" ")[0]}</h3>
          <p>{user.bio || "Este perfil aún no tiene descripción."}</p>
          {user.academic_info && (
            <div className="profile-block">
              <p className="eyebrow">INFORMACIÓN ACADÉMICA</p>
              <p>{user.academic_info}</p>
            </div>
          )}
          <div className="profile-contact">
            {user.email && (
              <span className="pill"><Mail size={13} /> {user.email}</span>
            )}
            {user.phone && (
              <span className="pill"><PhoneIcon size={13} /> {user.phone}</span>
            )}
          </div>
        </div>

        <div className="profile-card">
          <h3>Redes y plataformas</h3>
          {visibleLinks.length ? (
            <ul className="link-list" data-testid="profile-links">
              {visibleLinks.map((l) => {
                const meta = platformMeta(l.platform);
                const Icon = meta.icon;
                return (
                  <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noreferrer" data-testid={`profile-link-${l.id}`}>
                      <Icon size={16} />
                      <div>
                        <b>{l.label || meta.label}</b>
                        <small>{l.url}</small>
                      </div>
                      <ExternalLink size={13} />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Sin enlaces publicados.</p>
          )}
          {isMe && (
            <button className="ghost small" onClick={() => nav("/perfil/editar")}>
              <ArrowRight size={13} /> {visibleLinks.length ? "Editar redes" : "Añadir enlaces"}
            </button>
          )}
        </div>
      </div>

      {isMe && (
        <div className="profile-hint">
          <p className="eyebrow">CONSEJO</p>
          <p>Un perfil completo con foto, descripción y redes ayuda a que otras personas te encuentren.</p>
        </div>
      )}
    </section>
  );
}
