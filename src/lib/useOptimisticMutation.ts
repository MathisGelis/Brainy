import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { isSchemaError, saveErrorMessage } from './schemaErrors'

export function useOptimisticMutation<T, V>(
  queryKey: QueryKey,
  request: (variables: V) => Promise<unknown>,
  apply: (items: T[], variables: V) => T[],
  onError?: (message: string) => void,
  /** Autres listes à resynchroniser après coup (ex. une suppression qui touche aussi les todos). */
  alsoInvalidate: QueryKey[] = [],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: V) => request(variables),
    scope: { id: JSON.stringify(queryKey) },
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<T[]>(queryKey)
      queryClient.setQueryData<T[]>(queryKey, (old) => apply(old ?? [], variables))
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      onError?.(saveErrorMessage(error))
      // Une colonne ou une table manque : on relance le contrôle pour afficher le bandeau
      if (isSchemaError(error)) void queryClient.invalidateQueries({ queryKey: ['schema-check'] })
    },
    onSettled: () =>
      Promise.all(
        [queryKey, ...alsoInvalidate].map((key) =>
          queryClient.invalidateQueries({ queryKey: key }),
        ),
      ),
  })
}
