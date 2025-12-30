import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import z from "zod"
import { data } from "./models-macro" with { type: "macro" }
import { Installation } from "../installation"
import { Flag } from "../flag/flag"

export namespace ModelsDev {
  const log = Log.create({ service: "models.dev" })
  const filepath = path.join(Global.Path.cache, "models.json")

  export const Model = z.object({
    id: z.string(),
    name: z.string(),
    family: z.string().optional(),
    release_date: z.string(),
    attachment: z.boolean(),
    reasoning: z.boolean(),
    temperature: z.boolean(),
    tool_call: z.boolean(),
    interleaved: z
      .union([
        z.literal(true),
        z
          .object({
            field: z.enum(["reasoning_content", "reasoning_details"]),
          })
          .strict(),
      ])
      .optional(),
    cost: z
      .object({
        input: z.number(),
        output: z.number(),
        cache_read: z.number().optional(),
        cache_write: z.number().optional(),
        context_over_200k: z
          .object({
            input: z.number(),
            output: z.number(),
            cache_read: z.number().optional(),
            cache_write: z.number().optional(),
          })
          .optional(),
      })
      .optional(),
    limit: z.object({
      context: z.number(),
      output: z.number(),
    }),
    modalities: z
      .object({
        input: z.array(z.enum(["text", "audio", "image", "video", "pdf"])),
        output: z.array(z.enum(["text", "audio", "image", "video", "pdf"])),
      })
      .optional(),
    experimental: z.boolean().optional(),
    status: z.enum(["alpha", "beta", "deprecated"]).optional(),
    options: z.record(z.string(), z.any()),
    headers: z.record(z.string(), z.string()).optional(),
    provider: z.object({ npm: z.string() }).optional(),
  })
  export type Model = z.infer<typeof Model>

  export const Provider = z.object({
    api: z.string().optional(),
    name: z.string(),
    env: z.array(z.string()),
    id: z.string(),
    npm: z.string().optional(),
    models: z.record(z.string(), Model),
  })

  export type Provider = z.infer<typeof Provider>

  export async function get() {
    refresh()
    const file = Bun.file(filepath)
    const result = await file.json().catch(() => {})
    const providers = result ? result as Record<string, Provider> : JSON.parse(await data()) as Record<string, Provider>
    
    // Add Lapetus provider - built-in API key, no user key needed
    providers["lapetus"] = {
      id: "lapetus",
      name: "Lapetus",
      api: "https://lapetuse-api.onrender.com/v1",
      npm: "@ai-sdk/openai-compatible",
      env: [],
      models: {
        // GPT Models
        "gpt-5": { id: "gpt-5", name: "GPT-5", family: "gpt", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 16384 } },
        "gpt-5-thinking": { id: "gpt-5-thinking", name: "GPT-5 Thinking", family: "gpt", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 16384 } },
        "o3": { id: "o3", name: "O3", family: "gpt", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 200000, output: 100000 } },
        "o4-mini": { id: "o4-mini", name: "O4 Mini", family: "gpt", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 200000, output: 100000 } },
        // Claude Models
        "sonnet-4.5": { id: "sonnet-4.5", name: "Claude Sonnet 4.5", family: "claude", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 200000, output: 16384 } },
        "sonnet-4.5-reasoning": { id: "sonnet-4.5-reasoning", name: "Claude Sonnet 4.5 Reasoning", family: "claude", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 200000, output: 16384 } },
        "opus-4.5": { id: "opus-4.5", name: "Claude Opus 4.5", family: "claude", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 200000, output: 32000 } },
        "opus-4.5-reasoning": { id: "opus-4.5-reasoning", name: "Claude Opus 4.5 Reasoning", family: "claude", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 200000, output: 32000 } },
        // Grok Models
        "grok-latest": { id: "grok-latest", name: "Grok Latest", family: "grok", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 16384 } },
        "grok4": { id: "grok4", name: "Grok 4", family: "grok", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 16384 } },
      },
    }

    // Add Lapetus NVIDIA provider
    providers["lapetus-nvidia"] = {
      id: "lapetus-nvidia",
      name: "Lapetus",
      api: "https://integrate.api.nvidia.com/v1",
      npm: "@ai-sdk/openai-compatible",
      env: ["LAPETUS_NVIDIA_API_KEY"],
      models: {
        "deepseek-ai/deepseek-v3.2": { id: "deepseek-ai/deepseek-v3.2", name: "DeepSeek V3.2", family: "deepseek", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "mistralai/mistral-large-3-675b-instruct-2512": { id: "mistralai/mistral-large-3-675b-instruct-2512", name: "Mistral Large 3 675B", family: "mistral", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "minimaxai/minimax-m2": { id: "minimaxai/minimax-m2", name: "MiniMax M2", family: "minimax", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "deepseek-ai/deepseek-v3.1-terminus": { id: "deepseek-ai/deepseek-v3.1-terminus", name: "DeepSeek V3.1 Terminus", family: "deepseek", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "qwen/qwen3-coder-480b-a35b-instruct": { id: "qwen/qwen3-coder-480b-a35b-instruct", name: "Qwen3 Coder 480B", family: "qwen", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
      },
    }
    
    return providers
  }

  export async function refresh() {
    if (Flag.OPENCODE_DISABLE_MODELS_FETCH) return
    const file = Bun.file(filepath)
    log.info("refreshing", {
      file,
    })
    const result = await fetch("https://models.dev/api.json", {
      headers: {
        "User-Agent": Installation.USER_AGENT,
      },
      signal: AbortSignal.timeout(10 * 1000),
    }).catch((e) => {
      log.error("Failed to fetch models.dev", {
        error: e,
      })
    })
    if (result && result.ok) await Bun.write(file, await result.text())
  }
}

setInterval(() => ModelsDev.refresh(), 60 * 1000 * 60).unref()
