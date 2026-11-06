/**
 * OAuth Token File Management
 * 
 * Supports reading/writing OAuth tokens from/to a JSON file for persistent
 * storage. Default location: ~/.citelens/token.json
 * Override via CITELENS_TOKEN_FILE environment variable.
 * 
 * Token file format:
 * {
 *   "access_token": "...",
 *   "refresh_token": "...",
 *   "expires_at": 1234567890000,  // Unix timestamp in milliseconds
 *   "client_id": "...",           // Optional: for auto-refresh
 *   "client_secret": "..."        // Optional: for auto-refresh
 * }
 */

import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { OAuthTokens } from './bing-auth.js';

export interface TokenFileData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  client_id?: string;
  client_secret?: string;
}

export function getTokenFilePath(): string {
  const envPath = process.env.CITELENS_TOKEN_FILE;
  if (envPath) {
    return envPath;
  }
  return join(homedir(), '.citelens', 'token.json');
}

export function loadTokenFile(path?: string): TokenFileData | null {
  const tokenPath = path ?? getTokenFilePath();
  
  try {
    if (!existsSync(tokenPath)) {
      return null;
    }
    
    const content = readFileSync(tokenPath, 'utf-8');
    const data = JSON.parse(content) as TokenFileData;
    
    if (!data.access_token) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

export function saveTokenFile(data: TokenFileData, path?: string): void {
  const tokenPath = path ?? getTokenFilePath();
  const dir = dirname(tokenPath);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  
  const content = JSON.stringify(data, null, 2);
  writeFileSync(tokenPath, content, { encoding: 'utf-8', mode: 0o600 });
  
  // Ensure file permissions are restrictive (600)
  try {
    chmodSync(tokenPath, 0o600);
  } catch {
    // Ignore chmod errors (e.g., on Windows)
  }
}

export function tokenFileToOAuthTokens(data: TokenFileData): OAuthTokens {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

export function oauthTokensToTokenFile(
  tokens: OAuthTokens,
  clientId?: string,
  clientSecret?: string
): TokenFileData {
  return {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt,
    client_id: clientId,
    client_secret: clientSecret,
  };
}
