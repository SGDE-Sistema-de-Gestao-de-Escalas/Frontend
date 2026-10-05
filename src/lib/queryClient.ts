import { QueryClient } from "@tanstack/react-query";

/**
 * Instância única do React Query partilhada por toda a aplicação.
 *
 * Regra importante: todas as queries cujos dados dependem da escola ativa
 * devem incluir o `selectedSchoolId` na `queryKey` (ver `schoolScopedKey`).
 * Assim, ao trocar de escola no header, a key muda e o React Query
 * volta a pedir os dados automaticamente (já com o novo header `X-School-ID`).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Helper para construir query keys dependentes da escola ativa.
 * Ex.: schoolScopedKey("assistants", schoolId, filters)
 *   -> ["assistants", "school", schoolId, filters]
 */
export function schoolScopedKey(
  resource: string,
  schoolId: number | string | null | undefined,
  ...rest: unknown[]
) {
  return [resource, "school", String(schoolId ?? ""), ...rest] as const;
}
