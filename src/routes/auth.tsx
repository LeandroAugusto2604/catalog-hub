import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso Admin — Catálogo" },
      { name: "description", content: "Login do painel administrativo." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) nav({ to: "/admin" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para o seu e-mail.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        nav({ to: "/admin" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro de autenticação");
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
      <Link to="/" className="absolute top-6 left-6 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
      </Link>
      <Card className="w-full max-w-md p-8 card-elevated relative">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-xl btn-glow mx-auto flex items-center justify-center font-bold text-xl mb-3">
            C
          </div>
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Entrar" : "Recuperar senha"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Painel administrativo</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e">E-mail</Label>
            <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="p">Senha</Label>
              <Input
                id="p"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full btn-glow border-0">
            {loading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Enviar link de redefinição"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "forgot" ? "login" : "forgot")}
          className="mt-2 text-sm text-muted-foreground hover:text-primary w-full text-center"
        >
          {mode === "forgot" ? "Voltar ao login" : "Esqueci minha senha"}
        </button>

      </Card>
    </div>
  );
}
