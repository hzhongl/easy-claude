import Store from 'electron-store';
import { ClaudeConfig, DEFAULT_CONFIGS } from '../constants/config';

export interface StoreSchema {
  configs: Record<string, ClaudeConfig>;
  activeConfig: string;
}

const schema = {
  configs: {
    type: 'object' as const,
    default: DEFAULT_CONFIGS
  },
  activeConfig: {
    type: 'string' as const,
    default: ''
  }
};

const store = new Store<StoreSchema>({ schema });

export default store; 