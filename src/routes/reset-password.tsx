import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Catálogo" },
      { name: "description", content: "Defina uma nova senha para o painel administrativo." },
      { property: "og:title", content: "Nova senha — Catálogo" },
      { property: "og:description", content: "Defina uma nova senha para o painel administrativo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada!");
      nav({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível atualizar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <Toaster theme="dark" position="top-center" richColors />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "var(--gradient-radial-glow)" }}
      />
      <Link
        to="/auth"
        className="absolute top-6 left-6 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Link>
      <Card className="w-full max-w-md p-8 card-elevated relative">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-xl btn-glow mx-auto flex items-center justify-center font-bold text-xl mb-3">
            C
          </div>
          <h1 className="text-2xl font-bold">Nova senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha uma nova senha para sua conta
          </p>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground text-center">
            Abra esta página pelo link enviado no seu e-mail para definir uma nova senha.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p1">Nova senha</Label>
              <Input
                id="p1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p2">Confirmar senha</Label>
              <Input
                id="p2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full btn-glow border-0">
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
