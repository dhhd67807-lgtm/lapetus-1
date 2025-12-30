import { TextAttributes } from "@opentui/core"
import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"

// Main logo
const LOGO = [
  `██       ███    ██████  ████████ ████████ ██    ██  ██████ `,
  `██      ██ ██   ██   ██ ██          ██    ██    ██ ██      `,
  `██     ██   ██  ██████  █████       ██    ██    ██  █████  `,
  `██     ███████  ██      ██          ██    ██    ██      ██ `,
  `██████ ██   ██  ██      ████████    ██     ██████  ██████  `,
]

export function Logo() {
  const { theme } = useTheme()
  return (
    <box height={6}>
      {/* Black shadow - offset to bottom-right */}
      <box position="absolute" marginLeft={2} marginTop={1}>
        <For each={LOGO}>
          {(line) => (
            <box flexDirection="row">
              <text fg="#000000" selectable={false}>
                {line}
              </text>
            </box>
          )}
        </For>
      </box>
      {/* Main logo layer - primary color on top */}
      <box>
        <For each={LOGO}>
          {(line) => (
            <box flexDirection="row">
              <text fg={theme.primary} attributes={TextAttributes.BOLD} selectable={false}>
                {line}
              </text>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}
