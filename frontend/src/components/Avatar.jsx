import { useEffect, useState } from "react";
import { useProtectedFileUrl } from "@/hooks/useProtectedFile";
import { storagePathFromFileUrl } from "@/services/fileService";

export default function Avatar({ user, size = "", className = "", testId }) {
  const storagePath = storagePathFromFileUrl(user?.picture);
  const protectedUrl = useProtectedFileUrl(storagePath);
  const src = storagePath ? protectedUrl : user?.picture;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  return (
    <div className={`profile-avatar ${size} ${className}`.trim()} data-testid={testId}>
      {src && !imgError ? (
        <img src={src} alt={user?.name || "Avatar"} onError={() => setImgError(true)} />
      ) : (
        <span>{(user?.name || "?")[0]}</span>
      )}
    </div>
  );
}
