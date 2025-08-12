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
let useClaudeRouterCheckbox; // 添加Claude Router复选框引用

// Router相关DOM元素
let routerStatusIndicator;
let routerConfigPage;
let routerStartBtn;
let routerStopBtn;
let routerConfigForm;
let routerProxyAddress;
let routerHostBinding;
let routerApiTimeout;
let routerProvidersList;
let routerAddProviderBtn;
let currentProviderForm;
let routerStatusPage;

// 全局变量
let configs = {};
let activeConfigKey = '';
let firstTimeLoad = true;
let currentDirPath = '';
let selectedConfigKey = '';
let claudeInstalled = false;
let claudeRouterInstalled = false; // 添加Claude Router安装状态标志
let currentTheme = 'light'; // 添加主题设置变量
let routerRunning = false; // Router运行状态
let routerProviders = []; // Router提供商列表
let currentRouterConfig = null; // 当前Router配置

// 默认配置定义
const defaultConfigs = {
  
};

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('页面加载完成，开始初始化');
  
  // 初始化DOM元素引用
  initializeDOMReferences();
  
  // 加载保存的主题设置
  initTheme();

  // 预设配置，如果没有保存过配置的话
  if (!localStorage.getItem('first-init')) {
    console.log('首次初始化，添加预设配置');
    initializeDefaultConfigs();
  }
  
  // 检查Claude是否已安装
  checkClaudeInstallation();
  
  // 绑定事件处理
  bindEvents();
  
  // 初始化页面
  initPage();
  
  // 初始化Router状态
  initRouterStatus();
  
  // 绑定开发者快捷键 (F8 触发调试界面)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F8') {
      showDebugClaudeInstall();
    }
  });
});

// 初始化DOM元素引用
function initializeDOMReferences() {
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
  useClaudeRouterCheckbox = document.getElementById('use-claude-router'); // 初始化Router复选框

  // Router相关DOM元素
  routerStatusIndicator = document.getElementById('router-status-badge');
  routerConfigPage = document.getElementById('router-page');
  routerStartBtn = document.getElementById('start-router-btn');
  routerStopBtn = document.getElementById('stop-router-btn');
  routerConfigForm = document.getElementById('router-config-form');
  routerProxyAddress = document.getElementById('router-proxy-url');
  routerHostBinding = document.getElementById('router-host');
  routerApiTimeout = document.getElementById('router-timeout');
  routerProvidersList = document.getElementById('providers-container');
  routerAddProviderBtn = document.getElementById('add-provider-btn');
  routerConfigSection = document.getElementById('router-config-section');
  routerNotInstalledSection = document.getElementById('router-not-installed');
  routerInstalledSection = document.getElementById('router-installed');
  routerEnableToggle = document.getElementById('router-enable');
  routerInstallBtn = document.getElementById('install-router-btn');
  routerInstallProgress = document.getElementById('router-install-progress');
  routerInstallPercentage = document.getElementById('router-install-percentage');
  routerInstallMessage = document.getElementById('router-install-message');
  routerInstallProgressContainer = document.getElementById('router-install-progress-container');
  routerRefreshBtn = document.getElementById('router-refresh-btn');
  routerConfigModal = document.getElementById('router-config-modal');
  closeRouterModalBtn = document.getElementById('close-router-modal');
  editRouterConfigBtn = document.getElementById('edit-router-config-btn');
  resetRouterConfigBtn = document.getElementById('reset-router-config-btn');
  saveRouterConfigBtn = document.getElementById('save-router-config-btn');
}

// 初始化默认配置
function initializeDefaultConfigs() {
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

  // 绑定Router相关事件
  bindRouterEvents();

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
  
  // 添加Router选项
  const routerCheckboxContainer = dirSelectModal.querySelector('.router-checkbox-container');
  if (!routerCheckboxContainer && claudeRouterInstalled) {
    // 创建复选框容器
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'router-checkbox-container form-group';
    checkboxContainer.style.margin = '15px 0';
    
    // 创建复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'use-claude-router';
    checkbox.className = 'toggle-input';
    
    // 检查当前配置中是否启用了Router
    if (configs[configKey] && configs[configKey].routerConfig) {
      checkbox.checked = !!configs[configKey].useRouter;
    }
    
    // 创建标签和外层容器
    const label = document.createElement('label');
    label.htmlFor = 'use-claude-router';
    label.className = 'toggle-label';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'toggle-text';
    textSpan.textContent = '使用Claude Code Router启动 (多模型支持)';
    
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'toggle-container';
    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(label);
    toggleContainer.appendChild(textSpan);
    
    checkboxContainer.appendChild(toggleContainer);
    
    // 将容器添加到对话框
    const actionsContainer = dirSelectModal.querySelector('.dir-select-actions');
    if (actionsContainer && actionsContainer.parentNode) {
      actionsContainer.parentNode.insertBefore(checkboxContainer, actionsContainer);
    }
    
    // 更新引用
    useClaudeRouterCheckbox = checkbox;
  } else if (routerCheckboxContainer && claudeRouterInstalled) {
    // 更新已存在的复选框
    useClaudeRouterCheckbox = document.getElementById('use-claude-router');
    if (useClaudeRouterCheckbox && configs[configKey]) {
      useClaudeRouterCheckbox.checked = !!configs[configKey].useRouter;
    }
    routerCheckboxContainer.style.display = 'block';
  } else if (routerCheckboxContainer) {
    // 如果Router未安装，隐藏复选框
    routerCheckboxContainer.style.display = 'none';
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
    console.log('检查Claude和Claude Router是否已安装');
    claudeInstalled = await ipcRenderer.invoke('check-claude-installed');
    claudeRouterInstalled = await ipcRenderer.invoke('check-claude-router-installed');
    
    if (claudeInstalled && claudeRouterInstalled) {
      console.log('Claude和Claude Router已安装，隐藏检查界面');
      hideClaudeCheckOverlay();
    } else {
      console.log('Claude或Claude Router未安装，显示安装选项');
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
    if (!claudeInstalled && !claudeRouterInstalled) {
      claudeCheckMessage.textContent = 'Claude和Claude Code Router均未安装。';
    } else if (!claudeInstalled) {
      claudeCheckMessage.textContent = 'Claude未安装或无法找到。';
    } else if (!claudeRouterInstalled) {
      claudeCheckMessage.textContent = 'Claude Code Router未安装或无法找到。';
    }
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
  
  // 根据安装状态显示不同消息
  if (claudeCheckMessage) {
    if (!claudeInstalled && !claudeRouterInstalled) {
      claudeCheckMessage.textContent = 'Claude和Claude Code Router均未安装。';
    } else if (!claudeInstalled) {
      claudeCheckMessage.textContent = 'Claude未安装或无法找到。';
    } else if (!claudeRouterInstalled) {
      claudeCheckMessage.textContent = 'Claude Code Router未安装或无法找到。';
    } else {
      claudeCheckMessage.textContent = 'Claude和Claude Code Router均已安装。';
    }
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
      <p class="claude-check-message" id="claude-check-message">正在检查系统中是否已安装Claude和Claude Code Router...</p>
      <div class="claude-check-status">
        <div class="claude-status-item">
          <span>Claude Code: </span>
          <span id="claude-status-indicator" class="${claudeInstalled ? 'installed' : 'not-installed'}">
            ${claudeInstalled ? '已安装 ✓' : '未安装 ✗'}
          </span>
        </div>
        <div class="claude-status-item">
          <span>Claude Code Router: </span>
          <span id="claude-router-status-indicator" class="${claudeRouterInstalled ? 'installed' : 'not-installed'}">
            ${claudeRouterInstalled ? '已安装 ✓' : '未安装 ✗'}
          </span>
        </div>
      </div>
      <div class="claude-check-spinner" id="claude-check-spinner"></div>
      <div class="claude-progress-bar claude-progress-indeterminate" id="claude-progress-bar">
        <div class="claude-progress-fill"></div>
      </div>
      <div class="claude-check-actions" id="claude-check-actions" style="display:none">
        <button class="claude-check-btn claude-install-btn" id="claude-install-btn">安装必要组件</button>
        <button class="claude-check-btn claude-skip-btn" id="claude-skip-btn">跳过安装</button>
      </div>
    </div>
  `;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .claude-check-status {
      margin: 15px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .claude-status-item {
      display: flex;
      justify-content: space-between;
    }
    .installed {
      color: #4CAF50;
      font-weight: bold;
    }
    .not-installed {
      color: #F44336;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
  
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
      claudeCheckMessage.textContent = '正在安装Claude和Claude Code Router...';
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
    
    // 安装Claude和Claude Router
    const success = await ipcRenderer.invoke('install-claude-and-router');
    
    if (success) {
      console.log('Claude和Claude Code Router安装成功');
      claudeInstalled = true;
      claudeRouterInstalled = true;
      
      if (claudeCheckMessage) {
        claudeCheckMessage.textContent = 'Claude和Claude Code Router安装成功！';
      }
      
      // 安装成功后3秒隐藏界面
      setTimeout(hideClaudeCheckOverlay, 3000);
    } else {
      console.error('安装失败');
      if (claudeCheckMessage) {
        claudeCheckMessage.textContent = 'Claude或Claude Code Router安装失败，请手动安装。';
      }
      
      if (claudeCheckActions) {
        claudeCheckActions.style.display = 'flex';
      }
    }
  } catch (error) {
    console.error('安装失败:', error);
    if (claudeCheckMessage) {
      claudeCheckMessage.textContent = `安装失败: ${error.message || '未知错误'}`;
    }
    
    if (claudeCheckActions) {
      claudeCheckActions.style.display = 'flex';
    }
  }
}

// 更新Claude安装进度
function updateClaudeInstallProgress(data) {
  const { status, progress, message, claudeStatus, routerStatus } = data;
  
  if (claudeProgressBar) {
    const fill = claudeProgressBar.querySelector('.claude-progress-fill');
    if (fill && progress !== undefined) {
      fill.style.width = `${progress}%`;
    }
  }
  
  if (claudeCheckMessage && message) {
    claudeCheckMessage.textContent = message;
  }
  
  // 更新状态指示器
  if (claudeStatus !== undefined) {
    const claudeIndicator = document.getElementById('claude-status-indicator');
    if (claudeIndicator) {
      claudeIndicator.className = claudeStatus ? 'installed' : 'not-installed';
      claudeIndicator.textContent = claudeStatus ? '已安装 ✓' : '未安装 ✗';
      claudeInstalled = claudeStatus;
    }
  }
  
  if (routerStatus !== undefined) {
    const routerIndicator = document.getElementById('claude-router-status-indicator');
    if (routerIndicator) {
      routerIndicator.className = routerStatus ? 'installed' : 'not-installed';
      routerIndicator.textContent = routerStatus ? '已安装 ✓' : '未安装 ✗';
      claudeRouterInstalled = routerStatus;
    }
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
  
  // 获取是否使用Router
  const useRouter = useClaudeRouterCheckbox && useClaudeRouterCheckbox.checked;
  
  // 保存Router启用状态到配置
  if (configs[configKey]) {
    configs[configKey].useRouter = useRouter;
    ipcRenderer.invoke('update-config', configKey, configs[configKey]);
  }
  
  // 如果选择使用Router但未安装，提示错误
  if (useRouter && !claudeRouterInstalled) {
    showNotification('Claude Code Router未安装，无法使用Router模式', true);
    return;
  }
  
  // 发送启动Claude的消息到主进程
  showNotification(`正在启动 ${configs[configKey]?.name || configKey}${useRouter ? ' (Router模式)' : ''}...`);
  ipcRenderer.send('launch-claude', { 
    configKey, 
    workDir,
    useRouter // 添加使用Router的标志
  });
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

// 初始化Router状态
function initRouterStatus() {
  console.log('初始化Router状态');
  
  // 向主进程请求Router状态
  ipcRenderer.invoke('check-router-status').then(status => {
    updateRouterStatus(status);
  }).catch(error => {
    console.error('获取Router状态失败:', error);
    showNotification('获取Router状态失败', true);
  });
}

// 更新Router状态UI
function updateRouterStatus(data) {
  console.log('更新Router状态:', data);
  const { installed, running } = data;
  
  if (installed) {
    routerNotInstalledSection.classList.add('hidden');
    routerInstalledSection.classList.remove('hidden');
    routerConfigSection.classList.remove('hidden');
    
    // 更新状态指示器
    if (running) {
      routerStatusIndicator.textContent = '运行中';
      routerStatusIndicator.className = 'status-badge running';
      routerStartBtn.disabled = true;
      routerStopBtn.disabled = false;
    } else {
      routerStatusIndicator.textContent = '已停止';
      routerStatusIndicator.className = 'status-badge stopped';
      routerStartBtn.disabled = false;
      routerStopBtn.disabled = true;
    }
  } else {
    routerNotInstalledSection.classList.remove('hidden');
    routerInstalledSection.classList.add('hidden');
    routerConfigSection.classList.add('hidden');
    routerStatusIndicator.textContent = '未安装';
    routerStatusIndicator.className = 'status-badge not-installed';
  }
}

// 绑定Router相关事件
function bindRouterEvents() {
  // 安装Router按钮
  if (routerInstallBtn) {
    routerInstallBtn.onclick = installRouter;
  }
  
  // 刷新Router状态按钮
  if (routerRefreshBtn) {
    routerRefreshBtn.onclick = () => {
      initRouterStatus();
    };
  }
  
  // 启动Router按钮
  if (routerStartBtn) {
    routerStartBtn.onclick = startRouter;
  }
  
  // 停止Router按钮
  if (routerStopBtn) {
    routerStopBtn.onclick = stopRouter;
  }
  
  // Router启用切换
  if (routerEnableToggle) {
    routerEnableToggle.onchange = function() {
      const enabled = this.checked;
      console.log('Router启用状态切换:', enabled);
      
      // 保存到配置
      if (activeConfigKey && configs[activeConfigKey]) {
        if (!configs[activeConfigKey].routerConfig) {
          configs[activeConfigKey].routerConfig = {};
        }
        configs[activeConfigKey].useRouter = enabled;
        
        // 保存配置
        ipcRenderer.invoke('update-config', activeConfigKey, configs[activeConfigKey])
          .then(() => {
            showNotification(`${enabled ? '启用' : '禁用'}路由器成功`);
          })
          .catch(error => {
            console.error('保存Router设置失败:', error);
            showNotification('保存设置失败', true);
          });
      }
    };
  }
  
  // 编辑Router配置按钮
  if (editRouterConfigBtn) {
    editRouterConfigBtn.onclick = () => {
      showRouterConfigModal();
    };
  }
  
  // 关闭Router配置弹框
  if (closeRouterModalBtn) {
    closeRouterModalBtn.onclick = () => {
      routerConfigModal.classList.remove('active');
    };
  }
  
  // 添加提供商按钮
  if (routerAddProviderBtn) {
    routerAddProviderBtn.onclick = () => {
      addProviderItem();
    };
  }
  
  // 重置Router配置
  if (resetRouterConfigBtn) {
    resetRouterConfigBtn.onclick = () => {
      if (activeConfigKey && configs[activeConfigKey]) {
        populateRouterConfigForm(configs[activeConfigKey]);
      }
    };
  }
  
  // 保存Router配置
  if (routerConfigForm) {
    routerConfigForm.onsubmit = function(e) {
      e.preventDefault();
      saveRouterConfig();
    };
  }
  
  // 监听Router安装进度
  ipcRenderer.on('router-install-progress', (_, data) => {
    updateRouterInstallProgress(data);
  });
  
  // 监听Router状态更新
  ipcRenderer.on('router-status-update', (_, data) => {
    updateRouterStatus(data);
  });
  
  // 监听Router配置加载
  ipcRenderer.on('router-config-loaded', (_, data) => {
    updateRouterConfigDisplay(data);
  });
  
  // 监听Router错误
  ipcRenderer.on('router-error', (_, data) => {
    console.error('Router错误:', data);
    const errorMessage = data.error ? data.error.toString() : '未知错误';
    showNotification(`Router错误: ${errorMessage}`, true);
    
    // 如果错误包含ENOENT，则提示用户可能需要重新安装Router
    if (errorMessage.includes('ENOENT')) {
      setTimeout(() => {
        if (confirm('找不到Claude Code Router可执行文件。可能需要重新安装Router。是否立即安装？')) {
          installRouter();
        }
      }, 1000);
    }
  });
  
  // 监听Router停止进度
  ipcRenderer.on('router-stop-progress', (_, data) => {
    console.log('Router停止进度:', data);
    
    if (data.status === 'stopping') {
      showNotification('正在停止Router: ' + data.message);
    } else if (data.status === 'command-complete') {
      showNotification('Router停止命令已执行');
    } else if (data.status === 'killing') {
      showNotification('正在终止Router进程...');
    }
  });
}

// 显示Router配置弹框
function showRouterConfigModal() {
  console.log('显示Router配置弹框');
  
  // 加载当前配置
  if (activeConfigKey && configs[activeConfigKey]) {
    populateRouterConfigForm(configs[activeConfigKey]);
    routerConfigModal.classList.add('active');
  } else {
    showNotification('请先选择一个配置', true);
  }
}

// 填充Router配置表单
function populateRouterConfigForm(config) {
  console.log('填充Router配置表单:', config);
  
  // 如果没有Router配置，初始化一个默认配置
  if (!config.routerConfig) {
    // 基于当前配置初始化Router配置
    const defaultProvider = {
      name: 'default',
      displayName: config.name || 'Default Provider',
      api_base_url: config.baseUrl || '',
      api_key: config.apiKey || '',
      models: [config.model || 'anthropic/claude-3-opus-20240229'],
      transformer: {
        use: ['anthropic']
      }
    };

    config.routerConfig = {
      LOG: true,
      OPENAI_API_KEY: '',
      OPENAI_BASE_URL: '',
      OPENAI_MODEL: '',
      Providers: [defaultProvider],
      Router: {
        default: `default,${config.model || 'anthropic/claude-3-opus-20240229'}`,
        think: '',
        longContext: '',
        longContextThreshold: 60000
      }
    };
  }
  
  // 填充基本配置
  routerProxyAddress.value = config.routerConfig.OPENAI_BASE_URL || '';
  routerHostBinding.value = config.routerConfig.OPENAI_API_KEY || '';
  routerApiTimeout.value = config.routerConfig.Router?.longContextThreshold || 600000;
  
  // 填充路由规则
  if (config.routerConfig.Router) {
    document.getElementById('router-default').value = config.routerConfig.Router.default || '';
    document.getElementById('router-think').value = config.routerConfig.Router.think || '';
    document.getElementById('router-longcontext').value = config.routerConfig.Router.longContext || '';
    document.getElementById('router-longcontext-threshold').value = config.routerConfig.Router.longContextThreshold || 60000;
  }
  
  // 清空提供商容器
  routerProvidersList.innerHTML = '';
  
  // 添加提供商，包括当前配置的默认提供商
  if (config.routerConfig.Providers && config.routerConfig.Providers.length > 0) {
    config.routerConfig.Providers.forEach(provider => {
      addProviderItem(provider, config);
    });
  } else {
    // 添加基于当前配置的默认提供商
    addProviderItem(null, config);
  }
}

// 添加提供商项
function addProviderItem(provider = null, currentConfig = null) {
  const providerItem = document.createElement('div');
  providerItem.className = 'provider-item';
  
  // 如果没有提供provider，则创建一个基于当前配置的默认provider
  if (!provider && currentConfig) {
    provider = {
      name: 'default',
      displayName: currentConfig.name || 'Default Provider',
      api_base_url: currentConfig.baseUrl || '',
      api_key: currentConfig.apiKey || '',
      models: [currentConfig.model || 'anthropic/claude-3-opus-20240229'],
      transformer: {
        use: ['anthropic']
      }
    };
  } else if (!provider) {
    // 完全默认的provider
    provider = {
      name: 'openrouter',
      displayName: 'OpenRouter',
      api_base_url: 'https://openrouter.ai/api/v1/chat/completions',
      api_key: '',
      models: ['anthropic/claude-3-5-sonnet', 'anthropic/claude-3-7-sonnet:thinking', 'google/gemini-2.5-pro-preview'],
      transformer: {
        use: ['openrouter']
      }
    };
  }
  
  // 创建提供商类型选择器
  const providerTypes = [
    { value: 'current', label: '当前配置' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'groq', label: 'Groq' },
    { value: 'anthropic', label: 'Anthropic Direct' },
    { value: 'custom', label: '自定义' }
  ];
  
  // 确定当前选中的提供商类型
  let selectedType = 'custom';
  if (provider.name === 'default') {
    selectedType = 'current';
  } else {
    for (const type of providerTypes) {
      if (type.value === provider.name || 
          (provider.transformer && provider.transformer.use && 
          provider.transformer.use.includes(type.value))) {
        selectedType = type.value;
        break;
      }
    }
  }
  
  providerItem.innerHTML = `
    <div class="form-group">
      <label for="provider-type-${Date.now()}">提供商类型</label>
      <select class="provider-type">
        ${providerTypes.map(type => 
          `<option value="${type.value}" ${selectedType === type.value ? 'selected' : ''}>${type.label}</option>`
        ).join('')}
      </select>
    </div>
    
    <div class="form-group">
      <label for="provider-name-${Date.now()}">提供商名称</label>
      <input type="text" class="provider-name" value="${provider.displayName || provider.name}" placeholder="例如: OpenRouter">
    </div>
    
    <div class="form-group">
      <label for="provider-url-${Date.now()}">API基础地址</label>
      <input type="text" class="provider-url" value="${provider.api_base_url}" placeholder="例如: https://openrouter.ai/api/v1/chat/completions">
    </div>
    
    <div class="form-group">
      <label for="provider-key-${Date.now()}">API密钥</label>
      <input type="password" class="provider-key" value="${provider.api_key || ''}" placeholder="例如: sk-xxx">
    </div>
    
    <div class="form-group">
      <label for="provider-models-${Date.now()}">模型列表 (逗号分隔)</label>
      <textarea class="provider-models" rows="3">${provider.models ? provider.models.join(',') : 'anthropic/claude-3-5-sonnet,anthropic/claude-3-7-sonnet:thinking,google/gemini-2.5-pro-preview'}</textarea>
      <p class="form-hint provider-models-hint">常用模型: anthropic/claude-3-opus-20240229, anthropic/claude-3-5-sonnet, anthropic/claude-3-7-sonnet:thinking, google/gemini-2.5-pro-preview</p>
    </div>
    
    <div class="form-group">
      <label for="provider-transformer-${Date.now()}">转换器</label>
      <select class="provider-transformer">
        <option value="anthropic" ${provider.transformer && provider.transformer.use && provider.transformer.use.includes('anthropic') ? 'selected' : ''}>anthropic</option>
        <option value="openrouter" ${provider.transformer && provider.transformer.use && provider.transformer.use.includes('openrouter') ? 'selected' : ''}>openrouter</option>
        <option value="deepseek" ${provider.transformer && provider.transformer.use && provider.transformer.use.includes('deepseek') ? 'selected' : ''}>deepseek</option>
        <option value="gemini" ${provider.transformer && provider.transformer.use && provider.transformer.use.includes('gemini') ? 'selected' : ''}>gemini</option>
        <option value="groq" ${provider.transformer && provider.transformer.use && provider.transformer.use.includes('groq') ? 'selected' : ''}>groq</option>
        <option value="maxtoken" ${provider.transformer && provider.transformer.use && provider.transformer.use.includes('maxtoken') ? 'selected' : ''}>maxtoken</option>
        <option value="tooluse" ${provider.transformer && provider.transformer.use && provider.transformer.use.includes('tooluse') ? 'selected' : ''}>tooluse</option>
      </select>
      <p class="form-hint">选择适合此API格式的转换器</p>
    </div>
    
    <button type="button" class="danger-button remove-provider-btn">删除此提供商</button>
  `;
  
  // 添加删除提供商事件
  providerItem.querySelector('.remove-provider-btn').addEventListener('click', function() {
    // 至少保留一个提供商
    if (routerProvidersList.children.length > 1) {
      providerItem.remove();
    } else {
      showNotification('至少需要保留一个提供商', true);
    }
  });
  
  // 添加提供商类型变更事件
  const typeSelect = providerItem.querySelector('.provider-type');
  const nameInput = providerItem.querySelector('.provider-name');
  const urlInput = providerItem.querySelector('.provider-url');
  const keyInput = providerItem.querySelector('.provider-key');
  const modelsInput = providerItem.querySelector('.provider-models');
  const transformerSelect = providerItem.querySelector('.provider-transformer');
  
  typeSelect.addEventListener('change', function() {
    const selectedValue = this.value;
    
    // 根据选择的提供商类型预填充字段
    if (selectedValue === 'current' && currentConfig) {
      nameInput.value = currentConfig.name || 'Default Provider';
      urlInput.value = currentConfig.api_base_url || '';
      keyInput.value = currentConfig.api_key || '';
      modelsInput.value = currentConfig.model || 'anthropic/claude-3-opus-20240229';
      transformerSelect.value = 'anthropic';
    } else if (selectedValue === 'openrouter') {
      nameInput.value = 'OpenRouter';
      urlInput.value = 'https://openrouter.ai/api/v1/chat/completions';
      keyInput.value = '';
      modelsInput.value = 'anthropic/claude-3-5-sonnet,anthropic/claude-3-7-sonnet:thinking,google/gemini-2.5-pro-preview';
      transformerSelect.value = 'openrouter';
    } else if (selectedValue === 'deepseek') {
      nameInput.value = 'DeepSeek';
      urlInput.value = 'https://api.deepseek.com/v1/chat/completions';
      keyInput.value = '';
      modelsInput.value = 'deepseek/deepseek-coder,deepseek/deepseek-chat';
      transformerSelect.value = 'deepseek';
    } else if (selectedValue === 'gemini') {
      nameInput.value = 'Google Gemini';
      urlInput.value = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      keyInput.value = '';
      modelsInput.value = 'google/gemini-2.5-pro-preview,google/gemini-1.5-pro';
      transformerSelect.value = 'gemini';
    } else if (selectedValue === 'groq') {
      nameInput.value = 'Groq';
      urlInput.value = 'https://api.groq.com/openai/v1/chat/completions';
      keyInput.value = '';
      modelsInput.value = 'groq/llama3-8b-8192,groq/llama3-70b-8192';
      transformerSelect.value = 'groq';
    } else if (selectedValue === 'anthropic') {
      nameInput.value = 'Anthropic Direct';
      urlInput.value = 'https://api.anthropic.com/v1/messages';
      keyInput.value = '';
      modelsInput.value = 'claude-3-opus-20240229,claude-3-5-sonnet-20240620';
      transformerSelect.value = 'anthropic';
    }
  });
  
  routerProvidersList.appendChild(providerItem);
}

// 安装Router
function installRouter() {
  console.log('安装Router');
  
  routerInstallProgressContainer.classList.remove('hidden');
  routerInstallBtn.disabled = true;
  
  ipcRenderer.invoke('install-claude-router')
    .then(success => {
      if (success) {
        showNotification('Claude Router 安装成功');
        setTimeout(() => {
          initRouterStatus();
        }, 1000);
      } else {
        showNotification('Claude Router 安装失败', true);
      }
    })
    .catch(error => {
      console.error('安装Router失败:', error);
      showNotification(`安装失败: ${error.message || '未知错误'}`, true);
    })
    .finally(() => {
      routerInstallBtn.disabled = false;
    });
}

// 更新Router安装进度
function updateRouterInstallProgress(data) {
  console.log('Router安装进度:', data);
  const { status, progress, message } = data;
  
  if (routerInstallPercentage) {
    routerInstallPercentage.textContent = `${Math.round(progress)}%`;
  }
  
  if (routerInstallProgress) {
    routerInstallProgress.style.width = `${progress}%`;
  }
  
  if (routerInstallMessage && message) {
    routerInstallMessage.textContent = message;
  }
  
  if (status === 'completed') {
    showNotification('Claude Router 安装完成');
    
    setTimeout(() => {
      routerInstallProgressContainer.classList.add('hidden');
      initRouterStatus();
    }, 1000);
  } else if (status === 'failed') {
    showNotification('Claude Router 安装失败', true);
    
    setTimeout(() => {
      routerInstallProgressContainer.classList.add('hidden');
    }, 1000);
  }
}

// 启动Router
function startRouter() {
  console.log('启动Router');
  
  if (!activeConfigKey || !configs[activeConfigKey]) {
    showNotification('请先选择一个配置', true);
    return;
  }
  
  routerStartBtn.disabled = true;
  
  ipcRenderer.invoke('start-router', configs[activeConfigKey])
    .then(success => {
      if (success) {
        showNotification('Router 启动成功');
        updateRouterStatus({ installed: true, running: true });
       
       // 启用停止按钮
       if (routerStopBtn) {
         routerStopBtn.disabled = false;
       }
      } else {
        showNotification('Router 启动失败', true);
        routerStartBtn.disabled = false;
      }
    })
    .catch(error => {
      console.error('启动Router失败:', error);
     
     // 检查错误消息中是否包含"already running"
     if (error.message && (error.message.includes('already running') || error.message.includes('Service is already running'))) {
       showNotification('Router 已在运行中');
       updateRouterStatus({ installed: true, running: true });
       
       // 启用停止按钮
       if (routerStopBtn) {
         routerStopBtn.disabled = false;
       }
     } else {
        showNotification(`启动失败: ${error.message || '未知错误'}`, true);
        routerStartBtn.disabled = false;
     }
    });
}

// 停止Router
function stopRouter() {
  console.log('停止Router');
  
  routerStopBtn.disabled = true;
  showNotification('正在停止Router...');
  
  // 设置超时，防止长时间无响应
  let timeoutId = setTimeout(() => {
    showNotification('停止Router超时，可能需要手动终止进程', true);
    routerStopBtn.disabled = false;
    
    // 强制刷新状态
    initRouterStatus();
  }, 10000); // 10秒超时
  
  ipcRenderer.invoke('stop-router')
    .then(success => {
      clearTimeout(timeoutId);
      
      if (success) {
        showNotification('Router 已停止');
        updateRouterStatus({ installed: true, running: false });
        
        // 启用启动按钮
        if (routerStartBtn) {
          routerStartBtn.disabled = false;
        }
      } else {
        showNotification('停止Router失败，可能需要手动终止进程', true);
        routerStopBtn.disabled = false;
        
        // 刷新状态
        initRouterStatus();
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      
      console.error('停止Router失败:', error);
      showNotification(`停止失败: ${error.message || '未知错误'}`, true);
      routerStopBtn.disabled = false;
      
      // 刷新状态
      initRouterStatus();
    });
}

// 保存Router配置
function saveRouterConfig() {
  console.log('保存Router配置');
  
  if (!activeConfigKey || !configs[activeConfigKey]) {
    showNotification('请先选择一个配置', true);
    return;
  }
  
  // 获取表单数据
  const openaiBaseUrl = routerProxyAddress.value.trim();
  const openaiApiKey = routerHostBinding.value.trim();
  const longContextThreshold = parseInt(routerApiTimeout.value) || 600000;
  
  // 获取路由规则
  const defaultRoute = document.getElementById('router-default').value.trim();
  const thinkRoute = document.getElementById('router-think').value.trim();
  const longContextRoute = document.getElementById('router-longcontext').value.trim();
  
  // 获取提供商
  const providers = [];
  const providerItems = routerProvidersList.querySelectorAll('.provider-item');
  
  providerItems.forEach(item => {
    const typeSelect = item.querySelector('.provider-type');
    const name = item.querySelector('.provider-name').value.trim();
    const url = item.querySelector('.provider-url').value.trim();
    const key = item.querySelector('.provider-key').value.trim();
    const modelsText = item.querySelector('.provider-models').value.trim();
    const transformer = item.querySelector('.provider-transformer').value;
    
    if (name && url) {
      // 提供商ID使用类型值或自定义名称
      const providerType = typeSelect.value;
      const providerId = providerType === 'custom' ? name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 
                         providerType === 'current' ? 'default' : providerType;
      
      providers.push({
        name: providerId,
        displayName: name,
        api_base_url: url,
        api_key: key,
        models: modelsText.split(',').map(m => m.trim()).filter(m => m),
        transformer: {
          use: [transformer]
        }
      });
    }
  });
  
  // 构建配置
  const routerConfig = {
    LOG: true,
    OPENAI_API_KEY: openaiApiKey || "",
    OPENAI_BASE_URL: openaiBaseUrl || "",
    OPENAI_MODEL: "",
    Providers: providers,
    Router: {
      default: defaultRoute,
      think: thinkRoute || undefined,
      longContext: longContextRoute || undefined,
      longContextThreshold
    }
  };
  
  // 保存配置
  configs[activeConfigKey].routerConfig = routerConfig;
  configs[activeConfigKey].useRouter = true;  // 更新配置时默认启用Router
  
  ipcRenderer.invoke('update-config', activeConfigKey, configs[activeConfigKey])
    .then(() => {
      showNotification('Router配置保存成功');
      routerConfigModal.classList.remove('active');
      updateRouterConfigDisplay(routerConfig);
      
      // 如果Router正在运行，提示重启
      ipcRenderer.invoke('check-router-status').then(status => {
        if (status.running) {
          if (confirm('配置已更新，需要重启Router才能生效。是否立即重启Router？')) {
            restartRouter();
          }
        }
      });
    })
    .catch(error => {
      console.error('保存Router配置失败:', error);
      showNotification('保存配置失败', true);
    });
}

// 更新Router配置显示
function updateRouterConfigDisplay(config) {
  console.log('更新Router配置显示:', config);
  
  if (!config) return;
  
  // 更新配置显示
  document.getElementById('router-default-model').textContent = config.Router?.default || '-';
  document.getElementById('router-think-model').textContent = config.Router?.think || '-';
  document.getElementById('router-longcontext-model').textContent = config.Router?.longContext || '-';
  document.getElementById('router-context-threshold').textContent = `${config.Router?.longContextThreshold?.toLocaleString() || '60,000'} tokens`;
  
  // 更新提供商显示
  if (config.Providers && config.Providers.length > 0) {
    const providerNames = config.Providers.map(p => p.displayName || p.name).join(', ');
    document.getElementById('router-providers').textContent = providerNames;
  } else {
    document.getElementById('router-providers').textContent = '-';
  }
  
  // 更新启用状态
  if (routerEnableToggle) {
    routerEnableToggle.checked = !!config.useRouter;
  }
} 

// 添加重启Router功能
function restartRouter() {
  console.log('重启Router');
  
  if (!activeConfigKey || !configs[activeConfigKey]) {
    showNotification('请先选择一个配置', true);
    return;
  }
  
  routerStartBtn.disabled = true;
  routerStopBtn.disabled = true;
  
  showNotification('正在重启Router...');
  
  ipcRenderer.invoke('restart-router', configs[activeConfigKey])
    .then(success => {
      if (success) {
        showNotification('Router 重启成功');
        updateRouterStatus({ installed: true, running: true });
      } else {
        showNotification('Router 重启失败', true);
        // 查询当前状态
        initRouterStatus();
      }
    })
    .catch(error => {
      console.error('重启Router失败:', error);
      showNotification(`重启失败: ${error.message || '未知错误'}`, true);
      // 查询当前状态
      initRouterStatus();
    });
} 