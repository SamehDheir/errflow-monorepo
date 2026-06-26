"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, Download } from "lucide-react"

const steps = [
  {
    title: "Step 1 — Install",
    command: "npm install errflow",
  },
  {
    title: "Step 2 — Add to your app",
    command: `// Add to the top of your entry file (index.ts / server.ts)
import 'errflow/monitor'`,
  },
  {
    title: "Step 3 — Set environment variables",
    command: `ERRFLOW_API_KEY=your_api_key_here
ERRFLOW_ENV=production`,
  },
]

export function InstallGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [apiKey, setApiKey] = useState<string>("")

  const handleCopy = (index: number, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SDK Installation Guide</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Your API Key</Label>
          <Input
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Generate an API key in the Settings tab, then paste it here.
          </p>
        </div>
        {steps.map((step, index) => {
          const code = step.command.replace("your_api_key_here", apiKey || "your_api_key_here")
          return (
            <div key={index} className="space-y-2">
              <h4 className="font-medium">{step.title}</h4>
              <div className="relative group">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{code}</code>
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(index, code)}
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium">{children}</label>
}
