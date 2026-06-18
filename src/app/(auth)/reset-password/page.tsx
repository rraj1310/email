"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPassword } from "@/app/actions/reset-password"
import { toast } from "sonner"
import { Loader2, ShieldAlert, Lock, Sparkles, ArrowLeft } from "lucide-react"
import Link from "next/link"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email") || ""
  const token = searchParams.get("token") || ""

  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !token) {
      toast.error("Missing email or verification token in reset URL.")
      return
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setIsLoading(true)

    try {
      const res = await resetPassword({
        email,
        token,
        password,
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Password updated successfully! Redirecting to login...")
        router.push("/login")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!email || !token) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Invalid Reset Request</h3>
        <p className="text-sm text-muted-foreground">
          This password reset link is invalid or missing required parameters. Please request a new one.
        </p>
        <div className="pt-2">
          <Link href="/forgot-password" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="h-10 bg-muted/50 cursor-not-allowed"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <Lock className="h-3.5 w-3.5 text-indigo-500" /> New Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="h-10"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <Lock className="h-3.5 w-3.5 text-indigo-500" /> Confirm New Password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          className="h-10"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full h-11 font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 mt-2" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resetting Password...
          </>
        ) : (
          "Save New Password"
        )}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-2xl border-indigo-100/30 backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Choose New Password
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your new credentials below to restore dashboard access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <React.Suspense fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          }>
            <ResetPasswordForm />
          </React.Suspense>

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
