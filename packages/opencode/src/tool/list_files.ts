import z from "zod"
import { Tool } from "./tool"
import * as path from "path"
import { Instance } from "../project/instance"
import { Ripgrep } from "../file/ripgrep"
import { IGNORE_PATTERNS } from "./ls"

const LIMIT = 100

// list_files tool for Lapetus agent models
export const ListFilesTool = Tool.define("list_files", {
  description: "List files and directories in a given path. Returns a tree structure of files and folders.",
  parameters: z.object({
    path: z.string().describe("The path to the directory to list (relative or absolute)").optional(),
  }),
  async execute(params) {
    const searchPath = path.resolve(Instance.directory, params.path || ".")

    const ignoreGlobs = IGNORE_PATTERNS.map((p) => `!${p}*`)
    const files: string[] = []
    for await (const file of Ripgrep.files({ cwd: searchPath, glob: ignoreGlobs })) {
      files.push(file)
      if (files.length >= LIMIT) break
    }

    // Build directory structure
    const dirs = new Set<string>()
    const filesByDir = new Map<string, string[]>()

    for (const file of files) {
      const dir = path.dirname(file)
      const parts = dir === "." ? [] : dir.split("/")

      for (let i = 0; i <= parts.length; i++) {
        const dirPath = i === 0 ? "." : parts.slice(0, i).join("/")
        dirs.add(dirPath)
      }

      if (!filesByDir.has(dir)) filesByDir.set(dir, [])
      filesByDir.get(dir)!.push(path.basename(file))
    }

    function renderDir(dirPath: string, depth: number): string {
      const indent = "  ".repeat(depth)
      let output = ""

      if (depth > 0) {
        output += `${indent}${path.basename(dirPath)}/\n`
      }

      const childIndent = "  ".repeat(depth + 1)
      const children = Array.from(dirs)
        .filter((d) => path.dirname(d) === dirPath && d !== dirPath)
        .sort()

      for (const child of children) {
        output += renderDir(child, depth + 1)
      }

      const dirFiles = filesByDir.get(dirPath) || []
      for (const file of dirFiles.sort()) {
        output += `${childIndent}${file}\n`
      }

      return output
    }

    const output = `${searchPath}/\n` + renderDir(".", 0)

    return {
      title: path.relative(Instance.worktree, searchPath),
      metadata: {
        count: files.length,
        truncated: files.length >= LIMIT,
      },
      output,
    }
  },
})
