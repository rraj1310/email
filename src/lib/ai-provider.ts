import { db } from "@/lib/db"

export interface AIResponse {
  success: boolean
  text: string
  error?: string
}

function calculateEstimatedCost(provider: string, model: string, promptTokens: number, completionTokens: number): number {
  const m = model.toLowerCase()
  const p = provider.toUpperCase()

  if (p === "OPENAI") {
    if (m.includes("mini")) {
      // gpt-4o-mini: Input $0.15/1M, Output $0.60/1M
      return (promptTokens * 0.15 + completionTokens * 0.60) / 1000000
    }
    // gpt-4o: Input $2.50/1M, Output $10.00/1M
    return (promptTokens * 2.50 + completionTokens * 10.00) / 1000000
  }

  if (p === "GEMINI") {
    if (m.includes("pro")) {
      // gemini-2.5-pro: Input $1.25/1M, Output $5.00/1M
      return (promptTokens * 1.25 + completionTokens * 5.00) / 1000000
    }
    // gemini-2.5-flash: Input $0.075/1M, Output $0.30/1M
    return (promptTokens * 0.075 + completionTokens * 0.30) / 1000000
  }

  if (p === "ANTHROPIC") {
    if (m.includes("sonnet")) {
      // claude-3-5-sonnet: Input $3.00/1M, Output $15.00/1M
      return (promptTokens * 3.00 + completionTokens * 15.00) / 1000000
    }
    // claude-3-5-haiku: Input $0.80/1M, Output $4.00/1M
    return (promptTokens * 0.80 + completionTokens * 4.00) / 1000000
  }

  return 0.0
}

export async function generateText(options: {
  organizationId: string
  feature: "CAMPAIGN_WRITER" | "CAMPAIGN_AUDITOR" | "SEGMENT_GENERATOR" | "AUTOMATION_ASSISTANT" | "INSIGHTS"
  userId?: string
  prompt: string
  systemPrompt?: string
  jsonMode?: boolean
}): Promise<AIResponse> {
  const { organizationId, feature, userId, prompt, systemPrompt, jsonMode } = options

  try {
    // 1. Fetch organization settings
    const org = await db.organization.findUnique({
      where: { id: organizationId }
    })

    if (!org) {
      return { success: false, text: "", error: "Organization not found" }
    }

    // 2. Resolve provider and keys (Customer-managed keys vs Platform-managed keys)
    const provider = (org.aiProvider || process.env.AI_DEFAULT_PROVIDER || "GEMINI").toUpperCase()
    const isCustomKey = !!org.aiApiKey
    const apiKey = org.aiApiKey || (provider === "OPENAI" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY)

    if (!apiKey) {
      return {
        success: false,
        text: "",
        error: `AI Credentials not configured. Please supply a ${provider} key in the workspace settings.`
      }
    }

    // 3. Enforce Rate Limiting Quotas (By-pass if customer-managed API key is supplied)
    if (!isCustomKey) {
      const dailyLimit = org.plan === "FREE" ? 15 : org.plan === "STARTER" ? 100 : org.plan === "PRO" ? 500 : 5000
      
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const todayCount = await db.aiUsageLog.count({
        where: {
          organizationId,
          createdAt: { gte: startOfDay }
        }
      })

      if (todayCount >= dailyLimit) {
        return {
          success: false,
          text: "",
          error: `Daily AI usage quota exceeded (${todayCount}/${dailyLimit} used). Please upgrade your subscription plan or add a custom API key under Settings to unlock unlimited calls.`
        }
      }
    }

    // 4. Resolve Model
    let model = org.aiModelOverride || ""
    if (!model) {
      if (provider === "OPENAI") {
        model = org.plan === "ENTERPRISE" ? "gpt-4o" : "gpt-4o-mini"
      } else {
        model = org.plan === "ENTERPRISE" ? "gemini-2.5-pro" : "gemini-2.5-flash"
      }
    }

    let generatedText = ""
    let promptTokens = 0
    let completionTokens = 0

    // 5. Execute HTTP Request
    if (provider === "OPENAI") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          response_format: jsonMode ? { type: "json_object" } : undefined
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API returned error: ${response.status} - ${errorText}`)
      }

      const resJson = await response.json()
      generatedText = resJson.choices?.[0]?.message?.content || ""
      promptTokens = resJson.usage?.prompt_tokens || 0
      completionTokens = resJson.usage?.completion_tokens || 0
    } 
    else if (provider === "GEMINI") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt ? `System Instructions: ${systemPrompt}\n\n` : ""}${prompt}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: jsonMode ? "application/json" : "text/plain"
            }
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini API returned error: ${response.status} - ${errorText}`)
      }

      const resJson = await response.json()
      generatedText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || ""
      promptTokens = resJson.usageMetadata?.promptTokenCount || 0
      completionTokens = resJson.usageMetadata?.candidatesTokenCount || 0
    } 
    else {
      throw new Error(`AI Provider "${provider}" is currently not supported. Please select OpenAI or Gemini.`)
    }

    // 6. Log Token Usage and Calculate Cost
    const totalTokens = promptTokens + completionTokens
    const cost = calculateEstimatedCost(provider, model, promptTokens, completionTokens)

    await db.aiUsageLog.create({
      data: {
        organizationId,
        userId: userId || null,
        feature,
        provider,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost: cost
      }
    })

    return { success: true, text: generatedText }
  } catch (err: any) {
    console.error("AI Generation failed:", err)
    return { success: false, text: "", error: err.message || "An unexpected error occurred during AI prompt completion." }
  }
}
