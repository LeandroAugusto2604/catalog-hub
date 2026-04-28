import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Package, FileText, Home, Loader2, ShieldAlert } from "lucide-react";
import { Toaster } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Catálogo" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Toaster theme="dark" />
        <div className="card-elevated rounded-2xl p-8 max-w-md text-center">
          <ShieldAlert className="h-10 w-10 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sua conta ({user.email}) ainda não tem permissão de admin. Peça ao proprietário do
            sistema para promover seu usuário.
          </p>
          <p className="text-xs text-muted-foreground mb-4 font-mono break-all">
            User ID: {user.id}
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              nav({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  const isProducts = loc.pathname === "/admin" || loc.pathname.startsWith("/admin/products");
  const isQuotes = loc.pathname.startsWith("/admin/quotes");

  return (
    <div className="min-h-screen">
      <Toaster theme="dark" position="top-center" richColors />
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg btn-glow flex items-center justify-center font-bold">
                C
              </div>
              <span className="font-semibold hidden sm:inline">Admin</span>
            </Link>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/admin">
              <Button variant={isProducts ? "default" : "ghost"} size="sm" className={isProducts ? "btn-glow border-0" : ""}>
                <Package className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Produtos</span>
              </Button>
            </Link>
            <Link to="/admin/quotes">
              <Button variant={isQuotes ? "default" : "ghost"} size="sm" className={isQuotes ? "btn-glow border-0" : ""}>
                <FileText className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Pedidos</span>
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Site</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                nav({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
