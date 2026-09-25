// src/components/auth/LoginForm.tsx
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { authClient } from '@/react-app/lib/auth-client'
import { sessionQueryOptions } from '@/react-app/lib/auth-queries'

// Standard Shadcn/UI imports
import { Button } from '@/react-app/components/ui/button'
import { Input } from '@/react-app/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/react-app/components/ui/card'

export function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      // 1. Submit headlessly directly via the Better Auth SDK client
      const { data, error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })

      if (error) {
        alert(error.message) // Replace with a shadcn toast notification if preferred
        return
      }

      // 2. Refresh the session query; the sign-in response is not the same
      // shape as the session query result.
      if (data) {
        await queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey })
      }

      // 3. Signal to TanStack Router that context has changed
      await router.invalidate()

      // 4. Navigate into the protected route space safely
      router.navigate({ to: '/test-query' })
    },
  })

  return (
    <Card className="w-full max-w-sm">
      <CardHeader><CardTitle>Sign In</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="space-y-4">
          <form.Field name="email" children={(field) => (
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="email" required />
            </div>
          )} />
          <form.Field name="password" children={(field) => (
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="password" required />
            </div>
          )} />
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          )} />
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/auth/signup" className="underline">Sign up</Link>
        </p>
      </CardContent>
    </Card>
  )
}
