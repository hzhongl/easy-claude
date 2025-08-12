import Store from 'electron-store';
import { ClaudeConfig, DEFAULT_CONFIGS, RouterProvider, RouterConfig } from '../constants/config';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface StoreSchema {
  configs: Record<string, ClaudeConfig>;
  activeConfig: string;
  routerEnabled: boolean;
}

const schema = {
  configs: {
    type: 'object' as const,
    default: DEFAULT_CONFIGS
  },
  activeConfig: {
    type: 'string' as const,
    default: ''
  },
  routerEnabled: {
    type: 'boolean' as const,
    default: false
  }
};

const store = new Store<StoreSchema>({ schema });

// 保存路由配置到文件
export const saveRouterConfig = (config: ClaudeConfig): string => {
  if (!config.routerConfig) {
    throw new Error('路由配置不存在');
  }

  const homedir = os.homedir();
  const configDir = path.join(homedir, '.claude-code-router');
  
  // 确保配置目录存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const configPath = path.join(configDir, 'config.json');
  
  // 使用新的配置格式
  // 配置已经是新格式，直接写入
  fs.writeFileSync(configPath, JSON.stringify(config.routerConfig, null, 2));
  
  return configPath;
};

// 读取路由配置
export const loadRouterConfig = (): RouterConfig | null => {
  const homedir = os.homedir();
  const configPath = path.join(homedir, '.claude-code-router', 'config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent) as RouterConfig;
    } catch (error) {
      console.error('读取路由配置失败:', error);
      return null;
    }
  }
  
  return null;
};

export default store; 