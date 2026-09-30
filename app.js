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
  theme: localStorage.getItem('preferred_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
};

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
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function getItemPrice(item, currency = state.currency) {
  if (currency === 'USD') {
    return item.priceUSD || item.price;
  }
  return item.priceIDR || (item.price * 15000);
}

function setCurrency(newCurrency) {
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
  showToast(`Currency changed to ${newCurrency}`);
}

function setTheme(newTheme) {
  state.theme = newTheme;
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('preferred_theme', newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`);
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

let activeCheckoutModal = null;
let activePollingTimer = null;

function createSandboxPaymentModal() {
  if (document.getElementById('sandbox-payment-modal')) {
    return document.getElementById('sandbox-payment-modal');
  }

  const modal = document.createElement('div');
  modal.id = 'sandbox-payment-modal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(15, 23, 42, 0.7)';
  modal.style.display = 'none';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
    <div style="width:min(440px, calc(100vw - 32px)); background:#0f172a; border:1px solid rgba(148,163,184,.24); border-radius:22px; box-shadow:0 30px 80px rgba(15,23,42,.45); overflow:hidden; color:#e2e8f0;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px; border-bottom:1px solid rgba(148,163,184,.2);">
        <div>
          <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#a78bfa; font-weight:700;">MORGAD SECURE CHECKOUT (POWERED BY DOKU)</div>
          <div style="font-size:20px; font-weight:700; margin-top:4px;">Pembayaran Terenkripsi DOKU</div>
        </div>
        <button id="sandbox-payment-close" type="button" aria-label="Close payment modal" style="background:transparent; border:0; color:#cbd5e1; font-size:24px; cursor:pointer;">×</button>
      </div>
      <div style="padding:22px 20px 18px;">
        <div style="display:flex; align-items:center; justify-content:center; margin:8px 0 16px; background:#f8fafc; border-radius:16px; padding:16px;">
          <img id="sandbox-qr-image" alt="QR payment DOKU" src="" style="width:200px; height:200px; border-radius:12px; background:#fff; border:1px solid rgba(148,163,184,.2);" />
        </div>
        <div style="font-size:13px; color:#cbd5e1; margin-bottom:10px;">Detail transaksi</div>
        <div id="sandbox-payment-detail" style="padding:14px 12px; border:1px solid rgba(148,163,184,.22); border-radius:12px; background:rgba(15,23,42,.42); color:#e2e8f0; font-size:13px; word-break:break-word; min-height:52px;">
          Menyiapkan transaksi DOKU Checkout...
        </div>
        <div style="display:flex; gap:10px; margin-top:18px; flex-wrap:wrap;">
          <a id="doku-payment-redirect" href="#" target="_blank" rel="noopener noreferrer" style="flex:1; min-width:180px; padding:12px 14px; border:0; border-radius:12px; background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:white; font-weight:700; text-align:center; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;">Bayar Sekarang (DOKU)</a>
          <button id="sandbox-payment-cancel" type="button" style="padding:12px 14px; border:1px solid rgba(148,163,184,.3); border-radius:12px; background:transparent; color:#e2e8f0; font-weight:600; cursor:pointer;">Tutup</button>
        </div>
      </div>
    </div>
  `;

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeSandboxPaymentModal();
    }
  });

  const closeBtn = modal.querySelector('#sandbox-payment-close');
  const cancelBtn = modal.querySelector('#sandbox-payment-cancel');
  closeBtn.addEventListener('click', closeSandboxPaymentModal);
  cancelBtn.addEventListener('click', closeSandboxPaymentModal);

  document.body.appendChild(modal);
  activeCheckoutModal = modal;
  return modal;
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

function openSandboxPaymentModal(paymentDetail, invoiceId, checkoutUrl) {
  const modal = createSandboxPaymentModal();
  const qrImage = modal.querySelector('#sandbox-qr-image');
  const detailEl = modal.querySelector('#sandbox-payment-detail');
  const redirectBtn = modal.querySelector('#doku-payment-redirect');

  const qrTarget = paymentDetail && !paymentDetail.startsWith('http')
    ? paymentDetail
    : (checkoutUrl || paymentDetail || `https://doku.com/checkout?invoice=${encodeURIComponent(invoiceId)}`);

  qrImage.src = qrTarget.startsWith('http') && qrTarget.includes('qr')
    ? qrTarget
    : `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrTarget)}&size=200x200`;
  qrImage.onerror = () => { qrImage.src = '/assets/img/logo.png'; };

  detailEl.innerHTML = `
    <div style="font-weight:600; margin-bottom:4px;">No. Invoice: <span style="color:#a78bfa;">${invoiceId}</span></div>
    <div style="font-size:12px; color:#cbd5e1; margin-bottom:8px;">Metode: DOKU Checkout / QRIS Real-Time</div>
    <div style="font-size:11px; color:#94a3b8; background:rgba(30,41,59,.7); padding:8px 10px; border-radius:8px;">Scan QRIS di atas dengan m-Banking / e-Wallet Anda atau klik tombol di bawah untuk membayar langsung di gateway DOKU. Status pembayaran akan terverifikasi otomatis.</div>
  `;

  if (redirectBtn) {
    const targetUrl = checkoutUrl || (paymentDetail && paymentDetail.startsWith('http') ? paymentDetail : '#');
    redirectBtn.href = targetUrl;
    redirectBtn.onclick = (e) => {
      if (targetUrl && targetUrl !== '#') {
        window.location.href = targetUrl;
      }
    };
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  startPaymentPolling(invoiceId);
}

function closeSandboxPaymentModal() {
  const modal = document.getElementById('sandbox-payment-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
  if (activePollingTimer) {
    clearInterval(activePollingTimer);
    activePollingTimer = null;
  }
}

function startPaymentPolling(invoiceId) {
  if (activePollingTimer) clearInterval(activePollingTimer);

  const pollStatus = async () => {
    try {
      const res = await fetch(`/api/check-status?invoice_id=${encodeURIComponent(invoiceId)}`);
      const data = await res.json();
      if (!res.ok) return;

      const normalizedStatus = String(data.payment_status || data.status || '').toLowerCase();
      const isSuccess = normalizedStatus === 'success' || normalizedStatus === 'paid' || normalizedStatus === 'completed';

      if (isSuccess) {
        clearInterval(activePollingTimer);
        activePollingTimer = null;
        closeSandboxPaymentModal();
        showToast('Pembayaran lunas. Mengunduh file aman...');

        const downloadUrl = data.download_url || (data.download_token ? `/api/download/${encodeURIComponent(data.download_token)}` : null);

        if (downloadUrl) {
          setTimeout(() => {
            const safeUrl = downloadUrl.startsWith('http') ? downloadUrl : `${window.location.origin}${downloadUrl}`;
            const popup = window.open(safeUrl, '_blank', 'noopener,noreferrer');
            if (!popup) {
              window.location.href = safeUrl;
            }
          }, 300);
        }
      }
    } catch (error) {
      console.error('Polling payment status failed:', error);
    }
  };

  pollStatus();
  activePollingTimer = setInterval(pollStatus, 3000);
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

function handleBuyNow(productId) {
  const product = PRODUCTS_DATA[productId];
  if (!product) return;

  // Add to cart state
  const existingItem = state.cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    state.cart.push({ ...product, qty: 1 });
  }

  updateCartUI();
  showToast(`Added "${product.title}" to cart!`);
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
        <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-text-secondary);">Your cart is empty</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">Explore our catalog and pick your favorite digital collections!</p>
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
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remove item">
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
    showToast('Your cart is empty! Add products first.');
    return;
  }

  const primaryItem = state.cart[0];
  const email = 'customer@morgadcyber.com';

  try {
    showToast('Menghubungkan ke DOKU Secure Checkout...');
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: primaryItem.id,
        customer_email: email,
        currency: state.currency
      })
    });
    const checkoutData = await res.json();
    if (!res.ok) throw new Error(checkoutData.error || 'Checkout failed.');

    state.cart = [];
    updateCartUI();
    toggleCartDrawer();

    const checkoutUrl = checkoutData.url || checkoutData.checkout_url || (checkoutData.response && checkoutData.response.payment && checkoutData.response.payment.url);
    const invoiceId = checkoutData.invoice_id || checkoutData.order_number || (checkoutData.order && checkoutData.order.invoice_number);
    const paymentDetail = checkoutData.paymentDetail || checkoutData.qris_data || checkoutUrl;

    if (checkoutData.status === 'success' && invoiceId) {
      openSandboxPaymentModal(paymentDetail, invoiceId, checkoutUrl);
      showToast('Transaksi DOKU dibuat. Silakan bayar melalui modal atau dialihkan.');
      return;
    }

    throw new Error('Checkout response tidak lengkap.');
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
  modalTag.textContent = product.tag;
  modalTitle.textContent = product.title;
  modalDesc.textContent = product.desc;
  modalRes.textContent = product.resolution;
  modalFiles.textContent = product.files;
  modalPrice.textContent = formatPrice(getItemPrice(product, state.currency), state.currency);

  modalBuyBtn.onclick = () => {
    handleBuyNow(productId);
    closeProductModal();
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initThemeAndCurrency();
  updateCartUI();
  applyProductFilters();

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
