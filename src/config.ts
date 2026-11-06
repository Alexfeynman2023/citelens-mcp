import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadTokenFile, tokenFileToOAuthTokens } from './token-file.js';
import type { OAuthTokens } from './bing-auth.js';

export interface OAuthConfig {
  tokens: OAuthTokens;
  clientId?: string;
  clientSecret?: string;
}

export interface Config {
  bingWebmasterApiKey: string | undefined;
  oauth: OAuthConfig | undefined;
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

function loadOAuthConfig(): OAuthConfig | undefined {
  // Priority 1: Environment variable for access token (simplest for containers)
  const envAccessToken = process.env.CITELENS_ACCESS_TOKEN;
  if (envAccessToken) {
    return {
      tokens: {
        accessToken: envAccessToken,
        refreshToken: process.env.CITELENS_REFRESH_TOKEN,
        expiresAt: process.env.CITELENS_TOKEN_EXPIRES_AT
          ? parseInt(process.env.CITELENS_TOKEN_EXPIRES_AT, 10)
          : undefined,
      },
      clientId: process.env.CITELENS_CLIENT_ID,
      clientSecret: process.env.CITELENS_CLIENT_SECRET,
    };
  }

  // Priority 2: Token file (default: ~/.citelens/token.json)
  const tokenFile = loadTokenFile();
  if (tokenFile) {
    return {
      tokens: tokenFileToOAuthTokens(tokenFile),
      clientId: tokenFile.client_id,
      clientSecret: tokenFile.client_secret,
    };
  }

  return undefined;
}

export function loadConfig(): Config {
  return {
    bingWebmasterApiKey: process.env.BING_WEBMASTER_API_KEY,
    oauth: loadOAuthConfig(),
    indexNowKey: process.env.INDEXNOW_KEY,
    dataDir: getDataDir(),
  };
}

export function validateConfig(config: Config): string[] {
  const warnings: string[] = [];
  
  if (!config.bingWebmasterApiKey && !config.oauth) {
    warnings.push(
      'No authentication configured - set BING_WEBMASTER_API_KEY, ' +
      'CITELENS_ACCESS_TOKEN, or create ~/.citelens/token.json'
    );
  }
  
  if (!config.indexNowKey) {
    warnings.push('INDEXNOW_KEY not set - IndexNow submission will require key parameter');
  }
  
  return warnings;
}
