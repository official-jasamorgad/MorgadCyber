/**
 * TERA VIRAL HUB - INTERACTIVE APPLICATION SCRIPT
 * High-performance, zero-dependency ES6 marketplace logic
 */

// Product Catalog Data with Multi-Currency (IDR & USD)
const PRODUCTS_DATA = {
  'prod-1': {
    id: 'prod-1',
    title: 'DZKJ Tools',
    tag: 'Software',
    category: 'Software',
    priceUSD: 1.96,
    priceIDR: 35000,
    price: 1.96,
    image: 'assets/images/dzkg.svg',
    desc: 'DZKJ Tools adalah Tools untuk teknisi Hendphone untuk mencari skema pada mesin Hendphone .',
    resolution: 'Tools exe',
    files: 'exe File + License',
    size: '150 Mb'
  },
  'prod-2': {
    id: 'prod-2',
    title: 'Tes Point Isp Tools',
    tag: 'Software',
    category: 'Software',
    priceUSD: 0.84,
    priceIDR: 15000,
    price: 0.84,
    image: 'assets/images/Tp_isp.svg',
    desc: 'Tes Point Isp adalah Tools yang digunakan oleh para teknisi untuk mengetahui bagian titik Tes point.',
    resolution: '6K UHD (6000x4000)',
    files: '110+ Stock Photos',
    size: '2.4 GB'
  },
  'prod-3': {
    id: 'prod-3',
    title: 'AutoCad',
    tag: 'Software',
    category: 'Software',
    priceUSD: 1.96,
    priceIDR: 35000,
    price: 1.96,
    image: 'assets/images/autocad.svg',
    desc: 'AutoCad adalah software desain grafis yang digunakan untuk membuat desain arsitektur dan teknik.',
    resolution: 'Software + Lincesi',
    files: '95+ Abstract Textures',
    size: '1.8 GB'
  },
  'prod-4': {
    id: 'prod-4',
    title: 'Cellebrite UFED 4PC',
    tag: 'Software',
    category: 'Software',
    priceUSD: 2.8,
    priceIDR: 50000,
    price: 2.8,
    image: 'assets/images/ufed.svg',
    desc: 'Cellebrite UFED 4PC adalah software yang digunakan untuk melakukan forensik digital pada perangkat mobile.',
    resolution: 'App exe',
    files: 'Software + License',
    size: '120 Mb'
  },
  'prod-featured': {
    id: 'prod-featured',
    title: 'Cinematic Visual Collection',
    tag: 'Featured Collection',
    category: 'featured',
    priceUSD: 19.99,
    priceIDR: 299000,
    price: 19.99,
    image: 'assets/images/featured-city.svg',
    desc: 'A premium handpicked collection of cinematic visuals perfect for creators, designers, and filmmakers. Includes 120+ 4K ultra-definition scenes.',
    resolution: '4K Cinema DCI (4096x2160)',
    files: '120+ Cinematic Scenes',
    size: '3.6 GB'
  }
};

// Application State
const state = {
  cart: [],
  activeCategory: null,
  searchQuery: '',
  currency: localStorage.getItem('preferred_currency') || 'IDR',
  theme: localStorage.getItem('preferred_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  language: localStorage.getItem('preferred_language') || 'en'
};

const translations = {
  en: {
    navExplore: 'Explore',
    navCategories: 'Categories',
    navFeatured: 'Featured',
    navHowItWorks: 'How It Works',
    categoriesTitle: 'Categories',
    searchPlaceholder: 'Search catalog...',
    languageLabel: 'Select language',
    searchEmptyTitle: 'No products found',
    searchEmptyDescription: 'Try another search or browse all categories.',
    headerCta: 'Explore Products',
    heroBadge: 'Software & Tools',
    heroTitle: 'Digital tools for technical needs.',
    heroSubtitle: 'Find software for mobile technician work, technical design, and digital forensics.',
    viewProducts: 'View Products',
    allCategories: 'All Categories',
    exploreAllCategories: 'Explore All Categories',
    categorySoftware: 'Software',
    categoryFrp: 'FRP Rental Tools',
    categoryTools: 'Technical Tools',
    categoryCreative: 'Creative Packs',
    categoryTrending: 'Popular Collections',
    trustAccess: 'Product Access',
    trustAccessDesc: 'Available after payment is verified',
    trustDoku: 'DOKU Payment',
    trustDokuDesc: 'Payment status is processed automatically',
    trustDownload: 'Digital Download',
    trustDownloadDesc: 'Link is available after full payment',
    trustNoAccount: 'No Account Needed',
    trustNoAccountDesc: 'Checkout uses your email address',
    footerExplore: 'Explore',
    footerTrending: 'Trending Now',
    footerCategories: 'Browse Categories',
    footerFeatured: 'Featured Collection',
    footerHowItWorks: 'How It Works',
    footerProducts: 'Products',
    footerSoftware: 'Software',
    footerTools: 'Technical Tools',
    productsTitle: 'Featured Products',
    productsSubtitle: 'Technical tools, design software, and digital forensics software.',
    viewAllProducts: 'View All Products',
    quickView: 'Quick View',
    tagTechnicalTools: 'Technical Tools',
    tagSoftware: 'Software',
    productDescDzkj: 'Mobile technician tool for viewing device schematics.',
    productDescIsp: 'A mobile technician tool for identifying test points.',
    productDescCad: 'Architecture and engineering design software for civil engineering students and professionals.',
    productDescCellebrite: 'Cellebrite UFED software for digital forensics.',
    buyNow: 'Buy Now',
    viewDetails: 'View Details',
    rentalPill: 'Tool Rental Service',
    rentalTitle: 'Rent FRP Tools and More',
    rentalDescription: 'Access FRP, flashing, unlocking, and technician utility tools with flexible rental options.',
    rentalBenefitUpdated: 'Up-to-date FRP tools',
    rentalBenefitTerms: 'Daily and weekly rentals',
    rentalBenefitSupport: 'Technician support',
    rentalAction: 'Browse Available Tools',
    howToShop: 'How to Shop',
    howToShopDescription: 'Choose a product, pay through DOKU, then download after payment is verified.',
    stepChoose: 'Choose a product',
    stepChooseDesc: 'Review the details and price before continuing.',
    stepPay: 'Pay through DOKU',
    stepPayDesc: 'Complete your payment on the DOKU page.',
    stepDownload: 'Download your product',
    stepDownloadDesc: 'The download link is available after payment is verified.',
    purchaseInfo: 'Purchase Information',
    transparentPrice: 'Transparent pricing',
    transparentPriceDesc: 'See the product price before checkout.',
    guestCheckout: 'Guest checkout',
    guestCheckoutDesc: 'Enter your contact details to begin payment.',
    verifiedPayment: 'Verified payment',
    verifiedPaymentDesc: 'Download access is enabled after payment is confirmed.',
    orderStatus: 'Check order status',
    orderStatusDesc: 'View payment and download status on the order page.',
    articleSectionTitle: 'From the Hub',
    articleSectionDesc: 'Research, updates, and useful insights.',
    viewAllArticles: 'View All Articles',
    readArticle: 'Read article',
    ctaTitle: 'Need tools for your work?',
    ctaDescription: 'Explore the available software and technical tools.',
    footerDescription: 'Software and digital tools for technical needs.',
    footerSupport: 'Support',
    helpFaq: 'Help Center & FAQ',
    commercialLicensing: 'Commercial Licensing',
    downloadHelp: 'Direct Download Help',
    refundPolicy: 'Refund Policy',
    contactSupport: 'Contact Support',
    footerCompany: 'Company',
    aboutCompany: 'About MorgadCyber',
    creatorProgram: 'Creator Program',
    affiliatePartners: 'Affiliates & Partners',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    footerRights: 'All rights reserved.',
    footerTerms: 'Terms',
    footerPrivacy: 'Privacy',
    footerLicenses: 'Licenses',
    footerSecurity: 'Security',
    modalEquipment: 'Equipment:',
    modalFiles: 'Files:',
    modalFormat: 'Format:',
    modalLicense: 'License:',
    modalFormatValue: 'ZIP, EXE, digital files',
    modalLicenseValue: 'Commercial',
    instantPrice: 'Instant Download Price',
    buyDownload: 'Buy & Download Instantly',
    cartTitle: 'Shopping Cart',
    cartEmpty: 'Your cart is empty.',
    cartEmptyAction: 'Choose a product to continue.',
    cartEmptyExtra: 'Browse the catalog and choose a digital product.',
    total: 'Total',
    customerName: 'Full name',
    customerNamePlaceholder: 'Name as shown on your ID',
    customerEmail: 'Email',
    customerPhone: 'Phone number',
    continueDoku: 'Continue to DOKU',
    closeCart: 'Close cart',
    removeItem: 'Remove item',
    paymentSuccess: 'Payment confirmed. Downloading your product...',
    connectingPayment: 'Connecting to DOKU...',
    currencyChanged: 'Currency changed to',
    themeChanged: 'Theme changed to'
  },
  id: {
    navExplore: 'Jelajahi',
    navCategories: 'Kategori',
    navFeatured: 'Unggulan',
    navHowItWorks: 'Cara Kerja',
    categoriesTitle: 'Kategori Produk',
    searchPlaceholder: 'Cari katalog...',
    languageLabel: 'Pilih bahasa',
    searchEmptyTitle: 'Produk tidak ditemukan',
    searchEmptyDescription: 'Coba kata pencarian lain atau lihat semua kategori.',
    headerCta: 'Jelajahi Produk',
    heroBadge: 'Software & Alat',
    heroTitle: 'Alat digital untuk kebutuhan teknis.',
    heroSubtitle: 'Temukan perangkat lunak untuk pekerjaan teknisi ponsel, desain teknis, dan forensik digital.',
    viewProducts: 'Lihat Produk',
    allCategories: 'Semua Kategori',
    exploreAllCategories: 'Lihat Semua Kategori',
    categorySoftware: 'Software',
    categoryFrp: 'Sewa Alat FRP',
    categoryTools: 'Alat Teknisi',
    categoryCreative: 'Paket Kreatif',
    categoryTrending: 'Koleksi Populer',
    trustAccess: 'Akses Produk',
    trustAccessDesc: 'Tersedia setelah pembayaran diverifikasi',
    trustDoku: 'Pembayaran DOKU',
    trustDokuDesc: 'Status pembayaran diproses otomatis',
    trustDownload: 'Unduhan Digital',
    trustDownloadDesc: 'Tautan tersedia setelah pembayaran lunas',
    trustNoAccount: 'Tanpa Akun',
    trustNoAccountDesc: 'Checkout memakai email Anda',
    footerExplore: 'Jelajahi',
    footerTrending: 'Sedang Tren',
    footerCategories: 'Kategori',
    footerFeatured: 'Koleksi Unggulan',
    footerHowItWorks: 'Cara Kerja',
    footerProducts: 'Produk',
    footerSoftware: 'Software',
    footerTools: 'Alat Teknisi',
    productsTitle: 'Produk Pilihan',
    productsSubtitle: 'Alat teknisi, perangkat lunak desain, dan perangkat lunak forensik digital.',
    viewAllProducts: 'Lihat Semua Produk',
    quickView: 'Pratinjau Cepat',
    tagTechnicalTools: 'Alat Teknisi',
    tagSoftware: 'Software',
    productDescDzkj: 'Alat teknisi ponsel untuk melihat skema perangkat.',
    productDescIsp: 'Alat teknisi ponsel untuk menemukan titik tes.',
    productDescCad: 'Perangkat lunak desain arsitektur dan teknik untuk mahasiswa serta profesional teknik sipil.',
    productDescCellebrite: 'Perangkat lunak Cellebrite UFED untuk forensik digital.',
    buyNow: 'Beli Sekarang',
    viewDetails: 'Lihat Detail',
    rentalPill: 'Layanan Sewa Tools',
    rentalTitle: 'Sewa Tools FRP dan Lainnya',
    rentalDescription: 'Akses tools FRP, flashing, unlock, dan utilitas teknisi dengan pilihan sewa yang fleksibel.',
    rentalBenefitUpdated: 'Tools FRP terbaru',
    rentalBenefitTerms: 'Sewa harian dan mingguan',
    rentalBenefitSupport: 'Dukungan teknisi',
    rentalAction: 'Lihat Daftar Tools',
    howToShop: 'Cara Belanja',
    howToShopDescription: 'Pilih produk, bayar melalui DOKU, lalu unduh setelah pembayaran terverifikasi.',
    stepChoose: 'Pilih produk',
    stepChooseDesc: 'Periksa detail dan harga sebelum melanjutkan.',
    stepPay: 'Bayar melalui DOKU',
    stepPayDesc: 'Selesaikan pembayaran pada halaman DOKU.',
    stepDownload: 'Unduh produk',
    stepDownloadDesc: 'Tautan unduhan tersedia setelah pembayaran terverifikasi.',
    purchaseInfo: 'Informasi Pembelian',
    transparentPrice: 'Harga transparan',
    transparentPriceDesc: 'Harga produk terlihat sebelum checkout.',
    guestCheckout: 'Checkout tanpa akun',
    guestCheckoutDesc: 'Isi detail kontak untuk memulai pembayaran.',
    verifiedPayment: 'Pembayaran terverifikasi',
    verifiedPaymentDesc: 'Akses unduhan dibuka setelah pembayaran dikonfirmasi.',
    orderStatus: 'Cek status pesanan',
    orderStatusDesc: 'Lihat status pembayaran dan unduhan dari halaman pesanan.',
    articleSectionTitle: 'Wawasan dan Artikel',
    articleSectionDesc: 'Riset, kabar terbaru, dan wawasan bermanfaat.',
    viewAllArticles: 'Lihat Semua Artikel',
    readArticle: 'Baca artikel',
    ctaTitle: 'Butuh tools untuk pekerjaan Anda?',
    ctaDescription: 'Jelajahi software dan alat teknisi yang tersedia.',
    footerDescription: 'Software dan alat digital untuk kebutuhan teknis.',
    footerSupport: 'Dukungan',
    helpFaq: 'Pusat Bantuan & FAQ',
    commercialLicensing: 'Lisensi Komersial',
    downloadHelp: 'Bantuan Unduhan Langsung',
    refundPolicy: 'Kebijakan Pengembalian Dana',
    contactSupport: 'Hubungi Dukungan',
    footerCompany: 'Perusahaan',
    aboutCompany: 'Tentang MorgadCyber',
    creatorProgram: 'Program Kreator',
    affiliatePartners: 'Afiliasi & Mitra',
    termsOfService: 'Ketentuan Layanan',
    privacyPolicy: 'Kebijakan Privasi',
    footerRights: 'Hak cipta dilindungi.',
    footerTerms: 'Ketentuan',
    footerPrivacy: 'Privasi',
    footerLicenses: 'Lisensi',
    footerSecurity: 'Keamanan',
    modalEquipment: 'Perangkat:',
    modalFiles: 'Berkas:',
    modalFormat: 'Format:',
    modalLicense: 'Lisensi:',
    modalFormatValue: 'ZIP, EXE, berkas digital',
    modalLicenseValue: 'Komersial',
    instantPrice: 'Harga Unduhan Instan',
    buyDownload: 'Beli & Unduh Sekarang',
    cartTitle: 'Keranjang Belanja',
    cartEmpty: 'Keranjang Anda masih kosong.',
    cartEmptyAction: 'Pilih produk untuk melanjutkan.',
    cartEmptyExtra: 'Jelajahi katalog dan pilih produk digital.',
    total: 'Total',
    customerName: 'Nama lengkap',
    customerNamePlaceholder: 'Nama sesuai identitas',
    customerEmail: 'Email',
    customerPhone: 'Nomor telepon',
    continueDoku: 'Lanjutkan ke DOKU',
    closeCart: 'Tutup keranjang',
    removeItem: 'Hapus item',
    paymentSuccess: 'Pembayaran terverifikasi. Produk sedang diunduh...',
    connectingPayment: 'Menghubungkan ke DOKU...',
    currencyChanged: 'Mata uang diubah ke',
    themeChanged: 'Tema diubah ke'
  },
  zh: {
    navExplore: '探索',
    navCategories: '分类',
    navFeatured: '精选',
    navHowItWorks: '使用方式',
    categoriesTitle: '产品分类',
    searchPlaceholder: '搜索目录...',
    languageLabel: '选择语言',
    searchEmptyTitle: '未找到产品',
    searchEmptyDescription: '请尝试其他搜索词，或浏览全部分类。',
    headerCta: '探索产品',
    heroBadge: '软件与工具',
    heroTitle: '适用于技术需求的数字工具。',
    heroSubtitle: '查找适用于手机维修、技术设计和数字取证的软件。',
    viewProducts: '查看产品',
    allCategories: '全部分类',
    exploreAllCategories: '浏览全部分类',
    categorySoftware: '软件',
    categoryFrp: 'FRP租赁工具',
    categoryTools: '技术工具',
    categoryCreative: '创意包',
    categoryTrending: '热门合集',
    trustAccess: '产品访问',
    trustAccessDesc: '付款验证后即可使用',
    trustDoku: 'DOKU支付',
    trustDokuDesc: '付款状态会自动处理',
    trustDownload: '数字下载',
    trustDownloadDesc: '全额付款后可获取链接',
    trustNoAccount: '无需账户',
    trustNoAccountDesc: '结账时使用您的邮箱',
    footerExplore: '探索',
    footerTrending: '热门推荐',
    footerCategories: '浏览分类',
    footerFeatured: '精选合集',
    footerHowItWorks: '使用方式',
    footerProducts: '产品',
    footerSoftware: '软件',
    footerTools: '技术工具',
    productsTitle: '精选产品',
    productsSubtitle: '维修工具、设计软件和数字取证软件。',
    viewAllProducts: '查看全部产品',
    quickView: '快速预览',
    tagTechnicalTools: '技术工具',
    tagSoftware: '软件',
    productDescDzkj: '用于查看设备原理图的手机维修工具。',
    productDescIsp: '用于查找测试点的手机维修工具。',
    productDescCad: '面向土木工程学生和专业人士的建筑与工程设计软件。',
    productDescCellebrite: '用于数字取证的 Cellebrite UFED 软件。',
    buyNow: '立即购买',
    viewDetails: '查看详情',
    rentalPill: '工具租赁服务',
    rentalTitle: '租用 FRP 工具及其他工具',
    rentalDescription: '灵活租用 FRP、刷机、解锁和维修辅助工具。',
    rentalBenefitUpdated: '最新 FRP 工具',
    rentalBenefitTerms: '按天或按周租用',
    rentalBenefitSupport: '技术人员支持',
    rentalAction: '查看可用工具',
    howToShop: '购物流程',
    howToShopDescription: '选择产品，通过 DOKU 付款，验证成功后即可下载。',
    stepChoose: '选择产品',
    stepChooseDesc: '继续前请查看产品详情和价格。',
    stepPay: '通过 DOKU 付款',
    stepPayDesc: '在 DOKU 页面完成付款。',
    stepDownload: '下载产品',
    stepDownloadDesc: '付款验证后即可获取下载链接。',
    purchaseInfo: '购买信息',
    transparentPrice: '价格透明',
    transparentPriceDesc: '结账前即可查看产品价格。',
    guestCheckout: '无需账户结账',
    guestCheckoutDesc: '填写联系方式即可开始付款。',
    verifiedPayment: '付款已验证',
    verifiedPaymentDesc: '确认付款后将开放下载权限。',
    orderStatus: '查询订单状态',
    orderStatusDesc: '在订单页面查看付款和下载状态。',
    articleSectionTitle: '平台文章',
    articleSectionDesc: '研究、更新和实用见解。',
    viewAllArticles: '查看全部文章',
    readArticle: '阅读文章',
    ctaTitle: '工作需要工具吗？',
    ctaDescription: '浏览可用的软件和技术工具。',
    footerDescription: '满足技术需求的软件和数字工具。',
    footerSupport: '支持',
    helpFaq: '帮助中心与常见问题',
    commercialLicensing: '商业许可',
    downloadHelp: '直接下载帮助',
    refundPolicy: '退款政策',
    contactSupport: '联系支持',
    footerCompany: '公司',
    aboutCompany: '关于 MorgadCyber',
    creatorProgram: '创作者计划',
    affiliatePartners: '联盟与合作伙伴',
    termsOfService: '服务条款',
    privacyPolicy: '隐私政策',
    footerRights: '版权所有。',
    footerTerms: '条款',
    footerPrivacy: '隐私',
    footerLicenses: '许可',
    footerSecurity: '安全',
    modalEquipment: '设备：',
    modalFiles: '文件：',
    modalFormat: '格式：',
    modalLicense: '许可：',
    modalFormatValue: 'ZIP、EXE、数字文件',
    modalLicenseValue: '商业用途',
    instantPrice: '即时下载价格',
    buyDownload: '立即购买并下载',
    cartTitle: '购物车',
    cartEmpty: '购物车还是空的。',
    cartEmptyAction: '选择产品以继续。',
    cartEmptyExtra: '浏览目录并选择数字产品。',
    total: '总计',
    customerName: '姓名',
    customerNamePlaceholder: '填写证件上的姓名',
    customerEmail: '电子邮箱',
    customerPhone: '电话号码',
    continueDoku: '前往 DOKU 付款',
    closeCart: '关闭购物车',
    removeItem: '移除商品',
    paymentSuccess: '付款已确认，正在下载产品...',
    connectingPayment: '正在连接 DOKU...',
    currencyChanged: '货币已切换为',
    themeChanged: '主题已切换为'
  }
};

const bundledArticleTranslations = {
  'sinta-1-strategi-publikasi-jurnal-bereputasi': {
    en: { title: 'Sinta 1: A Strategy for Publishing in Reputable Journals', summary: 'A practical guide to preparing a strong research paper for accredited national journals and improving its visibility in Sinta.' },
    zh: { title: 'Sinta 1：在高声誉期刊发表研究的策略', summary: '实用指南，帮助研究者为国家认证期刊准备高质量论文，并提升其在 Sinta 平台上的可见度。' }
  },
  'sinta-2-panduan-meningkatkan-indeks-jurnal': {
    en: { title: 'Sinta 2: A Guide to Improving Journal Indexing', summary: 'Ways to improve journal quality, grow citations, and maintain consistent publication standards.' },
    zh: { title: 'Sinta 2：提升期刊索引的指南', summary: '介绍如何提升期刊质量、增加引用并保持稳定的出版标准。' }
  },
  'sinta-3-bibliometrik-dan-pemetaan-penelitian': {
    en: { title: 'Sinta 3: Bibliometrics and Research Mapping', summary: 'Bibliometric analysis helps reveal research trends, field strengths, and emerging directions for publication.' },
    zh: { title: 'Sinta 3：文献计量与研究图谱', summary: '文献计量分析有助于了解研究趋势、领域优势以及出版方向的变化。' }
  },
  'sinta-4-profil-penulis-dan-kinerja-publikasi': {
    en: { title: 'Sinta 4: Author Profiles and Publication Performance', summary: 'Strong author profiles improve institutional reputation, research visibility, and opportunities for collaboration.' },
    zh: { title: 'Sinta 4：作者档案与出版表现', summary: '完善的作者档案有助于提升机构声誉、研究可见度和合作机会。' }
  },
  'sinta-5-optimasi-riset-untuk-akreditasi': {
    en: { title: 'Sinta 5: Optimizing Research for Accreditation', summary: 'Well-documented, sustained research supports accreditation and strengthens an institution’s academic reputation.' },
    zh: { title: 'Sinta 5：优化研究以支持认证', summary: '完善记录并持续开展研究，有助于通过认证并提升机构的学术声誉。' }
  }
};

const articleCategoryTranslations = {
  Research: { en: 'Research', id: 'Riset', zh: '研究' },
  Publication: { en: 'Publication', id: 'Publikasi', zh: '出版' },
  Insights: { en: 'Insights', id: 'Wawasan', zh: '见解' },
  Academic: { en: 'Academic', id: 'Akademik', zh: '学术' },
  Strategy: { en: 'Strategy', id: 'Strategi', zh: '策略' }
};

const productSpecTranslations = {
  en: {
    'prod-1': ['Executable tool', 'EXE file + license'],
    'prod-2': ['6K UHD (6000x4000)', '110+ reference files'],
    'prod-3': ['Design software + license', '95+ design resources'],
    'prod-4': ['Windows application', 'Software + license']
  },
  id: {
    'prod-1': ['Aplikasi EXE', 'Berkas EXE + lisensi'],
    'prod-2': ['6K UHD (6000x4000)', '110+ berkas referensi'],
    'prod-3': ['Perangkat lunak desain + lisensi', '95+ sumber daya desain'],
    'prod-4': ['Aplikasi Windows', 'Perangkat lunak + lisensi']
  },
  zh: {
    'prod-1': ['可执行工具', 'EXE 文件 + 许可证'],
    'prod-2': ['6K UHD (6000x4000)', '110+ 个参考文件'],
    'prod-3': ['设计软件 + 许可证', '95+ 个设计资源'],
    'prod-4': ['Windows 应用程序', '软件 + 许可证']
  }
};

function translate(key) {
  return translations[state.language]?.[key] || translations.en[key] || key;
}

function applyLanguage(language = state.language) {
  const current = translations[language] || translations.en;
  const translatedText = document.querySelectorAll('[data-i18n]');
  translatedText.forEach(node => {
    const key = node.dataset.i18n;
    if (current[key]) {
      node.textContent = current[key];
    }
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(node => {
    const label = current[node.dataset.i18nAriaLabel];
    if (label) node.setAttribute('aria-label', label);
  });
  document.getElementById('languageCurrent')?.setAttribute('aria-label', current.languageLabel);

  document.querySelectorAll('.article-link').forEach(node => {
    node.textContent = current.readArticle || translations.en.readArticle;
  });

  const placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderNodes.forEach(node => {
    const key = node.dataset.i18nPlaceholder;
    if (current[key]) {
      node.placeholder = current[key];
    }
  });

  const languageOptions = document.querySelectorAll('.lang-option');
  languageOptions.forEach(button => {
    const isActive = button.dataset.lang === language;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-checked', String(isActive));
  });

  const currentFlag = document.getElementById('currentLanguageFlag');
  if (currentFlag) currentFlag.setAttribute('href', `#flag-${language in translations ? language : 'en'}`);
  const currencyCodes = { en: 'USD', id: 'IDR', zh: 'CNY' };
  const currentCurrencyCode = document.getElementById('currentCurrencyCode');
  if (currentCurrencyCode) currentCurrencyCode.textContent = currencyCodes[language] || 'USD';

  document.documentElement.lang = language === 'zh' ? 'zh' : language === 'id' ? 'id' : 'en';
  state.language = language;
  localStorage.setItem('preferred_language', language);
  const languageCurrency = { en: 'USD', id: 'IDR', zh: 'CNY' }[language] || 'USD';
  setCurrency(languageCurrency, false);
  updateCartUI();
  if (activeModalProdId) openProductQuickView(activeModalProdId);
  loadPublishedArticles();
}

function initLanguageSwitcher() {
  const switcher = document.getElementById('languageSwitcher');
  const currentButton = document.getElementById('languageCurrent');
  const menu = document.getElementById('languageMenu');
  const languageOptions = document.querySelectorAll('.lang-option');
  if (!switcher || !currentButton || !menu || !languageOptions.length) return;

  const closeMenu = () => {
    menu.hidden = true;
    currentButton.setAttribute('aria-expanded', 'false');
  };

  currentButton.addEventListener('click', () => {
    const isOpen = currentButton.getAttribute('aria-expanded') === 'true';
    currentButton.setAttribute('aria-expanded', String(!isOpen));
    menu.hidden = isOpen;
  });

  languageOptions.forEach(button => {
    button.addEventListener('click', () => {
      applyLanguage(button.dataset.lang);
      closeMenu();
      currentButton.focus();
    });
  });

  document.addEventListener('click', event => {
    if (!switcher.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu();
      currentButton.focus();
    }
  });
}

// DOM Elements
const cartToggleBtn = document.getElementById('cartToggleBtn');
const cartCountBadge = document.getElementById('cartCountBadge');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalSum = document.getElementById('cartTotalSum');
const toastContainer = document.getElementById('toastContainer');
const catalogSearchInput = document.getElementById('catalogSearchInput');
const productModal = document.getElementById('productModal');
const siteHeader = document.getElementById('siteHeader');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const currencySwitcher = document.getElementById('currencySwitcher');

// Quick View Modal Elements
const modalImg = document.getElementById('modalImg');
const modalTag = document.getElementById('modalTag');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalRes = document.getElementById('modalRes');
const modalFiles = document.getElementById('modalFiles');
const modalPrice = document.getElementById('modalPrice');
const modalBuyBtn = document.getElementById('modalBuyBtn');

let activeModalProdId = null;

/**
 * Currency and Theme Functions
 */
function formatPrice(amount, currency = state.currency) {
  if (currency === 'USD') {
    return '$' + Number(amount).toFixed(2);
  }
  if (currency === 'CNY') {
    return '¥' + Number(amount).toFixed(2);
  }
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function getItemPrice(item, currency = state.currency) {
  const idrPrice = item.priceIDR ?? (item.priceUSD ? item.priceUSD * 15000 : item.price * 15000);
  if (currency === 'USD') return idrPrice / 15000;
  if (currency === 'CNY') return idrPrice / 2200;
  return idrPrice;
}

function setCurrency(newCurrency, notify = true) {
  if (!['IDR', 'USD', 'CNY'].includes(newCurrency)) return;
  state.currency = newCurrency;
  localStorage.setItem('preferred_currency', newCurrency);

  // Update switcher buttons
  if (currencySwitcher) {
    currencySwitcher.querySelectorAll('.currency-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-currency') === newCurrency);
    });
  }

  // Update product cards in the grid
  document.querySelectorAll('#trendingProductGrid .product-card').forEach(card => {
    const id = card.getAttribute('data-id');
    const prod = PRODUCTS_DATA[id];
    const priceEl = card.querySelector('.product-price');
    if (priceEl && prod) {
      priceEl.textContent = formatPrice(getItemPrice(prod, newCurrency), newCurrency);
    }
  });

  // Update modal if open
  if (activeModalProdId && PRODUCTS_DATA[activeModalProdId]) {
    const prod = PRODUCTS_DATA[activeModalProdId];
    modalPrice.textContent = formatPrice(getItemPrice(prod, newCurrency), newCurrency);
  }

  // Update cart UI
  updateCartUI();
  if (notify) showToast(`${translate('currencyChanged')} ${newCurrency}`);
}

function setTheme(newTheme) {
  state.theme = newTheme;
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('preferred_theme', newTheme);
  showToast(`${translate('themeChanged')} ${newTheme === 'dark' ? 'Dark' : 'Light'}`);
}

function initThemeAndCurrency() {
  // Apply saved theme
  document.documentElement.setAttribute('data-theme', state.theme);

  // Attach theme toggle
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
    });
  }

  // Attach currency switcher
  if (currencySwitcher) {
    currencySwitcher.querySelectorAll('.currency-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-currency') === state.currency);
      btn.addEventListener('click', () => {
        const cur = btn.getAttribute('data-currency');
        if (cur !== state.currency) {
          setCurrency(cur);
        }
      });
    });
  }

  // Initial price update
  setCurrency(state.currency);
}

// Header Scroll Effect
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    siteHeader.classList.add('scrolled');
  } else {
    siteHeader.classList.remove('scrolled');
  }
});

/**
 * Toast Notification System
 */
function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';

  toast.innerHTML = `
    <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span class="toast-text">${message}</span>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

let activePaymentPollingTimer = null;

function getCheckoutCustomer() {
  const form = document.getElementById('checkoutCustomerForm');
  if (!form || !form.reportValidity()) return null;
  return {
    customer_name: form.elements.name.value.trim(),
    customer_email: form.elements.email.value.trim(),
    customer_phone: form.elements.phone.value.trim(),
  };
}

async function requestDokuCheckout(productId, customer) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, ...customer }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Checkout DOKU gagal dibuat.');
  const returnedUrl = data.checkout_url || data.response?.payment?.url || data.data?.url;
  if (!returnedUrl) throw new Error('DOKU tidak memberikan URL pembayaran.');
  const checkoutUrl = new URL(returnedUrl);
  if (checkoutUrl.protocol !== 'https:') throw new Error('URL checkout DOKU tidak valid.');
  return { ...data, checkout_url: checkoutUrl.href };
}

function launchDokuCheckout(checkout, customer) {
  const checkoutUrl = checkout.checkout_url
    || checkout.response?.payment?.url
    || checkout.data?.url;
  if (!checkoutUrl || typeof window.loadJokulCheckout !== 'function') {
    throw new Error('SDK atau URL Checkout DOKU tidak tersedia.');
  }
  window.loadJokulCheckout(checkoutUrl);
  startDokuPaymentPolling(checkout.invoice_id || checkout.response?.order?.invoice_number, customer.customer_email);
}

function startDokuPaymentPolling(invoiceId, customerEmail) {
  if (activePaymentPollingTimer) clearInterval(activePaymentPollingTimer);
  let requestInProgress = false;

  const poll = async () => {
    if (requestInProgress) return;
    requestInProgress = true;
    try {
      const query = new URLSearchParams({ invoice_id: invoiceId, email: customerEmail });
      const response = await fetch(`/api/check-status?${query}`);
      const data = await response.json();
      if (!response.ok) return;
      const status = String(data.payment_status || '').toUpperCase();
      if (!['SUCCESS', 'PAID', 'COMPLETED'].includes(status)) return;

      if (activePaymentPollingTimer) {
        clearInterval(activePaymentPollingTimer);
        activePaymentPollingTimer = null;
      }
      showToast(translate('paymentSuccess'));
      if (data.download_url) {
        const downloadUrl = new URL(data.download_url, window.location.origin);
        if (downloadUrl.origin !== window.location.origin) throw new Error('URL unduhan tidak valid.');
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl.href;
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
      }
    } catch (error) {
      console.error('DOKU payment status polling failed:', error);
    } finally {
      requestInProgress = false;
    }
  };

  poll();
  activePaymentPollingTimer = setInterval(poll, 3000);
}

function resolveProductImageUrl(imageUrl) {
  const candidate = (imageUrl || '').trim();
  if (!candidate) return '/assets/img/logo.png';
  if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('/')) {
    return candidate;
  }
  return `/${candidate.replace(/^\//, '')}`;
}

function attachProductImageFallback(imgEl, fallbackPath = '/assets/img/logo.png') {
  if (!imgEl) return;
  imgEl.onerror = () => {
    if (imgEl.dataset.fallbackApplied === 'true') return;
    imgEl.dataset.fallbackApplied = 'true';
    imgEl.src = fallbackPath;
    imgEl.onerror = null;
  };
}

function safeProductImageSource(product, fallbackPath = '/assets/img/logo.png') {
  const value = product && (product.image_path || product.image || '');
  const candidate = typeof value === 'string' ? value.trim() : '';
  return candidate || fallbackPath;
}

function renderProductImageElement(product, fallbackPath = '/assets/img/logo.png') {
  const imagePath = safeProductImageSource(product, fallbackPath);
  const altText = product ? (product.name || product.title || 'Product image') : 'Product image';
  return `<img src="${product && product.image_path ? product.image_path : imagePath}" onerror="this.src='${fallbackPath}'; this.onerror=null;" alt="${altText}">`;
}

/**
 * Cart Management
 */
function toggleCartDrawer() {
  cartDrawer.classList.toggle('active');
  cartBackdrop.classList.toggle('active');
}

if (cartToggleBtn) {
  cartToggleBtn.addEventListener('click', toggleCartDrawer);
}

async function handleBuyNow(productId) {
  if (!PRODUCTS_DATA[productId]) return;
  const existingItem = state.cart.find(item => item.id === productId);
  if (existingItem) existingItem.qty += 1;
  else state.cart.push({ ...PRODUCTS_DATA[productId], qty: 1 });
  updateCartUI();
  if (!cartDrawer.classList.contains('active')) toggleCartDrawer();
  document.querySelector('#checkoutCustomerForm [name="name"]')?.focus();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.id !== productId);
  updateCartUI();
}

function updateCartUI() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.qty, 0);
  cartCountBadge.textContent = totalCount;

  if (state.cart.length === 0) {
    cartItemsList.innerHTML = `
      <div style="text-align: center; margin-top: 50px; color: var(--color-text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px auto; opacity: 0.5;">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-text-secondary);">${translate('cartEmpty')}</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">${translate('cartEmptyExtra')}</p>
      </div>
    `;
    cartTotalSum.textContent = formatPrice(0, state.currency);
    return;
  }

  let totalSum = 0;
  cartItemsList.innerHTML = state.cart.map(item => {
    const unitPrice = getItemPrice(item, state.currency);
    const itemTotal = unitPrice * item.qty;
    totalSum += itemTotal;
    return `
      <div class="cart-item">
        <img src="${resolveProductImageUrl(item.image)}" alt="${item.title}" class="cart-item-img" onerror="this.src='/assets/img/logo.png'; this.onerror=null;">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.title}</div>
          <div class="cart-item-price">${formatPrice(unitPrice, state.currency)} &times; ${item.qty}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="${translate('removeItem')}" aria-label="${translate('removeItem')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  cartTotalSum.textContent = formatPrice(totalSum, state.currency);
}

async function handleCheckout() {
  if (state.cart.length === 0) {
    showToast(translate('cartEmptyAction'));
    return;
  }

  const primaryItem = state.cart[0];
  const customer = getCheckoutCustomer();
  if (!customer) return;

  try {
    showToast(translate('connectingPayment'));
    const checkout = await requestDokuCheckout(primaryItem.id, customer);

    state.cart = [];
    updateCartUI();
    if (cartDrawer.classList.contains('active')) toggleCartDrawer();
    launchDokuCheckout(checkout, customer);
  } catch (err) {
    showToast(`Checkout error: ${err.message}`, 'error');
  }
}

/**
 * Quick View Modal
 */
function openProductQuickView(productId) {
  const product = PRODUCTS_DATA[productId];
  if (!product) return;

  activeModalProdId = productId;
  modalImg.src = resolveProductImageUrl(product.image);
  modalImg.alt = product.title;
  attachProductImageFallback(modalImg);
  modalTag.textContent = product.category === 'Software' ? translate('tagSoftware') : product.tag;
  modalTitle.textContent = product.title;
  const descriptionKeys = {
    'prod-1': 'productDescDzkj',
    'prod-2': 'productDescIsp',
    'prod-3': 'productDescCad',
    'prod-4': 'productDescCellebrite'
  };
  modalDesc.textContent = descriptionKeys[productId] ? translate(descriptionKeys[productId]) : product.desc;
  const localizedSpecs = productSpecTranslations[state.language]?.[productId];
  modalRes.textContent = localizedSpecs?.[0] || product.resolution;
  modalFiles.textContent = localizedSpecs?.[1] || product.files;
  modalPrice.textContent = formatPrice(getItemPrice(product, state.currency), state.currency);

  modalBuyBtn.onclick = () => {
    closeProductModal();
    handleBuyNow(productId);
  };

  productModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  productModal.classList.remove('active');
  document.body.style.overflow = '';
  activeModalProdId = null;
}

// Close modal on click outside
if (productModal) {
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) {
      closeProductModal();
    }
  });
}

// Keyboard shortcuts (ESC to close modals)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (productModal.classList.contains('active')) closeProductModal();
    if (cartDrawer.classList.contains('active')) toggleCartDrawer();
  }
});

/**
 * Category Filter & Search
 */
function filterByCategory(categoryKey, element) {
  const allTiles = document.querySelectorAll('.category-tile');

  if (state.activeCategory === categoryKey) {
    // Deselect
    state.activeCategory = null;
    allTiles.forEach(tile => tile.classList.remove('active'));
    showToast('Showing all categories');
  } else {
    // Select
    state.activeCategory = categoryKey;
    allTiles.forEach(tile => tile.classList.remove('active'));
    if (element) element.classList.add('active');
    showToast(`Filtering by "${categoryKey}"`);
  }

  applyProductFilters();

  // Scroll smoothly to products section
  const trendingSection = document.getElementById('trending');
  if (trendingSection) {
    trendingSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function applyProductFilters() {
  const productCards = document.querySelectorAll('#trendingProductGrid .product-card');
  const emptyState = document.getElementById('catalogEmptyState');
  let visibleCount = 0;

  productCards.forEach(card => {
    const cardCategory = card.getAttribute('data-category');
    const cardTitle = card.querySelector('.product-title').textContent.toLowerCase();
    const cardTag = card.querySelector('.product-tag').textContent.toLowerCase();
    const cardDescription = card.querySelector('.product-desc')?.textContent.toLowerCase() || '';

    const matchesCategory = !state.activeCategory || cardCategory === state.activeCategory || state.activeCategory === 'trending';
    const matchesSearch = !state.searchQuery || cardTitle.includes(state.searchQuery) || cardTag.includes(state.searchQuery) || cardDescription.includes(state.searchQuery) || cardCategory.includes(state.searchQuery);

    if (matchesCategory && matchesSearch) {
      visibleCount += 1;
      card.style.display = 'flex';
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
    } else {
      card.style.display = 'none';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
    }
  });

  if (emptyState) emptyState.hidden = visibleCount !== 0;
}

// Search Input Listener
if (catalogSearchInput) {
  catalogSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    applyProductFilters();
  });

  catalogSearchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && catalogSearchInput.value.trim()) {
      document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

async function loadPublishedArticles() {
  const section = document.getElementById('articles');
  if (!section) return;

  try {
    const response = await fetch('/api/articles');
    const data = await response.json();
    const articles = response.ok && Array.isArray(data.articles) ? data.articles.slice(0, 3) : [];
    if (!articles.length) {
      section.remove();
      return;
    }

    const grid = section.querySelector('.article-grid-3');
    const cards = articles.map(article => {
      const card = document.createElement('a');
      card.className = 'article-card';
      card.href = `/baca-artikel.html?id=${encodeURIComponent(article.slug)}`;

      const imageContainer = document.createElement('div');
      imageContainer.className = 'article-image-container';
      const image = document.createElement('img');
      image.className = 'article-image';
      image.alt = article.title || 'Artikel MorgadCyber';
      image.loading = 'lazy';
      image.onerror = () => { image.src = '/assets/img/logo.png'; };
      try {
        const imageUrl = new URL(article.image_url || '/assets/img/logo.png', window.location.origin);
        image.src = imageUrl.protocol === 'https:' || imageUrl.origin === window.location.origin
          ? imageUrl.href
          : '/assets/img/logo.png';
      } catch {
        image.src = '/assets/img/logo.png';
      }
      imageContainer.appendChild(image);

      const body = document.createElement('div');
      body.className = 'article-body';
      const meta = document.createElement('div');
      meta.className = 'article-meta';
      const category = document.createElement('span');
      category.className = 'article-tag';
      const categoryTranslation = articleCategoryTranslations[article.category];
      category.textContent = categoryTranslation?.[state.language] || article.category || 'Article';
      meta.appendChild(category);
      if (article.published_at) {
        const date = new Date(article.published_at);
        if (!Number.isNaN(date.getTime())) {
          const dateLabel = document.createElement('span');
          dateLabel.className = 'article-date';
          const locales = { en: 'en-US', id: 'id-ID', zh: 'zh-CN' };
          dateLabel.textContent = date.toLocaleDateString(locales[state.language] || 'en-US');
          meta.appendChild(dateLabel);
        }
      }

      const title = document.createElement('h3');
      title.className = 'article-title';
      const localizedArticle = bundledArticleTranslations[article.slug]?.[state.language];
      title.textContent = localizedArticle?.title || article.title || '';
      const summary = document.createElement('p');
      summary.className = 'article-summary';
      summary.textContent = localizedArticle?.summary || article.summary || '';
      const linkLabel = document.createElement('span');
      linkLabel.className = 'article-link';
      linkLabel.textContent = translate('readArticle');

      body.append(meta, title, summary, linkLabel);
      card.append(imageContainer, body);
      return card;
    });

    grid.replaceChildren(...cards);
    section.hidden = false;
  } catch {
    section.remove();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initThemeAndCurrency();
  initLanguageSwitcher();
  applyLanguage(state.language);
  updateCartUI();
  applyProductFilters();
  loadPublishedArticles();

  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const sections = [...navLinks]
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  const updateActiveNav = entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(updateActiveNav, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }
  console.log('MorgadCyber marketplace initialized successfully.');
});
