// 在页面加载时导入所需的模块
const { ipcRenderer } = require('electron');

// DOM 元素
let sidebarItems;
let pages;
let configButtonsContainer;
let configList;
let addConfigButton;
let addConfigSettings;
let configModal;
let configForm;
let closeModalBtn;
let cancelModalBtn;
let modalTitle;
let configNameInput;
let configKeyInput;
let baseUrlInput;
let apiKeyInput;
let modelInput;
let editModeInput;
let originalKeyInput;
let notification;

// 全局变量
let configs = {};
let firstTimeLoad = true;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('页面加载完成，开始初始化');
  
  // 初始化DOM元素引用
  sidebarItems = document.querySelectorAll('.sidebar-menu .menu-item');
  pages = document.querySelectorAll('.page');
  configButtonsContainer = document.getElementById('config-buttons-container');
  configList = document.getElementById('config-list');
  addConfigButton = document.getElementById('add-config-button');
  addConfigSettings = document.getElementById('add-config-settings');
  configModal = document.getElementById('config-modal');
  configForm = document.getElementById('config-form');
  closeModalBtn = document.getElementById('close-modal');
  cancelModalBtn = document.getElementById('cancel-modal');
  modalTitle = document.getElementById('modal-title');
  configNameInput = document.getElementById('configName');
  configKeyInput = document.getElementById('configKey');
  baseUrlInput = document.getElementById('baseUrl');
  apiKeyInput = document.getElementById('apiKey');
  modelInput = document.getElementById('model');
  editModeInput = document.getElementById('editMode');
  originalKeyInput = document.getElementById('originalKey');
  notification = document.getElementById('notification');

  // 预设配置，如果没有保存过配置的话
  if (!localStorage.getItem('first-init')) {
    console.log('首次初始化，添加预设配置');
    // 添加基础配置
    const defaultConfigs = {
    
    };

    // 逐个添加默认配置
    Object.entries(defaultConfigs).forEach(async ([key, config]) => {
      try {
        console.log(`添加默认配置: ${key}`);
        await ipcRenderer.invoke('update-config', key, config);
      } catch (error) {
        console.error(`添加默认配置 ${key} 失败:`, error);
      }
    });

    localStorage.setItem('first-init', 'true');
  }
  
  // 绑定事件处理
  bindEvents();
  
  // 初始化页面
  initPage();
});

// 绑定所有事件处理
function bindEvents() {
  // 侧边栏菜单点击事件
  sidebarItems.forEach(item => {
    item.onclick = function() {
      const targetPage = this.getAttribute('data-page');
      console.log('点击菜单项, 目标页面:', targetPage);
      
      // 更新侧边栏选中状态
      sidebarItems.forEach(menuItem => {
        menuItem.classList.remove('active');
      });
      this.classList.add('active');
      
      // 切换页面
      pages.forEach(page => {
        page.classList.remove('active');
      });
      document.getElementById(targetPage).classList.add('active');
    };
  });
  
  // 添加配置按钮点击事件
  addConfigButton.onclick = function() {
    console.log('点击添加配置按钮 (主页)');
    showConfigModal('add');
  };
  
  addConfigSettings.onclick = function() {
    console.log('点击添加配置按钮 (设置页)');
    showConfigModal('add');
  };
  
  // 关闭弹框按钮点击事件
  closeModalBtn.onclick = function() {
    closeConfigModal();
  };
  
  cancelModalBtn.onclick = function() {
    closeConfigModal();
  };
  
  // 配置表单提交事件
  configForm.onsubmit = function(e) {
    saveConfig(e);
  };
  
  // 监听来自主进程的消息
  ipcRenderer.on('claude-error', (_, message) => {
    console.log('收到Claude错误:', message);
    showNotification(`错误: ${message}`, true);
  });
  
  ipcRenderer.on('claude-not-installed', () => {
    console.log('Claude未安装');
    const confirmed = confirm('Claude未安装，是否前往下载？');
    if (confirmed) {
      ipcRenderer.send('open-claude-download');
    }
  });
  
  ipcRenderer.on('claude-launched', (_, configKey) => {
    console.log('Claude已启动:', configKey);
    showNotification(`已成功启动 ${configs[configKey]?.name || configKey} 配置的Claude`);
  });
  
  ipcRenderer.on('config-updated', () => {
    console.log('配置已更新，重新加载');
    initPage();
  });
}

// 初始化页面
async function initPage() {
  try {
    console.log('正在初始化页面...');
    // 获取所有配置
    configs = await ipcRenderer.invoke('get-all-configs');
    console.log('获取的配置:', configs);
    
    // 渲染主页按钮
    renderConfigButtons();
    
    // 渲染设置页面的配置列表
    renderConfigList();
    
    // 首次加载检查是否需要进行配置
    if (firstTimeLoad && Object.keys(configs).length === 0) {
      showConfigModal('add');
      firstTimeLoad = false;
    }
  } catch (error) {
    console.error('初始化失败:', error);
    showNotification('加载配置失败', true);
  }
}

// 渲染主页配置按钮
function renderConfigButtons() {
  console.log('正在渲染配置按钮...');
  
  // 先清除所有已有的按钮（除了添加按钮）
  const existingButtons = configButtonsContainer.querySelectorAll('.config-button:not(.add-config-button)');
  existingButtons.forEach(button => button.remove());
  
  // 遍历所有配置，创建按钮
  Object.entries(configs).forEach(([key, config]) => {
    console.log('创建按钮:', key, config);
    const button = document.createElement('button');
    button.className = 'config-button';
    button.setAttribute('data-config', key);
    button.setAttribute('data-type', key.includes('custom-') ? 'custom' : key);
    
    button.innerHTML = `
      <span class="icon">${getIconForConfig(key)}</span>
      <div class="button-name">${config.name}</div>
    `;
    
    // 使用直接事件绑定而不是在创建时绑定
    configButtonsContainer.insertBefore(button, addConfigButton);
  });
  
  // 为所有配置按钮添加点击事件（包括新添加的）
  document.querySelectorAll('.config-button:not(.add-config-button)').forEach(button => {
    button.onclick = function() {
      const configKey = this.getAttribute('data-config');
      console.log('点击了配置按钮:', configKey);
      launchClaude(configKey);
    };
  });
}

// 为配置选择合适的图标
function getIconForConfig(configKey) {
  const icons = {
    'kimi2-1': '🟢',
    'kimi2-pro': '🔵',
    'qwen': '🟣',
    'custom': '🟠'
  };
  
  if (configKey in icons) {
    return icons[configKey];
  }
  
  return '🟠'; // 默认图标
}

// 渲染设置页面的配置列表
function renderConfigList() {
  console.log('正在渲染配置列表...');
  configList.innerHTML = '';
  
  Object.entries(configs).forEach(([key, config]) => {
    const item = document.createElement('div');
    item.className = 'config-item';
    
    item.innerHTML = `
      <div class="config-item-name">${config.name}</div>
      <div class="config-item-actions">
        <button class="edit-button" data-key="${key}">编辑</button>
        <button class="delete-button" data-key="${key}">删除</button>
      </div>
    `;
    
    configList.appendChild(item);
  });
  
  // 添加编辑和删除按钮的点击事件
  document.querySelectorAll('.edit-button').forEach(button => {
    button.onclick = function() {
      const key = this.getAttribute('data-key');
      console.log('编辑配置:', key);
      showConfigModal('edit', key);
    };
  });
  
  document.querySelectorAll('.delete-button').forEach(button => {
    button.onclick = function() {
      const key = this.getAttribute('data-key');
      console.log('删除配置:', key);
      if (confirm(`确定要删除配置 "${configs[key].name}" 吗？`)) {
        deleteConfig(key);
      }
    };
  });
}

// 显示通知
function showNotification(message, isError = false) {
  console.log('显示通知:', message, isError ? '(错误)' : '');
  notification.textContent = message;
  notification.className = `notification ${isError ? 'error' : ''}`;
  
  // 显示通知
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // 3秒后隐藏通知
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// 显示配置弹框
function showConfigModal(mode, configKey = null) {
  console.log('显示配置弹框:', mode, configKey);
  // 设置弹框模式（添加/编辑）
  editModeInput.value = mode;
  
  if (mode === 'edit' && configKey) {
    modalTitle.textContent = '编辑配置';
    const config = configs[configKey];
    
    configNameInput.value = config.name;
    configKeyInput.value = configKey;
    baseUrlInput.value = config.baseUrl;
    apiKeyInput.value = config.apiKey;
    modelInput.value = config.model || '';
    originalKeyInput.value = configKey;
    
    // 配置键在编辑模式下不可更改
    configKeyInput.disabled = true;
  } else {
    modalTitle.textContent = '添加配置';
    configForm.reset();
    originalKeyInput.value = '';
    configKeyInput.disabled = false;
  }
  
  configModal.classList.add('active');
}

// 关闭配置弹框
function closeConfigModal() {
  console.log('关闭配置弹框');
  configModal.classList.remove('active');
  configForm.reset();
}

// 启动Claude
function launchClaude(configKey) {
  console.log('正在启动Claude, 配置键:', configKey);
  if (!configs[configKey]) {
    showNotification(`配置 "${configKey}" 不存在`, true);
    return;
  }
  
  // 发送启动Claude的消息到主进程
  showNotification(`正在启动 ${configs[configKey]?.name || configKey}...`);
  ipcRenderer.send('launch-claude', configKey);
}

// 保存配置
async function saveConfig(e) {
  e.preventDefault();
  console.log('保存配置表单提交');
  
  const name = configNameInput.value.trim();
  const key = configKeyInput.value.trim();
  const baseUrl = baseUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  const mode = editModeInput.value;
  const originalKey = originalKeyInput.value;
  
  console.log('配置数据:', { name, key, baseUrl, apiKey, model, mode, originalKey });
  
  if (!name || !key || !baseUrl || !apiKey) {
    showNotification('请填写所有必填字段', true);
    return;
  }
  
  // 检查配置键是否已存在（在添加模式下）
  if (mode === 'add' && configs[key]) {
    showNotification(`配置键 "${key}" 已存在`, true);
    return;
  }
  
  const newConfig = {
    name,
    baseUrl,
    apiKey,
  };
  
  if (model) {
    newConfig.model = model;
  }
  
  try {
    if (mode === 'edit' && originalKey !== key) {
      // 如果编辑时更改了键，先删除旧的，再添加新的
      await ipcRenderer.invoke('delete-config', originalKey);
    }
    
    // 更新配置
    const result = await ipcRenderer.invoke('update-config', key, newConfig);
    console.log('更新配置结果:', result);
    
    // 重新获取所有配置
    configs = await ipcRenderer.invoke('get-all-configs');
    console.log('获取更新后的配置:', configs);
    
    // 重新渲染UI
    renderConfigButtons();
    renderConfigList();
    
    closeConfigModal();
    showNotification('配置已保存');
  } catch (error) {
    console.error('保存配置失败:', error);
    showNotification('保存配置失败', true);
  }
}

// 删除配置
async function deleteConfig(key) {
  console.log('删除配置:', key);
  try {
    const result = await ipcRenderer.invoke('delete-config', key);
    console.log('删除配置结果:', result);
    
    // 重新获取所有配置
    configs = await ipcRenderer.invoke('get-all-configs');
    console.log('获取更新后的配置:', configs);
    
    // 重新渲染UI
    renderConfigButtons();
    renderConfigList();
    
    showNotification('配置已删除');
  } catch (error) {
    console.error('删除配置失败:', error);
    showNotification('删除配置失败', true);
  }
}

// 添加全局错误处理
window.onerror = function(message, source, lineno, colno, error) {
  console.error('全局错误:', message, source, lineno, colno, error);
  showNotification(`发生错误: ${message}`, true);
}; 