import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

/** Render user Markdown to sanitized HTML (diário entries render locally). */
export function renderMarkdown(src: string): string {
  const html = marked.parse(src ?? '', { async: false })
  return DOMPurify.sanitize(html)
}
