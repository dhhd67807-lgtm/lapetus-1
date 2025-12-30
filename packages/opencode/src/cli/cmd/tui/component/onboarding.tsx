import { createSignal } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useKV } from "@tui/context/kv"
import { useKeyboard } from "@opentui/solid"
import { Logo } from "./logo"

export function Onboarding(props: { onComplete: () => void }) {
  const { theme } = useTheme()
  const kv = useKV()
  const [step, setStep] = createSignal(0)

  const steps = [
    {
      title: "Welcome to Lapetus",
      content: "Your AI-powered coding assistant in the terminal.",
      hint: "Press Enter to continue",
    },
    {
      title: "Free Models Included",
      content: "Lapetus comes with free AI models ready to use.\nNo API keys required to get started!",
      hint: "Press Enter to continue",
    },
    {
      title: "Premium Models",
      content: "Want GPT-5, Claude 4, Gemini 3, O3 and more?\nGet your API key from https://api.5202030.xyz/\n\nThen run: lapetus auth",
      hint: "Press Enter to continue",
    },
    {
      title: "Join Our Community",
      content: "Join our Discord for help, updates, and to connect\nwith other developers!\n\nhttps://discord.gg/QkDEczW6hF",
      hint: "Press Enter to continue",
    },
    {
      title: "You're All Set!",
      content: "Start coding with AI assistance.\nJust type your question below.",
      hint: "Press Enter to start",
    },
  ]

  const totalSteps = steps.length

  useKeyboard((evt) => {
    if (evt.name === "return" || evt.name === "space") {
      evt.preventDefault?.()
      const currentStep = step()
      if (currentStep < totalSteps - 1) {
        setStep(currentStep + 1)
      } else {
        // Last step - complete onboarding
        kv.set("onboarding_complete", true)
        props.onComplete()
      }
    }
    if (evt.name === "escape") {
      evt.preventDefault?.()
      kv.set("onboarding_complete", true)
      props.onComplete()
    }
  })

  const currentStep = () => steps[step()]

  return (
    <box
      flexGrow={1}
      justifyContent="center"
      alignItems="center"
      paddingLeft={4}
      paddingRight={4}
    >
      <box
        flexDirection="column"
        alignItems="center"
        gap={2}
        maxWidth={60}
      >
        <Logo />
        
        <box
          flexDirection="column"
          alignItems="center"
          gap={1}
          paddingTop={2}
        >
          <text fg={theme.primary}>
            ★ {currentStep().title}
          </text>
          
          <box paddingTop={1} paddingBottom={1}>
            <text fg={theme.text}>
              {currentStep().content}
            </text>
          </box>

          <box flexDirection="row" gap={1} paddingTop={1}>
            {steps.map((_, i) => (
              <text fg={i <= step() ? theme.primary : theme.textMuted}>
                {i <= step() ? "●" : "○"}
              </text>
            ))}
          </box>

          <box paddingTop={2}>
            <text fg={theme.textMuted}>
              {currentStep().hint} · Esc to skip
            </text>
          </box>
        </box>
      </box>
    </box>
  )
}
