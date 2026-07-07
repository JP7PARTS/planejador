// Lê as chaves públicas do Supabase das variáveis de ambiente.
// Elas são definidas na Vercel (e em .env.local para desenvolvimento).
// Enquanto não estiverem configuradas, o app continua no ar; só as telas
// que dependem de login mostram um aviso amigável em vez de quebrar.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true quando as duas chaves públicas do Supabase estão presentes. */
export function hasSupabaseEnv(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
