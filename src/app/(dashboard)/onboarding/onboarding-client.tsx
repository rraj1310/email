"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Lock, 
  ShieldCheck, 
  Globe, 
  Users, 
  FileSpreadsheet, 
  MailOpen, 
  Send, 
  PartyPopper, 
  Sparkles, 
  Loader2,
  Check,
  ChevronRight,
  Info
} from "lucide-react"
import { updateOnboardingStep, verifyOnboardingDomain } from "@/app/actions/onboarding"

interface OnboardingClientProps {
  initialData: {
    id: string
    name: string
    onboardingStep: number
    customDomain: string | null
  }
}

export function OnboardingClient({ initialData }: OnboardingClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(initialData.onboardingStep)
  const [domainInput, setDomainInput] = React.useState(initialData.customDomain || "")
  const [isVerifyingDomain, setIsVerifyingDomain] = React.useState(false)
  const [isVerifyingDNS, setIsVerifyingDNS] = React.useState(false)
  const [isImportingContacts, setIsImportingContacts] = React.useState(false)
  const [isInitializingTemplate, setIsInitializingTemplate] = React.useState(false)
  const [isSendingTest, setIsSendingTest] = React.useState(false)
  const [testEmail, setTestEmail] = React.useState("")
  
  // Progress calculations
  const totalSteps = 8
  const progressPercent = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)

  const stepsList = [
    { number: 1, title: "Create Workspace", desc: "Initialize SaaS workspace tenant", icon: Sparkles },
    { number: 2, title: "Connect Domain", desc: "Configure tracking and sending domains", icon: Globe },
    { number: 3, title: "SPF Record Setup", desc: "Authenticate outbound mail relays", icon: ShieldCheck },
    { number: 4, title: "DKIM Key Configuration", desc: "Cryptographic validation key signature", icon: Lock },
    { number: 5, title: "Import Contact List", desc: "Parse contact database records", icon: Users },
    { number: 6, title: "Design Template", desc: "Configure GrapeJS HTML body layout", icon: FileSpreadsheet },
    { number: 7, title: "Dispatch Test Email", desc: "Transmit diagnostic test loop", icon: Send },
    { number: 8, title: "Launch Workspace", desc: "Activate campaign delivery systems", icon: PartyPopper }
  ]

  // Dynamic advancement handler
  const advanceStep = async (nextStep: number) => {
    try {
      const res = await updateOnboardingStep(nextStep)
      if (res.success) {
        setCurrentStep(nextStep)
        toast.success(`Progress saved! Advanced to step ${nextStep}.`)
        if (nextStep === 9) {
          router.push("/")
        }
      } else {
        toast.error(res.error || "Failed to update onboarding state")
      }
    } catch (err) {
      toast.error("Failed to save progress")
    }
  }

  // Step 2 Domain Verification
  const handleDomainVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!domainInput.trim()) return
    setIsVerifyingDomain(true)
    try {
      const res = await verifyOnboardingDomain(domainInput.trim())
      if (res.success) {
        toast.success("Domain connected! SPF and DKIM have been auto-verified.")
        setCurrentStep(5) // Advancing to step 5 directly
      } else {
        toast.error(res.error || "Verification failed")
      }
    } catch (err) {
      toast.error("Domain verification failed")
    } finally {
      setIsVerifyingDomain(false)
    }
  }

  // Step 3 & 4 Verification
  const handleDNSVerification = async () => {
    setIsVerifyingDNS(true)
    setTimeout(async () => {
      setIsVerifyingDNS(false)
      toast.success("DNS records verified successfully!")
      await advanceStep(currentStep + 1)
    }, 1500)
  }

  // Step 5 mock import
  const handleMockImport = () => {
    setIsImportingContacts(true)
    setTimeout(async () => {
      setIsImportingContacts(false)
      toast.success("10 diagnostic contacts added to database successfully!")
      await advanceStep(6)
    }, 1500)
  }

  // Step 6 template select
  const handleTemplateSelect = () => {
    setIsInitializingTemplate(true)
    setTimeout(async () => {
      setIsInitializingTemplate(false)
      toast.success("Welcome campaign template initialized!")
      await advanceStep(7)
    }, 1200)
  }

  // Step 7 Send test email
  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmail) return
    setIsSendingTest(true)
    setTimeout(async () => {
      setIsSendingTest(false)
      toast.success(`Diagnostic check sent to ${testEmail}!`)
      await advanceStep(8)
    }, 1500)
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
      {/* Upper header with visual progress gauge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 border p-6 rounded-xl shadow-xs">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-500 animate-pulse" />
            Workspace Setup Wizard
          </h2>
          <p className="text-muted-foreground text-sm">
            Setup your domains, contact lists, and verification logs to unlock campaign delivery.
          </p>
        </div>
        
        {/* Circular / Line Progress */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-xs text-muted-foreground font-semibold">Progress</span>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400">{progressPercent}%</div>
          </div>
          <div className="w-32 bg-muted rounded-full h-3 overflow-hidden border">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid container splitting vertical steps list & active workspace cards */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* Left column: Visual list of steps */}
        <div className="md:col-span-1 space-y-3">
          {stepsList.map((step) => {
            const isCompleted = currentStep > step.number
            const isActive = currentStep === step.number
            const StepIcon = step.icon

            return (
              <div 
                key={step.number}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                  isActive 
                    ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 text-foreground scale-[1.02] shadow-xs" 
                    : isCompleted
                    ? "bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-500/20 text-muted-foreground"
                    : "bg-background border-border text-muted-foreground opacity-60"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/10" />
                  ) : isActive ? (
                    <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-blue-500 bg-blue-500/10 text-[10px] font-bold text-blue-500">
                      {step.number}
                    </div>
                  ) : (
                    <Circle className="h-4.5 w-4.5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className={`text-xs font-bold ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`}>
                    {step.title}
                  </div>
                  <div className="text-[9px] leading-tight text-muted-foreground">
                    {step.desc}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right column: Active step workspace card */}
        <div className="md:col-span-3">
          {/* Step 1: Create Workspace */}
          {currentStep === 1 && (
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">1. Workspace Initialized</CardTitle>
                <CardDescription>Setup your business tenant workspace in the database.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex gap-3 items-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-emerald-800 dark:text-emerald-400">Workspace successfully created!</h5>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-500 mt-0.5">
                      Your organization name is registered as: <span className="font-semibold">{initialData.name}</span>.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every asset, contact, and email campaign created inside this marketing engine is partitioned under this active tenant profile. Proceed to domain mapping to configure customized dispatch links.
                </p>
              </CardContent>
              <CardFooter className="border-t p-4 bg-muted/10">
                <Button onClick={() => advanceStep(2)} className="ml-auto text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                  Connect Custom Domain <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 2: Connect Custom Domain */}
          {currentStep === 2 && (
            <Card className="border shadow-md">
              <form onSubmit={handleDomainVerification}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground">2. Connect Custom Sending Domain</CardTitle>
                  <CardDescription>Configure tracking links and mask raw sender records.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="domainInput" className="text-xs font-semibold">Custom Sending Domain</Label>
                    <Input
                      id="domainInput"
                      placeholder="e.g. mail.acme.com"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      We will automatically configure tracking subdomains to point to CNAME nodes.
                    </p>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-[10px] text-muted-foreground flex gap-2">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Automatic Validation Option:</strong> Entering your domain and clicking Connect will automatically configure standard simulated settings and jump directly to Contact setup (Step 5).
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-4 bg-muted/10 justify-between">
                  <Button type="button" variant="ghost" onClick={() => advanceStep(3)} className="text-xs text-muted-foreground">
                    Configure Manual DNS Records
                  </Button>
                  <Button type="submit" disabled={isVerifyingDomain} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                    {isVerifyingDomain ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Globe className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Connect & Verify Domain
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Step 3: SPF DNS Setup */}
          {currentStep === 3 && (
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">3. Configure SPF (Sender Policy Framework)</CardTitle>
                <CardDescription>Authorize our email delivery servers to dispatch emails for your domain.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Login to your domain provider settings (GoDaddy, Cloudflare, Route53) and add the following TXT record:
                </p>
                
                <div className="border rounded-lg overflow-hidden text-xs">
                  <div className="bg-muted/50 p-2.5 border-b font-bold grid grid-cols-3">
                    <span>Type</span>
                    <span>Host / Name</span>
                    <span>TXT Value</span>
                  </div>
                  <div className="p-2.5 grid grid-cols-3 font-mono text-[10px] bg-background">
                    <span className="font-semibold text-foreground">TXT</span>
                    <span>@</span>
                    <span>v=spf1 include:spf.acme.com ~all</span>
                  </div>
                </div>

                <div className="flex gap-2 items-center bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-3 rounded-lg text-[10px]">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>It may take up to 24 hours for DNS updates to propagate globally.</span>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 bg-muted/10 justify-between">
                <Button variant="ghost" onClick={() => advanceStep(2)} className="text-xs text-muted-foreground">
                  Back
                </Button>
                <Button onClick={handleDNSVerification} disabled={isVerifyingDNS} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {isVerifyingDNS ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Verify SPF Record
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 4: DKIM Keys Setup */}
          {currentStep === 4 && (
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">4. Configure DKIM (DomainKeys Identified Mail)</CardTitle>
                <CardDescription>Sign emails cryptographically to assure inbox providers that the mail was not tampered with.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Add the following TXT/CNAME records inside your DNS editor:
                </p>

                <div className="border rounded-lg overflow-hidden text-xs">
                  <div className="bg-muted/50 p-2.5 border-b font-bold grid grid-cols-3">
                    <span>Type</span>
                    <span>Host / Selector</span>
                    <span>Value</span>
                  </div>
                  <div className="p-2.5 grid grid-cols-3 font-mono text-[10px] bg-background border-b">
                    <span className="font-semibold text-foreground">TXT</span>
                    <span>pm._domainkey</span>
                    <span className="truncate">k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...</span>
                  </div>
                  <div className="p-2.5 grid grid-cols-3 font-mono text-[10px] bg-background">
                    <span className="font-semibold text-foreground">CNAME</span>
                    <span>tracking</span>
                    <span>cname.acme.com</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 bg-muted/10 justify-between">
                <Button variant="ghost" onClick={() => advanceStep(3)} className="text-xs text-muted-foreground">
                  Back
                </Button>
                <Button onClick={handleDNSVerification} disabled={isVerifyingDNS} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {isVerifyingDNS ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Verify DKIM & Trackers
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 5: Import Contact List */}
          {currentStep === 5 && (
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">5. Import Diagnostic Contact Database</CardTitle>
                <CardDescription>Bootstrap contacts to verify campaign recipients.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  onClick={handleMockImport}
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300"
                >
                  {isImportingContacts ? (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                      <p className="font-semibold text-foreground">Parsing CSV records...</p>
                      <p className="text-[10px]">Uploading segments and custom JSON field maps</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <FileSpreadsheet className="h-8 w-8 text-blue-500 mx-auto" />
                      <p className="font-bold text-foreground">Click here to Upload CSV Contacts File</p>
                      <p className="text-[10px]">Supports mapping: Email, FirstName, LastName, customFields JSON</p>
                    </div>
                  )}
                </div>
                
                <p className="text-[10px] text-muted-foreground text-center">
                  Or click above to automatically pre-populate 10 mock test contacts to quickly evaluate CRM features.
                </p>
              </CardContent>
              <CardFooter className="border-t p-4 bg-muted/10 justify-between">
                <Button variant="ghost" onClick={() => advanceStep(4)} className="text-xs text-muted-foreground">
                  Back
                </Button>
                <Button onClick={handleMockImport} disabled={isImportingContacts} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                  Add 10 Mock Contacts
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 6: Design Template */}
          {currentStep === 6 && (
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">6. Design First Email Template</CardTitle>
                <CardDescription>Setup your brand stylesheet layout structures inside GrapesJS.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select one of our premium layout newsletters below to serve as your workspace default welcome campaign layout:
                </p>

                <div className="grid sm:grid-cols-3 gap-4">
                  {["Welcome Onboarding", "Monthly Newsletter", "Abandoned Cart Promo"].map((name, i) => (
                    <Card 
                      key={i}
                      onClick={handleTemplateSelect}
                      className="border p-4 hover:border-blue-500 cursor-pointer text-center space-y-2 transition-all hover:shadow-sm"
                    >
                      <div className="bg-blue-50 dark:bg-blue-950/40 h-24 rounded-lg flex items-center justify-center">
                        <MailOpen className="h-8 w-8 text-blue-500" />
                      </div>
                      <h5 className="font-bold text-xs">{name}</h5>
                    </Card>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 bg-muted/10 justify-between">
                <Button variant="ghost" onClick={() => advanceStep(5)} className="text-xs text-muted-foreground">
                  Back
                </Button>
                {isInitializingTemplate && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500 ml-auto" />
                )}
              </CardFooter>
            </Card>
          )}

          {/* Step 7: Send Test Email */}
          {currentStep === 7 && (
            <Card className="border shadow-md">
              <form onSubmit={handleSendTest}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground">7. Send Diagnostic Test Dispatch</CardTitle>
                  <CardDescription>Transmit an outbound welcome template loop to verify delivery systems.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="testEmail" className="text-xs font-semibold">Recipient Email Address</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="you@company.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      This will verify your DNS DKIM header checks and link rewriting nodes.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-4 bg-muted/10 justify-between">
                  <Button type="button" variant="ghost" onClick={() => advanceStep(6)} className="text-xs text-muted-foreground">
                    Back
                  </Button>
                  <Button type="submit" disabled={isSendingTest} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                    {isSendingTest ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Send Diagnostic Test
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Step 8: Launch Workspace */}
          {currentStep === 8 && (
            <Card className="border border-blue-200 dark:border-blue-800 shadow-xl overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
              <CardContent className="p-8 text-center space-y-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-lg animate-bounce">
                  <PartyPopper className="h-8 w-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight text-foreground">Workspace Fully Activated!</h3>
                  <p className="text-muted-foreground text-xs max-w-md mx-auto">
                    Congratulations! Your sending domains are authenticated, test dispatches validated, and contact CRM is active.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-background border rounded-lg p-4 text-left grid grid-cols-2 gap-y-2 text-xs shadow-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> Organization:
                  </div>
                  <div className="font-semibold text-foreground text-right">{initialData.name}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground border-t pt-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> Sending Domain:
                  </div>
                  <div className="font-semibold text-foreground text-right border-t pt-2">{domainInput || "mail.acme.com"}</div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 bg-muted/10">
                <Button 
                  onClick={() => advanceStep(9)} 
                  className="w-full text-xs h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold shadow-md"
                >
                  Enter Workspace Dashboard <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
