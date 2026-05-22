// 咕宝聚合指南 — 主页逻辑
let categories = [];
let links = [];
let activeCategoryId = null;

// 加载数据
async function loadData() {
  try {
    [categories, links] = await Promise.all([
      supabaseFetch('categories?select=*&order=sort_order'),
      supabaseFetch('links?select=*&order=sort_order')
    ]);
  } catch (err) {
    console.error('加载失败:', err);
    document.getElementById('linkList').innerHTML = '<div class="empty-state">数据加载失败，请刷新页面重试 😞</div>';
    return;
  }

  if (categories.length > 0) {
    activeCategoryId = categories[0].id;
    renderTabs();
    renderLinks();
  }
}

// 渲染分类 Tab
function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = categories.map(cat =>
    `<button class="tab${cat.id === activeCategoryId ? ' active' : ''}" data-id="${cat.id}">
      ${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}
    </button>`
  ).join('');

  tabsEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategoryId = parseInt(btn.dataset.id);
      renderTabs();
      renderLinks();
    });
  });
}

// 渲染链接列表
function renderLinks(filterText = '') {
  const activeCat = categories.find(c => c.id === activeCategoryId);
  const titleEl = document.getElementById('sectionTitle');
  const listEl = document.getElementById('linkList');

  let filteredLinks;
  if (filterText) {
    filteredLinks = links.filter(l =>
      l.name.toLowerCase().includes(filterText) ||
      (l.description && l.description.toLowerCase().includes(filterText))
    );
  } else {
    filteredLinks = links.filter(l => l.category_id === activeCategoryId);
  }

  if (filterText) {
    titleEl.textContent = `搜索结果 · ${filteredLinks.length} 个`;
  } else {
    titleEl.textContent = activeCat ? `${activeCat.icon} ${activeCat.name} · ${filteredLinks.length} 个网站` : '';
  }

  if (filteredLinks.length === 0) {
    listEl.innerHTML = '<div class="empty-state">没有找到匹配的网站 🤔</div>';
    return;
  }

  listEl.innerHTML = filteredLinks.map(link => `
    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card">
      <span class="link-icon">${activeCat ? activeCat.icon : '🔗'}</span>
      <div class="link-info">
        <div class="link-name">${escapeHtml(link.name)}</div>
        ${link.description ? `<div class="link-desc">${escapeHtml(link.description)}</div>` : ''}
      </div>
    </a>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 搜索处理
function initSearch() {
  const input = document.getElementById('searchInput');
  const container = document.querySelector('.container');
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const val = input.value.trim().toLowerCase();
      if (val) {
        container.classList.add('search-mode');
        activeCategoryId = null;
        renderTabs();
        renderLinks(val);
      } else {
        container.classList.remove('search-mode');
        activeCategoryId = categories.length > 0 ? categories[0].id : null;
        renderTabs();
        renderLinks();
      }
    }, 200);
  });
}

// 启动
loadData().then(() => initSearch());
