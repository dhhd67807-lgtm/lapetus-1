import { TextAttributes } from "@opentui/core"
import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"

// Main logo (foreground)
const LOGO_MAIN = [
  `██       ███    ██████  ████████ ████████ ██    ██  ██████ `,
  `██      ██ ██   ██   ██ ██          ██    ██    ██ ██      `,
  `██     ██   ██  ██████  █████       ██    ██    ██  █████  `,
  `██     ███████  ██      ██          ██    ██    ██      ██ `,
  `██████ ██   ██  ██      ████████    ██     ██████  ██████  `,
]

// Shadow (offset by 1)
const LOGO_SHADOW = [
  `░░       ░░░    ░░░░░░  ░░░░░░░░ ░░░░░░░░ ░░    ░░  ░░░░░░ `,
  `░░      ░░ ░░   ░░   ░░ ░░          ░░    ░░    ░░ ░░      `,
  `░░     ░░   ░░  ░░░░░░  ░░░░░       ░░    ░░    ░░  ░░░░░  `,
  `░░     ░░░░░░░  ░░      ░░          ░░    ░░    ░░      ░░ `,
  `░░░░░░ ░░   ░░  ░░      ░░░░░░░░    ░░     ░░░░░░  ░░░░░░  `,
]

export function Logo() {
  const { theme } = useTheme()
  return (
    <box>
      {/* Shadow layer */}
      <box position="absolute" marginLeft={1} marginTop={1}>
        <For each={LOGO_SHADOW}>
          {(line) => (
            <box flexDirection="row">
              <text fg={theme.backgroundElement} selectable={false}>
                {line}
              </text>
            </box>
          )}
        </For>
      </box>
      {/* Main logo layer */}
      <box>
        <For each={LOGO_MAIN}>
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
