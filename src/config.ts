import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Config {
  bingWebmasterApiKey: string | undefined;
  indexNowKey: string | undefined;
  dataDir: string;
}

function getDataDir(): string {
  const envDir = process.env.CITELENS_DATA_DIR;
  if (envDir) {
    return envDir;
  }
  return join(homedir(), '.citelens');
}

export function loadConfig(): Config {
  return {
    bingWebmasterApiKey: process.env.BING_WEBMASTER_API_KEY,
    indexNowKey: process.env.INDEXNOW_KEY,
    dataDir: getDataDir(),
  };
}

export function validateConfig(config: Config): string[] {
  const warnings: string[] = [];
  
  if (!config.bingWebmasterApiKey) {
    warnings.push('BING_WEBMASTER_API_KEY not set - Bing Webmaster tools will not work');
  }
  
  if (!config.indexNowKey) {
    warnings.push('INDEXNOW_KEY not set - IndexNow submission will require key parameter');
  }
  
  return warnings;
}
