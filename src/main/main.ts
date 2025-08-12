import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { exec, spawn, ChildProcess } from 'child_process';
// 安装了electron-is-dev但可能在package.json中没有正确记录，直接使用process.env.NODE_ENV
const isDev = process.env.NODE_ENV !== 'production';
import store, { StoreSchema, saveRouterConfig, loadRouterConfig } from './store';
import { ClaudeConfig, CLAUDE_EXEC_PATH, RouterProvider, RouterConfig } from '../constants/config';
import { promisify } from 'util';

let mainWindow: BrowserWindow | null = null;
let routerProcess: ChildProcess | null = null;

// 检查Claude是否已安装
const checkClaudeInstalled = async (): Promise<boolean> => {
  try {
    console.log('检查Claude是否已安装');
    
    // 尝试获取Claude可执行文件路径
    const claudeExec = await getClaudeExecPath();
    if (claudeExec) {
      console.log('Claude已安装, 路径:', claudeExec);
      return true;
    }
    
    console.log('Claude未安装');
    return false;
  } catch (error) {
    console.error('检查Claude安装失败:', error);
    return false;
  }
};

// 检查claude-code-router是否已安装
const checkClaudeRouterInstalled = async (): Promise<boolean> => {
  try {
    console.log('检查Claude Code Router是否已安装');
    
    // 使用which/where命令检查
    const which = process.platform === 'win32' ? 'where' : 'which';
    await promisify(exec)(`${which} ccr`);
    return true;
  } catch (error) {
    console.log('使用which/where检查Claude Code Router失败');
    
    // 如果命令检查失败，尝试检查常见的安装位置
    try {
    const isWindows = process.platform === 'win32';
      const commonPaths = isWindows ? [
        path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'ccr.cmd'),
        path.join(os.homedir(), '.npm-global', 'bin', 'ccr.cmd'),
        'C:\\Program Files\\nodejs\\ccr.cmd',
        'C:\\Program Files (x86)\\nodejs\\ccr.cmd'
      ] : [
        '/usr/local/bin/ccr',
        '/usr/bin/ccr',
        path.join(os.homedir(), '.npm-global', 'bin', 'ccr'),
        path.join(os.homedir(), 'node_modules', '.bin', 'ccr')
      ];
      
      for (const pathToCheck of commonPaths) {
        if (fs.existsSync(pathToCheck)) {
          console.log('在替代位置找到ccr:', pathToCheck);
          return true;
        }
      }
      
      console.log('未找到Claude Code Router');
      return false;
    } catch (e) {
      console.error('检查Claude Code Router安装位置失败:', e);
      return false;
    }
  }
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

// 安装claude-code-router
const installClaudeRouter = async (): Promise<boolean> => {
  console.log('准备安装Claude Code Router...');
  
  if (mainWindow) {
    mainWindow.webContents.send('router-install-progress', { 
      status: 'installing', 
      progress: 5, 
      message: '正在准备安装Claude Code Router...'
    });
  }
  
  try {
    // 首先检查Node.js和npm版本
    const { stdout: nodeVersionOutput } = await promisify(exec)('node --version');
    const nodeVersion = nodeVersionOutput.trim();
    console.log('Node.js版本:', nodeVersion);
    
    if (mainWindow) {
      mainWindow.webContents.send('router-install-progress', { 
        status: 'installing', 
        progress: 10, 
        message: `检测到Node.js版本: ${nodeVersion}`
      });
    }
    
    // 确保npm模块路径存在于PATH中
    const isWindows = process.platform === 'win32';
    const npmPath = isWindows ? 
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm') : 
      '/usr/local/bin';
    
    const npmExists = fs.existsSync(npmPath);
    console.log('npm路径存在:', npmExists, npmPath);
    
    // 尝试获取npm版本
    const { stdout: npmVersionOutput } = await promisify(exec)('npm --version');
    const npmVersion = npmVersionOutput.trim();
    console.log('npm版本:', npmVersion);
    
    if (mainWindow) {
      mainWindow.webContents.send('router-install-progress', { 
        status: 'installing', 
        progress: 15, 
        message: `检测到npm版本: ${npmVersion}`
      });
    }
    
    // 设置npm安装命令
    const installCommand = 'npm install -g @musistudio/claude-code-router';
    console.log('准备执行安装命令:', installCommand);
    
    if (mainWindow) {
      mainWindow.webContents.send('router-install-progress', { 
        status: 'installing', 
        progress: 20, 
        message: `开始安装Claude Code Router...\n执行命令: ${installCommand}`
      });
    }
    
    // 执行安装命令
    const installProcess = exec(installCommand);
    let installOutput = '';
    
    // 监听标准输出
    installProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      installOutput += output;
      console.log('安装输出:', output);
      
      // 尝试从输出中提取进度信息
      let progressValue = 20; // 起始进度为20%
      
      // 检查是否有下载进度
      if (output.includes('download') || output.includes('fetch')) {
        progressValue = 30;
      }
      
      // 检查是否正在解压或安装依赖
      if (output.includes('extract') || output.includes('dependencies')) {
        progressValue = 50;
      }
      
      // 检查是否正在安装或配置
      if (output.includes('install') || output.includes('configure')) {
        progressValue = 70;
      }
      
      if (mainWindow) {
          mainWindow.webContents.send('router-install-progress', { 
            status: 'installing', 
          progress: progressValue, 
          message: `安装中...\n${output.trim()}`
          });
      }
    });
    
    // 监听错误输出
    installProcess.stderr?.on('data', (data) => {
      const errorOutput = data.toString();
      installOutput += errorOutput;
      console.error('安装错误:', errorOutput);
      
      // 有些npm输出会发送到stderr，但不一定是错误
      if (!errorOutput.includes('WARN') && !errorOutput.includes('npm notice')) {
        if (mainWindow) {
          mainWindow.webContents.send('router-install-progress', { 
            status: 'installing', 
            progress: 40, 
            message: `安装过程中出现警告或信息:\n${errorOutput.trim()}`
          });
        }
      }
    });
    
    // 等待安装完成
    const exitCode = await new Promise<number>((resolve) => {
    installProcess.on('close', (code) => {
        resolve(code || 0);
      });
    });
    
    console.log('安装完成，退出代码:', exitCode);
    
    // 检查安装是否成功
    if (exitCode === 0) {
      // 验证ccr是否可用
      try {
        // 等待一些时间，确保安装过程完全完成
        await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (mainWindow) {
        mainWindow.webContents.send('router-install-progress', { 
            status: 'installing', 
            progress: 85, 
            message: '安装完成，正在验证...'
          });
        }
        
        // 检查ccr命令是否可用
        const checkCommand = isWindows ? 'where ccr' : 'which ccr';
        await promisify(exec)(checkCommand);
        
        console.log('成功验证ccr命令可用');
        if (mainWindow) {
          mainWindow.webContents.send('router-install-progress', { 
            status: 'completed', 
            progress: 100, 
            message: 'Claude Code Router安装成功！'
          });
        }
        
        return true;
      } catch (error: any) {
        console.error('找不到ccr命令，但npm安装成功:', error);
        
        // 检查常见的安装位置
        let ccrFound = false;
        const commonPaths = isWindows ? [
          path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'ccr.cmd'),
          path.join(os.homedir(), '.npm-global', 'bin', 'ccr.cmd')
        ] : [
          '/usr/local/bin/ccr',
          path.join(os.homedir(), '.npm-global', 'bin', 'ccr'),
          path.join(os.homedir(), 'node_modules', '.bin', 'ccr')
        ];
        
        for (const pathToCheck of commonPaths) {
          if (fs.existsSync(pathToCheck)) {
            console.log('在替代位置找到ccr:', pathToCheck);
            ccrFound = true;
            break;
          }
        }
        
        if (ccrFound) {
          if (mainWindow) {
            mainWindow.webContents.send('router-install-progress', { 
              status: 'completed', 
              progress: 100, 
              message: 'Claude Code Router安装成功，但需要手动将其添加到PATH中。'
            });
          }
          return true;
        } else {
          if (mainWindow) {
            mainWindow.webContents.send('router-install-progress', { 
              status: 'failed', 
              progress: 90, 
              message: `安装似乎成功，但找不到ccr命令。可能需要手动添加到PATH或重启应用。\n错误: ${error.message}`
            });
          }
          return false;
        }
      }
    } else {
      console.error('安装失败，退出代码:', exitCode);
      if (mainWindow) {
        mainWindow.webContents.send('router-install-progress', { 
          status: 'failed', 
          progress: 0, 
          message: `安装失败，退出代码: ${exitCode}\n${installOutput}`
        });
      }
      return false;
    }
  } catch (error: any) {
    console.error('安装Claude Router时出错:', error);
    
    if (mainWindow) {
      mainWindow.webContents.send('router-install-progress', { 
        status: 'failed', 
        progress: 0, 
        message: `安装失败: ${error.message}`
      });
    }
    
    return false;
  }
};

// 创建Router启动脚本
const createRouterStartScript = async (configPath: string): Promise<string> => {
  console.log('创建Router启动脚本...');
  
  // 获取应用用户数据目录
  const appDataDir = app.getPath('userData');
  const batPath = path.join(appDataDir, 'start-router.bat');
  
  // 创建用于启动Router的.bat文件，将配置作为参数传递
  const batContent = `@echo off\necho 正在启动Claude Code Router...\nccr start --config "${configPath}"\npause`;
  fs.writeFileSync(batPath, batContent);
  
  // 启动bat文件
  spawn('cmd.exe', ['/c', 'start', batPath], { detached: true });
  
  return configPath; // 返回原始配置路径
};

const createRouterConfigFile = (config: ClaudeConfig): string => {
  try {
    console.log('创建Router配置文件...');
    
    // 获取配置目录路径
    const appDir = app.getPath('userData');
    const configDir = path.join(appDir, 'router-configs');
    
    // 确保配置目录存在
    if (!fs.existsSync(configDir)) {
      console.log(`创建配置目录: ${configDir}`);
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // 配置文件路径
    const configPath = path.join(configDir, 'router-config.json');
    
    // 创建Router配置 - 强制使用新格式
    let routerConfig: RouterConfig;
    
    // 创建默认提供商配置
    const providerId = config.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'default';
    
    // 确定模型名称
    let modelName = config.model || 'claude-3-opus-20240229';
    if (config.baseUrl?.includes('moonshot') || config.baseUrl?.includes('siliconflow')) {
      if (!modelName.includes('kimi') && !modelName.includes('moonshot')) {
        // 对于Kimi/Moonshot API，使用默认的Kimi模型
        modelName = 'moonshotai/Kimi-K2-Instruct';
      }
    }
    
    const defaultProvider: RouterProvider = {
      name: providerId,
      api_base_url: config.baseUrl || '',
      api_key: config.apiKey || '',
      models: [modelName],
      transformer: {
        use: ['anthropic']
      }
    };
    
    // 根据API URL和模型选择合适的转换器
    console.log(`检测模型转换器: baseUrl=${config.baseUrl}, model=${modelName}`);
    if (config.baseUrl?.includes('moonshot') || config.baseUrl?.includes('siliconflow') || 
        modelName.includes('kimi') || modelName.includes('moonshot')) {
      console.log('检测到Kimi/Moonshot API，使用deepseek转换器');
      defaultProvider.transformer = { use: ['deepseek'] };
    } else if (modelName.includes('gemini') || config.baseUrl?.includes('google')) {
      console.log('检测到Gemini API，使用gemini转换器');
      defaultProvider.transformer = { use: ['gemini'] };
    } else if (config.baseUrl?.includes('openrouter')) {
      console.log('检测到OpenRouter API，使用openrouter转换器');
      defaultProvider.transformer = { use: ['openrouter'] };
    } else if (modelName.includes('qwen') || config.baseUrl?.includes('alibaba') || config.baseUrl?.includes('modelscope')) {
      console.log('检测到Qwen API，使用deepseek转换器');
      defaultProvider.transformer = { use: ['deepseek'] };
    }
    
    // 检查是否有现有的配置，尝试转换
    if (config.routerConfig && Object.keys(config.routerConfig).length > 0) {
      const oldConfig = config.routerConfig;
      
      // 尝试从旧格式转换
      const providers: RouterProvider[] = [];
      
      // 尝试转换providers
      if ('providers' in oldConfig && Array.isArray((oldConfig as any).providers)) {
        (oldConfig as any).providers.forEach((p: any) => {
          providers.push({
            name: p.name || 'default',
            api_base_url: p.apiBaseUrl || p.api_base_url || '',
            api_key: p.apiKey || p.api_key || '',
            models: Array.isArray(p.models) ? p.models : [p.models || 'claude-3-opus-20240229'],
            transformer: p.transformer || { use: ['anthropic'] }
          });
        });
      } else if ('Providers' in oldConfig && Array.isArray(oldConfig.Providers) && oldConfig.Providers.length > 0) {
        // 已经是新格式
        providers.push(...oldConfig.Providers);
      } else {
        // 没有找到提供商或提供商数组为空，使用默认提供商
        providers.push(defaultProvider);
      }
      
      // 创建默认路由规则
      const defaultRouter = {
        default: `${providers[0].name},${providers[0].models[0]}`,
        think: '',
        longContext: '',
        longContextThreshold: 60000
      };
      
      // 尝试转换router
      let router: {
        default: string;
        think?: string;
        longContext?: string;
        longContextThreshold?: number;
      };
      
      if ('router' in oldConfig && (oldConfig as any).router) {
        const oldRouter = (oldConfig as any).router;
        router = {
          default: oldRouter.default || defaultRouter.default,
          think: oldRouter.think || '',
          longContext: oldRouter.longContext || '',
          longContextThreshold: oldRouter.longContextThreshold || 60000
        };
      } else if ('Router' in oldConfig && oldConfig.Router) {
        // 已经是新格式
        router = oldConfig.Router;
      } else {
        router = defaultRouter;
      }
      
      // 创建新配置
      routerConfig = {
        LOG: true,
        OPENAI_API_KEY: oldConfig.OPENAI_API_KEY || "",
        OPENAI_BASE_URL: oldConfig.OPENAI_BASE_URL || (oldConfig as any).proxyUrl || "",
        OPENAI_MODEL: oldConfig.OPENAI_MODEL || "",
        Providers: providers,
        Router: router
      };
    } else {
      // 没有现有配置或配置为空，创建默认配置
      console.log('未找到有效的Router配置或配置为空，使用当前Claude配置创建');
      routerConfig = {
        LOG: true,
        OPENAI_API_KEY: "",
        OPENAI_BASE_URL: "",
        OPENAI_MODEL: "",
        Providers: [defaultProvider],
        Router: {
          default: `${defaultProvider.name},${defaultProvider.models[0]}`,
          think: '',
          longContext: '',
          longContextThreshold: 60000
        }
      };
      
      // 输出生成的配置用于调试
      console.log('生成的默认Provider:', JSON.stringify(defaultProvider, null, 2));
    }
    
    // 序列化配置
    const configJson = JSON.stringify(routerConfig, null, 2);
    console.log(`准备写入配置到 ${configPath}, 内容长度: ${configJson.length}`);
    
    // 写入配置文件
    fs.writeFileSync(configPath, configJson);
    
    // 验证写入成功
    if (fs.existsSync(configPath)) {
      const stats = fs.statSync(configPath);
      console.log(`成功写入配置文件 ${configPath}, 文件大小: ${stats.size} 字节`);
    } else {
      throw new Error(`配置文件写入失败，${configPath} 不存在`);
    }
    
    return configPath;
  } catch (error: any) {
    console.error('创建Router配置文件失败:', error);
    throw new Error(`创建Router配置文件失败: ${error.message}`);
  }
};

// 将Router配置写入默认位置
const writeRouterConfigToDefaultLocation = async (config: ClaudeConfig): Promise<string> => {
  console.log('正在写入Router配置到默认位置...');
  try {
    // 强制重新创建Router配置文件，确保使用最新配置
    const configPath = createRouterConfigFile(config);
    console.log(`创建备份Router配置文件: ${configPath}`);
    
    // 读取刚创建的配置
    const configContent = fs.readFileSync(configPath, 'utf8');
    let routerConfig = JSON.parse(configContent);
    
    // 将配置写入默认位置
    const defaultDir = path.join(os.homedir(), '.claude-code-router');
    if (!fs.existsSync(defaultDir)) {
      console.log(`创建默认配置目录: ${defaultDir}`);
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    
    const defaultConfigPath = path.join(defaultDir, 'config.json');
    console.log(`准备写入配置到 ${defaultConfigPath}, 内容长度: ${configContent.length}`);
    
    try {
      // 常规方式写入配置文件
      fs.writeFileSync(defaultConfigPath, configContent);
      console.log(`常规方式写入配置文件成功`);
      
      // 验证写入成功
      if (fs.existsSync(defaultConfigPath)) {
        const stats = fs.statSync(defaultConfigPath);
        console.log(`成功写入Router配置文件 ${defaultConfigPath}, 文件大小: ${stats.size} 字节`);
        return defaultConfigPath;
      }
    } catch (error: any) {
      console.error(`常规方式写入配置文件失败: ${error.message}`);
      
      // 尝试使用提升的权限写入
      console.log(`尝试使用提升的权限写入配置文件...`);
      await writeFileWithElevation(defaultConfigPath, configContent);
      
      // 验证写入成功
      if (fs.existsSync(defaultConfigPath)) {
        const stats = fs.statSync(defaultConfigPath);
        console.log(`通过提升权限成功写入Router配置文件 ${defaultConfigPath}, 文件大小: ${stats.size} 字节`);
        return defaultConfigPath;
      } else {
        console.error(`无法写入配置文件到默认位置 ${defaultConfigPath}`);
      }
    }
    
    // 如果默认位置无法写入，尝试替代方案
    console.log(`无法写入到默认位置，尝试替代方案...`);
    return createRouterStartScript(configPath);
  } catch (error: any) {
    console.error(`写入Router配置到默认位置失败: ${error.message}`);
    throw new Error(`写入Router配置到默认位置失败: ${error.message}`);
  }
};

// 启动claude-code-router
const startClaudeRouter = async (config: ClaudeConfig): Promise<boolean> => {
  try {
    // 首先检查ccr命令是否可用
    const isInstalled = await checkClaudeRouterInstalled();
    if (!isInstalled) {
      console.error('Claude Code Router未安装或不在PATH中');
      if (mainWindow) {
        mainWindow.webContents.send('router-error', { error: 'Claude Code Router未安装或不在PATH中，请先安装' });
      }
      return false;
    }
    
    // 如果已经有一个路由进程在运行，先停止它
    if (routerProcess) {
      stopClaudeRouter();
    }
    
    // 写入配置到默认位置
    try {
      await writeRouterConfigToDefaultLocation(config);
    } catch (configError: any) {
      console.error('写入Router配置失败:', configError);
      if (mainWindow) {
        mainWindow.webContents.send('router-error', { error: `写入Router配置失败: ${configError.message}` });
      }
      return false;
    }
    
    // 获取ccr的完整路径
    let ccrPath = 'ccr';
    try {
      // 尝试获取ccr的完整路径
      const which = process.platform === 'win32' ? 'where' : 'which';
      const { stdout } = await promisify(exec)(`${which} ccr`);
      // 处理可能的多行输出，只取第一行
      ccrPath = stdout.trim().split(/[\r\n]+/)[0];
      
      // 在Windows上确保使用.cmd扩展名
      if (process.platform === 'win32' && !ccrPath.endsWith('.cmd')) {
        // 检查.cmd文件是否存在
        const cmdPath = `${ccrPath}.cmd`;
        if (fs.existsSync(cmdPath)) {
          ccrPath = cmdPath;
        }
      }
      
      console.log('找到ccr路径:', ccrPath);
    } catch (error: any) {
      // 如果找不到ccr，尝试使用常见的安装位置
      console.warn('无法获取ccr路径，使用默认命令:', error);
      if (process.platform === 'win32') {
        // Windows上检查常见位置
        const possiblePaths = [
          path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'ccr.cmd'),
          path.join(os.homedir(), '.npm-global', 'bin', 'ccr.cmd')
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            ccrPath = possiblePath;
            console.log('找到ccr替代路径:', ccrPath);
            break;
          }
        }
      } else {
        // Linux/macOS上检查常见位置
        const possiblePaths = [
          '/usr/local/bin/ccr',
          path.join(os.homedir(), '.npm-global', 'bin', 'ccr'),
          path.join(os.homedir(), 'node_modules', '.bin', 'ccr')
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            ccrPath = possiblePath;
            console.log('找到ccr替代路径:', ccrPath);
            break;
          }
        }
      }
    }
    
    // 启动路由进程
    console.log('启动路由进程，使用命令:', ccrPath);
    
    // 检查文件是否真的存在
    if (!fs.existsSync(ccrPath)) {
      console.error(`ccr路径不存在: ${ccrPath}`);
      
      // 尝试在PATH中寻找ccr.cmd
      if (process.platform === 'win32') {
        // 直接使用cmd文件
        ccrPath = 'ccr.cmd';
      } else {
        ccrPath = 'ccr';
      }
      
      console.log(`使用系统PATH中的ccr命令: ${ccrPath}`);
    }
    
    if (mainWindow) {
      mainWindow.webContents.send('router-status', { status: 'starting' });
    }
    
    try {
      routerProcess = spawn(ccrPath, ['start'], {
      detached: false,
      stdio: 'pipe',
        env: { 
          ...process.env,
          LANG: 'zh_CN.UTF-8',
          LC_ALL: 'zh_CN.UTF-8',
          // Windows环境下设置
          PYTHONIOENCODING: 'UTF-8',
          NODE_OPTIONS: '--no-warnings --max-http-header-size=80000'
        }
      });
    } catch (error: any) {
      console.error('启动ccr进程失败:', error);
    if (mainWindow) {
        mainWindow.webContents.send('router-error', { error: `启动Claude Code Router失败: ${error.message}` });
        mainWindow.webContents.send('router-status', { status: 'error' });
      }
      return false;
    }
    
    // 监听输出
    routerProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('路由输出:', output);
      
      // 如果输出包含启动成功的信息
      if (output.includes('Server started') || output.includes('listening on port') || output.includes('already running')) {
        if (mainWindow) {
          mainWindow.webContents.send('router-status', { status: 'running' });
        }
      }
    });
    
    // 监听错误
    routerProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      console.error('路由错误:', error);
      
      if (mainWindow) {
        mainWindow.webContents.send('router-error', { error });
      }
    });
    
    // 监听进程退出
    routerProcess.on('close', (code) => {
      console.log('路由进程退出,代码:', code);
      
      // 如果退出代码为0并且输出包含already running，视为成功
      if (code === 0) {
        return true;
      }
      
      if (mainWindow) {
        mainWindow.webContents.send('router-status', { status: 'stopped' });
      }
      
      routerProcess = null;
    });
    
    routerProcess.on('error', (error) => {
      console.error('路由进程错误:', error);
      
      if (mainWindow) {
        mainWindow.webContents.send('router-error', { error: `路由进程错误: ${error.message}` });
        mainWindow.webContents.send('router-status', { status: 'error' });
      }
      
      routerProcess = null;
      return false;
    });
    
    // 等待一段时间，确保服务启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error: any) {
    console.error('启动路由失败:', error);
    if (mainWindow) {
      mainWindow.webContents.send('router-status', { status: 'error', error: error.message });
      mainWindow.webContents.send('router-error', { error: `启动失败: ${error.message}` });
    }
    return false;
  }
};

// 停止Claude Router进程
const stopClaudeRouter = async (): Promise<boolean> => {
  try {
    console.log('正在停止Router进程...');
    
    // 如果没有运行中的进程，则直接返回成功
    if (!routerProcess) {
      console.log('没有运行中的Router进程');
      if (mainWindow) {
        mainWindow.webContents.send('router-status', { status: 'stopped' });
      }
      return true;
    }
    
    // 记录进程ID
    const pid = routerProcess.pid;
    console.log(`尝试终止进程ID: ${pid}`);
    
    // 在Windows上，使用专用命令终止ccr服务
    if (process.platform === 'win32') {
      try {
        console.log('在Windows上使用"ccr stop"命令停止服务');
        
        // 通知前端正在执行停止命令
        if (mainWindow) {
          mainWindow.webContents.send('router-stop-progress', {
            status: 'stopping',
            message: '正在执行ccr stop命令...'
          });
        }
        
        // 尝试通过ccr stop命令停止服务
        const { stdout } = await promisify(exec)('ccr stop');
        console.log('ccr stop命令输出:', stdout);
        
        // 通知前端命令执行完毕
        if (mainWindow) {
          mainWindow.webContents.send('router-stop-progress', {
            status: 'command-complete',
            message: 'ccr stop命令已执行'
          });
        }
        
        // 无论ccr stop成功与否，都尝试强制终止进程
        try {
          if (pid) {
            // 通知前端正在终止进程
            if (mainWindow) {
              mainWindow.webContents.send('router-stop-progress', {
                status: 'killing',
                message: `正在终止进程 ${pid}...`
              });
            }
            
            await promisify(exec)(`taskkill /pid ${pid} /t /f`);
            console.log(`已通过taskkill终止进程${pid}`);
          }
        } catch (killError) {
          console.error('taskkill失败，可能进程已终止:', killError);
        }
      } catch (stopError) {
        console.error('ccr stop命令失败:', stopError);
        
        // 如果ccr stop失败，尝试查找所有ccr进程并强制终止
        try {
          console.log('尝试查找并终止所有ccr进程');
          await promisify(exec)('taskkill /im ccr.exe /t /f');
          await promisify(exec)('taskkill /im node.exe /t /f /fi "windowtitle eq ccr*"');
        } catch (taskkillError) {
          console.error('终止所有ccr进程失败:', taskkillError);
        }
      }
    } else {
      // 在Unix系统上
      console.log('在Unix系统上停止进程');
      
      // 尝试用ccr stop命令
      try {
        await promisify(exec)('ccr stop');
      } catch (stopError) {
        console.error('ccr stop命令失败:', stopError);
      }
      
      // 向进程发送终止信号
      if (pid) {
        try {
          process.kill(pid, 'SIGTERM');
          console.log(`已发送SIGTERM信号到进程${pid}`);
        } catch (killError) {
          console.error('发送SIGTERM信号失败:', killError);
        }
        
        // 延迟后检查进程是否还在运行
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          process.kill(pid, 0); // 检查进程是否存在
          console.log(`进程${pid}仍然存在，尝试SIGKILL`);
          process.kill(pid, 'SIGKILL');
        } catch (checkError) {
          console.log(`进程${pid}已终止`);
        }
      }
    }
    
    // 清除进程引用
    routerProcess = null;
    
    // 通知渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('router-status', { status: 'stopped' });
    }
    
    console.log('Router进程已停止');
    return true;
  } catch (error: any) {
    console.error('停止Router失败:', error);
    
    // 即使出错，也尝试更新状态为已停止
    if (mainWindow) {
      mainWindow.webContents.send('router-error', { error: `停止Router失败: ${error.message}` });
      mainWindow.webContents.send('router-status', { status: 'stopped' });
    }
    
    // 清除进程引用
    routerProcess = null;
    
    return false;
  }
};

// 检查路由是否正在运行
const checkRouterRunning = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    // 尝试请求路由服务的状态
    const command = process.platform === 'win32' ? 
      'netstat -ano | findstr "3456"' : 
      'lsof -i:3456';
    
    exec(command, (error, stdout) => {
      // 如果没有错误并且有输出，则路由正在运行
      resolve(!error && stdout.trim().length > 0);
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

// 在应用准备好时，加载index.html
app.whenReady().then(async () => {
  // 注册IPC处理程序
  // 检查Router状态
  ipcMain.handle('check-router-status', async () => {
    try {
      const installed = await checkClaudeRouterInstalled();
      const running = routerProcess !== null || await checkRouterRunning();
      
      return {
        installed,
        running
      };
    } catch (error: any) {
      console.error('检查Router状态失败:', error);
      return {
        installed: false,
        running: false,
        error: error.message || '未知错误'
      };
    }
  });
  
  // 启动Router
  ipcMain.handle('start-router', async (_, config: ClaudeConfig) => {
    try {
      return await startClaudeRouter(config);
    } catch (error: any) {
      console.error('启动Router失败:', error);
      return false;
    }
  });
  
  // 停止Router
  ipcMain.handle('stop-router', async () => {
    try {
      return await stopClaudeRouter();
    } catch (error: any) {
      console.error('停止Router失败:', error);
      return false;
    }
  });
  
  // 重启Router
  ipcMain.handle('restart-router', async (_, config: ClaudeConfig) => {
    try {
      console.log('重启Router');
      
      // 先停止现有进程
      await stopClaudeRouter();
      
      // 等待进程停止
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 写入配置到默认位置
      try {
        await writeRouterConfigToDefaultLocation(config);
      } catch (configError: any) {
        console.error('写入Router配置失败:', configError);
        return false;
      }
      
      // 启动Router
      return await startClaudeRouter(config);
    } catch (error: any) {
      console.error('重启Router失败:', error);
      return false;
    }
  });
  
  // 安装Claude Router
  ipcMain.handle('install-claude-router', async () => {
    try {
      return await installClaudeRouter();
    } catch (error: any) {
      console.error('安装Claude Router失败:', error);
      if (mainWindow) {
        mainWindow.webContents.send('router-install-progress', { 
          status: 'failed', 
          progress: 0, 
          message: `安装失败: ${error.message || '未知错误'}`
        });
      }
      return false;
    }
  });
  
  createWindow();
  
  // 在应用启动时检查Claude和Router是否已安装
  const isClaudeInstalled = await checkClaudeInstalled();
  const isClaudeRouterInstalled = await checkClaudeRouterInstalled();
  const isRouterRunning = await checkRouterRunning();
  
  if (mainWindow) {
    mainWindow.webContents.send('claude-status', { installed: isClaudeInstalled });
    mainWindow.webContents.send('router-status', { 
      installed: isClaudeRouterInstalled,
      status: isRouterRunning ? 'running' : 'stopped'
    });
  }

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
ipcMain.on('launch-claude', async (_, data) => {
  const { configKey, workDir, useRouter } = data;
  console.log('正在启动Claude, 配置键:', configKey, '工作目录:', workDir, '使用Router:', useRouter);
  
  try {
    // 获取配置
    const config = store.get(`configs.${configKey}`);
  if (!config) {
      throw new Error(`找不到配置: ${configKey}`);
    }
    
    // 确保config是ClaudeConfig类型
    const claudeConfig: ClaudeConfig = config as ClaudeConfig;
    
    // 检查是否使用Router
    if (useRouter) {
      // 使用Router模式启动
      const success = await launchClaudeWithRouter(claudeConfig, workDir);
      
      if (success) {
        console.log('Router模式启动成功');
        mainWindow?.webContents.send('claude-launched', configKey);
      } else {
        throw new Error('Router模式启动失败');
      }
    } else {
      // 检查Claude是否已安装
      const isClaudeInstalled = await checkClaudeInstalled();
      if (!isClaudeInstalled) {
        console.log('Claude未安装');
        mainWindow?.webContents.send('claude-not-installed');
        return;
      }

      console.log('使用普通模式启动Claude');
      
      // 构建启动Claude的命令
      let command: string[] = [];
      const claudeExec = await getClaudeExecPath();
      
      if (claudeExec) {
        console.log(`找到Claude可执行文件: ${claudeExec}`);
        command.push(claudeExec);
        
        // 添加工作目录
        if (workDir) {
          command.push('-d', workDir);
        }
        
        // 添加配置
        if (claudeConfig.baseUrl) {
          command.push('-u', claudeConfig.baseUrl);
        }
        
        if (claudeConfig.apiKey) {
          command.push('-k', claudeConfig.apiKey);
        }
        
        if (claudeConfig.model) {
          command.push('-m', claudeConfig.model);
        }
        
        if (claudeConfig.options && typeof claudeConfig.options === 'object') {
          Object.entries(claudeConfig.options).forEach(([key, value]) => {
            if (typeof value === 'boolean' && value) {
              command.push(`--${key}`);
            } else if (value !== null && value !== undefined && value !== '') {
              command.push(`--${key}`, String(value));
            }
          });
        }
      } else {
        // 如果找不到Claude可执行文件，尝试使用全局命令
        console.log('无法找到Claude可执行文件路径，使用全局命令"claude"');
        command = ['claude'];
        
        if (workDir) {
          command.push('-d', workDir);
        }
        
        // 添加配置
        if (claudeConfig.baseUrl) {
          command.push('-u', claudeConfig.baseUrl);
        }
        
        if (claudeConfig.apiKey) {
          command.push('-k', claudeConfig.apiKey);
        }
        
        if (claudeConfig.model) {
          command.push('-m', claudeConfig.model);
        }
      }
      
      console.log('启动Claude命令:', command.join(' '));
      
      try {
        // 使用spawn启动Claude
        const claudeProcess = spawn(command[0], command.slice(1), {
          detached: process.platform !== 'win32', // Linux/macOS上使用分离模式
          stdio: 'ignore',
          env: {
            ...process.env,
            LANG: 'zh_CN.UTF-8',
            LC_ALL: 'zh_CN.UTF-8',
            PYTHONIOENCODING: 'utf-8'
          },
          windowsHide: false // Windows上显示窗口
        });
        
        // 监听错误
        claudeProcess.on('error', (err) => {
          console.error('Claude进程启动错误:', err);
          mainWindow?.webContents.send('claude-error', `Claude启动错误: ${err.message}`);
        });
        
        // 不等待进程结束
        claudeProcess.unref();
        
        console.log('Claude启动成功');
        mainWindow?.webContents.send('claude-launched', configKey);
      } catch (spawnError: any) {
        console.error('Claude进程启动失败:', spawnError);
        mainWindow?.webContents.send('claude-error', `Claude进程启动失败: ${spawnError.message}`);
      }
    }
  } catch (error: any) {
    console.error('启动Claude失败:', error);
    mainWindow?.webContents.send('claude-error', `启动Claude失败: ${error.message}`);
  }
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

// 检查Claude是否已安装
ipcMain.handle('check-claude-installed', async () => {
  return await checkClaudeInstalled();
});

// 检查Claude Router是否已安装
ipcMain.handle('check-claude-router-installed', async () => {
  return await checkClaudeRouterInstalled();
});

// 安装Claude
ipcMain.handle('install-claude', async () => {
  return await installClaude();
});

// 安装Claude和Claude Router
ipcMain.handle('install-claude-and-router', async () => {
  return await installClaudeAndRouter();
});

// 监听渲染进程发来的安装Claude请求
ipcMain.on('install-claude', async () => {
  const success = await installClaude();
  if (mainWindow) {
    mainWindow.webContents.send('claude-status', { installed: success });
  }
});

// 监听渲染进程发来的安装Claude Router请求
ipcMain.on('install-claude-router', async () => {
  const success = await installClaudeRouter();
  if (mainWindow) {
    mainWindow.webContents.send('router-status', { installed: success });
  }
});

// 监听渲染进程发来的启动路由请求
ipcMain.on('start-claude-router', async (event, config: ClaudeConfig) => {
  const success = await startClaudeRouter(config);
  if (mainWindow) {
    mainWindow.webContents.send('router-status', { status: success ? 'running' : 'error' });
  }
});

// 监听渲染进程发来的停止路由请求
ipcMain.on('stop-claude-router', () => {
  stopClaudeRouter();
});

// 监听渲染进程发来的检查路由状态请求
ipcMain.on('check-router-status', async () => {
  const isInstalled = await checkClaudeRouterInstalled();
  const isRunning = await checkRouterRunning();
  
  if (mainWindow) {
    mainWindow.webContents.send('router-status', { 
      installed: isInstalled,
      status: isRunning ? 'running' : 'stopped'
    });
  }
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

// 监听渲染进程发来的保存配置请求
ipcMain.on('save-config', (event, configData: { name: string; config: ClaudeConfig }) => {
  const { name, config } = configData;
  const configs = store.get('configs');
  
  // 保存配置到store
  configs[name] = config;
  store.set('configs', configs);
  
  // 如果使用路由，则生成路由配置文件
  if (config.useRouter && config.routerConfig) {
    try {
      const configPath = saveRouterConfig(config);
      console.log('已保存路由配置到:', configPath);
    } catch (error) {
      console.error('保存路由配置失败:', error);
    }
  }
  
  // 通知渲染进程配置已保存
  if (mainWindow) {
    mainWindow.webContents.send('config-saved', { success: true, name });
  }
});

// 监听渲染进程发来的设置路由启用状态请求
ipcMain.on('set-router-enabled', (event, enabled: boolean) => {
  store.set('routerEnabled', enabled);
});

// 监听渲染进程发来的获取路由配置请求
ipcMain.on('get-router-config', () => {
  const config = loadRouterConfig();
  if (mainWindow) {
    mainWindow.webContents.send('router-config', config);
  }
}); 

// 安装Claude和Claude Router
const installClaudeAndRouter = async (): Promise<boolean> => {
  try {
    if (mainWindow) {
      mainWindow.webContents.send('claude-install-progress', { 
        status: 'installing', 
        progress: 0, 
        message: '准备安装Claude Code...'
      });
    }
    
    // 首先安装Claude
    const claudeInstalled = await installClaude();
    
    if (mainWindow) {
      // 更新状态指示器
      mainWindow.webContents.send('claude-install-progress', { 
        status: 'installing', 
        progress: 50, 
        message: 'Claude Code安装完成，准备安装Claude Code Router...',
        claudeStatus: claudeInstalled
      });
    }
    
    // 如果Claude安装成功，继续安装Router
    if (claudeInstalled) {
      const routerInstalled = await installClaudeRouter();
      
      if (mainWindow) {
        mainWindow.webContents.send('claude-install-progress', { 
          status: 'completed', 
          progress: 100, 
          message: routerInstalled ? '所有组件安装完成！' : 'Claude已安装，但Router安装失败。',
          claudeStatus: true,
          routerStatus: routerInstalled
        });
      }
      
      return routerInstalled;
    }
    
    if (mainWindow) {
      mainWindow.webContents.send('claude-install-progress', { 
        status: 'failed', 
        progress: 0, 
        message: 'Claude安装失败。',
        claudeStatus: false,
        routerStatus: false
      });
    }
    
    return false;
  } catch (error) {
    console.error('安装失败:', error);
    if (mainWindow) {
      mainWindow.webContents.send('claude-install-progress', { 
        status: 'failed', 
        progress: 0, 
        message: `安装失败: ${error}`,
        claudeStatus: false,
        routerStatus: false
      });
    }
    return false;
  }
}; 

// 启动claude-code-router
const launchClaudeWithRouter = async (config: ClaudeConfig, workDir?: string): Promise<boolean> => {
  try {
    console.log('使用Router启动Claude');
    console.log('配置:', JSON.stringify(config));
    
    // 检查Router是否已安装
    const routerInstalled = await checkClaudeRouterInstalled();
    if (!routerInstalled) {
      console.error('Claude Code Router未安装');
      if (mainWindow) {
        mainWindow.webContents.send('claude-error', 'Claude Code Router未安装，请先安装');
      }
      return false;
    }
    
    // 如果routerConfig为空，创建默认配置
    if (!config.routerConfig || Object.keys(config.routerConfig).length === 0) {
      console.log('配置中routerConfig为空，创建默认配置');
      
      // 确定模型名称
      let modelName = config.model || 'claude-3-opus-20240229';
      let transformerType = 'anthropic';
      
      // 根据baseUrl判断模型类型
      if (config.baseUrl?.includes('moonshot') || config.baseUrl?.includes('siliconflow')) {
        if (!modelName.includes('kimi') && !modelName.includes('moonshot')) {
          modelName = 'moonshotai/Kimi-K2-Instruct';
        }
        transformerType = 'deepseek';
      } else if (config.baseUrl?.includes('google') || modelName.includes('gemini')) {
        transformerType = 'gemini';
      } else if (config.baseUrl?.includes('openrouter')) {
        transformerType = 'openrouter';
      }
      
      const providerId = config.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'default';
      
      console.log(`创建默认提供商: id=${providerId}, model=${modelName}, transformer=${transformerType}`);
      
      // 创建默认配置
      config.routerConfig = {
        LOG: true,
        OPENAI_API_KEY: "",
        OPENAI_BASE_URL: "",
        OPENAI_MODEL: "",
        Providers: [{
          name: providerId,
          api_base_url: config.baseUrl || '',
          api_key: config.apiKey || '',
          models: [modelName],
          transformer: { use: [transformerType] }
        }],
        Router: {
          default: `${providerId},${modelName}`,
          think: '',
          longContext: '',
          longContextThreshold: 60000
        }
      };
      
      // 更新存储的配置
      // @ts-ignore: 忽略类型错误
      const configs = store.get('configs');
      if (configs && configs[config.name || '']) {
        configs[config.name || ''] = config;
        // @ts-ignore: 忽略类型错误
        store.set('configs', configs);
        console.log('已更新存储的配置');
      }
    }
    
    // 写入配置到默认位置
    console.log('正在写入Router配置到默认位置...');
    try {
      const configPath = await writeRouterConfigToDefaultLocation(config);
      console.log('写入Router配置成功:', configPath);
    } catch (configError: any) {
      console.error('写入Router配置失败:', configError);
      if (mainWindow) {
        mainWindow.webContents.send('claude-error', `写入Router配置失败: ${configError.message}`);
      }
      return false;
    }
    
    // 获取ccr的路径
    let ccrPath = 'ccr';
    try {
      const which = process.platform === 'win32' ? 'where' : 'which';
      const { stdout } = await promisify(exec)(`${which} ccr`);
      ccrPath = stdout.trim().split(/[\r\n]+/)[0];
      
      // 在Windows上确保使用.cmd扩展名
      if (process.platform === 'win32' && !ccrPath.endsWith('.cmd')) {
        const cmdPath = `${ccrPath}.cmd`;
        if (fs.existsSync(cmdPath)) {
          ccrPath = cmdPath;
        }
      }
    } catch (error) {
      console.error('获取ccr路径失败:', error);
      // 使用默认值
    }
    
    console.log('启动Router模式Claude, 使用命令:', ccrPath);
    
    // 检查文件是否存在
    if (!fs.existsSync(ccrPath)) {
      console.warn(`ccr路径不存在: ${ccrPath}，使用系统PATH`);
      // 使用系统PATH中的ccr
      ccrPath = process.platform === 'win32' ? 'ccr.cmd' : 'ccr';
    }
    
    // 准备命令行参数
    const args = ['code'];
    
    // 添加工作目录参数
    if (workDir) {
      args.push('-d', workDir);
    }
    
    console.log('执行命令:', ccrPath, args.join(' '));
    
    // 启动进程
    const claudeProcess = spawn(ccrPath, args, {
      detached: process.platform !== 'win32', // Linux/macOS上使用分离模式
      stdio: 'ignore',
      env: {
        ...process.env,
        LANG: 'zh_CN.UTF-8',
        LC_ALL: 'zh_CN.UTF-8',
        PYTHONIOENCODING: 'utf-8'
      }
    });
    
    // 不等待进程结束
    claudeProcess.unref();
    
    return true;
  } catch (error: any) {
    console.error('启动Router模式Claude失败:', error);
    if (mainWindow) {
      mainWindow.webContents.send('claude-error', `启动失败: ${error.message}`);
    }
    return false;
  }
}; 

// 获取Claude可执行文件路径
async function getClaudeExecPath(): Promise<string | null> {
  try {
    console.log('获取Claude可执行文件路径');
    const isWindows = process.platform === 'win32';
    const claudeExec = isWindows ? 'claude.cmd' : 'claude';
    const which = isWindows ? 'where' : 'which';
    
    // 首先尝试使用which/where命令
    try {
      const { stdout } = await promisify(exec)(`${which} ${claudeExec}`);
      const path = stdout.trim().split(/[\r\n]+/)[0];
      console.log(`使用${which}命令找到Claude:`, path);
      return path;
    } catch (error) {
      console.warn(`使用${which}命令未找到Claude:`, error);
    }
    
    // 如果which/where失败，尝试检查常见的安装路径
    const commonPaths = isWindows ? [
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'claude.cmd'),
      path.join(os.homedir(), '.npm-global', 'bin', 'claude.cmd'),
      'C:\\Program Files\\nodejs\\claude.cmd',
      'C:\\Program Files (x86)\\nodejs\\claude.cmd',
      path.join(process.env.APPDATA || '', 'npm', 'claude.cmd'),
      path.join(process.env.LOCALAPPDATA || '', 'npm', 'claude.cmd')
    ] : [
      '/usr/local/bin/claude',
      '/usr/bin/claude',
      path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
      path.join(os.homedir(), 'node_modules', '.bin', 'claude')
    ];
    
    for (const pathToCheck of commonPaths) {
      if (fs.existsSync(pathToCheck)) {
        console.log('在替代位置找到Claude:', pathToCheck);
        return pathToCheck;
      }
    }
    
    // 如果仍找不到Claude，返回null
    console.log('未找到Claude可执行文件');
    return null;
  } catch (error) {
    console.error('获取Claude路径失败:', error);
    return null;
  }
} 

// 尝试使用提升的权限写入文件
const writeFileWithElevation = async (filePath: string, content: string): Promise<boolean> => {
  // 标准写入尝试
  try {
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
    console.log(`直接写入文件成功: ${filePath}`);
    return true;
  } catch (error) {
    console.warn(`直接写入文件失败: ${filePath}`, error);
    
    // 在Windows上尝试使用PowerShell提升权限写入
    if (process.platform === 'win32') {
      try {
        console.log('尝试使用PowerShell提升权限写入文件...');
        
        // 创建临时文件
        const tempDir = app.getPath('temp');
        const tempFile = path.join(tempDir, `router-config-${Date.now()}.json`);
        
        // 先写入临时文件
        fs.writeFileSync(tempFile, content, { encoding: 'utf8' });
        
        // 构建PowerShell命令
        const powershellCmd = `
          $content = Get-Content -Path "${tempFile}" -Raw;
          $content | Out-File -FilePath "${filePath}" -Encoding UTF8 -Force;
        `;
        
        // 执行PowerShell命令
        const { stdout, stderr } = await promisify(exec)(
          `powershell -Command "${powershellCmd}"`,
          { maxBuffer: 1024 * 1024 * 5 }  // 5MB buffer
        );
        
        console.log('PowerShell执行结果:', stdout);
        if (stderr) {
          console.warn('PowerShell警告:', stderr);
        }
        
        // 清理临时文件
        fs.unlinkSync(tempFile);
        
        // 验证写入是否成功
        if (fs.existsSync(filePath)) {
          console.log(`使用PowerShell写入文件成功: ${filePath}`);
          return true;
        } else {
          console.error(`使用PowerShell写入后文件不存在: ${filePath}`);
          return false;
        }
      } catch (psError) {
        console.error('使用PowerShell提升权限写入失败:', psError);
        return false;
      }
    }
    
    // 在Unix系统上尝试使用sudo
    else {
      try {
        console.log('尝试使用sudo提升权限写入文件...');
        
        // 创建临时文件
        const tempDir = app.getPath('temp');
        const tempFile = path.join(tempDir, `router-config-${Date.now()}.json`);
        
        // 先写入临时文件
        fs.writeFileSync(tempFile, content, { encoding: 'utf8' });
        
        // 使用sudo命令复制文件
        const { stdout, stderr } = await promisify(exec)(
          `sudo cp "${tempFile}" "${filePath}"`,
          { maxBuffer: 1024 * 1024 * 5 }  // 5MB buffer
        );
        
        console.log('sudo执行结果:', stdout);
        if (stderr) {
          console.warn('sudo警告:', stderr);
        }
        
        // 清理临时文件
        fs.unlinkSync(tempFile);
        
        // 验证写入是否成功
        if (fs.existsSync(filePath)) {
          console.log(`使用sudo写入文件成功: ${filePath}`);
          return true;
        } else {
          console.error(`使用sudo写入后文件不存在: ${filePath}`);
          return false;
        }
      } catch (sudoError) {
        console.error('使用sudo提升权限写入失败:', sudoError);
        return false;
      }
    }
    
    return false;
  }
}; 

// 转换旧格式配置为新格式
function convertToNewRouterConfig(oldConfig: any): RouterConfig {
  if (!oldConfig) {
    return {
      LOG: true,
      OPENAI_API_KEY: "",
      OPENAI_BASE_URL: "",
      OPENAI_MODEL: "",
      Providers: [],
      Router: {
        default: "default,claude-3-opus-20240229"
      }
    };
  }
  
  // 如果已经是新格式
  if (oldConfig.Providers && oldConfig.Router) {
    return oldConfig as RouterConfig;
  }
  
  // 转换旧格式 - 处理的是旧配置对象，不是RouterConfig类型
  const oldProviders = oldConfig.providers as Array<{
    name?: string;
    apiBaseUrl?: string;
    apiKey?: string;
    models?: string[] | string;
    transformer?: { use: string[] };
  }> || [];
  
  const newProviders: RouterProvider[] = oldProviders.map(p => ({
    name: p.name || 'default',
    api_base_url: p.apiBaseUrl || '',
    api_key: p.apiKey || '',
    models: Array.isArray(p.models) ? p.models : [p.models || 'claude-3-opus-20240229'],
    transformer: p.transformer || { use: ['anthropic'] }
  }));
  
  // 创建路由规则
  const oldRouter = oldConfig.router as {
    default?: string;
    think?: string;
    longContext?: string;
    longContextThreshold?: number;
  } || {};
  
  const defaultRoute = oldRouter.default || 
    (newProviders.length > 0 
      ? `${newProviders[0].name},${newProviders[0].models[0]}` 
      : 'default,claude-3-opus-20240229');
  
  return {
    LOG: true,
    OPENAI_API_KEY: "",
    OPENAI_BASE_URL: "",
    OPENAI_MODEL: "",
    Providers: newProviders,
    Router: {
      default: defaultRoute,
      think: oldRouter.think,
      longContext: oldRouter.longContext,
      longContextThreshold: oldRouter.longContextThreshold
    }
  };
} 