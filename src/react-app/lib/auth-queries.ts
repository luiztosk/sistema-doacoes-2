// src/lib/auth-queries.ts
import { queryOptions } from '@tanstack/react-query'
import { authClient } from './auth-client'

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: async () => {
    const res = await authClient.getSession()
    // Better Auth returns { data: Session | null, error: any }
    if (res.error) throw new Error(res.error.message)
    return res.data // Contains user and session info
  },
  // Keep the session fresh, but don't aggressively spam the endpoint
  staleTime: 1000 * 60 * 5, 
})
