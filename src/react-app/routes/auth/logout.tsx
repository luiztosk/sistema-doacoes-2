import { authClient } from '@/react-app/lib/auth-client'
import { queryClient } from '@/react-app/lib/query-client'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/auth/logout')({
  component: LogoutComponent,
})

function LogoutComponent() {
    const navigate = useNavigate()
    useEffect(() => {
        authClient.signOut()
        queryClient.invalidateQueries({ queryKey: ['session'] })
        navigate({ to: '/'})
    }, [navigate])
}
