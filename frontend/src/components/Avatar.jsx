import { useProtectedFileUrl } from "@/hooks/useProtectedFile";
import { storagePathFromFileUrl } from "@/services/fileService";

export default function Avatar({ user, size = "", className = "", testId }) {
  const storagePath = storagePathFromFileUrl(user?.picture);
  const protectedUrl = useProtectedFileUrl(storagePath);
  const src = storagePath ? protectedUrl : user?.picture;
  return (
    <div className={`profile-avatar ${size} ${className}`.trim()} data-testid={testId}>
      {src ? <img src={src} alt={user?.name || "Avatar"} /> : <span>{(user?.name || "?")[0]}</span>}
    </div>
  );
}
