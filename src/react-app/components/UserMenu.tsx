// src/components/DashboardHeader.tsx
import { useQuery } from '@tanstack/react-query'
import { sessionQueryOptions } from '@/react-app/lib/auth-queries'
import { Link, useRouter } from '@tanstack/react-router'

export function UserMenu() {
  const { data: session } = useQuery(sessionQueryOptions)

  return (
    <ul className="flex flex-wrap gap-2">
    <li className="flex flex-col items-start">
      <span className="font-semibold">{session?.user.name}</span>
      <span className="ml-2 text-sm text-muted-foreground">{session?.user.email}</span>
    </li>
    <li>
      {session ? <Link to='/auth/logout'>Sair</Link> : <Link to='/auth/login'>Entrar</Link>}
    </li>
    </ul>
  )
}
