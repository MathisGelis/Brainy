import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

/**
 * Mutation à mise à jour optimiste sur une liste mise en cache : le cache est modifié tout de suite,
 * restauré en cas d'erreur, puis resynchronisé avec le serveur.
 */
export function useOptimisticMutation<T, V>(
  queryKey: QueryKey,
  request: (variables: V) => Promise<unknown>,
  apply: (items: T[], variables: V) => T[],
  onError?: (message: string) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: V) => request(variables),
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<T[]>(queryKey)
      queryClient.setQueryData<T[]>(queryKey, (old) => apply(old ?? [], variables))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      onError?.("L'enregistrement a échoué. Vos modifications ont été annulées.")
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
