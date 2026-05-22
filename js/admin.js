// 咕宝聚合指南 — 管理后台逻辑
let adminCategories = [];
let adminLinks = [];
let selectedCategoryId = null;
let adminPassword = '';

// ====== 工具函数 ======
function $(id) { return document.getElementById(id); }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ====== 带错误处理的 REST 封装 ======
async function apiGet(path) {
  try {
    return await supabaseFetch(path);
  } catch (err) {
    return null;
  }
}

async function apiMutate(method, path, body) {
  try {
    const opts = { method };
    if (body) { opts.body = JSON.stringify(body); }
    await supabaseFetch(path, opts);
    return true;
  } catch (err) {
    showToast('操作失败：' + err.message);
    return false;
  }
}

// ====== 密码门 ======
async function loadAdminPassword() {
  const data = await apiGet('config?select=value&key=eq.admin_password');
  if (!data || data.length === 0) { showToast('密码配置加载失败，请刷新页面重试'); adminPassword = null; return; }
  adminPassword = data[0].value;
}

async function initLogin() {
  await loadAdminPassword();
  $('loginBtn').addEventListener('click', async () => {
    if (adminPassword === null || adminPassword === '') {
      showToast('密码配置异常，请刷新页面重试');
      return;
    }
    const btn = $('loginBtn');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '验证中...';
    const input = $('passwordInput').value;
    if (input === adminPassword) {
      $('passwordGate').style.display = 'none';
      $('adminPanel').style.display = 'flex';
      $('adminPanel').style.flexDirection = 'column';
      loadAdminData();
    } else {
      btn.disabled = false;
      btn.textContent = origText;
      $('passwordError').style.display = 'block';
    }
  });
  $('passwordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('loginBtn').click();
  });
  $('logoutBtn').addEventListener('click', () => {
    $('adminPanel').style.display = 'none';
    $('passwordGate').style.display = 'flex';
    $('passwordInput').value = '';
    $('passwordError').style.display = 'none';
  });
}

// ====== 数据加载 ======
async function loadAdminData() {
  const [cats, lnks] = await Promise.all([
    apiGet('categories?select=*&order=sort_order'),
    apiGet('links?select=*&order=sort_order')
  ]);
  if (!cats) { showToast('分类数据加载失败'); return; }
  if (!lnks) { showToast('链接数据加载失败'); return; }
  adminCategories = cats;
  adminLinks = lnks;
  renderSidebar();
  if (adminCategories.length > 0) {
    selectCategory(adminCategories[0].id);
  }
}

// ====== 侧边栏渲染 ======
function renderSidebar() {
  const list = $('catList');
  list.innerHTML = adminCategories.map(cat => {
    const count = adminLinks.filter(l => l.category_id === cat.id).length;
    return `
      <div class="cat-item${cat.id === selectedCategoryId ? ' active' : ''}" data-id="${cat.id}" onclick="selectCategory(${cat.id})">
        <span>${escapeHtml(cat.icon)}</span>
        <span>${escapeHtml(cat.name)}</span>
        <span class="cat-count">${count}</span>
        <span class="cat-actions">
          <button class="btn-icon" onclick="event.stopPropagation();editCategory(${cat.id})" title="编辑">✏️</button>
          <button class="btn-icon danger" onclick="event.stopPropagation();deleteCategory(${cat.id})" title="删除">🗑️</button>
        </span>
      </div>`;
  }).join('');
}

function selectCategory(id) {
  selectedCategoryId = id;
  renderSidebar();
  renderLinks();
}

// ====== 链接列表渲染 ======
function renderLinks() {
  const cat = adminCategories.find(c => c.id === selectedCategoryId);
  if (!cat) { $('linkRows').innerHTML = ''; return; }

  const catLinks = adminLinks.filter(l => l.category_id === selectedCategoryId);
  $('mainTitle').textContent = `${cat.icon} ${cat.name}`;
  $('mainCount').textContent = `${catLinks.length} 个链接`;
  $('btnAddLink').style.display = 'block';

  $('linkRows').innerHTML = catLinks.map(link => `
    <div class="link-row">
      <span class="lr-name">${escapeHtml(link.name)}</span>
      <span class="lr-url">${escapeHtml(link.url)}</span>
      <span class="lr-actions">
        <button class="btn-icon" onclick="editLink(${link.id})" title="编辑">✏️</button>
        <button class="btn-icon danger" onclick="deleteLink(${link.id})" title="删除">🗑️</button>
      </span>
    </div>
  `).join('') || '<div class="empty-state">暂无链接，点击下方按钮添加</div>';
}

// ====== Modal ======
function openModal(title, fields, onSave) {
  const overlay = $('modalOverlay');
  $('modalContent').innerHTML = `
    <h4>${escapeHtml(title)}</h4>
    ${fields.map(f => f.type === 'delete'
      ? `<p style="color:#8899bb;font-size:14px;margin-top:8px;">${escapeHtml(f.label)}</p>`
      : `<label>${escapeHtml(f.label)}</label>
        ${f.type === 'textarea'
          ? `<textarea id="field_${f.key}" placeholder="${escapeHtml(f.placeholder || '')}">${escapeHtml(f.value || '')}</textarea>`
          : `<input type="text" id="field_${f.key}" placeholder="${escapeHtml(f.placeholder || '')}" value="${escapeHtml(f.value || '')}">`}`
    ).join('')}
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      ${fields.some(f => f.type === 'delete')
        ? `<button class="btn-delete-confirm" id="btnSave">确认删除</button>`
        : `<button class="btn-save" id="btnSave">保存</button>`}
    </div>
  `;
  overlay.classList.add('show');
  $('btnSave').addEventListener('click', async () => {
    $('btnSave').disabled = true;
    const isEmpty = fields.some(f => f.type !== 'delete' && f.key !== 'description' && !document.getElementById(`field_${f.key}`).value.trim());
    if (isEmpty) { showToast('请填写必填字段'); $('btnSave').disabled = false; return; }
    const values = {};
    fields.filter(f => f.type !== 'delete').forEach(f => {
      values[f.key] = document.getElementById(`field_${f.key}`).value;
    });
    const result = await onSave(values);
    if (result !== false) {
      closeModal();
    } else {
      $('btnSave').disabled = false;
    }
  });
}

function closeModal() {
  $('modalOverlay').classList.remove('show');
}

// ====== 分类 CRUD ======
function editCategory(id) {
  const cat = adminCategories.find(c => c.id === id);
  if (!cat) return;
  openModal('编辑分类', [
    { key: 'name', label: '名称', value: cat.name },
    { key: 'icon', label: '图标 (emoji)', value: cat.icon, placeholder: '例如 🎬' }
  ], async (values) => {
    const ok = await apiMutate('PATCH', `categories?id=eq.${id}`, { name: values.name, icon: values.icon });
    if (!ok) return false;
    showToast('分类已更新');
    loadAdminData();
  });
}

async function deleteCategory(id) {
  const cat = adminCategories.find(c => c.id === id);
  if (!cat) return;
  openModal(`删除分类: ${cat.icon} ${cat.name}`, [
    { key: 'confirm', label: '删除分类将同时删除该分类下的所有链接，确定要删除吗？', type: 'delete' }
  ], async () => {
    const ok = await apiMutate('DELETE', `categories?id=eq.${id}`);
    if (!ok) return false;
    showToast('分类已删除');
    selectedCategoryId = null;
    loadAdminData();
  });
}

async function addCategory() {
  openModal('添加分类', [
    { key: 'name', label: '名称', placeholder: '例如 学习' },
    { key: 'icon', label: '图标 (emoji)', placeholder: '例如 📚' }
  ], async (values) => {
    const maxSort = adminCategories.reduce((max, c) => Math.max(max, c.sort_order), 0);
    const ok = await apiMutate('POST', 'categories', {
      name: values.name, icon: values.icon || '📌', sort_order: maxSort + 1
    });
    if (!ok) return false;
    showToast('分类已添加');
    loadAdminData();
  });
}

// ====== 链接 CRUD ======
function editLink(id) {
  const link = adminLinks.find(l => l.id === id);
  if (!link) return;
  openModal('编辑链接', [
    { key: 'name', label: '网站名称', value: link.name },
    { key: 'url', label: '网址', value: link.url, placeholder: 'https://...' },
    { key: 'description', label: '描述', value: link.description || '', type: 'textarea', placeholder: '简短描述' }
  ], async (values) => {
    const ok = await apiMutate('PATCH', `links?id=eq.${id}`, {
      name: values.name, url: values.url, description: values.description
    });
    if (!ok) return false;
    showToast('链接已更新');
    loadAdminData();
  });
}

async function deleteLink(id) {
  const link = adminLinks.find(l => l.id === id);
  if (!link) return;
  openModal(`删除链接: ${link.name}`, [
    { key: 'confirm', label: '确定要删除这个链接吗？', type: 'delete' }
  ], async () => {
    const ok = await apiMutate('DELETE', `links?id=eq.${id}`);
    if (!ok) return false;
    showToast('链接已删除');
    loadAdminData();
  });
}

async function addLink() {
  if (!selectedCategoryId) return;
  openModal('添加链接', [
    { key: 'name', label: '网站名称', placeholder: '例如 低端影视' },
    { key: 'url', label: '网址', placeholder: 'https://...' },
    { key: 'description', label: '描述', type: 'textarea', placeholder: '简短描述（可选）' }
  ], async (values) => {
    const catLinks = adminLinks.filter(l => l.category_id === selectedCategoryId);
    const maxSort = catLinks.reduce((max, l) => Math.max(max, l.sort_order), 0);
    const ok = await apiMutate('POST', 'links', {
      category_id: selectedCategoryId,
      name: values.name, url: values.url, description: values.description || '',
      sort_order: maxSort + 1
    });
    if (!ok) return false;
    showToast('链接已添加');
    loadAdminData();
  });
}

// ====== 事件绑定 ======
$('btnAddCat').addEventListener('click', addCategory);
$('btnAddLink').addEventListener('click', addLink);

// 关闭 modal（点击遮罩）
$('modalOverlay').addEventListener('click', (e) => {
  if (e.target === $('modalOverlay')) closeModal();
});

document.addEventListener('DOMContentLoaded', initLogin);
