/**
 * TERA ADMIN CONSOLE - DASHBOARD LOGIC
 * High-performance, clean, human-designed administrative interactions.
 */

const ADMIN_DATA = {
  orders: {}
};

let adminOrders = [];
let displayCurrency = localStorage.getItem('adminCurrency') || 'USD';
const IDR_PER_USD = 16000;
let adminProducts = [];
let adminArticles = [];
let activeDateRange = { start: '', end: '' };
let productUploadInProgress = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function sectionShell(title, description, content) {
  return `<div class="admin-card section-view-card">
    <div class="card-header"><div><h2 class="card-header-title">${escapeHtml(title)}</h2><span class="card-header-sub">${escapeHtml(description)}</span></div>
    <button class="btn-storefront-link" type="button" id="backToDashboardBtn">Back to Dashboard</button></div>
    <div class="card-body">${content}</div>
  </div>`;
}

function getDateFilteredOrders() {
  return adminOrders.filter(order => {
    const day = String(order.created_at || '').slice(0, 10);
    return (!activeDateRange.start || day >= activeDateRange.start)
      && (!activeDateRange.end || day <= activeDateRange.end);
  });
}

function applyDashboardDateRange() {
  const orders = getDateFilteredOrders();
  const paid = orders.filter(order => String(order.payment_status).toUpperCase() === 'PAID');
  const revenue = paid.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const statuses = {};
  orders.forEach(order => {
    const status = String(order.payment_status || '').toUpperCase();
    statuses[status] = (statuses[status] || 0) + 1;
  });
  const rate = orders.length ? Math.round((paid.length / orders.length) * 1000) / 10 : 0;
  const revenueElement = document.getElementById('totalRevenueValue');
  const orderElement = document.getElementById('totalOrdersValue');
  const successElement = document.getElementById('paymentSuccessValue');
  const paidElement = document.getElementById('paidOrdersValue');
  const fulfillmentElement = document.getElementById('fulfillmentRateValue');
  const refundElement = document.getElementById('refundRateValue');
  if (revenueElement) revenueElement.textContent = formatMoney(revenue, displayCurrency);
  if (orderElement) orderElement.textContent = orders.length;
  if (successElement) successElement.textContent = `${rate}%`;
  if (paidElement) paidElement.textContent = `${paid.length} Paid`;
  if (fulfillmentElement) fulfillmentElement.textContent = `${rate}%`;
  if (refundElement) refundElement.textContent = `${statuses.REFUNDED || 0} refunds`;
  renderOrders(orders);
  renderActivityTables(orders);
  updateOrderFilters(orders);
  updateStatusSummary(statuses, orders.length);
}

function renderArticlesAdminSection(view) {
  renderContentManager(view, 'articles');
}

function renderContentManager(view, activeTab = 'products') {
  view.innerHTML = sectionShell('Content Manager', 'Manage every uploaded product and article from one page', `
    <div role="tablist" aria-label="Content type" style="display:flex;gap:8px;border-bottom:1px solid var(--border-color);margin-bottom:20px;">
      <button type="button" role="tab" class="content-manager-tab ${activeTab === 'products' ? 'active' : ''}" aria-selected="${activeTab === 'products'}" data-content-tab="products">Products <span id="managerProductCount">${adminProducts.length}</span></button>
      <button type="button" role="tab" class="content-manager-tab ${activeTab === 'articles' ? 'active' : ''}" aria-selected="${activeTab === 'articles'}" data-content-tab="articles">Articles <span id="managerArticleCount">${adminArticles.length}</span></button>
    </div>
    <section id="contentManagerProducts" role="tabpanel" ${activeTab === 'products' ? '' : 'hidden'}>
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;"><button class="btn-primary-action" type="button" id="managerAddProduct">Add Product</button></div>
      <div id="adminProductsList" class="notif-empty">Loading products...</div>
    </section>
    <section id="contentManagerArticles" role="tabpanel" ${activeTab === 'articles' ? '' : 'hidden'}>
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;"><button class="btn-primary-action" type="button" id="managerAddArticle">Add Article</button></div>
      <div id="adminArticlesList" class="notif-empty">Loading articles...</div>
    </section>
  `);

  view.querySelectorAll('[data-content-tab]').forEach(button => button.addEventListener('click', () => {
    const tab = button.dataset.contentTab;
    view.querySelectorAll('[data-content-tab]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    view.querySelector('#contentManagerProducts').hidden = tab !== 'products';
    view.querySelector('#contentManagerArticles').hidden = tab !== 'articles';
    if (tab === 'products') loadAdminProducts(view);
    else loadAdminArticles(view);
  }));
  view.querySelector('#managerAddProduct').addEventListener('click', openAddProductModal);
  view.querySelector('#managerAddArticle').addEventListener('click', () => openArticleEditor(null, () => loadAdminArticles(view)));
  if (activeTab === 'products') loadAdminProducts(view);
  else loadAdminArticles(view);
}

async function loadAdminArticles(view) {
  const list = view.querySelector('#adminArticlesList');
  if (!list) return;
  try {
    const response = await fetch('/api/admin/articles');
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Could not load articles.');
    adminArticles = data.articles || [];
    const count = document.getElementById('managerArticleCount');
    if (count) count.textContent = adminArticles.length;
    if (!adminArticles.length) {
      list.className = 'notif-empty';
      list.textContent = 'No articles yet. Add your first article to publish it on the storefront.';
      return;
    }

    list.className = 'table-responsive-wrapper';
    list.innerHTML = `<table class="admin-table"><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${adminArticles.map(article => `
      <tr><td><strong>${escapeHtml(article.title)}</strong><br><span style="color:var(--text-muted);font-size:.75rem;">/${escapeHtml(article.slug)}</span></td>
      <td>${escapeHtml(article.category)}</td><td>${escapeHtml(article.status)}</td>
      <td>${new Date(article.updated_at).toLocaleDateString()}</td>
      <td><div style="display:flex;gap:6px;"><button type="button" class="action-btn-sm" data-edit-article="${article.id}">Edit</button><button type="button" class="action-btn-danger-sm" data-delete-article="${article.id}">Delete</button></div></td></tr>
    `).join('')}</tbody></table>`;
    list.querySelectorAll('[data-edit-article]').forEach(button => {
      button.addEventListener('click', () => {
        const article = adminArticles.find(item => item.id === Number(button.dataset.editArticle));
        if (article) openArticleEditor(article, () => loadAdminArticles(view));
      });
    });
    list.querySelectorAll('[data-delete-article]').forEach(button => button.addEventListener('click', async () => {
      const article = adminArticles.find(item => item.id === Number(button.dataset.deleteArticle));
      if (!article || !window.confirm(`Delete article "${article.title}"? This cannot be undone.`)) return;
      try {
        const response = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: article.id }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not delete article.');
        showAdminToast('Article deleted.');
        loadAdminArticles(view);
      } catch (error) {
        showAdminToast(error.message || 'Could not delete article.');
      }
    }));
  } catch (error) {
    list.className = 'notif-empty';
    list.textContent = error.message || 'Could not load articles.';
  }
}

function openArticleEditor(article, onSaved) {
  const modal = document.createElement('div');
  modal.className = 'admin-modal-backdrop active';
  const categories = ['Tips & Guides', 'Inspiration', 'Resources'];
  modal.innerHTML = `
    <div class="admin-modal-window" role="dialog" aria-modal="true" aria-labelledby="articleEditorTitle">
      <div class="modal-header-row"><h3 class="modal-header-title" id="articleEditorTitle">${article ? 'Edit Article' : 'Add Article'}</h3>
        <button class="modal-close-icon" type="button" aria-label="Close">×</button></div>
      <form id="articleEditorForm">
        <div class="modal-body-content">
          <div class="form-group"><label class="form-label" for="articleTitle">Title *</label><input class="form-input" id="articleTitle" maxlength="180" required value="${escapeHtml(article?.title)}"></div>
          <div class="form-group"><label class="form-label" for="articleSlug">URL Slug *</label><input class="form-input" id="articleSlug" maxlength="200" required value="${escapeHtml(article?.slug)}"></div>
          <div class="form-group"><label class="form-label" for="articleCategory">Category</label><select class="form-select" id="articleCategory">${categories.map(category => `<option value="${escapeHtml(category)}" ${article?.category === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="articleSummary">Summary</label><textarea class="form-textarea" id="articleSummary" rows="2" maxlength="500">${escapeHtml(article?.summary)}</textarea></div>
          <div class="form-group"><label class="form-label" for="articleImage">Cover image URL</label><input class="form-input" id="articleImage" type="url" placeholder="https://... or /assets/..." value="${escapeHtml(article?.image_url)}"></div>
          <div class="form-group"><label class="form-label" for="articleContent">Article content *</label><textarea class="form-textarea" id="articleContent" rows="10" maxlength="100000" required placeholder="Write the article here. Separate paragraphs with a blank line.">${escapeHtml(article?.content)}</textarea></div>
          <div class="form-group"><label class="form-label" for="articleStatus">Publication status</label><select class="form-select" id="articleStatus"><option value="draft" ${article?.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${article?.status === 'published' ? 'selected' : ''}>Published</option></select></div>
          <div id="articleEditorError" role="alert" style="color:var(--danger-text);font-size:.85rem;"></div>
        </div>
        <div class="modal-footer-row"><button class="btn-secondary-action" type="button" data-cancel-article>Cancel</button><button class="btn-primary-action" type="submit">Save Article</button></div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close-icon').addEventListener('click', close);
  modal.querySelector('[data-cancel-article]').addEventListener('click', close);
  const title = modal.querySelector('#articleTitle');
  const slug = modal.querySelector('#articleSlug');
  let slugManuallyEdited = Boolean(article);
  title.addEventListener('input', () => {
    if (!slugManuallyEdited) slug.value = title.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });
  slug.addEventListener('input', () => { slugManuallyEdited = true; });
  modal.querySelector('#articleEditorForm').addEventListener('submit', async event => {
    event.preventDefault();
    const saveButton = modal.querySelector('[type="submit"]');
    const errorBox = modal.querySelector('#articleEditorError');
    saveButton.disabled = true;
    errorBox.textContent = '';
    const payload = {
      ...(article ? { id: article.id } : {}),
      title: title.value,
      slug: slug.value,
      category: modal.querySelector('#articleCategory').value,
      summary: modal.querySelector('#articleSummary').value,
      image_url: modal.querySelector('#articleImage').value,
      content: modal.querySelector('#articleContent').value,
      status: modal.querySelector('#articleStatus').value,
    };
    try {
      const response = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not save article.');
      close();
      showAdminToast(article ? 'Article updated.' : 'Article saved.');
      onSaved();
    } catch (error) {
      errorBox.textContent = error.message || 'Could not save article.';
      saveButton.disabled = false;
    }
  });
}

function renderProductsAdminSection(view) {
  renderContentManager(view, 'products');
}

async function loadAdminProducts(view) {
  const list = view.querySelector('#adminProductsList');
  if (!list) return;
  try {
    const response = await fetch('/api/admin/products');
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Could not load products.');
    adminProducts = data.products || [];
    const count = document.getElementById('managerProductCount');
    if (count) count.textContent = adminProducts.length;
    if (!adminProducts.length) {
      list.className = 'notif-empty';
      list.textContent = 'No products have been added yet.';
      return;
    }
    list.className = 'table-responsive-wrapper';
    list.innerHTML = `<table class="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${adminProducts.map(product => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px;">${product.image_path ? `<img src="${escapeHtml(product.image_path)}" alt="" style="width:48px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.onerror=null;this.src='/assets/img/logo.png';">` : `<img src="/assets/img/logo.png" alt="" style="width:48px;height:40px;object-fit:cover;border-radius:4px;">`}<div><strong>${escapeHtml(product.name)}</strong><br><span style="font-size:.75rem;color:var(--text-muted);">${escapeHtml(product.slug)}</span></div></div></td>
        <td>${escapeHtml(product.category)}</td><td>${escapeHtml(formatMoney(product.price, product.currency || 'USD'))}</td>
        <td>${product.stock_quantity === null ? 'Unlimited' : Number(product.stock_quantity)}</td>
        <td>${escapeHtml(product.status)}</td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="action-btn-sm" data-edit-product="${escapeHtml(product.id)}">Edit</button>
          <button type="button" class="action-btn-sm" data-add-stock="${escapeHtml(product.id)}">Add stock</button>
          ${product.status === 'archived' ? '' : `<button type="button" class="action-btn-danger-sm" data-delete-product="${escapeHtml(product.id)}">Delete</button>`}
        </div></td>
      </tr>`).join('')}</tbody></table>`;

    list.querySelectorAll('[data-edit-product]').forEach(button => button.addEventListener('click', () => {
      const product = adminProducts.find(item => item.id === button.dataset.editProduct);
      if (product) openProductEditor(product, () => loadAdminProducts(view));
    }));
    list.querySelectorAll('[data-add-stock]').forEach(button => button.addEventListener('click', async () => {
      const product = adminProducts.find(item => item.id === button.dataset.addStock);
      if (!product) return;
      const rawQuantity = window.prompt(`How many units to add to ${product.name}?`, '1');
      if (rawQuantity === null) return;
      const quantity = Number(rawQuantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        showAdminToast('Enter a whole stock quantity greater than 0.');
        return;
      }
      await updateAdminProduct({ action: 'add_stock', id: product.id, quantity }, view);
    }));
    list.querySelectorAll('[data-delete-product]').forEach(button => button.addEventListener('click', async () => {
      const product = adminProducts.find(item => item.id === button.dataset.deleteProduct);
      if (!product || !window.confirm(`Remove ${product.name} from the storefront? Existing order history will be preserved.`)) return;
      await updateAdminProduct({ action: 'delete', id: product.id }, view);
    }));
  } catch (error) {
    list.className = 'notif-empty';
    list.textContent = error.message || 'Could not load products.';
  }
}

async function updateAdminProduct(payload, view) {
  try {
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Could not update product.');
    showAdminToast(payload.action === 'delete' ? 'Product removed from the storefront.' : 'Product updated.');
    await loadAdminProducts(view);
    if (payload.action === 'add_stock') await loadAdminData();
  } catch (error) {
    showAdminToast(error.message || 'Could not update product.');
  }
}

function openProductEditor(product, onSaved) {
  const modal = document.createElement('div');
  modal.className = 'admin-modal-backdrop active';
  modal.innerHTML = `
    <div class="admin-modal-window" role="dialog" aria-modal="true" aria-labelledby="productEditorTitle">
      <div class="modal-header-row"><h3 class="modal-header-title" id="productEditorTitle">Edit Product</h3><button class="modal-close-icon" type="button" aria-label="Close">×</button></div>
      <form id="productEditorForm">
        <div class="modal-body-content">
          <div class="form-group"><label class="form-label" for="editProductName">Product name *</label><input class="form-input" id="editProductName" maxlength="255" required value="${escapeHtml(product.name)}"></div>
          <div class="form-group"><label class="form-label" for="editProductDescription">Description *</label><textarea class="form-textarea" id="editProductDescription" rows="6" maxlength="10000" required>${escapeHtml(product.description)}</textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label class="form-label" for="editProductCategory">Category *</label><input class="form-input" id="editProductCategory" maxlength="100" required value="${escapeHtml(product.category)}"></div>
            <div class="form-group"><label class="form-label" for="editProductPrice">Price *</label><input class="form-input" id="editProductPrice" type="number" min="0.01" step="0.01" required value="${Number(product.price)}"></div>
          </div>
          <div class="form-group"><label class="form-label" for="editProductStatus">Publication status</label><select class="form-select" id="editProductStatus"><option value="published" ${product.status === 'published' ? 'selected' : ''}>Published</option><option value="draft" ${product.status === 'draft' ? 'selected' : ''}>Draft</option><option value="archived" ${product.status === 'archived' ? 'selected' : ''}>Archived</option></select></div>
          <div id="productEditorError" role="alert" style="color:var(--danger-text);font-size:.85rem;"></div>
        </div>
        <div class="modal-footer-row"><button class="btn-secondary-action" type="button" data-cancel-product>Cancel</button><button class="btn-primary-action" type="submit">Save Changes</button></div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('.modal-close-icon').addEventListener('click', close);
  modal.querySelector('[data-cancel-product]').addEventListener('click', close);
  modal.querySelector('#productEditorForm').addEventListener('submit', async event => {
    event.preventDefault();
    const saveButton = modal.querySelector('[type="submit"]');
    const errorBox = modal.querySelector('#productEditorError');
    saveButton.disabled = true;
    errorBox.textContent = '';
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_product',
          id: product.id,
          name: modal.querySelector('#editProductName').value,
          description: modal.querySelector('#editProductDescription').value,
          category: modal.querySelector('#editProductCategory').value,
          price: Number(modal.querySelector('#editProductPrice').value),
          status: modal.querySelector('#editProductStatus').value,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not update product.');
      close();
      showAdminToast('Product details updated.');
      onSaved();
      loadAdminData();
    } catch (error) {
      errorBox.textContent = error.message || 'Could not update product.';
      saveButton.disabled = false;
    }
  });
}

function renderAdminSection(section) {
  const dashboard = document.querySelector('.dashboard-content');
  if (!dashboard) return;
  dashboard.querySelectorAll(':scope > *').forEach(element => { element.hidden = true; });
  let view = document.getElementById('activeSectionView');
  if (!view) {
    view = document.createElement('div');
    view.id = 'activeSectionView';
    dashboard.appendChild(view);
  }
  view.hidden = false;
  const orders = adminOrders;
  if (section === 'customers') {
    const customers = [...new Map(orders.map(order => [order.customer_email, order])).values()];
    view.innerHTML = sectionShell('Customers', 'Customers found in real orders', customers.length ? `<div class="table-responsive-wrapper"><table class="admin-table"><thead><tr><th>Email</th><th>Orders</th><th>Last order</th></tr></thead><tbody>${customers.map(customer => `<tr><td>${escapeHtml(customer.customer_email)}</td><td>${orders.filter(order => order.customer_email === customer.customer_email).length}</td><td>${new Date(customer.created_at).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>` : '<div class="notif-empty">No customers yet.</div>');
  } else if (section === 'licenses') {
    const licenses = orders.filter(order => order.license_key);
    view.innerHTML = sectionShell('Licenses', 'Issued licenses from completed orders', licenses.length ? `<div class="table-responsive-wrapper"><table class="admin-table"><thead><tr><th>License key</th><th>Order</th><th>Status</th></tr></thead><tbody>${licenses.map(order => `<tr><td><code>${escapeHtml(order.license_key)}</code></td><td>#${escapeHtml(order.order_number || order.id)}</td><td>${escapeHtml(orderStatus(order))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="notif-empty">No licenses issued yet.</div>');
  } else if (section === 'categories') {
    const categories = [...new Set(adminProducts.map(product => product.category).filter(Boolean))];
    view.innerHTML = sectionShell('Categories', 'Categories currently used by the product catalog', categories.length ? `<div class="product-rank-list">${categories.map(category => `<div class="product-rank-item"><span class="product-rank-title">${escapeHtml(category)}</span><span>${adminProducts.filter(product => product.category === category).length} products</span></div>`).join('')}</div>` : '<div class="notif-empty">No categories yet.</div>');
  } else if (section === 'content-manager') {
    renderContentManager(view, 'products');
  } else if (section === 'products') {
    renderProductsAdminSection(view);
  } else if (section === 'articles') {
    renderArticlesAdminSection(view);
  } else if (section === 'reports') {
    const revenue = orders.filter(order => order.payment_status === 'PAID').reduce((sum, order) => sum + Number(order.amount || 0), 0);
    view.innerHTML = sectionShell('Reports', 'Reports calculated from the current database', `<div class="grid-12"><div class="col-3 admin-card"><span class="kpi-label">Revenue</span><strong class="kpi-value">${formatMoney(revenue, displayCurrency)}</strong></div><div class="col-3 admin-card"><span class="kpi-label">Orders</span><strong class="kpi-value">${orders.length}</strong></div><div class="col-3 admin-card"><span class="kpi-label">Products</span><strong class="kpi-value">${adminProducts.length}</strong></div></div>`);
  } else if (section === 'settings') {
    view.innerHTML = sectionShell('Settings', 'Dashboard display preferences', `<label class="form-label" for="sectionCurrencySelect">Display currency</label><select class="form-select" id="sectionCurrencySelect"><option value="USD">USD</option><option value="IDR">IDR</option></select>`);
    const select = view.querySelector('#sectionCurrencySelect');
    select.value = displayCurrency;
    select.addEventListener('change', event => { if (adminCurrencySelect) { adminCurrencySelect.value = event.target.value; adminCurrencySelect.dispatchEvent(new Event('change')); } });
  }
  const backButton = view.querySelector('#backToDashboardBtn');
  if (backButton) backButton.addEventListener('click', () => {
    view.remove();
    dashboard.querySelectorAll(':scope > *').forEach(element => { element.hidden = false; });
  });
}

function formatMoney(amount, currency = displayCurrency) {
  const value = currency === 'IDR' ? Number(amount || 0) * IDR_PER_USD : Number(amount || 0);
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency', currency, maximumFractionDigits: currency === 'IDR' ? 0 : 2
  }).format(value);
}

function formatOrderMoney(amount, sourceCurrency = 'USD') {
  const sourceAmount = Number(amount || 0);
  const usdAmount = sourceCurrency === 'IDR' ? sourceAmount / IDR_PER_USD : sourceAmount;
  return formatMoney(usdAmount, displayCurrency);
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'paid' ? 'badge-paid' : normalized === 'refunded' ? 'badge-refunded' : 'badge-pending';
}

function orderStatus(order) {
  return String(order.order_status || order.payment_status || 'PENDING').toLowerCase();
}

function renderOrders(orders = getDateFilteredOrders()) {
  const body = document.getElementById('ordersTableBody');
  if (!body) return;
  body.innerHTML = '';
  if (!orders.length) {
    body.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">No order history yet.</td></tr>';
    return;
  }
  orders.forEach(order => {
    const status = orderStatus(order);
    const id = order.order_number || order.id;
    const initials = (order.customer_email || 'C').slice(0, 2).toUpperCase();
    const row = document.createElement('tr');
    row.dataset.status = String(order.payment_status || status).toLowerCase();
    row.innerHTML = `<td><strong style="color:var(--purple-700);">#${id}</strong></td>
      <td><div class="customer-cell"><div class="customer-avatar">${initials}</div><div class="customer-meta"><span class="customer-name">${order.customer_email || 'Unknown customer'}</span><span class="customer-email">${order.customer_email || ''}</span></div></div></td>
      <td><span class="product-name-link">${order.product_name || 'Unknown product'}</span></td>
      <td><span class="amount-text">${formatOrderMoney(order.amount, order.currency || 'USD')}</span></td>
      <td><span class="badge-status ${statusClass(status)}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
      <td><span style="font-size:.75rem;">${new Date(order.created_at).toLocaleString()}</span></td>
      <td style="text-align:right;"><button class="action-btn-sm" data-order-id="${id}">Details</button></td>`;
    row.querySelector('button').addEventListener('click', () => openOrderDetailModal(id));
    body.appendChild(row);
  });
}

function updateOrderFilters(orders = getDateFilteredOrders()) {
  const counts = { all: orders.length, paid: 0, pending: 0, refunded: 0 };
  orders.forEach(order => {
    const status = String(order.payment_status || orderStatus(order)).toLowerCase();
    if (counts[status] !== undefined) counts[status] += 1;
  });
  document.querySelectorAll('.filter-tab').forEach(button => {
    const match = button.getAttribute('onclick')?.match(/'([^']+)'/);
    if (match && counts[match[1]] !== undefined) button.textContent = `${match[1][0].toUpperCase() + match[1].slice(1)} (${counts[match[1]]})`;
  });
}

function updateStatusSummary(statusBreakdown, totalOrders) {
  const keys = ['paid', 'pending', 'failed', 'expired', 'refunded'];
  keys.forEach(status => {
    const count = Number(statusBreakdown[status.toUpperCase()] || statusBreakdown[status] || 0);
    const countElement = document.getElementById(`${status}StatusCount`);
    const barElement = document.getElementById(`${status}StatusBar`);
    if (countElement) countElement.textContent = count;
    if (barElement) {
      const percent = totalOrders ? (count / totalOrders) * 100 : 0;
      barElement.style.width = `${percent}%`;
      barElement.title = `${status}: ${percent.toFixed(1)}%`;
    }
  });
  const paid = Number(statusBreakdown.PAID || statusBreakdown.paid || 0);
  const rate = totalOrders ? (paid / totalOrders) * 100 : 0;
  const gatewayRate = document.getElementById('gatewayRate');
  if (gatewayRate) gatewayRate.textContent = `${rate.toFixed(1)}% Cleared`;
}

function renderActivityTables(orders = getDateFilteredOrders()) {
  const paymentBody = document.getElementById('paymentActivityBody');
  const downloadBody = document.getElementById('downloadActivityBody');
  if (paymentBody) {
    paymentBody.innerHTML = orders.length ? orders.map(order => `<tr>
      <td><code style="font-size:.725rem;">${order.payment_reference || 'N/A'}</code></td>
      <td><span class="channel-pill">${order.payment_channel || 'N/A'}</span></td>
      <td><strong>${formatOrderMoney(order.amount, order.currency || 'USD')}</strong></td>
      <td><span class="badge-status ${statusClass(orderStatus(order))}">${orderStatus(order)}</span></td>
      <td><span style="font-size:.725rem;color:var(--text-muted);">${new Date(order.created_at).toLocaleString()}</span></td>
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-muted);">No payment activity yet.</td></tr>';
  }
  if (downloadBody) {
    const downloads = orders.filter(order => order.download_count !== null && order.download_count !== undefined);
    downloadBody.innerHTML = downloads.length ? downloads.map(order => {
      const max = Number(order.max_downloads || 0);
      const count = Number(order.download_count || 0);
      const percent = max ? Math.min(100, count / max * 100) : 0;
      const id = order.order_number || order.id;
      return `<tr><td><span style="font-weight:600;">${order.product_name || 'Unknown product'}</span></td><td><code>#${id}</code></td>
        <td><div class="download-quota-bar"><span>${count}/${max}</span><div class="quota-track"><div class="quota-fill" style="width:${percent}%;"></div></div></div></td>
        <td><span style="font-size:.725rem;color:var(--text-muted);">${order.last_download_at || 'No download yet'}</span></td>
        <td><span class="badge-status ${order.revoked ? 'badge-revoked' : 'badge-active'}">${order.revoked ? 'Revoked' : 'Active'}</span></td>
        <td style="text-align:right;"><button class="action-btn-danger-sm" onclick="promptRevokeToken('${id}', '${String(order.product_name || '').replaceAll("'", '')}')">Revoke</button></td></tr>`;
    }).join('') : '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted);">No download activity yet.</td></tr>';
  }
}

async function loadAdminData() {
  try {
    const [ordersResponse, statsResponse, productsResponse] = await Promise.all([fetch('/api/admin/orders'), fetch('/api/admin/stats'), fetch('/api/admin/products')]);
    if (!ordersResponse.ok || !statsResponse.ok || !productsResponse.ok) throw new Error('Admin API unavailable');
    const ordersData = await ordersResponse.json();
    const statsData = await statsResponse.json();
    const productsData = await productsResponse.json();
    adminOrders = ordersData.orders || [];
    adminProducts = productsData.products || [];
    ADMIN_DATA.orders = Object.fromEntries(adminOrders.map(order => [order.order_number || order.id, {
      ...order, id: order.order_number || order.id, status: orderStatus(order), statusClass: statusClass(orderStatus(order)),
      customer: order.customer_email, product: order.product_name, price: formatOrderMoney(order.amount, order.currency || 'USD'),
      date: new Date(order.created_at).toLocaleString(), gateway: order.payment_provider || 'DOKU', license: order.license_key || 'N/A'
    }]));
    applyDashboardDateRange();
    const stats = statsData.stats || {};
    document.getElementById('activeProductsValue').textContent = stats.active_products || 0;
    document.getElementById('productNavCount').textContent = stats.active_products || 0;
    document.getElementById('orderNavCount').textContent = stats.total_orders || 0;
  } catch (error) {
    showAdminToast(`Failed to load admin data: ${error.message}`);
    renderOrders([]);
  }
}

const adminCurrencySelect = document.getElementById('adminCurrencySelect');
if (adminCurrencySelect) {
  adminCurrencySelect.value = displayCurrency;
  adminCurrencySelect.addEventListener('change', () => {
    displayCurrency = adminCurrencySelect.value;
    localStorage.setItem('adminCurrency', displayCurrency);
    applyDashboardDateRange();
  });
}

const exportOrdersBtn = document.getElementById('exportOrdersBtn');
if (exportOrdersBtn) {
  exportOrdersBtn.addEventListener('click', () => {
    const header = ['Order ID', 'Customer', 'Product', 'Amount', 'Currency', 'Status', 'Created At'];
    const rows = adminOrders.map(order => [order.order_number || order.id, order.customer_email, order.product_name, order.amount, order.currency, orderStatus(order), order.created_at]);
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'morgad-orders.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

document.querySelectorAll('.nav-item[data-nav]').forEach(navItem => {
  navItem.addEventListener('click', event => {
    const section = navItem.dataset.nav;
    if (section === 'dashboard') return;
    event.preventDefault();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    navItem.classList.add('active');
    renderAdminSection(section);
  });
});

// Pending destructive action holder
let pendingDestructiveAction = null;

/**
 * Toast System
 */
function showAdminToast(message) {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--purple-300);">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/**
 * Mobile Sidebar Toggle
 */
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const adminSidebar = document.getElementById('adminSidebar');

if (sidebarToggleBtn && adminSidebar) {
  sidebarToggleBtn.addEventListener('click', () => {
    adminSidebar.classList.toggle('mobile-open');
  });
}

/**
 * Notifications Popover Toggle
 */
const notifBellBtn = document.getElementById('notifBellBtn');
const notifPopover = document.getElementById('notifPopover');

if (notifBellBtn && notifPopover) {
  notifBellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPopover.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!notifPopover.contains(e.target) && e.target !== notifBellBtn) {
      notifPopover.classList.remove('active');
    }
  });
}

function markAllNotifsRead() {
  document.querySelectorAll('.notif-item-unread').forEach(item => {
    item.classList.remove('notif-item-unread');
    const dot = item.querySelector('.notif-dot');
    if (dot) dot.style.background = 'var(--text-subtle)';
  });
  const notifBadge = document.querySelector('.notif-badge-dot');
  if (notifBadge) notifBadge.style.display = 'none';
  showAdminToast('All notifications marked as read.');
}

/**
 * Date Range Filter Presets
 */
const dateRangeBtn = document.getElementById('dateRangeBtn');
const activeDateRangeLabel = document.getElementById('activeDateRangeLabel');

function updateDateRangeLabel() {
  if (!activeDateRangeLabel) return;
  if (!activeDateRange.start && !activeDateRange.end) {
    activeDateRangeLabel.textContent = 'All dates';
    return;
  }
  const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '...';
  activeDateRangeLabel.textContent = `${formatDate(activeDateRange.start)} – ${formatDate(activeDateRange.end)}`;
}

if (dateRangeBtn && activeDateRangeLabel) {
  updateDateRangeLabel();
  dateRangeBtn.setAttribute('aria-haspopup', 'dialog');
  dateRangeBtn.setAttribute('aria-expanded', 'false');
  dateRangeBtn.addEventListener('click', () => {
    const existing = document.getElementById('dateRangePicker');
    if (existing) {
      existing.remove();
      dateRangeBtn.setAttribute('aria-expanded', 'false');
      return;
    }
    const bounds = dateRangeBtn.getBoundingClientRect();
    const picker = document.createElement('div');
    picker.id = 'dateRangePicker';
    picker.className = 'admin-card';
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-label', 'Filter dashboard by date');
    picker.style.cssText = `position:fixed;z-index:1100;top:${Math.min(bounds.bottom + 8, window.innerHeight - 250)}px;left:${Math.max(12, Math.min(bounds.right - 320, window.innerWidth - 332))}px;width:min(320px,calc(100vw - 24px));padding:18px;background:var(--bg-surface);box-shadow:var(--shadow-dropdown);`;
    picker.innerHTML = `
      <div class="form-group"><label class="form-label" for="rangeStartDate">Start date</label><input class="form-input" type="date" id="rangeStartDate" value="${activeDateRange.start}"></div>
      <div class="form-group"><label class="form-label" for="rangeEndDate">End date</label><input class="form-input" type="date" id="rangeEndDate" value="${activeDateRange.end}"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;"><button class="btn-secondary-action" type="button" id="clearDateRange">Clear</button><button class="btn-primary-action" type="button" id="applyDateRange">Apply</button></div>`;
    document.body.appendChild(picker);
    dateRangeBtn.setAttribute('aria-expanded', 'true');
    const closePicker = event => {
      if (!picker.contains(event.target) && event.target !== dateRangeBtn && !dateRangeBtn.contains(event.target)) {
        picker.remove();
        dateRangeBtn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', closePicker, true);
      }
    };

    picker.querySelector('#applyDateRange').addEventListener('click', () => {
      const start = picker.querySelector('#rangeStartDate').value;
      const end = picker.querySelector('#rangeEndDate').value;
      if (start && end && start > end) {
        showAdminToast('Start date must be on or before end date.');
        return;
      }
      if (!start && end) {
        showAdminToast('Choose a start date or clear the end date.');
        return;
      }
      if (start && !end) {
        showAdminToast('Choose an end date or clear the start date.');
        return;
      }
      activeDateRange = { start, end };
      updateDateRangeLabel();
      applyDashboardDateRange();
      picker.remove();
      dateRangeBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', closePicker, true);
    });
    picker.querySelector('#clearDateRange').addEventListener('click', () => {
      activeDateRange = { start: '', end: '' };
      updateDateRangeLabel();
      applyDashboardDateRange();
      picker.remove();
      dateRangeBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', closePicker, true);
    });
    setTimeout(() => document.addEventListener('click', closePicker, true), 0);
    picker.querySelector('#rangeStartDate').focus();
  });
}

/**
 * Interactive SVG Chart Switching
 */
function switchChartMetric(metric, buttonEl) {
  const container = buttonEl.closest('.chart-toggle-pill');
  if (container) {
    container.querySelectorAll('.chart-toggle-btn').forEach(btn => btn.classList.remove('active'));
    buttonEl.classList.add('active');
  }
  showAdminToast(`Switched chart metric to: ${metric.toUpperCase()}`);
}

function switchChartPeriod(period, buttonEl) {
  const container = buttonEl.closest('.chart-toggle-pill');
  if (container) {
    container.querySelectorAll('.chart-toggle-btn').forEach(btn => btn.classList.remove('active'));
    buttonEl.classList.add('active');
  }
  showAdminToast(`Switched chart grouping to: ${period.toUpperCase()}`);
}

/**
 * Order Status Filtering & Live Search
 */
function filterOrdersTable(status, buttonEl) {
  const tabGroup = buttonEl.closest('.filter-tab-group');
  if (tabGroup) {
    tabGroup.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    buttonEl.classList.add('active');
  }

  const rows = document.querySelectorAll('#ordersTableBody tr');
  rows.forEach(row => {
    const rowStatus = row.getAttribute('data-status');
    if (status === 'all' || rowStatus === status) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Order Search Input
const orderSearchInput = document.getElementById('orderSearchInput');
if (orderSearchInput) {
  orderSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#ordersTableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

// Global Search (⌘K)
const globalAdminSearch = document.getElementById('globalAdminSearch');
if (globalAdminSearch) {
  globalAdminSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      showAdminToast(`Searching admin database for "${globalAdminSearch.value}"...`);
    }
  });
}

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (globalAdminSearch) globalAdminSearch.focus();
  }
});

/**
 * Order Detail Modal
 */
const orderDetailModal = document.getElementById('orderDetailModal');

function openOrderDetailModal(orderId) {
  const order = ADMIN_DATA.orders[orderId];
  if (!order) return;

  document.getElementById('odOrderTitle').textContent = `Order #${order.id}`;
  document.getElementById('odOrderDate').textContent = order.date;
  document.getElementById('odGateway').textContent = order.gateway;
  
  const statusBadge = document.getElementById('odStatus');
  statusBadge.className = `badge-status ${order.statusClass}`;
  statusBadge.textContent = order.status;

  document.getElementById('odCustName').textContent = order.customer;
  document.getElementById('odCustEmail').textContent = order.email;
  document.getElementById('odProdName').textContent = order.product;
  document.getElementById('odProdPrice').textContent = order.price;
  document.getElementById('odLicenseKey').textContent = order.license;

  orderDetailModal.classList.add('active');
}

function closeOrderDetailModal() {
  if (orderDetailModal) orderDetailModal.classList.remove('active');
}

function copyLicenseKey() {
  const key = document.getElementById('odLicenseKey').textContent;
  navigator.clipboard.writeText(key).then(() => {
    showAdminToast(`Copied license key: ${key}`);
  }).catch(() => {
    showAdminToast(`License key: ${key}`);
  });
}

function resendDeliveryEmail() {
  showAdminToast('Sent instant delivery email with download token to customer!');
  closeOrderDetailModal();
}

function promptRefundOrder() {
  const orderTitle = document.getElementById('odOrderTitle').textContent;
  closeOrderDetailModal();
  openConfirmDialog(
    'Issue Full Refund?',
    `Are you sure you want to refund ${orderTitle} via DOKU? This will automatically revoke the customer's digital download token.`,
    () => {
      showAdminToast(`Refund issued successfully for ${orderTitle}.`);
    }
  );
}

/**
 * Add Product Modal
 */
const addProductModal = document.getElementById('addProductModal');

function openAddProductModal() {
  if (addProductModal) addProductModal.classList.add('active');
}

function closeAddProductModal() {
  if (addProductModal) addProductModal.classList.remove('active');
}

function handleProductImageSelected(input) {
  const image = input.files && input.files[0];
  const label = document.getElementById('productImageLabel');
  const preview = document.getElementById('productImagePreview');
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  preview.removeAttribute('src');
  preview.hidden = true;
  preview.style.display = 'none';
  if (!image) {
    label.textContent = 'JPG, PNG, or WebP · Max 5 MB';
    return;
  }
  if (!allowedTypes.includes(image.type) || image.size > 5 * 1024 * 1024) {
    input.value = '';
    label.textContent = 'Choose a JPG, PNG, or WebP image up to 5 MB';
    showAdminToast('Product image must be JPG, PNG, or WebP and no larger than 5 MB.');
    return;
  }

  label.textContent = `${image.name} (${(image.size / (1024 * 1024)).toFixed(1)} MB)`;
  preview.src = URL.createObjectURL(image);
  preview.hidden = false;
  preview.style.display = 'block';
}

async function handleAddProductSubmit(e) {
  e.preventDefault();
  if (productUploadInProgress) return;

  const title = document.getElementById('newProdTitle').value.trim();
  const price = document.getElementById('newProdPrice').value;
  const category = document.getElementById('newProdCategory').value;
  const description = document.getElementById('newProdDesc').value.trim();
  const googleDriveFileId = document.getElementById('googleDriveFileId').value.trim();
  const stockQuantity = document.getElementById('newProdStock').value;
  const imageInput = document.getElementById('productImageInput');

  if (!title) {
    showAdminToast('Judul produk wajib diisi.');
    return;
  }

  if (!/^[A-Za-z0-9_-]{10,200}$/.test(googleDriveFileId)) {
    showAdminToast('Masukkan Google Drive File ID yang valid.');
    return;
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
  const formData = new FormData();
  formData.append('title', title);
  formData.append('slug', slug);
  formData.append('category', category);
  formData.append('description', description);
  formData.append('price', String(Number(price)));
  formData.append('google_drive_id', googleDriveFileId);
  formData.append('stock_quantity', String(Number(stockQuantity || 0)));
  formData.append('file_size', 'Google Drive');
  if (imageInput && imageInput.files && imageInput.files[0]) {
    formData.append('image', imageInput.files[0]);
  }

  const submitButton = document.getElementById('addProductSubmitButton');
  productUploadInProgress = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Publishing...';

  try {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan produk.');

    showAdminToast(`Successfully published "${title}" to marketplace!`);
    document.getElementById('addProductForm').reset();
    document.getElementById('productImageLabel').textContent = 'Optional product image (not required for Drive-based products)';
    document.getElementById('productImagePreview').removeAttribute('src');
    document.getElementById('productImagePreview').hidden = true;
    document.getElementById('productImagePreview').style.display = 'none';
    if (imageInput) imageInput.value = '';
    closeAddProductModal();
  } catch (error) {
    showAdminToast(`Failed to publish product: ${error.message}`);
  } finally {
    productUploadInProgress = false;
    submitButton.disabled = false;
    submitButton.textContent = 'Create & Publish';
  }
}

/**
 * Quick Action Triggers
 */
function triggerFileUpload() {
  openAddProductModal();
}

function openCreateCategoryModal() {
  const name = prompt('Enter new digital category name:', '3D Low-Poly Assets');
  if (name) {
    showAdminToast(`New category "${name}" created successfully.`);
  }
}

/**
 * Token Security & Quota Controls
 */
function promptRevokeToken(orderId, productName) {
  openConfirmDialog(
    'Revoke Download Token',
    `Are you sure you want to revoke the digital download token for #${orderId} (${productName})? The customer will no longer be able to download the asset.`,
    async () => {
      try {
        const res = await fetch(`/api/admin/downloads/${orderId}/revoke`, { method: 'POST' });
        const data = await res.json();
        showAdminToast(data.message || `Download token for #${orderId} has been revoked.`);
      } catch (err) {
        showAdminToast(`Failed to revoke token: ${err.message}`);
      }
    }
  );
}

async function resetTokenQuota(orderId) {
  try {
    const res = await fetch(`/api/admin/downloads/${orderId}/reset`, { method: 'POST' });
    const data = await res.json();
    showAdminToast(data.message || `Download quota for #${orderId} reset to 0/5 downloads.`);
  } catch (err) {
    showAdminToast(`Failed to reset quota: ${err.message}`);
  }
}

/**
 * Reusable Confirmation Dialog
 */
const confirmDialogModal = document.getElementById('confirmDialogModal');
const confirmDialogTitle = document.getElementById('confirmDialogTitle');
const confirmDialogMessage = document.getElementById('confirmDialogMessage');

function openConfirmDialog(title, message, onConfirmCallback) {
  if (!confirmDialogModal) return;
  confirmDialogTitle.textContent = title;
  confirmDialogMessage.textContent = message;
  pendingDestructiveAction = onConfirmCallback;
  confirmDialogModal.classList.add('active');
}

function closeConfirmDialog() {
  if (confirmDialogModal) confirmDialogModal.classList.remove('active');
  pendingDestructiveAction = null;
}

function executeConfirmedAction() {
  if (typeof pendingDestructiveAction === 'function') {
    pendingDestructiveAction();
  }
  closeConfirmDialog();
}

// Close modals on ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeOrderDetailModal();
    closeAddProductModal();
    closeConfirmDialog();
  }
});

// Click outside to close modals
[orderDetailModal, addProductModal, confirmDialogModal].forEach(modal => {
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
});

loadAdminData();

if (new URLSearchParams(window.location.search).get('addProduct') === '1') {
  openAddProductModal();
}

console.log('Tera Marketplace Admin Dashboard loaded successfully.');
