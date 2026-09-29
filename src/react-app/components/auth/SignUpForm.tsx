// src/components/auth/SignUpForm.tsx
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { authClient } from '@/react-app/lib/auth-client'
import { sessionQueryOptions } from '@/react-app/lib/auth-queries'

// Standard Shadcn/UI imports
import { Button } from '@/react-app/components/ui/button'
import { Input } from '@/react-app/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react-app/components/ui/card'

export function SignUpForm() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      // 1. Submit headlessly directly via the Better Auth SDK client
      const { data, error } = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      })

      if (error) {
        alert(error.message) // Replace with a shadcn toast notification if preferred
        return
      }

      // 2. Refresh the session query; the sign-up response is not the same
      // shape as the session query result.
      if (data) {
        await queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey })
      }

      // 3. Signal to TanStack Router that context has changed
      await router.invalidate()

      // 4. Navigate into the protected route space safely
      router.navigate({ to: '/painel' })
    },
  })

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Cadastrar-se</CardTitle>
        <CardDescription>Crie sua conta para doar e ser ajudado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="space-y-4">
          <form.Field name="name" children={(field) => (
            <div>
              <label htmlFor={field.name} className="text-sm font-medium">Nome</label>
              <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} autoComplete="name" required />
            </div>
          )} />
          <form.Field name="email" children={(field) => (
            <div>
              <label htmlFor={field.name} className="text-sm font-medium">E-mail</label>
              <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="email" autoComplete="email" required />
            </div>
          )} />
          <form.Field name="password" children={(field) => (
            <div>
              <label htmlFor={field.name} className="text-sm font-medium">Senha</label>
              <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="password" autoComplete="new-password" minLength={8} required />
            </div>
          )} />
          <form.Field
            name="confirmPassword"
            validators={{ onBlur: ({ value, fieldApi }) => value !== fieldApi.form.getFieldValue('password') ? 'As senhas não conferem' : undefined }}
            children={(field) => (
              <div>
                <label htmlFor={field.name} className="text-sm font-medium">Confirmar senha</label>
                <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="password" autoComplete="new-password" required aria-invalid={!!field.state.meta.isTouched && !!field.state.meta.errors?.length} />
                {field.state.meta.isTouched && field.state.meta.errors?.length > 0 && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          />
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {isSubmitting ? 'Criando conta...' : 'Cadastrar-se'}
            </Button>
          )} />
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/auth/login" className="underline">Entrar</Link>
        </p>
      </CardContent>
    </Card>
  )
}
