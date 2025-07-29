export interface ClaudeConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
}

export const DEFAULT_CONFIGS: Record<string, ClaudeConfig> = {

};

export const CLAUDE_EXEC_PATH = 'Claude'; 