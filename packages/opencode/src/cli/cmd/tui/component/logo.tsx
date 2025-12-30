import { TextAttributes } from "@opentui/core"
import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"

// Main logo with shadow built-in using different characters
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
    <box>
      <For each={LOGO}>
        {(line) => (
          <box flexDirection="row">
            <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
              {line}
            </text>
          </box>
        )}
      </For>
    </box>
  )
}
