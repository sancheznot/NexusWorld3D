import FrameworkPresentation from "@/components/marketing/FrameworkPresentation";

/**
 * ES: Página pública — framework, crear mundos, cámaras, etc. (sin login).
 * EN: Public page — framework pitch, worlds, cameras, etc. (no login).
 * ES: Panel con login → /admin/panel vía /admin/login.
 * EN: Authenticated dashboard → /admin/panel via /admin/login.
 */
export default function AdminPublicPage() {
  return <FrameworkPresentation ctaTarget="admin-login" />;
}
