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
    
    // Add Lapetus (iFlow) provider - no env needed, API key is hardcoded
    providers["lapetus"] = {
      id: "lapetus",
      name: "Lapetus",
      api: "https://apis.iflow.cn/v1",
      npm: "@ai-sdk/openai-compatible",
      env: [],
      models: {
        "qwen3-coder-plus": { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus", family: "qwen", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "qwen3-max-preview": { id: "qwen3-max-preview", name: "Qwen3 Max Preview", family: "qwen", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "glm-4.6": { id: "glm-4.6", name: "GLM 4.6", family: "glm", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "deepseek-v3.2": { id: "deepseek-v3.2", name: "DeepSeek V3.2", family: "deepseek", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "qwen3-235b-a22b-thinking-2507": { id: "qwen3-235b-a22b-thinking-2507", name: "Qwen3 235B Thinking", family: "qwen", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "qwen3-235b-a22b-instruct": { id: "qwen3-235b-a22b-instruct", name: "Qwen3 235B Instruct", family: "qwen", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "qwen3-235b": { id: "qwen3-235b", name: "Qwen3 235B", family: "qwen", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
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
        "deepseek-ai/deepseek-v3.2": { id: "deepseek-ai/deepseek-v3.2", name: "DeepSeek V3.2 (NVIDIA)", family: "deepseek", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "mistralai/mistral-large-3-675b-instruct-2512": { id: "mistralai/mistral-large-3-675b-instruct-2512", name: "Mistral Large 3 675B", family: "mistral", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "minimaxai/minimax-m2": { id: "minimaxai/minimax-m2", name: "MiniMax M2", family: "minimax", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "moonshotai/kimi-k2-instruct-0905": { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2 Instruct 0905", family: "kimi", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "moonshotai/kimi-k2-thinking": { id: "moonshotai/kimi-k2-thinking", name: "Kimi K2 Thinking", family: "kimi", attachment: false, reasoning: true, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "deepseek-ai/deepseek-v3.1-terminus": { id: "deepseek-ai/deepseek-v3.1-terminus", name: "DeepSeek V3.1 Terminus", family: "deepseek", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "qwen/qwen3-coder-480b-a35b-instruct": { id: "qwen/qwen3-coder-480b-a35b-instruct", name: "Qwen3 Coder 480B", family: "qwen", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
        "moonshotai/kimi-k2-instruct": { id: "moonshotai/kimi-k2-instruct", name: "Kimi K2 Instruct", family: "kimi", attachment: false, reasoning: false, temperature: true, tool_call: true, release_date: "2025-01-01", options: {}, limit: { context: 128000, output: 8192 } },
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
