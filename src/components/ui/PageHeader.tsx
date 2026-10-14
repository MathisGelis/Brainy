import { useDocumentTitle } from '@/lib/useDocumentTitle'

export function PageHeader({ title }: { title: string }) {
  useDocumentTitle(title)
  return <h1 className="mb-6 text-xl font-semibold">{title}</h1>
}
