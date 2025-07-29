// 在页面加载时导入所需的模块
const { ipcRenderer } = require('electron');

// DOM 元素
let sidebarItems;
let pages;
let configButtonsContainer;
let configList;
let currentConfigInfo;
let addConfigButton;
let addConfigSettings;
let configModal;
let configForm;
let closeModalBtn;
let cancelModalBtn;
let modalTitle;
let configNameInput;
let configKeyInput;
let configAliasInput;
let baseUrlInput;
let apiKeyInput;
let modelInput;
let editModeInput;
let originalKeyInput;
let notification;
let resetConfigButton;
let dirSelectModal;
let dirSelectContent;
let dirSelectList;
let dirSelectPath;
let closeDirModalBtn;
let cancelDirModalBtn;
let selectDirBtn;
let claudeCheckOverlay;
let claudeCheckMessage;
let claudeCheckSpinner;
let claudeProgressBar;
let claudeCheckActions;
let claudeInstallBtn;
let claudeSkipBtn;
let themeSwitch; // 添加主题切换按钮引用

// 全局变量
let configs = {};
let activeConfigKey = '';
let firstTimeLoad = true;
let currentDirPath = '';
let selectedConfigKey = '';
let claudeInstalled = false;
let currentTheme = 'light'; // 添加主题设置变量

// 默认配置定义
const defaultConfigs = {
  
};

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
  configAliasInput = document.getElementById('configAlias');
  baseUrlInput = document.getElementById('baseUrl');
  apiKeyInput = document.getElementById('apiKey');
  modelInput = document.getElementById('model');
  editModeInput = document.getElementById('editMode');
  originalKeyInput = document.getElementById('originalKey');
  notification = document.getElementById('notification');
  resetConfigButton = document.getElementById('reset-config-button');
  dirSelectModal = document.getElementById('dir-select-modal');
  dirSelectContent = document.getElementById('dir-select-content');
  dirSelectList = document.getElementById('dir-select-list');
  dirSelectPath = document.getElementById('dir-select-path');
  closeDirModalBtn = document.getElementById('close-dir-modal');
  cancelDirModalBtn = document.getElementById('cancel-dir-modal');
  selectDirBtn = document.getElementById('select-dir-btn');
  claudeCheckOverlay = document.getElementById('claude-check-overlay');
  claudeCheckMessage = document.getElementById('claude-check-message');
  claudeCheckSpinner = document.getElementById('claude-check-spinner');
  claudeProgressBar = document.getElementById('claude-progress-bar');
  claudeCheckActions = document.getElementById('claude-check-actions');
  claudeInstallBtn = document.getElementById('claude-install-btn');
  claudeSkipBtn = document.getElementById('claude-skip-btn');
  themeSwitch = document.getElementById('theme-switch'); // 初始化主题切换按钮
  
  // 加载保存的主题设置
  initTheme();

  // 预设配置，如果没有保存过配置的话
  if (!localStorage.getItem('first-init')) {
    console.log('首次初始化，添加预设配置');
    // 添加基础配置
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
  
  // 检查Claude是否已安装
  checkClaudeInstallation();
  
  // 绑定事件处理
  bindEvents();
  
  // 初始化页面
  initPage();
  
  // 绑定开发者快捷键 (F8 触发调试界面)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F8') {
      showDebugClaudeInstall();
    }
  });
});

// 初始化主题
function initTheme() {
  // 从本地存储中获取主题设置，如果没有则默认为浅色主题
  currentTheme = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', currentTheme);
  
  // 根据当前主题设置显示对应图标
  updateThemeIcon();
  
  console.log('初始化主题:', currentTheme);
}

// 更新主题图标
function updateThemeIcon() {
  const sunIcon = themeSwitch.querySelector('.icon-sun');
  const moonIcon = themeSwitch.querySelector('.icon-moon');
  
  if (currentTheme === 'dark') {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  } else {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  }
}

// 切换主题
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  
  updateThemeIcon();
  
  // 添加主题切换动画
  document.body.classList.add('theme-transition');
  setTimeout(() => {
    document.body.classList.remove('theme-transition');
  }, 500);
  
  console.log('切换主题为:', currentTheme);
}

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
  
  // 重置配置按钮点击事件
  if (resetConfigButton) {
    resetConfigButton.onclick = function() {
      console.log('点击重置配置按钮');
      resetConfigs();
    };
  }
  
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
  
  // 添加目录选择对话框相关的事件
  if (closeDirModalBtn) {
    closeDirModalBtn.onclick = function() {
      closeDirSelectModal();
    };
  }
  
  if (cancelDirModalBtn) {
    cancelDirModalBtn.onclick = function() {
      closeDirSelectModal();
    };
  }
  
  if (selectDirBtn) {
    selectDirBtn.onclick = function() {
      launchClaudeWithDir(selectedConfigKey, currentDirPath);
      closeDirSelectModal();
    };
  }
  
  // 绑定Claude安装相关按钮事件
  if (claudeInstallBtn) {
    claudeInstallBtn.onclick = installClaude;
  }
  
  if (claudeSkipBtn) {
    claudeSkipBtn.onclick = skipClaudeInstallation;
  }
  
  // 绑定主题切换事件
  if (themeSwitch) {
    themeSwitch.onclick = toggleTheme;
  }

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
    activeConfigKey = configKey;
    updateCurrentConfigInfo();
    showNotification(`已成功启动 ${configs[configKey]?.name || configKey} 配置的Claude`);
  });
  
  ipcRenderer.on('config-updated', () => {
    console.log('配置已更新，重新加载');
    initPage();
  });

  // 监听Claude安装进度
  ipcRenderer.on('claude-install-progress', (_, data) => {
    console.log('Claude安装进度:', data);
    updateClaudeInstallProgress(data);
  });
  
  // 监听调试消息
  ipcRenderer.on('debug-show-claude-install', () => {
    console.log('调试: 显示Claude安装界面');
    showDebugClaudeInstall();
  });
  
  ipcRenderer.on('debug-hide-claude-install', () => {
    console.log('调试: 隐藏Claude安装界面');
    hideClaudeCheckOverlay();
  });
}

// 初始化页面
async function initPage() {
  try {
    console.log('正在初始化页面...');
    // 获取所有配置
    configs = await ipcRenderer.invoke('get-all-configs');
    console.log('获取的配置:', configs);
    
    // 获取当前活跃配置
    activeConfigKey = await ipcRenderer.invoke('get-active-config');
    console.log('当前活跃配置:', activeConfigKey);
    
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
    
    // 改进按钮内容展示
    const iconEmoji = getIconForConfig(key);
    const name = config.name || key;
    const alias = config.alias ? `(${config.alias})` : '';
    
    button.innerHTML = `
      <span class="icon">${iconEmoji}</span>
      <div class="button-name">${name}</div>
      ${alias ? `<div class="button-alias">${alias}</div>` : ''}
    `;
    
    // 添加到DOM
    configButtonsContainer.insertBefore(button, addConfigButton);
  });
  
  // 为所有配置按钮添加点击事件（包括新添加的）
  document.querySelectorAll('.config-button:not(.add-config-button)').forEach(button => {
    button.onclick = function() {
      const configKey = this.getAttribute('data-config');
      console.log('点击了配置按钮:', configKey);
      showDirSelectModal(configKey);
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

// 更新当前配置信息显示
function updateCurrentConfigInfo() {
  // 该函数保留为空，因为快速切换页面已被移除
  // 但该函数仍被其他地方调用，所以保留函数本身
  console.log('更新当前配置信息（已废弃）');
}

// 渲染设置页面的配置列表
function renderConfigList() {
  console.log('正在渲染配置列表...');
  configList.innerHTML = '';
  
  Object.entries(configs).forEach(([key, config]) => {
    const item = document.createElement('div');
    item.className = 'config-item';
    
    item.innerHTML = `
      <div class="config-item-name">${config.name}${config.alias ? ` (${config.alias})` : ''}</div>
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
    configAliasInput.value = config.alias || '';
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

// 显示目录选择对话框
function showDirSelectModal(configKey) {
  console.log('显示目录选择对话框:', configKey);
  selectedConfigKey = configKey;
  currentDirPath = '';
  
  // 更新标题
  const modalTitle = dirSelectModal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = `选择${configs[configKey]?.name || configKey}的启动目录`;
  }
  
  // 加载目录列表
  loadDirectories();
  
  // 显示对话框
  dirSelectModal.classList.add('active');
}

// 关闭目录选择对话框
function closeDirSelectModal() {
  dirSelectModal.classList.remove('active');
}

// 加载指定目录的子目录
async function loadDirectories(dirPath) {
  try {
    const directories = await ipcRenderer.invoke('get-directory-list', dirPath);
    console.log('获取目录列表:', directories);
    
    // 更新当前路径
    if (dirPath) {
      currentDirPath = dirPath;
    }
    
    // 更新路径显示
    if (dirSelectPath) {
      dirSelectPath.textContent = currentDirPath || '主目录';
    }
    
    // 清除现有列表
    dirSelectList.innerHTML = '';
    
    // 添加"使用当前目录"选项
    const currentDirItem = document.createElement('div');
    currentDirItem.className = 'dir-item current-dir';
    currentDirItem.innerHTML = `
      <span class="dir-icon">✓</span>
      <span class="dir-name">使用当前目录</span>
    `;
    currentDirItem.onclick = function() {
      selectDirBtn.disabled = false;
    };
    dirSelectList.appendChild(currentDirItem);
    
    // 渲染目录列表
    directories.forEach(dir => {
      const item = document.createElement('div');
      item.className = 'dir-item';
      item.setAttribute('data-path', dir.path);
      
      item.innerHTML = `
        <span class="dir-icon">${getIconForDir(dir.name)}</span>
        <span class="dir-name">${dir.name}</span>
      `;
      
      item.onclick = function() {
        loadDirectories(dir.path);
      };
      
      dirSelectList.appendChild(item);
    });
  } catch (error) {
    console.error('加载目录失败:', error);
    showNotification('加载目录列表失败', true);
  }
}

// 为目录选择合适的图标
function getIconForDir(dirName) {
  const specialDirs = {
    '..': '↩️',
    'Desktop': '🖥️',
    '桌面': '🖥️',
    'Documents': '📄',
    '文档': '📄',
    'Downloads': '⬇️',
    '下载': '⬇️',
    '主目录': '🏠'
  };
  
  if (dirName in specialDirs) {
    return specialDirs[dirName];
  }
  
  // 对于Windows驱动器
  if (/^[A-Z]:$/.test(dirName)) {
    return '💽';
  }
  
  return '📁';
}

// 检查Claude是否安装
async function checkClaudeInstallation() {
  try {
    console.log('检查Claude是否已安装');
    claudeInstalled = await ipcRenderer.invoke('check-claude-installed');
    
    if (claudeInstalled) {
      console.log('Claude已安装，隐藏检查界面');
      hideClaudeCheckOverlay();
    } else {
      console.log('Claude未安装，显示安装选项');
      showClaudeInstallOptions();
    }
  } catch (error) {
    console.error('检查Claude安装失败:', error);
    showClaudeInstallOptions();
  }
}

// 显示Claude安装选项
function showClaudeInstallOptions() {
  if (claudeCheckMessage) {
    claudeCheckMessage.textContent = 'Claude未安装或无法找到。';
  }
  
  if (claudeCheckSpinner) {
    claudeCheckSpinner.style.display = 'none';
  }
  
  if (claudeCheckActions) {
    claudeCheckActions.style.display = 'flex';
  }
}

// 隐藏Claude安装检查界面
function hideClaudeCheckOverlay() {
  if (claudeCheckOverlay) {
    claudeCheckOverlay.classList.add('hidden');
    
    // 动画结束后移除元素
    setTimeout(() => {
      if (claudeCheckOverlay && claudeCheckOverlay.parentNode) {
        claudeCheckOverlay.parentNode.removeChild(claudeCheckOverlay);
      }
    }, 300);
  }
}

// 显示调试用的Claude安装界面
function showDebugClaudeInstall() {
  console.log('显示调试用Claude安装界面');
  
  // 如果已经移除了界面，需要重新创建
  if (!claudeCheckOverlay || !document.body.contains(claudeCheckOverlay)) {
    createClaudeCheckOverlay();
  }
  
  // 重置界面状态
  if (claudeCheckOverlay) {
    claudeCheckOverlay.classList.remove('hidden');
  }
  
  if (claudeCheckMessage) {
    claudeCheckMessage.textContent = 'Claude未安装或无法找到。';
  }
  
  if (claudeCheckSpinner) {
    claudeCheckSpinner.style.display = 'none';
  }
  
  if (claudeCheckActions) {
    claudeCheckActions.style.display = 'flex';
  }
  
  if (claudeProgressBar) {
    claudeProgressBar.classList.add('claude-progress-indeterminate');
  }
}

// 创建Claude检查界面（当需要重新创建时使用）
function createClaudeCheckOverlay() {
  // 创建界面元素
  const overlay = document.createElement('div');
  overlay.className = 'claude-check-overlay';
  overlay.id = 'claude-check-overlay';
  
  overlay.innerHTML = `
    <div class="claude-check-content">
      <h2 class="claude-check-title">检查Claude安装</h2>
      <p class="claude-check-message" id="claude-check-message">正在检查系统中是否已安装Claude...</p>
      <div class="claude-check-spinner" id="claude-check-spinner"></div>
      <div class="claude-progress-bar claude-progress-indeterminate" id="claude-progress-bar">
        <div class="claude-progress-fill"></div>
      </div>
      <div class="claude-check-actions" id="claude-check-actions" style="display:none">
        <button class="claude-check-btn claude-install-btn" id="claude-install-btn">安装Claude</button>
        <button class="claude-check-btn claude-skip-btn" id="claude-skip-btn">跳过安装</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // 更新DOM引用
  claudeCheckOverlay = document.getElementById('claude-check-overlay');
  claudeCheckMessage = document.getElementById('claude-check-message');
  claudeCheckSpinner = document.getElementById('claude-check-spinner');
  claudeProgressBar = document.getElementById('claude-progress-bar');
  claudeCheckActions = document.getElementById('claude-check-actions');
  claudeInstallBtn = document.getElementById('claude-install-btn');
  claudeSkipBtn = document.getElementById('claude-skip-btn');
  
  // 重新绑定事件
  if (claudeInstallBtn) {
    claudeInstallBtn.onclick = installClaude;
  }
  
  if (claudeSkipBtn) {
    claudeSkipBtn.onclick = skipClaudeInstallation;
  }
}

// 安装Claude
async function installClaude() {
  try {
    if (claudeCheckMessage) {
      claudeCheckMessage.textContent = '正在安装Claude...';
    }
    
    if (claudeProgressBar) {
      claudeProgressBar.classList.remove('claude-progress-indeterminate');
      const fill = claudeProgressBar.querySelector('.claude-progress-fill');
      if (fill) {
        fill.style.width = '0%';
      }
    }
    
    if (claudeCheckActions) {
      claudeCheckActions.style.display = 'none';
    }
    
    if (claudeCheckSpinner) {
      claudeCheckSpinner.style.display = 'block';
    }
    
    const success = await ipcRenderer.invoke('install-claude');
    
    if (success) {
      console.log('Claude安装成功');
      claudeInstalled = true;
      
      if (claudeCheckMessage) {
        claudeCheckMessage.textContent = 'Claude安装成功！';
      }
      
      // 安装成功后3秒隐藏界面
      setTimeout(hideClaudeCheckOverlay, 3000);
    } else {
      console.error('Claude安装失败');
      if (claudeCheckMessage) {
        claudeCheckMessage.textContent = 'Claude安装失败，请手动安装。';
      }
      
      if (claudeCheckActions) {
        claudeCheckActions.style.display = 'flex';
      }
    }
  } catch (error) {
    console.error('安装Claude失败:', error);
    if (claudeCheckMessage) {
      claudeCheckMessage.textContent = `安装Claude失败: ${error.message || '未知错误'}`;
    }
    
    if (claudeCheckActions) {
      claudeCheckActions.style.display = 'flex';
    }
  }
}

// 更新Claude安装进度
function updateClaudeInstallProgress(data) {
  const { status, progress, message } = data;
  
  if (claudeProgressBar) {
    const fill = claudeProgressBar.querySelector('.claude-progress-fill');
    if (fill && progress !== undefined) {
      fill.style.width = `${progress}%`;
    }
  }
  
  if (claudeCheckMessage && message) {
    claudeCheckMessage.textContent = message;
  }
  
  if (status === 'completed') {
    if (claudeCheckSpinner) {
      claudeCheckSpinner.style.display = 'none';
    }
    
    // 安装完成后3秒隐藏界面
    setTimeout(hideClaudeCheckOverlay, 3000);
  }
}

// 跳过Claude安装
function skipClaudeInstallation() {
  console.log('跳过Claude安装');
  hideClaudeCheckOverlay();
}

// 修改现有的启动Claude函数以检查Claude是否已安装
function launchClaudeWithDir(configKey, workDir) {
  console.log('正在启动Claude, 配置键:', configKey, '工作目录:', workDir);
  if (!configs[configKey]) {
    showNotification(`配置 "${configKey}" 不存在`, true);
    return;
  }
  
  // 检查Claude是否安装
  if (!claudeInstalled) {
    showNotification('Claude未安装，请先安装Claude', true);
    checkClaudeInstallation();
    return;
  }
  
  // 发送启动Claude的消息到主进程
  showNotification(`正在启动 ${configs[configKey]?.name || configKey}...`);
  ipcRenderer.send('launch-claude', { configKey, workDir });
}

// 修改现有的启动Claude函数
function launchClaude(configKey) {
  showDirSelectModal(configKey);
}

// 保存配置
async function saveConfig(e) {
  e.preventDefault();
  console.log('保存配置表单提交');
  
  const name = configNameInput.value.trim();
  const alias = configAliasInput.value.trim();
  const key = configKeyInput.value.trim();
  const baseUrl = baseUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  const mode = editModeInput.value;
  const originalKey = originalKeyInput.value;
  
  console.log('配置数据:', { name, alias, key, baseUrl, apiKey, model, mode, originalKey });
  
  if (!name || !key || !baseUrl || !apiKey) {
    showNotification('请填写所有必填字段', true);
    return;
  }
  
  // 检查配置键是否已存在（在添加模式下）
  if (mode === 'add' && configs[key]) {
    showNotification(`配置键 "${key}" 已存在`, true);
    return;
  }
  
  // 检查别名是否已存在（如果提供了别名）
  if (alias) {
    const aliasExists = Object.entries(configs).some(([k, c]) => 
      c.alias === alias && (mode !== 'edit' || k !== originalKey)
    );
    if (aliasExists) {
      showNotification(`别名 "${alias}" 已被使用`, true);
      return;
    }
  }
  
  const newConfig = {
    name,
    baseUrl,
    apiKey,
  };
  
  if (alias) {
    newConfig.alias = alias;
  }
  
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
    renderSwitchList();
    updateCurrentConfigInfo();
    
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
    renderSwitchList();
    updateCurrentConfigInfo();
    
    showNotification('配置已删除');
    
    // 如果删除的是当前活跃配置，清空活跃配置
    if (key === activeConfigKey) {
      activeConfigKey = '';
      updateCurrentConfigInfo();
    }
  } catch (error) {
    console.error('删除配置失败:', error);
    showNotification('删除配置失败', true);
  }
}

// 重置配置为默认设置
async function resetConfigs() {
  console.log('准备重置配置');
  
  if (confirm('确定要重置所有配置吗？这将删除所有自定义配置并恢复默认设置。')) {
    try {
      showNotification('正在重置配置...');
      
      // 获取当前所有配置
      const currentConfigs = await ipcRenderer.invoke('get-all-configs');
      
      // 删除所有现有配置
      for (const key of Object.keys(currentConfigs)) {
        console.log(`删除配置: ${key}`);
        await ipcRenderer.invoke('delete-config', key);
      }
      
      // 重新添加默认配置
      for (const [key, config] of Object.entries(defaultConfigs)) {
        console.log(`添加默认配置: ${key}`);
        await ipcRenderer.invoke('update-config', key, config);
      }
      
      // 重新加载配置
      configs = await ipcRenderer.invoke('get-all-configs');
      activeConfigKey = '';
      
      // 更新UI
      renderConfigButtons();
      renderConfigList();
      renderSwitchList();
      updateCurrentConfigInfo();
      
      showNotification('配置已重置为默认设置');
    } catch (error) {
      console.error('重置配置失败:', error);
      showNotification('重置配置失败', true);
    }
  }
}

// 添加全局错误处理
window.onerror = function(message, source, lineno, colno, error) {
  console.error('全局错误:', message, source, lineno, colno, error);
  showNotification(`发生错误: ${message}`, true);
}; 