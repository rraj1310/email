"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff } from "lucide-react"

import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (res?.error) {
        toast.error("Invalid credentials. Please verify your email and password.")
      } else {
        toast.success("Successfully logged in! Redirecting...")
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      console.error("Login submission error:", err)
      toast.error("An error occurred during authentication.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen overflow-hidden bg-zinc-950 font-sans">
      <style>{`
        @keyframes draw-path {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-chart-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw-path 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes ticker-scroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-ticker {
          display: inline-flex;
          animation: ticker-scroll 25s linear infinite;
        }
      `}</style>

      {/* Left Panel - Animation (Stock Market theme) */}
      <div className="relative hidden md:flex md:w-3/5 flex-col justify-between bg-zinc-950 p-10 text-white overflow-hidden border-r border-zinc-800/80">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-25" />
        
        {/* Animated Glowing Gradient background or light source */}
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" />

        {/* Header Info */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
            1C
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">1ClickMail</span>
            <span className="text-[10px] ml-2 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold font-mono tracking-wider">
              MARKET ACTIVE
            </span>
          </div>
        </div>

        {/* Center Graph Animation */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center w-full max-w-lg mx-auto">
          {/* Animated Stock Graph / Candlestick SVG */}
          <div className="w-full bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-800/60 p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Email Delivery Volume</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold tracking-tight text-zinc-100">$MAIL Index</span>
                  <span className="text-sm font-semibold text-emerald-400 flex items-center gap-0.5 animate-bounce">
                    ▲ +14.82%
                  </span>
                </div>
              </div>
              {/* Live Ticker Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono font-medium text-zinc-300">LIVE FEED</span>
              </div>
            </div>

            {/* SVG Stock Chart Line Animation */}
            <div className="h-48 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 200" fill="none" preserveAspectRatio="none">
                {/* Grid Lines */}
                <line x1="0" y1="50" x2="500" y2="50" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

                {/* Area gradient under path */}
                <defs>
                  <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 160 Q 75 140, 150 170 T 300 90 T 400 120 T 500 40 L 500 200 L 0 200 Z"
                  fill="url(#chart-gradient)"
                />

                {/* Main Glowing Trendline */}
                <path
                  d="M0 160 Q 75 140, 150 170 T 300 90 T 400 120 T 500 40"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="animate-chart-line"
                />
                
                {/* Pulsing indicator point at the end of the line */}
                <circle cx="500" cy="40" r="5" fill="#10b981" />
                <circle cx="500" cy="40" r="12" fill="#10b981" opacity="0.3" className="animate-ping" />
              </svg>

              {/* Simulated Candlesticks along the bottom */}
              <div className="absolute bottom-2 inset-x-0 flex justify-between px-4 opacity-30">
                <div className="w-1.5 h-8 bg-red-500 rounded-sm" />
                <div className="w-1.5 h-12 bg-emerald-500 rounded-sm" />
                <div className="w-1.5 h-10 bg-emerald-500 rounded-sm" />
                <div className="w-1.5 h-16 bg-emerald-500 rounded-sm" />
                <div className="w-1.5 h-14 bg-red-500 rounded-sm" />
                <div className="w-1.5 h-20 bg-emerald-500 rounded-sm" />
                <div className="w-1.5 h-24 bg-emerald-500 rounded-sm" />
              </div>
            </div>

            {/* Dynamic Floating Stock Info Card */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-zinc-800 text-center font-mono">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">VOL (24H)</span>
                <span className="text-xs font-bold text-zinc-300 mt-1">1.84M emails</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">OPEN RATE</span>
                <span className="text-xs font-bold text-emerald-400 mt-1">94.8%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">CTR RATE</span>
                <span className="text-xs font-bold text-emerald-400 mt-1">12.4%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Moving Stock Ticker */}
        <div className="absolute bottom-12 left-0 right-0 w-full overflow-hidden bg-zinc-950/80 border-y border-zinc-800/80 py-3">
          <div className="animate-ticker">
            {/* Ticker Group 1 */}
            <div className="flex gap-8 px-4 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$MAIL</span> <span className="text-zinc-200">124.50</span> <span className="text-emerald-400 font-semibold">▲ +14.82%</span></span>
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$CAMP</span> <span className="text-zinc-200">92.15</span> <span className="text-emerald-400 font-semibold">▲ +24.15%</span></span>
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$CNTC</span> <span className="text-zinc-200">312.40</span> <span className="text-emerald-400 font-semibold">▲ +5.60%</span></span>
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$DELV</span> <span className="text-zinc-200">99.98</span> <span className="text-emerald-400 font-semibold">▲ +0.02%</span></span>
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$OPEN</span> <span className="text-zinc-200">84.30</span> <span className="text-emerald-400 font-semibold">▲ +12.55%</span></span>
            </div>
            {/* Ticker Group 2 (Duplicate for seamless loop) */}
            <div className="flex gap-8 px-4 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$MAIL</span> <span className="text-zinc-200">124.50</span> <span className="text-emerald-400 font-semibold">▲ +14.82%</span></span>
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$CAMP</span> <span className="text-zinc-200">92.15</span> <span className="text-emerald-400 font-semibold">▲ +24.15%</span></span>
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$CNTC</span> <span className="text-zinc-200">312.40</span> <span className="text-emerald-400 font-semibold">▲ +5.60%</span></span>
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$DELV</span> <span className="text-zinc-200">99.98</span> <span className="text-emerald-400 font-semibold">▲ +0.02%</span></span>
              <span className="flex items-center gap-1.5"><span className="text-zinc-500 font-bold">$OPEN</span> <span className="text-zinc-200">84.30</span> <span className="text-emerald-400 font-semibold">▲ +12.55%</span></span>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 flex justify-between items-center text-xs text-zinc-500 mt-8">
          <span>&copy; {new Date().getFullYear()} 1ClickMail Inc.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Fields */}
      <div className="flex w-full md:w-2/5 items-center justify-center p-6 sm:p-10 bg-zinc-950 md:bg-background">
        <Card className="w-full max-w-sm shadow-xl border-zinc-200 dark:border-zinc-800 backdrop-blur-md bg-card/90">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your credentials to access the Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="test@mail.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                  <Link href="/forgot-password" className="text-xs underline text-muted-foreground hover:text-foreground">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-10 font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
            <div className="mt-6 text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline text-foreground hover:text-indigo-600 dark:hover:text-indigo-400">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
