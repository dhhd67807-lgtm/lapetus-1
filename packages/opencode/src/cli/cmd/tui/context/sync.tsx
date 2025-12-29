import type {
  Message,
  Agent,
  Provider,
  Session,
  Part,
  Config,
  Todo,
  Command,
  Permission,
  LspStatus,
  McpStatus,
  FormatterStatus,
  SessionStatus,
  ProviderListResponse,
  ProviderAuthMethod,
  VcsInfo,
} from "@opencode-ai/sdk/v2"
import { createStore, produce, reconcile } from "solid-js/store"
import { useSDK } from "@tui/context/sdk"
import { Binary } from "@opencode-ai/util/binary"
import { createSimpleContext } from "./helper"
import type { Snapshot } from "@/snapshot"
import { useExit } from "./exit"
import { useArgs } from "./args"
import { batch, onMount } from "solid-js"
import { Log } from "@/util/log"
import type { Path } from "@opencode-ai/sdk"

const log = Log.create({ service: "tui.sync" })

// Direct file logging for debugging
const debugWriter = Bun.file("/tmp/tui-sync-debug.log").writer()
function debugLog(msg: string) {
  debugWriter.write(`[${new Date().toISOString()}] ${msg}\n`)
  debugWriter.flush()
}

export const { use: useSync, provider: SyncProvider } = createSimpleContext({
  name: "Sync",
  init: () => {
    const [store, setStore] = createStore<{
      status: "loading" | "partial" | "complete"
      provider: Provider[]
      provider_default: Record<string, string>
      provider_next: ProviderListResponse
      provider_auth: Record<string, ProviderAuthMethod[]>
      agent: Agent[]
      command: Command[]
      permission: {
        [sessionID: string]: Permission[]
      }
      config: Config
      session: Session[]
      session_status: {
        [sessionID: string]: SessionStatus
      }
      session_diff: {
        [sessionID: string]: Snapshot.FileDiff[]
      }
      todo: {
        [sessionID: string]: Todo[]
      }
      message: {
        [sessionID: string]: Message[]
      }
      part: {
        [messageID: string]: Part[]
      }
      lsp: LspStatus[]
      mcp: {
        [key: string]: McpStatus
      }
      formatter: FormatterStatus[]
      vcs: VcsInfo | undefined
      path: Path
    }>({
      provider_next: {
        all: [],
        default: {},
        connected: [],
      },
      provider_auth: {},
      config: {},
      status: "loading",
      agent: [],
      permission: {},
      command: [],
      provider: [],
      provider_default: {},
      session: [],
      session_status: {},
      session_diff: {},
      todo: {},
      message: {},
      part: {},
      lsp: [],
      mcp: {},
      formatter: [],
      vcs: undefined,
      path: { state: "", config: "", worktree: "", directory: "" },
    })

    const sdk = useSDK()

    sdk.event.listen((e) => {
      const event = e.details
      debugLog(`Event listener received: type=${event.type}`)
      switch (event.type) {
        case "permission.updated": {
          debugLog(`permission.updated: sessionID=${event.properties.sessionID}`)
          const permissions = store.permission[event.properties.sessionID]
          if (!permissions) {
            setStore("permission", event.properties.sessionID, [event.properties])
            break
          }
          const match = Binary.search(permissions, event.properties.id, (p) => p.id)
          setStore(
            "permission",
            event.properties.sessionID,
            produce((draft) => {
              if (match.found) {
                draft[match.index] = event.properties
                return
              }
              draft.push(event.properties)
            }),
          )
          break
        }

        case "permission.replied": {
          const permissions = store.permission[event.properties.sessionID]
          const match = Binary.search(permissions, event.properties.permissionID, (p) => p.id)
          if (!match.found) break
          setStore(
            "permission",
            event.properties.sessionID,
            produce((draft) => {
              draft.splice(match.index, 1)
            }),
          )
          break
        }

        case "todo.updated":
          setStore("todo", event.properties.sessionID, event.properties.todos)
          break

        case "session.diff":
          setStore("session_diff", event.properties.sessionID, event.properties.diff)
          break

        case "session.deleted": {
          const result = Binary.search(store.session, event.properties.info.id, (s) => s.id)
          if (result.found) {
            setStore(
              "session",
              produce((draft) => {
                draft.splice(result.index, 1)
              }),
            )
          }
          break
        }
        case "session.updated": {
          debugLog(`session.updated: sessionID=${event.properties.info.id}`)
          const result = Binary.search(store.session, event.properties.info.id, (s) => s.id)
          if (result.found) {
            setStore("session", result.index, reconcile(event.properties.info))
            break
          }
          setStore(
            "session",
            produce((draft) => {
              draft.splice(result.index, 0, event.properties.info)
            }),
          )
          break
        }

        case "session.status": {
          debugLog(`session.status: sessionID=${event.properties.sessionID}, status=${JSON.stringify(event.properties.status)}`)
          setStore("session_status", event.properties.sessionID, event.properties.status)
          break
        }

        case "message.updated": {
          debugLog(`message.updated: sessionID=${event.properties.info.sessionID}, messageID=${event.properties.info.id}, role=${event.properties.info.role}`)
          log.info("message.updated event received", { sessionID: event.properties.info.sessionID, messageID: event.properties.info.id, role: event.properties.info.role })
          const messages = store.message[event.properties.info.sessionID]
          if (!messages) {
            debugLog(`message.updated: No existing messages, creating new array`)
            log.info("No existing messages, creating new array")
            setStore("message", event.properties.info.sessionID, [event.properties.info])
            break
          }
          const result = Binary.search(messages, event.properties.info.id, (m) => m.id)
          if (result.found) {
            debugLog(`message.updated: Message found at index ${result.index}, updating`)
            log.info("Message found, updating")
            setStore("message", event.properties.info.sessionID, result.index, reconcile(event.properties.info))
            break
          }
          debugLog(`message.updated: Message not found, inserting at index ${result.index}`)
          log.info("Message not found, inserting")
          setStore(
            "message",
            event.properties.info.sessionID,
            produce((draft) => {
              draft.splice(result.index, 0, event.properties.info)
              if (draft.length > 100) draft.shift()
            }),
          )
          break
        }
        case "message.removed": {
          const messages = store.message[event.properties.sessionID]
          const result = Binary.search(messages, event.properties.messageID, (m) => m.id)
          if (result.found) {
            setStore(
              "message",
              event.properties.sessionID,
              produce((draft) => {
                draft.splice(result.index, 1)
              }),
            )
          }
          break
        }
        case "message.part.updated": {
          debugLog(`message.part.updated: messageID=${event.properties.part.messageID}, partID=${event.properties.part.id}, type=${event.properties.part.type}`)
          log.info("message.part.updated event received", { messageID: event.properties.part.messageID, partID: event.properties.part.id, type: event.properties.part.type })
          const parts = store.part[event.properties.part.messageID]
          if (!parts) {
            log.info("No existing parts, creating new array")
            setStore("part", event.properties.part.messageID, [event.properties.part])
            break
          }
          const result = Binary.search(parts, event.properties.part.id, (p) => p.id)
          if (result.found) {
            log.info("Part found, updating")
            setStore("part", event.properties.part.messageID, result.index, reconcile(event.properties.part))
            break
          }
          log.info("Part not found, inserting")
          setStore(
            "part",
            event.properties.part.messageID,
            produce((draft) => {
              draft.splice(result.index, 0, event.properties.part)
            }),
          )
          break
        }

        case "message.part.removed": {
          const parts = store.part[event.properties.messageID]
          const result = Binary.search(parts, event.properties.partID, (p) => p.id)
          if (result.found)
            setStore(
              "part",
              event.properties.messageID,
              produce((draft) => {
                draft.splice(result.index, 1)
              }),
            )
          break
        }

        case "lsp.updated": {
          sdk.client.lsp.status().then((x) => setStore("lsp", x.data!))
          break
        }

        case "vcs.branch.updated": {
          setStore("vcs", { branch: event.properties.branch })
          break
        }
      }
    })

    const exit = useExit()
    const args = useArgs()

    async function bootstrap() {
      const sessionListPromise = sdk.client.session.list().then((x) =>
        setStore(
          "session",
          (x.data ?? []).toSorted((a, b) => a.id.localeCompare(b.id)),
        ),
      )

      // blocking - include session.list when continuing a session
      const blockingRequests: Promise<unknown>[] = [
        sdk.client.config.providers({}, { throwOnError: true }).then((x) => {
          batch(() => {
            setStore("provider", x.data!.providers)
            setStore("provider_default", x.data!.default)
          })
        }),
        sdk.client.provider.list({}, { throwOnError: true }).then((x) => {
          batch(() => {
            setStore("provider_next", x.data!)
          })
        }),
        sdk.client.app.agents({}, { throwOnError: true }).then((x) => setStore("agent", x.data ?? [])),
        sdk.client.config.get({}, { throwOnError: true }).then((x) => setStore("config", x.data!)),
        ...(args.continue ? [sessionListPromise] : []),
      ]

      await Promise.all(blockingRequests)
        .then(() => {
          if (store.status !== "complete") setStore("status", "partial")
          // non-blocking
          Promise.all([
            ...(args.continue ? [] : [sessionListPromise]),
            sdk.client.command.list().then((x) => setStore("command", x.data ?? [])),
            sdk.client.lsp.status().then((x) => setStore("lsp", x.data!)),
            sdk.client.mcp.status().then((x) => setStore("mcp", x.data!)),
            sdk.client.formatter.status().then((x) => setStore("formatter", x.data!)),
            sdk.client.session.status().then((x) => setStore("session_status", x.data!)),
            sdk.client.provider.auth().then((x) => setStore("provider_auth", x.data ?? {})),
            sdk.client.vcs.get().then((x) => setStore("vcs", x.data)),
            sdk.client.path.get().then((x) => setStore("path", x.data!)),
          ]).then(() => {
            setStore("status", "complete")
          })
        })
        .catch(async (e) => {
          Log.Default.error("tui bootstrap failed", {
            error: e instanceof Error ? e.message : String(e),
            name: e instanceof Error ? e.name : undefined,
            stack: e instanceof Error ? e.stack : undefined,
          })
          await exit(e)
        })
    }

    onMount(() => {
      bootstrap()
    })

    const fullSyncedSessions = new Set<string>()
    const result = {
      data: store,
      set: setStore,
      get status() {
        return store.status
      },
      get ready() {
        return store.status !== "loading"
      },
      session: {
        get(sessionID: string) {
          const match = Binary.search(store.session, sessionID, (s) => s.id)
          if (match.found) return store.session[match.index]
          return undefined
        },
        status(sessionID: string) {
          const session = result.session.get(sessionID)
          if (!session) return "idle"
          if (session.time.compacting) return "compacting"
          const messages = store.message[sessionID] ?? []
          const last = messages.at(-1)
          if (!last) return "idle"
          if (last.role === "user") return "working"
          return last.time.completed ? "idle" : "working"
        },
        async sync(sessionID: string) {
          debugLog(`sync called: sessionID=${sessionID}`)
          log.info("sync called", { sessionID })
          if (fullSyncedSessions.has(sessionID)) {
            debugLog(`sync: Session already synced, skipping`)
            log.info("Session already synced, skipping", { sessionID })
            return
          }
          debugLog(`sync: Fetching session data...`)
          log.info("Fetching session data...", { sessionID })
          const [session, messages, todo, diff] = await Promise.all([
            sdk.client.session.get({ sessionID }, { throwOnError: true }),
            sdk.client.session.messages({ sessionID, limit: 100 }),
            sdk.client.session.todo({ sessionID }),
            sdk.client.session.diff({ sessionID }),
          ])
          debugLog(`sync: Fetched messages count=${messages.data?.length ?? 0}`)
          log.info("Fetched messages", { sessionID, count: messages.data?.length ?? 0 })
          
          // Log existing messages before merge
          const existingMsgsBefore = store.message[sessionID] ?? []
          debugLog(`sync: Existing messages before merge: ${existingMsgsBefore.map(m => `${m.id}(${m.role})`).join(", ")}`)
          
          // Log existing parts before merge
          for (const msg of existingMsgsBefore) {
            const parts = store.part[msg.id] ?? []
            debugLog(`sync: Existing parts for ${msg.id}: ${parts.map(p => `${p.id}(${p.type})`).join(", ")}`)
          }
          
          setStore(
            produce((draft) => {
              const match = Binary.search(draft.session, sessionID, (s) => s.id)
              if (match.found) draft.session[match.index] = session.data!
              if (!match.found) draft.session.splice(match.index, 0, session.data!)
              draft.todo[sessionID] = todo.data ?? []
              
              // Merge messages instead of overwriting to preserve any messages
              // that were added by the event listener during the sync
              const existingMessages = draft.message[sessionID] ?? []
              const fetchedMessages = messages.data!.map((x) => x.info)
              
              // Create a map of existing messages by ID for quick lookup
              const existingMap = new Map(existingMessages.map((m) => [m.id, m]))
              
              // Merge: use fetched messages as base, but keep any newer messages from events
              for (const msg of fetchedMessages) {
                existingMap.set(msg.id, msg)
              }
              
              // Sort by ID to maintain order
              draft.message[sessionID] = Array.from(existingMap.values()).sort((a, b) => 
                a.id.localeCompare(b.id)
              )
              
              // Similarly merge parts instead of overwriting
              for (const message of messages.data!) {
                const existingParts = draft.part[message.info.id] ?? []
                const fetchedParts = message.parts
                
                // Create a map of existing parts by ID
                const partsMap = new Map(existingParts.map((p) => [p.id, p]))
                
                // Merge: use fetched parts as base, but keep any newer parts from events
                for (const part of fetchedParts) {
                  partsMap.set(part.id, part)
                }
                
                // Sort by ID to maintain order
                draft.part[message.info.id] = Array.from(partsMap.values()).sort((a, b) =>
                  a.id.localeCompare(b.id)
                )
              }
              
              draft.session_diff[sessionID] = diff.data ?? []
            }),
          )
          
          // Log messages after merge
          const existingMsgsAfter = store.message[sessionID] ?? []
          debugLog(`sync: Messages after merge: ${existingMsgsAfter.map(m => `${m.id}(${m.role})`).join(", ")}`)
          fullSyncedSessions.add(sessionID)
        },
      },
      bootstrap,
    }
    return result
  },
})
