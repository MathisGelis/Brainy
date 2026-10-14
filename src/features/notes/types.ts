export type Note = {
  id: string
  title: string
  content: string
  pinned: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'pinned' | 'tags'>>
