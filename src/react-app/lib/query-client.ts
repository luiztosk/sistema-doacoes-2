import { MutationCache, QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	mutationCache: new MutationCache({
		onError: (error) => console.error(error),
	}),
	defaultOptions: {
		queries: {
			// staleTime: 5000,
		},
	},
});
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__:
      import('@tanstack/query-core')
        .QueryClient
  }
}

window.__TANSTACK_QUERY_CLIENT__ = queryClient