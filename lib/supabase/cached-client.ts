import { createClient } from '@supabase/supabase-js'

/**
 * Cria um cliente Supabase usando o JWT diretamente (sem cookies).
 * Usar APENAS dentro de funções cacheadas com unstable_cache(),
 * onde cookies() não pode ser chamado.
 *
 * O token é obtido FORA do cache via createClient() normal e passado como argumento.
 * As políticas RLS (auth.uid()) continuam funcionando pois o JWT é enviado no header.
 */
export function createCachedClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )
}
