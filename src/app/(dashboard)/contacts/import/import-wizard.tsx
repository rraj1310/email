"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import Papa from "papaparse"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { importContactsAction } from "@/app/actions/contacts"

type Step = "UPLOAD" | "MAP" | "VALIDATE" | "DONE"

export function ImportWizard() {
  const [step, setStep] = React.useState<Step>("UPLOAD")
  const [file, setFile] = React.useState<File | null>(null)
  const [rawHeaders, setRawHeaders] = React.useState<string[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewData, setPreviewData] = React.useState<any[]>([])
  const [mapping, setMapping] = React.useState<Record<string, string>>({})
  const [validationResults, setValidationResults] = React.useState<{valid: number, invalid: number, duplicates: number}>({valid: 0, invalid: 0, duplicates: 0})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mappedContacts, setMappedContacts] = React.useState<any[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const router = useRouter()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return
    setFile(uploadedFile)
    
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => {
        setRawHeaders(results.meta.fields || [])
        setPreviewData(results.data)
        
        // Auto-map common headers
        const initialMap: Record<string, string> = {}
        const fields = results.meta.fields || []
        fields.forEach(field => {
          const lower = field.toLowerCase()
          if (lower.includes("email")) initialMap[field] = "email"
          else if (lower.includes("first") || lower === "name") initialMap[field] = "firstName"
          else if (lower.includes("last")) initialMap[field] = "lastName"
          else if (lower.includes("phone")) initialMap[field] = "phone"
          else if (lower.includes("city")) initialMap[field] = "city"
          else if (lower.includes("country")) initialMap[field] = "country"
          else if (lower.includes("tag")) initialMap[field] = "tags"
          else initialMap[field] = ""
        })
        setMapping(initialMap)
        setStep("MAP")
      }
    })
  }

  const handleValidation = () => {
    if (!file) return

    // Verify a column is mapped to 'email'
    const isEmailMapped = Object.values(mapping).includes("email")
    if (!isEmailMapped) {
      toast.error("You must map at least one column to the 'Email' system field.")
      return
    }

    // Parse the full CSV file
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fullData = results.data
        
        // Map data based on user configuration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = fullData.map((row: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contactObj: any = {}
          Object.entries(mapping).forEach(([csvHeader, systemField]) => {
            if (systemField) {
              contactObj[systemField] = row[csvHeader]
            }
          })
          return contactObj
        })

        // Count metrics
        let valid = 0
        let invalid = 0
        let duplicates = 0
        const seenEmails = new Set<string>()

        mapped.forEach(c => {
          const email = (c.email || "").trim().toLowerCase()
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            invalid++
          } else if (seenEmails.has(email)) {
            duplicates++
          } else {
            seenEmails.add(email)
            valid++
          }
        })

        setValidationResults({ valid, invalid, duplicates })
        setMappedContacts(mapped)
        setStep("VALIDATE")
      }
    })
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const result = await importContactsAction(mappedContacts)
      setIsImporting(false)
      
      if (result.success && result.data) {
        toast.success(`Import complete! Created: ${result.data.imported}, Updated: ${result.data.updated}, Skipped: ${result.data.invalid}`)
        setStep("DONE")
      } else {
        toast.error(result.error || "An error occurred during bulk import")
      }
    } catch (err) {
      console.error(err)
      setIsImporting(false)
      toast.error("Bulk import operation failed.")
    }
  }

  return (
    <Card className="max-w-4xl mx-auto mt-8 border shadow-sm">
      <CardHeader className="border-b pb-4 mb-6">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          {step === "UPLOAD" && "Step 1: Upload CSV File"}
          {step === "MAP" && "Step 2: Map CSV Headers"}
          {step === "VALIDATE" && "Step 3: Preview & Verify"}
          {step === "DONE" && "Import Complete"}
        </CardTitle>
        <CardDescription className="text-xs">
          {step === "UPLOAD" && "Upload a spreadsheet (.csv) containing contact records."}
          {step === "MAP" && "Match headers in your file to fields in our database."}
          {step === "VALIDATE" && "Review formatting counts before confirming database insertions."}
          {step === "DONE" && "Your contact records are now integrated in the system."}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="min-h-[250px]">
        {step === "UPLOAD" && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center bg-muted/20 hover:bg-muted/30 transition-colors">
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-4 opacity-70 animate-bounce" />
            <h3 className="text-md font-semibold mb-1">Drag and drop your file here</h3>
            <p className="text-xs text-muted-foreground mb-6">Only support comma-separated spreadsheets (.csv)</p>
            <div className="relative">
              <Input 
                type="file" 
                accept=".csv" 
                className="cursor-pointer file:text-xs file:font-semibold" 
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {step === "MAP" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 font-semibold text-xs text-muted-foreground uppercase border-b pb-2 mb-2">
              <div>Spreadsheet Header</div>
              <div>Database System Field</div>
            </div>
            <div className="space-y-3">
              {rawHeaders.map((header) => (
                <div key={header} className="grid grid-cols-2 gap-4 items-center">
                  <div className="p-2 border rounded-md bg-muted/40 font-medium text-xs truncate">{header}</div>
                  <select 
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    value={mapping[header] || ""}
                    onChange={(e) => setMapping({...mapping, [header]: e.target.value})}
                  >
                    <option value="">Ignore this column</option>
                    <option value="email">Email Address (Required)</option>
                    <option value="firstName">First Name</option>
                    <option value="lastName">Last Name</option>
                    <option value="phone">Phone Number</option>
                    <option value="city">City</option>
                    <option value="country">Country</option>
                    <option value="tags">Tags (Comma-separated)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "VALIDATE" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <Card className="p-4 bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{validationResults.valid}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Valid Contacts</div>
              </Card>
              <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{validationResults.duplicates}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Duplicates (Will Update)</div>
              </Card>
              <Card className="p-4 bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{validationResults.invalid}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Invalid (Will Skip)</div>
              </Card>
            </div>

            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Data Preview (First 5 Rows)</h4>
              <div className="border rounded-md overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      {Object.values(mapping).filter(Boolean).map(val => (
                         <TableHead key={val} className="capitalize text-xs py-2">{val}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        {Object.entries(mapping).filter((entry) => entry[1]).map(([header]) => (
                          <TableCell key={header} className="text-xs py-2">{row[header] || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {step === "DONE" && (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="bg-green-500/20 p-4 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-green-500 animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Import Successful!</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Your contact records have been updated in the database.
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2 border-t p-4 bg-muted/10">
        {step === "MAP" && (
          <>
            <Button variant="outline" onClick={() => setStep("UPLOAD")} className="text-xs h-9">Back</Button>
            <Button onClick={handleValidation} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">Continue to Validation</Button>
          </>
        )}
        {step === "VALIDATE" && (
          <>
             <Button variant="outline" onClick={() => setStep("MAP")} disabled={isImporting} className="text-xs h-9">Back</Button>
             <Button onClick={handleImport} disabled={isImporting} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
               {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Import Contacts
             </Button>
          </>
        )}
        {step === "DONE" && (
          <Button onClick={() => router.push("/contacts")} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">View Contacts</Button>
        )}
      </CardFooter>
    </Card>
  )
}
