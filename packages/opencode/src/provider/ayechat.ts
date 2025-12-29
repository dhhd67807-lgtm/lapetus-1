/**
 * Aye Chat Provider Adapter
 * 
 * Adapts Aye Chat's polling-based API to work with the AI SDK's streaming interface.
 * Aye Chat API: https://api.ayechat.ai
 * 
 * The API uses a custom format:
 * - POST /invoke_cli with message and source files
 * - Returns a response_url to poll
 * - Poll until response is ready
 * - Response contains answer_summary and source_files
 */

import { Log } from "../util/log"
import { Env } from "../env"
import { Auth } from "../auth"

const log = Log.create({ service: "provider.ayechat" })

const BASE_URL = "https://api.ayechat.ai"
const TIMEOUT = 900000 // 15 minutes
const POLL_INTERVAL = 2000 // 2 seconds

// Aye Chat model configurations
export const AYECHAT_MODELS = {
  "x-ai/grok-code-fast-1": { name: "xAI: Grok Code Fast 1", maxPromptKb: 150, maxOutputTokens: 32000 },
  "x-ai/grok-4.1-fast": { name: "xAI: Grok 4.1 Fast", maxPromptKb: 340, maxOutputTokens: 32000 },
  "google/gemini-2.5-flash": { name: "Google: Gemini 2.5 Flash", maxPromptKb: 340, maxOutputTokens: 32000 },
  "openai/gpt-5.1-codex-mini": { name: "OpenAI: GPT-5.1-Codex-Mini", maxPromptKb: 220, maxOutputTokens: 32000 },
  "moonshotai/kimi-k2-0905": { name: "MoonshotAI: Kimi K2 0905", maxPromptKb: 170, maxOutputTokens: 32000 },
  "google/gemini-2.5-pro": { name: "Google: Gemini 2.5 Pro", maxPromptKb: 340, maxOutputTokens: 24000 },
  "google/gemini-3-pro-preview": { name: "Google: Gemini 3 Pro Preview", maxPromptKb: 340, maxOutputTokens: 24000 },
  "anthropic/claude-sonnet-4.5": { name: "Anthropic: Claude Sonnet 4.5", maxPromptKb: 340, maxOutputTokens: 24000 },
  "openai/gpt-5.1-codex": { name: "OpenAI: GPT-5.1-Codex", maxPromptKb: 200, maxOutputTokens: 24000 },
  "openai/gpt-5.2": { name: "OpenAI: GPT-5.2", maxPromptKb: 200, maxOutputTokens: 24000 },
  "anthropic/claude-opus-4.5": { name: "Anthropic: Claude Opus 4.5", maxPromptKb: 200, maxOutputTokens: 16000 },
} as const

export type AyeChatModelId = keyof typeof AYECHAT_MODELS

interface AyeChatResponse {
  answer_summary: string
  source_files: Array<{
    file_name: string
    file_content: string
  }>
}

async function getToken(): Promise<string | undefined> {
  // Check environment variable first
  const envToken = Env.get("AYE_TOKEN")
  if (envToken) return envToken
  
  // Check auth store
  const auth = await Auth.get("ayechat")
  if (auth?.type === "api") return auth.key
  
  return undefined
}

async function invokeAyeChat(
  model: string,
  message: string,
  token: string,
  maxOutputTokens: number = 32000,
): Promise<AyeChatResponse> {
  const payload = {
    chat_id: -1,
    message,
    source_files: {},
    model,
    max_output_tokens: maxOutputTokens,
    dry_run: false,
  }

  log.info("invoking ayechat", { model, messageLength: message.length })

  // Initial request
  const response = await fetch(`${BASE_URL}/invoke_cli`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Aye Chat API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as { response_url: string }
  const responseUrl = data.response_url

  log.info("polling for response", { responseUrl })

  // Poll for response
  const deadline = Date.now() + TIMEOUT
  while (Date.now() < deadline) {
    try {
      const pollResponse = await fetch(responseUrl)
      
      if (pollResponse.status === 200) {
        const result = await pollResponse.json() as AyeChatResponse
        log.info("received response", { summaryLength: result.answer_summary?.length })
        return result
      }
      
      if (pollResponse.status === 403 || pollResponse.status === 404) {
        // Response not ready yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
        continue
      }
      
      throw new Error(`Unexpected poll status: ${pollResponse.status}`)
    } catch (e) {
      if (e instanceof Error && e.message.includes("Unexpected poll status")) {
        throw e
      }
      // Network error, retry
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
    }
  }

  throw new Error("Timeout waiting for Aye Chat response")
}

/**
 * Creates an Aye Chat language model adapter
 */
export function createAyeChatModel(modelId: AyeChatModelId): any {
  const modelConfig = AYECHAT_MODELS[modelId]
  
  return {
    specificationVersion: "v2",
    provider: "ayechat",
    modelId,
    defaultObjectGenerationMode: "json",
    
    async doGenerate(options: any) {
      const token = await getToken()
      if (!token) {
        throw new Error("Aye Chat token not configured. Set AYE_TOKEN environment variable or run auth for ayechat provider.")
      }

      // Extract text from messages
      const messages = options.prompt
      const textParts: string[] = []
      
      for (const msg of messages) {
        if (msg.role === "user" || msg.role === "assistant") {
          for (const part of msg.content) {
            if (part.type === "text") {
              textParts.push(part.text)
            }
          }
        } else if (msg.role === "system") {
          textParts.unshift(msg.content)
        }
      }

      const fullMessage = textParts.join("\n\n")
      const response = await invokeAyeChat(modelId, fullMessage, token, modelConfig.maxOutputTokens)

      return {
        text: response.answer_summary,
        finishReason: "stop" as const,
        usage: {
          promptTokens: Math.ceil(fullMessage.length / 4),
          completionTokens: Math.ceil(response.answer_summary.length / 4),
        },
        rawCall: {
          rawPrompt: fullMessage,
          rawSettings: { model: modelId },
        },
        response: {
          id: `ayechat-${Date.now()}`,
          timestamp: new Date(),
          modelId,
        },
      }
    },

    async doStream(options: any) {
      const token = await getToken()
      if (!token) {
        throw new Error("Aye Chat token not configured. Set AYE_TOKEN environment variable or run auth for ayechat provider.")
      }

      // Extract text from messages
      const messages = options.prompt
      const textParts: string[] = []
      
      for (const msg of messages) {
        if (msg.role === "user" || msg.role === "assistant") {
          for (const part of msg.content) {
            if (part.type === "text") {
              textParts.push(part.text)
            }
          }
        } else if (msg.role === "system") {
          textParts.unshift(msg.content)
        }
      }

      const fullMessage = textParts.join("\n\n")
      
      // Since Aye Chat doesn't support streaming, we simulate it
      const response = await invokeAyeChat(modelId, fullMessage, token, modelConfig.maxOutputTokens)
      
      // Create a simulated stream
      const stream = new ReadableStream({
        async start(controller) {
          // Emit the full response as a single text delta
          controller.enqueue({
            type: "text-delta",
            textDelta: response.answer_summary,
          })
          
          // Emit finish
          controller.enqueue({
            type: "finish",
            finishReason: "stop",
            usage: {
              promptTokens: Math.ceil(fullMessage.length / 4),
              completionTokens: Math.ceil(response.answer_summary.length / 4),
            },
          })
          
          controller.close()
        },
      })

      return {
        stream,
        rawCall: {
          rawPrompt: fullMessage,
          rawSettings: { model: modelId },
        },
      }
    },
  }
}

/**
 * Creates the Aye Chat provider SDK
 */
export function createAyeChat(): any {
  return {
    languageModel(modelId: string) {
      if (!(modelId in AYECHAT_MODELS)) {
        throw new Error(`Unknown Aye Chat model: ${modelId}`)
      }
      return createAyeChatModel(modelId as AyeChatModelId)
    },
    // Required by Provider interface but not used
    textEmbeddingModel() {
      throw new Error("Aye Chat does not support text embeddings")
    },
    imageModel() {
      throw new Error("Aye Chat does not support image generation")
    },
  }
}
