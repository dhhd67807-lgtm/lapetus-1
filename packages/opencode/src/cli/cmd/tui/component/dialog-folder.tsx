import { createMemo, createSignal, createResource } from "solid-js"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useSync } from "@tui/context/sync"
import path from "path"
import fs from "fs/promises"

export function DialogFolder(props: { 
  currentPath: string
  onSelect: (folderPath: string) => void 
}) {
  const dialog = useDialog()
  const sync = useSync()
  const [currentDir, setCurrentDir] = createSignal(props.currentPath || sync.data.path.directory)
  
  const [folders] = createResource(currentDir, async (dir) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      const dirs = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => ({
          name: entry.name,
          path: path.join(dir, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      return dirs
    } catch {
      return []
    }
  })

  const options = createMemo(() => {
    const items = folders() ?? []
    const parentDir = path.dirname(currentDir())
    
    const result = [
      // Select current folder option
      {
        value: currentDir(),
        title: `📁 Select this folder`,
        description: currentDir(),
        category: "Actions",
        onSelect: () => {
          props.onSelect(currentDir())
          dialog.clear()
        }
      },
      // Go up option (if not at root)
      ...(parentDir !== currentDir() ? [{
        value: parentDir,
        title: "📂 ..",
        description: "Go to parent folder",
        category: "Navigation",
        onSelect: () => {
          setCurrentDir(parentDir)
        }
      }] : []),
      // Subfolders
      ...items.map(folder => ({
        value: folder.path,
        title: `📁 ${folder.name}`,
        description: folder.path,
        category: "Folders",
        onSelect: () => {
          setCurrentDir(folder.path)
        }
      }))
    ]
    
    return result
  })

  return (
    <DialogSelect
      title={`Select folder: ${path.basename(currentDir()) || currentDir()}`}
      options={options()}
    />
  )
}
