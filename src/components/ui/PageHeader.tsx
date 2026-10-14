import { useDocumentTitle } from '@/lib/useDocumentTitle'

/** Grand titre façon iOS. */
export function PageHeader({ title }: { title: string }) {
  useDocumentTitle(title)
  return (
    <h1 className="mb-6 pr-24 text-[28px] leading-tight font-semibold tracking-tight md:pr-0 md:text-[34px]">
      {title}
    </h1>
  )
}
