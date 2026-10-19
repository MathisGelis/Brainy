import ReactMarkdown, { type ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Nœud HTML (hast) transmis par react-markdown */
type Element = NonNullable<ExtraProps['node']>

type Props = {
  children: string
  /** Coche/décoche la case de la ligne `line` (1-indexée) du source Markdown */
  onToggleTask?: (line: number) => void
}

/** Rendu Markdown sûr (le HTML brut n'est pas interprété) avec listes à cocher GFM. */
export function Markdown({ children, onToggleTask }: Props) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: label }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ),
          // La case par défaut (désactivée) est remplacée par la nôtre, dans <li>
          input: () => null,
          li: ({ node, className, children: content }) => {
            const element = node as Element | undefined
            const isTask = className?.includes('task-list-item') && element?.position
            if (!isTask) return <li className={className}>{content}</li>
            const box = element.children.find(
              (c): c is Element => c.type === 'element' && c.tagName === 'input',
            )
            const checked = Boolean(box?.properties?.checked)
            const line = element.position!.start.line
            return (
              <li className="task-list-item">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="check mt-0.5 shrink-0"
                    checked={checked}
                    disabled={!onToggleTask}
                    onChange={() => onToggleTask?.(line)}
                  />
                  <span className={checked ? 'text-muted line-through' : ''}>{content}</span>
                </label>
              </li>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
