// Claude配置
export interface ClaudeConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
  alias?: string;
  routerConfig?: RouterConfig;
  useRouter?: boolean;
  options?: Record<string, any>;
}

// 路由提供商配置
export interface RouterProvider {
  name: string;
  api_base_url: string;
  api_key: string;
  models: string[];
  transformer?: {
    use: Array<string | [string, Record<string, any>]>;
    [modelName: string]: { use: Array<string | [string, Record<string, any>]> } | Array<string | [string, Record<string, any>]>;
  };
}

// 路由配置
export interface RouterConfig {
  LOG?: boolean;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  Providers: RouterProvider[];
  Router: {
    default: string;
    think?: string;
    longContext?: string;
    longContextThreshold?: number;
    [key: string]: string | number | undefined;
  };
}

export const DEFAULT_CONFIGS: Record<string, ClaudeConfig> = {
  'claude-default': {
    name: 'Claude (默认)',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    model: 'claude-3-5-sonnet-20240620',
    useRouter: false
  },
  'claude-router': {
    name: 'Claude (使用路由)',
    baseUrl: 'http://localhost:3456',
    apiKey: 'any-string-is-ok',
    model: 'claude-3-5-sonnet-20240620',
    useRouter: true,
    routerConfig: {
      LOG: true,
      OPENAI_API_KEY: "",
      OPENAI_BASE_URL: "",
      OPENAI_MODEL: "",
      Providers: [
        {
          name: 'openrouter',
          api_base_url: 'https://openrouter.ai/api/v1/chat/completions',
          api_key: '',
          models: [
            'google/gemini-2.5-pro-preview',
            'anthropic/claude-3-5-sonnet',
            'anthropic/claude-3-7-sonnet:thinking'
          ],
          transformer: {
            use: ['openrouter']
          }
        }
      ],
      Router: {
        default: 'openrouter,anthropic/claude-3-5-sonnet',
        think: 'openrouter,anthropic/claude-3-7-sonnet:thinking',
        longContext: 'openrouter,google/gemini-2.5-pro-preview',
        longContextThreshold: 60000
      }
    }
  }
};

export const CLAUDE_EXEC_PATH = 'Claude';

// 示例配置对象
export const defaultRouterConfig: RouterConfig = {
  LOG: true,
  OPENAI_API_KEY: "",
  OPENAI_BASE_URL: "",
  OPENAI_MODEL: "",
  Providers: [
    {
      name: "default",
      api_base_url: "https://api.anthropic.com/v1/messages",
      api_key: "",
      models: ["claude-3-opus-20240229"],
      transformer: {
        use: ["anthropic"]
      }
    }
  ],
  Router: {
    default: "default,claude-3-opus-20240229"
  }
}; 