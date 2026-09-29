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
            // A ordem importa. O cookie de sessao e apagado pelo header Set-Cookie
            // da resposta do sign-out, entao qualquer requisicao disparada antes
            // de processar essa resposta leva o cookie ainda valido. Sem o await,
            // o invalidateQueries abaixo dispara get-session antes disso e
            // recoloca no cache a sessao que ainda existe — e era por isso que
            // Sair exigia dois cliques. Ver #52.
            await authClient.signOut()

            // removeQueries, nao invalidateQueries: invalidar dispararia outro
            // get-session, que ainda poderia responder com a sessao velha se o
            // cookie nao tivesse chegado.
            queryClient.removeQueries({ queryKey: sessionQueryOptions.queryKey })

            await navigate({ to: '/' })
        })()
    }, [navigate])
}
