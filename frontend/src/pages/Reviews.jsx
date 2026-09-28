import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Loading } from "@/components/ui/states";
import ReviewCard from "@/components/reviews/ReviewCard";
import FilePreviewModal from "@/components/files/FilePreviewModal";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "Entregada", label: "Pendientes" },
  { key: "reviewed", label: "Revisadas" },
];

export default function Reviews() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/submissions/incoming")
      .then((r) => setItems(r.data))
      .catch((x) => {
        setItems([]);
        setError(x.response?.data?.detail || "No pudimos cargar la bandeja de revisión.");
      });
  }, []);

  const visible = useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    if (filter === "Entregada") return items.filter((i) => i.status === "Entregada");
    return items.filter((i) => i.status !== "Entregada");
  }, [items, filter]);

  const pending = items?.filter((i) => i.status === "Entregada").length || 0;

  const onReviewed = (updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));

  return (
    <section className="page reviews-page" data-testid="reviews-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">REVISIÓN DOCENTE</p>
          <h1>Bandeja de entregas</h1>
          <p className="lede">Revisa, previsualiza y descarga los archivos que tus estudiantes entregaron.</p>
        </div>
        <span className="task-count" data-testid="reviews-pending-count">{pending} pendientes</span>
      </div>
      {error && <div className="error" data-testid="reviews-error" onClick={() => setError("")}>{error}</div>}
      <div className="filter-bar" data-testid="reviews-filters">
        {FILTERS.map((f) => (
          <button key={f.key} className={`filter ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)} data-testid={`reviews-filter-${f.key}`}>
            {f.label}
          </button>
        ))}
      </div>
      {items === null ? (
        <Loading label="Cargando entregas…" />
      ) : visible.length ? (
        <div className="review-list" data-testid="review-list">
          {visible.map((item) => (
            <ReviewCard key={item.id} item={item} onPreview={setPreview} onReviewed={onReviewed} onError={setError} />
          ))}
        </div>
      ) : (
        <Empty text="No hay entregas en esta vista. Cuando tus estudiantes entreguen tareas aparecerán aquí." />
      )}
      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
    </section>
  );
}
