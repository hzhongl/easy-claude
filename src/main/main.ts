import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
// 安装了electron-is-dev但可能在package.json中没有正确记录，直接使用process.env.NODE_ENV
const isDev = process.env.NODE_ENV !== 'production';
import store, { StoreSchema } from './store';
import { ClaudeConfig, CLAUDE_EXEC_PATH } from '../constants/config';

let mainWindow: BrowserWindow | null = null;

// 检查Claude是否已安装
const checkClaudeInstalled = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const isWindows = process.platform === 'win32';
    const checkCommand = isWindows ? 
      `where ${CLAUDE_EXEC_PATH}` : 
      `which ${CLAUDE_EXEC_PATH}`;

    exec(checkCommand, (error) => {
      if (error) {
        console.log('Claude未安装');
        resolve(false);
      } else {
        console.log('Claude已安装');
        resolve(true);
      }
    });
  });
};

// 安装Claude
const installClaude = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const installCommand = 'npm install -g @anthropic-ai/claude-code';
    console.log('执行安装命令:', installCommand);
    
    if (mainWindow) {
      mainWindow.webContents.send('claude-install-progress', { status: 'installing', progress: 0 });
    }
    
    const installProcess = exec(installCommand);
    
    // 监听安装进度
    let installationOutput = '';
    installProcess.stdout?.on('data', (data) => {
      installationOutput += data.toString();
      console.log('安装输出:', data.toString());
      
      if (mainWindow) {
        // 更新安装进度（这里只是简单模拟进度，实际进度无法准确获取）
        const progressMatch = data.toString().match(/(\d+)%/);
        if (progressMatch && progressMatch[1]) {
          const progress = parseInt(progressMatch[1]);
          mainWindow.webContents.send('claude-install-progress', { 
            status: 'installing', 
            progress,
            message: data.toString().trim()
          });
        }
      }
    });
    
    installProcess.stderr?.on('data', (data) => {
      installationOutput += data.toString();
      console.error('安装错误:', data.toString());
    });
    
    installProcess.on('close', (code) => {
      const success = code === 0;
      console.log('安装完成, 退出代码:', code);
      
      if (mainWindow) {
        mainWindow.webContents.send('claude-install-progress', { 
          status: success ? 'completed' : 'failed',
          progress: success ? 100 : 0,
          message: success ? '安装完成！' : '安装失败，请手动安装。'
        });
      }
      
      resolve(success);
    });
  });
};

const createWindow = (): void => {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: path.join(__dirname, '../../assets/icon.png'),
    autoHideMenuBar: true, // 自动隐藏菜单栏
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // 启用开发者工具，但不自动打开
      devTools: true
    }
  });

  // 加载应用
  const indexPath = path.join(__dirname, '../../index.html');
  console.log('尝试加载HTML文件:', indexPath);
  
  // 检查文件是否存在
  if (fs.existsSync(indexPath)) {
    console.log('HTML文件存在，正在加载...');
    mainWindow.loadFile(indexPath);
    // 不自动打开开发者工具
    // mainWindow.webContents.openDevTools();
  } else {
    console.log('HTML文件不存在:', indexPath);
    mainWindow.loadURL('data:text/html,<h1>错误: HTML文件不存在</h1>');
  }

  // 只在开发模式下创建开发者菜单
  if (isDev) {
    createDevMenu();
  } else {
    // 设置菜单为null，完全移除菜单栏
    mainWindow.setMenu(null);
  }
  
  // 窗口关闭时释放资源
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// 创建开发者菜单
function createDevMenu() {
  if (!mainWindow) return;
  
  const devMenu = Menu.buildFromTemplate([
    {
      label: '开发',
      submenu: [
        {
          label: '打开开发者工具',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.openDevTools();
          }
        },
        { type: 'separator' },
        {
          label: '模拟Claude未安装',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('debug-show-claude-install');
          }
        },
        {
          label: '模拟Claude已安装',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('debug-hide-claude-install');
          }
        }
      ]
    }
  ]);
  
  mainWindow.setMenu(devMenu);
}

// 应用准备好后创建窗口
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // 在macOS上，当dock图标被点击且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用 (Windows & Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理Claude启动
ipcMain.on('launch-claude', (_, { configKey, workDir }: { configKey: string; workDir?: string }) => {
  console.log('正在启动Claude, 配置键:', configKey, '工作目录:', workDir);
  // @ts-ignore: 忽略类型错误
  const configs = store.get('configs');
  const config = configs[configKey];
  
  if (!config) {
    if (mainWindow) {
      mainWindow.webContents.send('claude-error', '找不到配置');
    }
    return;
  }

  // @ts-ignore: 忽略类型错误
  store.set('activeConfig', configKey);

  // 检查Claude是否已安装
  const isWindows = process.platform === 'win32';
  const checkCommand = isWindows ? 
    `where ${CLAUDE_EXEC_PATH}` : 
    `which ${CLAUDE_EXEC_PATH}`;

  exec(checkCommand, (error) => {
    if (error) {
      // Claude未安装，发送提示消息
      if (mainWindow) {
        mainWindow.webContents.send('claude-not-installed');
      }
      return;
    }

    // 设置环境变量并启动Claude
    const envVars: Record<string, string> = {
      ANTHROPIC_BASE_URL: config.baseUrl,
      ANTHROPIC_API_KEY: config.apiKey,
    };

    if (config.model) {
      envVars['ANTHROPIC_MODEL'] = config.model;
    }

    let command = '';
    let cdCommand = '';
    
    // 添加切换目录命令
    if (workDir) {
      cdCommand = isWindows ? `cd /d "${workDir}" && ` : `cd "${workDir}" && `;
    }
    
    if (isWindows) {
      // Windows下的环境变量设置和启动命令
      const envString = Object.entries(envVars)
        .map(([key, value]) => `SET ${key}=${value}`)
        .join(' && ');
      command = `${cdCommand}${envString} && start ${CLAUDE_EXEC_PATH}`;
    } else {
      // macOS/Linux下的环境变量设置和启动命令
      const envString = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      command = `${cdCommand}${envString} ${CLAUDE_EXEC_PATH} &`;
    }

    console.log('执行命令:', command);
    exec(command, (err) => {
      if (err) {
        console.error('启动失败:', err);
        if (mainWindow) {
          mainWindow.webContents.send('claude-error', `启动失败: ${err.message}`);
        }
      } else {
        console.log('启动成功');
        if (mainWindow) {
          mainWindow.webContents.send('claude-launched', configKey);
        }
      }
    });
  });
});

// 获取所有配置
ipcMain.handle('get-all-configs', () => {
  // @ts-ignore: 忽略类型错误
  return store.get('configs');
});

// 获取当前配置
ipcMain.handle('get-active-config', () => {
  // @ts-ignore: 忽略类型错误
  return store.get('activeConfig');
});

// 更新配置
ipcMain.handle('update-config', (_, configKey: string, newConfig: any) => {
  try {
    console.log('更新配置:', configKey, newConfig);
    // @ts-ignore: 忽略类型错误
    const configs = store.get('configs');
    configs[configKey] = {...newConfig};
    // @ts-ignore: 忽略类型错误
    store.set('configs', configs);
    
    if (mainWindow) {
      mainWindow.webContents.send('config-updated', configKey);
    }
    return true;
  } catch (error) {
    console.error('更新配置失败:', error);
    return false;
  }
});

// 删除配置
ipcMain.handle('delete-config', (_, configKey: string) => {
  try {
    console.log('删除配置:', configKey);
    // @ts-ignore: 忽略类型错误
    const configs = store.get('configs');
    
    if (configs[configKey]) {
      delete configs[configKey];
      // @ts-ignore: 忽略类型错误
      store.set('configs', configs);
      
      // 如果删除的是当前活跃配置，重置活跃配置
      // @ts-ignore: 忽略类型错误
      const activeConfig = store.get('activeConfig');
      if (activeConfig === configKey) {
        const firstConfig = Object.keys(configs)[0];
        // @ts-ignore: 忽略类型错误
        store.set('activeConfig', firstConfig || '');
      }
      
      if (mainWindow) {
        mainWindow.webContents.send('config-updated');
      }
    }
    return true;
  } catch (error) {
    console.error('删除配置失败:', error);
    return false;
  }
});

// 处理Claude安装检查
ipcMain.handle('check-claude-installed', async () => {
  return await checkClaudeInstalled();
});

// 处理Claude安装
ipcMain.handle('install-claude', async () => {
  return await installClaude();
});

// 打开Claude下载链接
ipcMain.on('open-claude-download', () => {
  shell.openExternal('https://claude.ai/');
}); 

// 添加获取目录列表的处理函数
ipcMain.handle('get-directory-list', async (_, startDir?: string) => {
  try {
    const homeDir = os.homedir();
    const baseDir = startDir || homeDir;
    const isWindows = process.platform === 'win32';
    
    const files = await fs.promises.readdir(baseDir, { withFileTypes: true });
    const directories = files
      .filter(file => file.isDirectory())
      .map(dir => {
        const fullPath = path.join(baseDir, dir.name);
        return {
          name: dir.name,
          path: fullPath
        };
      });
    
    // 排序：首先是驱动器（Windows），然后是目录
    directories.sort((a, b) => a.name.localeCompare(b.name));
    
    // 如果当前目录不是根目录，添加返回上一级目录的选项
    const result = [];
    
    if (baseDir !== homeDir) {
      result.push({
        name: '..',
        path: path.dirname(baseDir)
      });
    }
    
    // 添加常用目录
    if (baseDir === homeDir) {
      // Windows 系统添加所有驱动器
      if (isWindows) {
        const drives: string[] = [];
        await new Promise<void>((resolve) => {
          exec('wmic logicaldisk get caption', (error, stdout) => {
            if (!error && stdout) {
              const lines = stdout.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (/^[A-Z]:$/.test(trimmed)) {
                  drives.push(trimmed);
                }
              }
            }
            resolve();
          });
        });
        
        for (const drive of drives) {
          result.push({
            name: drive,
            path: drive + '\\'
          });
        }
      }
      
      // 添加特殊目录
      result.push({
        name: '主目录',
        path: homeDir
      });
      
      result.push({
        name: '桌面',
        path: path.join(homeDir, 'Desktop')
      });
      
      result.push({
        name: '文档',
        path: path.join(homeDir, 'Documents')
      });
    }
    
    return [...result, ...directories];
  } catch (error) {
    console.error('获取目录列表失败:', error);
    return [];
  }
}); 

// 处理调试检查请求（始终返回指定状态，用于调试）
ipcMain.handle('debug-check-claude-installed', async (_, forceStatus: boolean) => {
  console.log(`调试模式: 强制Claude安装状态为 ${forceStatus}`);
  return forceStatus;
}); 