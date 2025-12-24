<p align="center">
  <a href="#">
    <picture>
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Lapetus logo">
    </picture>
  </a>
</p>
<p align="center">The AI-powered coding agent.</p>

---

### Installation

```bash
# Package managers
npm i -g lapetus@latest        # or bun/pnpm/yarn
```

### Agents

Lapetus includes two built-in agents you can switch between,
you can switch between these using the `Tab` key.

- **build** - Default, full access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also, included is a **general** subagent for complex searches and multi-step tasks.
This is used internally and can be invoked using `@general` in messages.

### Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev
```

### Contributing

If you're interested in contributing to Lapetus, please read our contributing docs before submitting a pull request.

---

**Lapetus** - AI-powered development tool
