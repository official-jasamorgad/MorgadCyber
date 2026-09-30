export type CategoryMeta = {
  label: string
  desc: string
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  software: { label: 'Software', desc: 'Aplikasi dan tools produktivitas' },
  application: { label: 'Application', desc: 'Aplikasi desktop dan mobile' },
  saas: { label: 'SaaS', desc: 'Layanan berbasis cloud' },
  source_code: { label: 'Source Code', desc: 'Kode siap deploy' },
  plugin: { label: 'Plugin', desc: 'Ekstensi dan plugin' },
  template: { label: 'Template', desc: 'Template siap pakai' },
  journal: { label: 'Journal', desc: 'Jurnal ilmiah dan akademik' },
  paper: { label: 'Paper', desc: 'Research paper' },
  makalah: { label: 'Makalah', desc: 'Makalah dan karya tulis' },
  ebook: { label: 'E-Book', desc: 'Buku digital' },
  document: { label: 'Document', desc: 'Dokumen digital' },
  digital_asset: { label: 'Aset Digital', desc: 'Foto, grafis, ilustrasi' },
  other: { label: 'Lainnya', desc: 'Produk digital lainnya' },
}

export const FEATURED_CATEGORIES = [
  'digital_asset',
  'template',
  'ebook',
  'software',
  'source_code',
] as const