// Cliente Supabase com a chave PÚBLICA (anon) para rotas de servidor.
// Nenhuma operação aqui precisa da chave de serviço: as escritas sensíveis
// (confirmar pagamento, dados de envio) passam por funções SECURITY DEFINER
// protegidas por token no banco.
import { createClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof createClient<any>> | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPublicSupabase(): ReturnType<typeof createClient<any>> {
  if (_client) return _client;
  const url =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuração do banco ausente");
  _client = createClient<any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
