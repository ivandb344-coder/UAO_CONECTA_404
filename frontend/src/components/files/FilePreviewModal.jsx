import { X, Download, ExternalLink, FileText } from "lucide-react";
import { useProtectedFile } from "@/hooks/useProtectedFile";
import { openProtectedFile, previewKind } from "@/services/fileService";

function PreviewBody({ kind, url, name }) {
  if (kind === "image") return <img src={url} alt={name} className="preview-media" data-testid="file-preview-image" />;
  if (kind === "pdf") return <iframe src={url} title={name} className="preview-frame" data-testid="file-preview-pdf" />;
  if (kind === "video") return <video src={url} controls className="preview-media" data-testid="file-preview-video" />;
  return (
    <div className="preview-fallback" data-testid="file-preview-fallback">
      <FileText size={32} />
      <p>Este tipo de archivo no tiene vista previa. Descárgalo para abrirlo.</p>
    </div>
  );
}

export default function FilePreviewModal({ file, onClose }) {
  const kind = previewKind(file);
  const { url, loading, error } = useProtectedFile(file?.storage_path);
  if (!file) return null;
  const name = file.name || "archivo";
  const download = () => openProtectedFile(file.storage_path, { download: true, filename: name }).catch(() => {});
  const openTab = () => openProtectedFile(file.storage_path, { filename: name }).catch(() => {});
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal preview-modal" onClick={(e) => e.stopPropagation()} data-testid="file-preview-modal">
        <button className="close" onClick={onClose} aria-label="Cerrar vista previa" data-testid="close-file-preview">
          <X />
        </button>
        <p className="eyebrow">VISTA PREVIA</p>
        <h2 className="preview-title" data-testid="file-preview-name">{name}</h2>
        <div className="preview-stage">
          {loading && <div className="loading" data-testid="file-preview-loading"><span />Cargando archivo…</div>}
          {error && <div className="error" data-testid="file-preview-error">{error}</div>}
          {url && <PreviewBody kind={kind} url={url} name={name} />}
        </div>
        <div className="preview-actions">
          <button className="ghost small" onClick={openTab} disabled={!url} data-testid="file-preview-open-tab">
            <ExternalLink size={13} /> Abrir en pestaña
          </button>
          <button className="primary small" onClick={download} disabled={!url} data-testid="file-preview-download">
            <Download size={13} /> Descargar
          </button>
        </div>
      </div>
    </div>
  );
}
