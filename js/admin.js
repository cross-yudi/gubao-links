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

// ====== 密码门 ======
async function loadAdminPassword() {
  const { data, error } = await supabase.from('config').select('value').eq('key', 'admin_password').single();
  if (error) { console.error('加载密码配置失败:', error); return; }
  adminPassword = data.value;
}

async function initLogin() {
  await loadAdminPassword();
  $('loginBtn').addEventListener('click', () => {
    const input = $('passwordInput').value;
    if (input === adminPassword) {
      $('passwordGate').style.display = 'none';
      $('adminPanel').style.display = 'flex';
      $('adminPanel').style.flexDirection = 'column';
      loadAdminData();
    } else {
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
  const [catRes, linkRes] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('links').select('*').order('sort_order')
  ]);
  if (catRes.error) { console.error(catRes.error); return; }
  if (linkRes.error) { console.error(linkRes.error); return; }
  adminCategories = catRes.data;
  adminLinks = linkRes.data;
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

document.addEventListener('DOMContentLoaded', initLogin);
