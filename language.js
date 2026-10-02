(() => {
  const flags = {
    en: '<svg class="language-flag" viewBox="0 0 24 16" aria-hidden="true"><rect width="24" height="16" fill="#fff"/><path fill="#b22234" d="M0 0h24v1.2H0zm0 2.4h24v1.2H0zm0 2.4h24V7H0zm0 2.4h24v1.2H0zm0 2.4h24v1.2H0zm0 2.4h24v1.2H0zm0 2.4h24V16H0z"/><path fill="#3c3b6e" d="M0 0h10.5v8.8H0z"/><g fill="#fff"><circle cx="2" cy="2" r=".45"/><circle cx="5" cy="2" r=".45"/><circle cx="8" cy="2" r=".45"/><circle cx="3.5" cy="4.3" r=".45"/><circle cx="6.5" cy="4.3" r=".45"/><circle cx="2" cy="6.6" r=".45"/><circle cx="5" cy="6.6" r=".45"/><circle cx="8" cy="6.6" r=".45"/></g></svg>',
    zh: '<svg class="language-flag" viewBox="0 0 24 16" aria-hidden="true"><rect width="24" height="16" fill="#de2910"/><path fill="#ffde00" d="m4 2 1 2.5 2.7.1-2.1 1.7.8 2.6L4 7.4l-2.3 1.5.8-2.6-2.1-1.7 2.7-.1z"/><circle cx="9" cy="2.2" r=".6" fill="#ffde00"/><circle cx="11" cy="4" r=".6" fill="#ffde00"/><circle cx="11" cy="6.5" r=".6" fill="#ffde00"/><circle cx="9" cy="8.5" r=".6" fill="#ffde00"/></svg>',
    id: '<svg class="language-flag" viewBox="0 0 24 16" aria-hidden="true"><rect width="24" height="8" fill="#ce1126"/><rect y="8" width="24" height="8" fill="#fff"/></svg>'
  }
  const languageCurrencies = { en: 'USD', zh: 'CNY', id: 'IDR' }

  const dictionaries = {
    en: {
      languageLabel: 'Select language', home: 'Home', explore: 'Explore', categories: 'Categories', checkOrder: 'Check Order', articles: 'Articles', rental: 'Tool Rental', exploreProducts: 'Explore Products',
      categoryKicker: 'MorgadCyber Catalog', digitalProducts: 'Digital Products', categoryIntro: 'Browse software and digital tools. Payments are securely processed through DOKU. No account required.', allProducts: 'All products', searchCategories: 'Search categories...', checkMyOrder: 'Check My Order', sortNewest: 'Sort: Newest', sortPriceLow: 'Price: Low to High', sortPriceHigh: 'Price: High to Low', sortName: 'Name: A to Z', loadingProducts: 'Loading products...', productsCount: 'Showing {start}-{end} of {total} products', productsCountEmpty: 'Showing 0 of {total} products', productNotFound: 'No products found', tryCategorySearch: 'Try another category or change your search.', resetFilters: 'Reset filters', productImageMissing: 'Product image unavailable', buyNow: 'Buy Now', viewDetails: 'View Details', previous: 'Previous', next: 'Next', footerDescription: 'Software and digital tools for technical needs.', marketplace: 'Marketplace', allCategories: 'All Categories', trackOrder: 'Track Order', admin: 'Admin', rights: 'All rights reserved.',
      productDetails: 'Product details', fullName: 'Full name', namePlaceholder: 'Name as shown on your ID', email: 'Email', phone: 'Phone number', phonePlaceholder: 'Phone number', continueDoku: 'Continue to DOKU', closeProduct: 'Close product details', selectCurrency: 'Display currency', sortProducts: 'Sort products', categoryFilter: 'Product categories',
      rentalEyebrow: 'Morgad Tools Rental', rentalTitle: 'Rent FRP and Other Technician Tools', rentalIntro: 'Use tools as needed without purchasing a full license. FRP, flashing, unlocking, and technician utilities are available for authorized use on your own devices or with the owner’s permission.', rentalList: 'Browse Tools', backHome: 'Back to Home', rentalOptions: 'Rental Options', rentalIntroList: 'Choose a package and duration. Enter your email to continue to Mayar payment.', description: 'View Details', hours: 'hours', rentalDialogKicker: 'Rental Product Details', rentalDescription: 'Tool rental service for technicians. Use only on devices you own or are authorized to service.', rentalTerm: 'Access for the selected duration', rentalInstructions: 'Access instructions are sent after payment is verified', mayarSecure: 'Payments are securely processed through Mayar', buyProduct: 'Buy Product', closeDescription: 'Close product details', checkoutMayar: 'Mayar Checkout', enterEmailInstructions: 'Enter your email to receive payment instructions and reference.', emailExample: 'name@example.com', continueMayar: 'Continue to Mayar', preparingPayment: 'Preparing Mayar payment...', rentalNote: 'Note: Use the service only on devices you own or are authorized to service. Confirm compatibility, rental duration, pricing, and verification steps with the administrator.',
      articleKicker: 'MorgadCyber', articleTitle: 'Articles', articleIntro: 'Research, updates, and guides published by the MorgadCyber team.', all: 'All', loadingArticles: 'Loading articles...', noArticles: 'No articles have been published yet.', articlesLoadError: 'Articles could not be loaded.', articleCount: 'Showing {count} article(s)', readMore: 'Read article', articleNotFound: 'Article not found', articleUnavailable: 'This article is unavailable or is no longer published.', backArticles: 'Back to all articles', allArticles: 'All Articles', relatedArticles: 'More in {category}',
      categoryDefault: 'Digital product ready to use for your creative work.', articleDateLocale: 'en-US', invalidCheckout: 'Checkout could not be created.'
    },
    id: {
      languageLabel: 'Pilih bahasa', home: 'Beranda', explore: 'Jelajahi', categories: 'Kategori', checkOrder: 'Cek Pesanan', articles: 'Artikel', rental: 'Sewa Tools', exploreProducts: 'Jelajahi Produk',
      categoryKicker: 'Katalog MorgadCyber', digitalProducts: 'Produk Digital', categoryIntro: 'Jelajahi perangkat lunak dan alat digital. Pembayaran diproses dengan aman melalui DOKU tanpa perlu membuat akun.', allProducts: 'Semua produk', searchCategories: 'Cari kategori...', checkMyOrder: 'Cek Pesanan Saya', sortNewest: 'Urutkan: Terbaru', sortPriceLow: 'Harga: Terendah ke Tertinggi', sortPriceHigh: 'Harga: Tertinggi ke Terendah', sortName: 'Nama: A sampai Z', loadingProducts: 'Memuat produk...', productsCount: 'Menampilkan {start}-{end} dari {total} produk', productsCountEmpty: 'Menampilkan 0 dari {total} produk', productNotFound: 'Produk tidak ditemukan', tryCategorySearch: 'Coba kategori lain atau ubah kata pencarian.', resetFilters: 'Atur ulang filter', productImageMissing: 'Gambar produk tidak tersedia', buyNow: 'Beli Sekarang', viewDetails: 'Lihat Detail', previous: 'Sebelumnya', next: 'Selanjutnya', footerDescription: 'Perangkat lunak dan alat digital untuk kebutuhan teknis.', marketplace: 'Marketplace', allCategories: 'Semua Kategori', trackOrder: 'Lacak Pesanan', admin: 'Admin', rights: 'Hak cipta dilindungi.',
      productDetails: 'Detail produk', fullName: 'Nama lengkap', namePlaceholder: 'Nama sesuai identitas', email: 'Email', phone: 'Nomor telepon', phonePlaceholder: 'Nomor telepon', continueDoku: 'Lanjutkan ke DOKU', closeProduct: 'Tutup detail produk', selectCurrency: 'Mata uang tampilan', sortProducts: 'Urutkan produk', categoryFilter: 'Kategori produk',
      rentalEyebrow: 'Sewa Tools Morgad', rentalTitle: 'Sewa Tools FRP dan Tools Teknisi Lain', rentalIntro: 'Gunakan tools sesuai kebutuhan tanpa harus membeli lisensi penuh. Tersedia pilihan FRP, flashing, unlock, dan utilitas teknisi untuk perangkat milik Anda atau dengan izin pemilik.', rentalList: 'Lihat Daftar Tools', backHome: 'Kembali ke Beranda', rentalOptions: 'Pilihan Sewa Tools', rentalIntroList: 'Pilih paket dan durasi. Masukkan email untuk melanjutkan ke pembayaran Mayar.', description: 'Lihat Deskripsi', hours: 'jam', rentalDialogKicker: 'Detail Produk Sewa', rentalDescription: 'Layanan sewa tools untuk teknisi. Gunakan hanya pada perangkat milik sendiri atau perangkat yang sudah mendapat izin pemilik.', rentalTerm: 'Akses sesuai durasi yang dipilih', rentalInstructions: 'Instruksi dan detail akses dikirim setelah pembayaran terverifikasi', mayarSecure: 'Pembayaran diproses dengan aman melalui Mayar', buyProduct: 'Beli Produk', closeDescription: 'Tutup deskripsi', checkoutMayar: 'Checkout Mayar', enterEmailInstructions: 'Masukkan email untuk menerima instruksi dan referensi pembayaran.', emailExample: 'email@contoh.com', continueMayar: 'Lanjut ke Mayar', preparingPayment: 'Menyiapkan pembayaran Mayar...', rentalNote: 'Catatan: layanan hanya untuk perangkat milik sendiri atau perangkat dengan izin pemilik. Detail kompatibilitas, durasi sewa, harga, dan prosedur verifikasi dapat dikonfirmasi kepada admin.',
      articleKicker: 'MorgadCyber', articleTitle: 'Artikel', articleIntro: 'Riset, kabar terbaru, dan panduan yang diterbitkan oleh tim MorgadCyber.', all: 'Semua', loadingArticles: 'Memuat artikel...', noArticles: 'Belum ada artikel yang dipublikasikan.', articlesLoadError: 'Artikel belum dapat dimuat.', articleCount: 'Menampilkan {count} artikel', readMore: 'Baca artikel', articleNotFound: 'Artikel tidak ditemukan', articleUnavailable: 'Artikel ini belum tersedia atau sudah tidak dipublikasikan.', backArticles: 'Kembali ke daftar artikel', allArticles: 'Semua Artikel', relatedArticles: 'Artikel lainnya dalam {category}',
      categoryDefault: 'Produk digital siap digunakan untuk kebutuhan kreatif Anda.', articleDateLocale: 'id-ID', invalidCheckout: 'Checkout gagal dibuat.'
    },
    zh: {
      languageLabel: '选择语言', home: '首页', explore: '探索', categories: '分类', checkOrder: '查询订单', articles: '文章', rental: '工具租赁', exploreProducts: '浏览产品',
      categoryKicker: 'MorgadCyber 商品目录', digitalProducts: '数字产品', categoryIntro: '浏览软件和数字工具。付款通过 DOKU 安全处理，无需注册账户。', allProducts: '全部产品', searchCategories: '搜索分类...', checkMyOrder: '查询我的订单', sortNewest: '排序：最新', sortPriceLow: '价格：从低到高', sortPriceHigh: '价格：从高到低', sortName: '名称：A 到 Z', loadingProducts: '正在加载产品...', productsCount: '显示第 {start}-{end} 项，共 {total} 个产品', productsCountEmpty: '显示 0 个产品，共 {total} 个', productNotFound: '未找到产品', tryCategorySearch: '请尝试其他分类或修改搜索词。', resetFilters: '重置筛选', productImageMissing: '暂无产品图片', buyNow: '立即购买', viewDetails: '查看详情', previous: '上一页', next: '下一页', footerDescription: '满足技术需求的软件和数字工具。', marketplace: '商城', allCategories: '全部分类', trackOrder: '查询订单', admin: '管理', rights: '版权所有。',
      productDetails: '产品详情', fullName: '姓名', namePlaceholder: '填写证件上的姓名', email: '电子邮箱', phone: '电话号码', phonePlaceholder: '电话号码', continueDoku: '前往 DOKU 付款', closeProduct: '关闭产品详情', selectCurrency: '显示货币', sortProducts: '排序产品', categoryFilter: '产品分类',
      rentalEyebrow: 'Morgad 工具租赁', rentalTitle: '租用 FRP 及其他维修工具', rentalIntro: '按需使用工具，无需购买完整许可证。提供 FRP、刷机、解锁及维修辅助工具，仅限在自有设备或获得所有者授权的设备上使用。', rentalList: '查看工具列表', backHome: '返回首页', rentalOptions: '租赁方案', rentalIntroList: '选择套餐和时长。填写邮箱后继续使用 Mayar 付款。', description: '查看详情', hours: '小时', rentalDialogKicker: '租赁产品详情', rentalDescription: '面向维修人员的工具租赁服务。仅可用于自有设备或已获授权的设备。', rentalTerm: '按所选时长提供访问权限', rentalInstructions: '付款验证后发送访问说明和详情', mayarSecure: '付款通过 Mayar 安全处理', buyProduct: '购买产品', closeDescription: '关闭产品详情', checkoutMayar: 'Mayar 结账', enterEmailInstructions: '输入邮箱以接收付款说明和参考编号。', emailExample: 'name@example.com', continueMayar: '继续前往 Mayar', preparingPayment: '正在准备 Mayar 付款...', rentalNote: '注意：仅可在自有或已获授权的设备上使用。兼容性、租赁时长、价格和验证流程请向管理员确认。',
      articleKicker: 'MorgadCyber', articleTitle: '文章', articleIntro: 'MorgadCyber 团队发布的研究、更新和指南。', all: '全部', loadingArticles: '正在加载文章...', noArticles: '暂无已发布文章。', articlesLoadError: '无法加载文章。', articleCount: '显示 {count} 篇文章', readMore: '阅读文章', articleNotFound: '未找到文章', articleUnavailable: '文章暂不可用或已取消发布。', backArticles: '返回文章列表', allArticles: '全部文章', relatedArticles: '{category}中的更多文章',
      categoryDefault: '可立即使用的数字创意产品。', articleDateLocale: 'zh-CN', invalidCheckout: '无法创建结账订单。'
    }
  }

  const articleContent = {
    'sinta-1-strategi-publikasi-jurnal-bereputasi': {
      en: { title: 'Sinta 1: A Strategy for Publishing in Reputable Journals', summary: 'A practical guide to preparing a strong research paper for accredited national journals and improving its visibility in Sinta.', body: ['A strong research publication begins with a relevant topic, a clear methodology, and results that reviewers can understand.', 'To improve the chances of publication in a Sinta-indexed journal, use a consistent format, relevant citations, and well-documented methods.', 'Prepare a review-ready draft and ask colleagues to conduct an internal peer review before submission.'] },
      zh: { title: 'Sinta 1：在高声誉期刊发表研究的策略', summary: '实用指南，帮助研究者为国家认证期刊准备高质量论文，并提升其在 Sinta 平台上的可见度。', body: ['高质量学术发表始于相关的研究主题、清晰的方法论以及便于审稿人理解的结果。', '为提高在 Sinta 收录期刊发表的机会，应保持格式一致、引用相关文献，并完整记录研究方法。', '提交前请准备好可供审阅的稿件，并邀请同行进行内部评审。'] }
    },
    'sinta-2-panduan-meningkatkan-indeks-jurnal': {
      en: { title: 'Sinta 2: A Guide to Improving Journal Indexing', summary: 'Ways to improve journal quality, grow citations, and maintain consistent publication standards.', body: ['Well-managed journals have transparent peer-review processes, complete metadata, and regularly updated content.', 'Editors should maintain quality standards, screen for plagiarism, and verify that citations come from reliable sources.', 'Consistent publication practices can help a journal earn broader recognition in Sinta.'] },
      zh: { title: 'Sinta 2：提升期刊索引的指南', summary: '介绍如何提升期刊质量、增加引用并保持稳定的出版标准。', body: ['管理完善的期刊通常拥有透明的同行评审流程、完整的元数据和定期更新的内容。', '编辑团队应维护质量标准、检查抄袭，并确认引用来自可靠来源。', '持续稳定的出版实践有助于期刊在 Sinta 获得更广泛的认可。'] }
    },
    'sinta-3-bibliometrik-dan-pemetaan-penelitian': {
      en: { title: 'Sinta 3: Bibliometrics and Research Mapping', summary: 'Bibliometric analysis helps reveal research trends, field strengths, and emerging directions for publication.', body: ['Bibliometrics provides an overview of research concentrations, citation networks, and emerging topics.', 'By mapping research trends, institutions can define areas of strength, allocate resources, and develop effective collaborations.', 'This method helps assess research influence before making strategic decisions.'] },
      zh: { title: 'Sinta 3：文献计量与研究图谱', summary: '文献计量分析有助于了解研究趋势、领域优势以及出版方向的变化。', body: ['文献计量可以概览研究集中领域、引用网络和新兴主题。', '通过绘制研究趋势，机构可以确定优势方向、分配资源并建立有效合作。', '在制定战略决策前，这种方法有助于评估研究影响力。'] }
    },
    'sinta-4-profil-penulis-dan-kinerja-publikasi': {
      en: { title: 'Sinta 4: Author Profiles and Publication Performance', summary: 'Strong author profiles improve institutional reputation, research visibility, and opportunities for collaboration.', body: ['An author profile communicates more than a name and affiliation; it shows a consistent record of scholarly work.', 'Well-documented publications help researchers demonstrate the quality and continuity of their work.', 'Institutions can use this information to plan academic capacity and researcher development.'] },
      zh: { title: 'Sinta 4：作者档案与出版表现', summary: '完善的作者档案有助于提升机构声誉、研究可见度和合作机会。', body: ['作者档案不仅展示姓名和单位，也呈现持续的学术成果记录。', '完善记录的出版成果有助于研究者展示工作质量和连续性。', '机构可以利用这些信息规划学术能力建设和研究人员发展。'] }
    },
    'sinta-5-optimasi-riset-untuk-akreditasi': {
      en: { title: 'Sinta 5: Optimizing Research for Accreditation', summary: 'Well-documented, sustained research supports accreditation and strengthens an institution’s academic reputation.', body: ['Accreditation reflects an institution’s ability to manage a sustainable research environment.', 'Research data, publications, collaboration, and impact should be connected and consistently documented.', 'A reliable system helps study programs plan publication roadmaps and prepare more accurate evaluations.'] },
      zh: { title: 'Sinta 5：优化研究以支持认证', summary: '完善记录并持续开展研究，有助于通过认证并提升机构的学术声誉。', body: ['认证体现了机构管理可持续研究环境的能力。', '研究数据、出版成果、合作和影响应相互衔接并持续记录。', '可靠的系统有助于专业项目制定出版路线图并进行更准确的评估。'] }
    }
  }

  const articleCategories = {
    Research: { en: 'Research', id: 'Riset', zh: '研究' },
    Publication: { en: 'Publication', id: 'Publikasi', zh: '出版' },
    Insights: { en: 'Insights', id: 'Wawasan', zh: '见解' },
    Academic: { en: 'Academic', id: 'Akademik', zh: '学术' },
    Strategy: { en: 'Strategy', id: 'Strategi', zh: '策略' }
  }

  const rentalProducts = {
    rental_unlocktool_6h: { en: 'Unlocktool rental · 6 hours', id: 'Sewa Unlocktool · 6 jam', zh: 'Unlocktool 租赁 · 6 小时' },
    rental_unlocktool_12h: { en: 'Unlocktool rental · 12 hours', id: 'Sewa Unlocktool · 12 jam', zh: 'Unlocktool 租赁 · 12 小时' },
    rental_unlocktool_24h: { en: 'Unlocktool rental · 24 hours', id: 'Sewa Unlocktool · 24 jam', zh: 'Unlocktool 租赁 · 24 小时' },
    rental_dft_pro_24h: { en: 'DFT Pro Tool rental · 24 hours', id: 'Sewa DFT Pro Tool · 24 jam', zh: 'DFT Pro Tool 租赁 · 24 小时' },
    rental_dft_pro_48h: { en: 'DFT Pro Tool rental · 48 hours', id: 'Sewa DFT Pro Tool · 48 jam', zh: 'DFT Pro Tool 租赁 · 48 小时' },
    rental_tfm_24h: { en: 'TFM Tool rental · 24 hours', id: 'Sewa TFM Tool · 24 jam', zh: 'TFM Tool 租赁 · 24 小时' },
    rental_cf_tool_24h: { en: 'CF Instant Tool rental · 24 hours', id: 'Sewa CF Tool Instan · 24 jam', zh: 'CF Instant Tool 租赁 · 24 小时' },
    rental_android_multi_tool_24h: { en: 'Android Multi Tool · 24 hours', id: 'Android Multi Tool · 24 jam', zh: 'Android Multi Tool · 24 小时' }
  }

  const productCategories = {
    software: { en: 'Software', id: 'Perangkat Lunak', zh: '软件' },
    'tools teknisi': { en: 'Technical Tools', id: 'Alat Teknisi', zh: '维修工具' }
  }

  const productDescriptions = {
    'prod-1': { en: 'Mobile technician software for viewing device schematics.', id: 'Tools teknisi handphone untuk membaca skema perangkat.', zh: '用于查看设备电路图的手机维修工具。' },
    'prod-2': { en: 'A mobile technician tool for identifying test points.', id: 'Tools untuk teknisi handphone untuk mengetahui titik test point.', zh: '用于识别测试点的手机维修工具。' },
    'prod-3': { en: 'Architecture and engineering design software for civil engineering students and professionals.', id: 'Software desain arsitektur dan teknik untuk mahasiswa Teknik Sipil dan insinyur.', zh: '面向土木工程学生和专业人士的建筑与工程设计软件。' },
    'prod-4': { en: 'Cellebrite UFED software for digital forensics.', id: 'Software Cellebrite UFED untuk kebutuhan forensik digital.', zh: '用于数字取证的 Cellebrite UFED 软件。' }
  }

  const productAliases = {
    'prod-dzkj-tools': 'prod-1',
    'prod-tes-point-isp': 'prod-2',
    'prod-autocad': 'prod-3',
    'prod-cellebrite-tools': 'prod-4'
  }

  const t = (key, values = {}) => {
    const language = localStorage.getItem('preferred_language') || 'en'
    const template = dictionaries[language]?.[key] || dictionaries.en[key] || key
    return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '')
  }

  const syncCurrencyForLanguage = (language) => {
    const currency = languageCurrencies[language] || 'USD'
    localStorage.setItem('preferred_currency', currency)
    const currencySelect = document.getElementById('currencySelect')
    if (currencySelect && currencySelect.value !== currency) {
      currencySelect.value = currency
      currencySelect.dispatchEvent(new Event('change', { bubbles: true }))
    }
    window.dispatchEvent(new CustomEvent('morgad-currency-change', { detail: { currency } }))
  }

  const applyTranslations = () => {
    const language = localStorage.getItem('preferred_language') || 'en'
    document.documentElement.lang = language === 'zh' ? 'zh' : language
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n)
    })
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.placeholder = t(node.dataset.i18nPlaceholder)
    })
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel))
    })
  }

  const injectSwitcher = () => {
    const actions = document.querySelector('.nav-actions')
    if (!actions || document.getElementById('languageSwitcher')) return
    const language = localStorage.getItem('preferred_language') || 'en'
    const switcher = document.createElement('div')
    switcher.className = 'language-switcher'
    switcher.id = 'languageSwitcher'
    switcher.innerHTML = `<button type="button" class="language-current" id="languageCurrent" aria-label="${t('languageLabel')}" aria-expanded="false" aria-haspopup="true" aria-controls="languageMenu">${flags[language] || flags.en}<span class="language-currency-code">${languageCurrencies[language] || 'USD'}</span><svg class="language-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="language-menu" id="languageMenu" role="menu" hidden><button type="button" class="lang-option" data-lang="en" role="menuitemradio" aria-checked="${language === 'en'}"><span class="language-option-label">${flags.en} English</span><span class="language-option-currency">USD</span></button><button type="button" class="lang-option" data-lang="zh" role="menuitemradio" aria-checked="${language === 'zh'}"><span class="language-option-label">${flags.zh} 中文</span><span class="language-option-currency">CNY</span></button><button type="button" class="lang-option" data-lang="id" role="menuitemradio" aria-checked="${language === 'id'}"><span class="language-option-label">${flags.id} Indonesia</span><span class="language-option-currency">IDR</span></button></div>`
    const cta = actions.querySelector('.btn-header-cta')
    actions.insertBefore(switcher, cta || actions.firstChild)

    const current = switcher.querySelector('.language-current')
    const menu = switcher.querySelector('.language-menu')
    current.addEventListener('click', () => {
      const open = current.getAttribute('aria-expanded') === 'true'
      current.setAttribute('aria-expanded', String(!open))
      menu.hidden = open
    })
    switcher.querySelectorAll('.lang-option').forEach((button) => button.addEventListener('click', () => {
      localStorage.setItem('preferred_language', button.dataset.lang)
      syncCurrencyForLanguage(button.dataset.lang)
      applyTranslations()
      current.innerHTML = `${flags[button.dataset.lang]}<span class="language-currency-code">${languageCurrencies[button.dataset.lang]}</span><svg class="language-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>`
      current.setAttribute('aria-label', t('languageLabel'))
      current.setAttribute('aria-expanded', 'false')
      menu.hidden = true
      switcher.querySelectorAll('.lang-option').forEach((option) => option.setAttribute('aria-checked', String(option === button)))
      window.dispatchEvent(new CustomEvent('morgad-language-change', { detail: { language: button.dataset.lang } }))
    }))
    document.addEventListener('click', (event) => {
      if (!switcher.contains(event.target)) {
        menu.hidden = true
        current.setAttribute('aria-expanded', 'false')
      }
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        menu.hidden = true
        current.setAttribute('aria-expanded', 'false')
      }
    })
  }

  window.morgadI18n = {
    t,
    article(slug, language = localStorage.getItem('preferred_language') || 'en') {
      return articleContent[slug]?.[language] || null
    },
    articleCategory(category, language = localStorage.getItem('preferred_language') || 'en') {
      return articleCategories[category]?.[language] || category
    },
    rentalProduct(id, language = localStorage.getItem('preferred_language') || 'en') {
      return rentalProducts[id]?.[language] || null
    },
    productCategory(category, language = localStorage.getItem('preferred_language') || 'en') {
      return productCategories[String(category).toLowerCase()]?.[language] || category
    },
    productDescription(id, fallback, language = localStorage.getItem('preferred_language') || 'en') {
      return productDescriptions[id]?.[language] || productDescriptions[productAliases[id]]?.[language] || fallback
    },
    locale() {
      return dictionaries[localStorage.getItem('preferred_language') || 'en']?.articleDateLocale || 'en-US'
    },
    language() {
      return localStorage.getItem('preferred_language') || 'en'
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncCurrencyForLanguage(localStorage.getItem('preferred_language') || 'en')
    injectSwitcher()
    applyTranslations()
  })
})()
