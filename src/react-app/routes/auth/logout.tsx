import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { authClient } from '@/react-app/lib/auth-client'
import { sessionQueryOptions } from '@/react-app/lib/auth-queries'
import { queryClient } from '@/react-app/lib/query-client'

export const Route = createFileRoute('/auth/logout')({
  component: LogoutComponent,
})

function LogoutComponent() {
    const navigate = useNavigate()
    useEffect(() => {
        void (async () => {
            await authClient.signOut()

            // `setQueryData` com null, e nao `removeQueries`: remover tira a
            // query do cache enquanto o observador dela ainda esta montado, e
            // nenhuma montagem posterior volta a buscar — o `invalidateQueries`
            // do login passa a nao encontrar nada e vira no-op, entao o
            // sign-in nao busca a sessao nova. Zerar o valor mantem a entrada
            // saudavel e da o mesmo efeito na tela. Ver #52 e #53.
            queryClient.setQueryData(sessionQueryOptions.queryKey, null)

            await navigate({ to: '/' })
        })()
    }, [navigate])
}
