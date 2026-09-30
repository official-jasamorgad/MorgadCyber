import { db, products, adminUsers } from './index'
import bcrypt from 'bcryptjs'

async function seed() {
  console.log('🌱 Seeding database...')

  // ── Products ──────────────────────────────────────────────────────
  const productData = [
    {
      id: 'prod_viral_visual_vol1',
      name: 'Viral Visual Pack Vol. 01',
      slug: 'viral-visual-pack-vol-1',
      description: 'Koleksi lengkap visual viral untuk konten media sosial. Termasuk 500+ gambar HD, template, dan preset warna yang siap pakai untuk Instagram, TikTok, dan platform lainnya.',
      shortDescription: '500+ viral visuals, HD quality, ready-to-use',
      category: 'digital_asset' as const,
      price: 119000,
      currency: 'IDR',
      fileKey: 'products/viral_visual_pack_vol1.zip',
      fileName: 'viral_visual_pack_vol1.zip',
      fileSize: 52428800,
      fileMimeType: 'application/zip',
      version: '1.0',
      maxDownloads: 5,
      status: 'PUBLISHED' as const,
      featured: true,
      thumbnailUrl: '/assets/images/cyberpunk-tunnel.svg',
      tags: ['viral', 'social media', 'visual', 'instagram'],
    },
    {
      id: 'prod_premium_aesthetic',
      name: 'Premium Aesthetic Collection',
      slug: 'premium-aesthetic-collection',
      description: 'Kumpulan foto premium estetik berkualitas tinggi. Cocok untuk branding profesional, website, dan konten kreatif.',
      shortDescription: 'Premium aesthetic photos for professional branding',
      category: 'digital_asset' as const,
      price: 149000,
      currency: 'IDR',
      fileKey: 'products/premium_aesthetic_collection.zip',
      fileName: 'premium_aesthetic_collection.zip',
      fileSize: 78643200,
      fileMimeType: 'application/zip',
      version: '1.0',
      maxDownloads: 5,
      status: 'PUBLISHED' as const,
      featured: false,
      thumbnailUrl: '/assets/images/pink-archway.svg',
      tags: ['aesthetic', 'premium', 'branding', 'photography'],
    },
    {
      id: 'prod_creative_bundle',
      name: 'Creative Image Bundle',
      slug: 'creative-image-bundle',
      description: 'Bundle kreatif yang mencakup berbagai genre: abstrak, nature, urban, dan conceptual art. Sempurna untuk desainer dan kreator konten.',
      shortDescription: 'Creative multi-genre image bundle for designers',
      category: 'digital_asset' as const,
      price: 133000,
      currency: 'IDR',
      fileKey: 'products/creative_image_bundle.zip',
      fileName: 'creative_image_bundle.zip',
      fileSize: 62914560,
      fileMimeType: 'application/zip',
      version: '1.0',
      maxDownloads: 5,
      status: 'PUBLISHED' as const,
      featured: false,
      thumbnailUrl: '/assets/images/fluid-swirl.svg',
      tags: ['creative', 'abstract', 'design', 'art'],
    },
    {
      id: 'prod_social_media_pack',
      name: 'Social Media Image Pack',
      slug: 'social-media-image-pack',
      description: 'Pack lengkap untuk semua platform media sosial. Termasuk template story, feed, thumbnail YouTube, dan cover Facebook yang siap edit.',
      shortDescription: 'Complete social media templates for all platforms',
      category: 'template' as const,
      price: 104000,
      currency: 'IDR',
      fileKey: 'products/social_media_image_pack.zip',
      fileName: 'social_media_image_pack.zip',
      fileSize: 41943040,
      fileMimeType: 'application/zip',
      version: '1.0',
      maxDownloads: 5,
      status: 'PUBLISHED' as const,
      featured: false,
      thumbnailUrl: '/assets/images/mountain-lake.svg',
      tags: ['social media', 'template', 'youtube', 'instagram'],
    },
    {
      id: 'prod_cinematic_visual',
      name: 'Cinematic Visual Collection',
      slug: 'cinematic-visual-collection',
      description: 'Koleksi visual sinematik eksklusif dengan kualitas film profesional. Termasuk LUT pack, preset Lightroom, dan 200+ foto sinematik resolusi 4K.',
      shortDescription: '4K cinematic visuals, LUTs, Lightroom presets',
      category: 'digital_asset' as const,
      price: 299000,
      currency: 'IDR',
      fileKey: 'products/cinematic_visual_collection.zip',
      fileName: 'cinematic_visual_collection.zip',
      fileSize: 157286400,
      fileMimeType: 'application/zip',
      version: '1.0',
      maxDownloads: 3,
      status: 'PUBLISHED' as const,
      featured: true,
      thumbnailUrl: '/assets/images/featured-city.svg',
      tags: ['cinematic', '4k', 'LUT', 'lightroom', 'premium'],
    },
  ]

  for (const product of productData) {
    await db.insert(products).values(product).onConflictDoNothing()
    console.log(`  ✓ Product: ${product.name}`)
  }

  // ── Admin User ────────────────────────────────────────────────────
  // Default admin: morgadcyber@morgad.com / JasaMorgad21vp
  // IMPORTANT: Change this password immediately after first login
  const passwordHash = await bcrypt.hash('JasaMorgad21vp', 12)

  await db.insert(adminUsers).values({
    id: 'adm_sujon_super',
    email: 'morgadcyber@morgad.com',
    name: 'Morgad Admin',
    passwordHash,
    role: 'SUPER_ADMIN',
    active: true,
  }).onConflictDoUpdate({
    target: adminUsers.id,
    set: {
      email: 'morgadcyber@morgad.com',
      name: 'Morgad Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      active: true,
      updatedAt: new Date(),
    },
  })

  console.log('  ✓ Admin: morgadcyber@morgad.com (SUPER_ADMIN)')
  console.log('')
  console.log('✅ Seed complete.')
  console.log('')
  console.log('⚠️  IMPORTANT: Change the default admin password after first login!')
  console.log('   Default: morgadcyber@morgad.com / JasaMorgad21vp')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
