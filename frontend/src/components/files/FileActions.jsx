import { Eye, Download, FileText } from "lucide-react";
import { openProtectedFile, previewKind } from "@/services/fileService";

export default function FileActions({ file, idPrefix, onPreview, onError, showName = false }) {
  if (!file?.storage_path) return null;
  const canPreview = previewKind(file) !== "none";
  const download = () =>
    openProtectedFile(file.storage_path, { download: true, filename: file.name || "archivo" }).catch(() =>
      onError?.("No pudimos descargar el archivo. Verifica que tengas permisos."),
    );
  return (
    <div className="file-actions" data-testid={`file-actions-${idPrefix}`}>
      {showName && (
        <span className="pill file-name" data-testid={`file-name-${idPrefix}`}>
          <FileText size={13} /> {file.name}
        </span>
      )}
      {canPreview && (
        <button type="button" className="ghost small" onClick={() => onPreview(file)} data-testid={`preview-${idPrefix}`}>
          <Eye size={13} /> Vista previa
        </button>
      )}
      <button type="button" className="ghost small" onClick={download} data-testid={`download-${idPrefix}`}>
        <Download size={13} /> Descargar
      </button>
    </div>
  );
}
