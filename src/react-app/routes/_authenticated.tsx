import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { sessionQueryOptions } from '../lib/auth-queries'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    try {
      const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
      if (!session) {
        throw redirect({ to: '/auth/login' })
      }
    } catch {
      throw redirect({ to: '/auth/login' })
    }
  },
  // If authenticated, render the sub-routes (dashboard, profile, etc.)
  component: () => <Outlet /> 
})
