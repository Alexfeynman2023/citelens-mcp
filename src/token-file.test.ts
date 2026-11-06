import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getTokenFilePath,
  loadTokenFile,
  saveTokenFile,
  tokenFileToOAuthTokens,
  oauthTokensToTokenFile,
  type TokenFileData,
} from './token-file.js';

describe('token-file', () => {
  const testDir = join(tmpdir(), 'citelens-test-' + Date.now());
  const testTokenPath = join(testDir, 'token.json');
  
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    delete process.env.CITELENS_TOKEN_FILE;
  });
  
  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    delete process.env.CITELENS_TOKEN_FILE;
  });

  describe('getTokenFilePath', () => {
    it('should return default path when CITELENS_TOKEN_FILE not set', () => {
      const path = getTokenFilePath();
      expect(path).toContain('.citelens');
      expect(path).toContain('token.json');
    });

    it('should return env var path when CITELENS_TOKEN_FILE is set', () => {
      process.env.CITELENS_TOKEN_FILE = '/custom/path/token.json';
      const path = getTokenFilePath();
      expect(path).toBe('/custom/path/token.json');
    });
  });

  describe('saveTokenFile', () => {
    it('should create directory and file with correct permissions', () => {
      const nestedPath = join(testDir, 'nested', 'dir', 'token.json');
      const tokenData: TokenFileData = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: Date.now() + 3600000,
      };

      saveTokenFile(tokenData, nestedPath);

      expect(existsSync(nestedPath)).toBe(true);
      
      const content = JSON.parse(readFileSync(nestedPath, 'utf-8'));
      expect(content.access_token).toBe('test-access-token');
      expect(content.refresh_token).toBe('test-refresh-token');

      // Check file permissions (Unix only)
      if (process.platform !== 'win32') {
        const stats = statSync(nestedPath);
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600);
      }
    });

    it('should include client credentials when provided', () => {
      const tokenData: TokenFileData = {
        access_token: 'test-token',
        client_id: 'my-client-id',
        client_secret: 'my-client-secret',
      };

      saveTokenFile(tokenData, testTokenPath);

      const content = JSON.parse(readFileSync(testTokenPath, 'utf-8'));
      expect(content.client_id).toBe('my-client-id');
      expect(content.client_secret).toBe('my-client-secret');
    });
  });

  describe('loadTokenFile', () => {
    it('should return null for non-existent file', () => {
      const result = loadTokenFile(join(testDir, 'nonexistent.json'));
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      writeFileSync(testTokenPath, 'not valid json', 'utf-8');
      const result = loadTokenFile(testTokenPath);
      expect(result).toBeNull();
    });

    it('should return null when access_token is missing', () => {
      writeFileSync(testTokenPath, JSON.stringify({ refresh_token: 'test' }), 'utf-8');
      const result = loadTokenFile(testTokenPath);
      expect(result).toBeNull();
    });

    it('should load valid token file', () => {
      const tokenData: TokenFileData = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: 1700000000000,
        client_id: 'client-123',
      };
      writeFileSync(testTokenPath, JSON.stringify(tokenData), 'utf-8');

      const result = loadTokenFile(testTokenPath);

      expect(result).not.toBeNull();
      expect(result!.access_token).toBe('test-access-token');
      expect(result!.refresh_token).toBe('test-refresh-token');
      expect(result!.expires_at).toBe(1700000000000);
      expect(result!.client_id).toBe('client-123');
    });
  });

  describe('tokenFileToOAuthTokens', () => {
    it('should convert token file data to OAuthTokens', () => {
      const fileData: TokenFileData = {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_at: 1700000000000,
      };

      const tokens = tokenFileToOAuthTokens(fileData);

      expect(tokens.accessToken).toBe('access-123');
      expect(tokens.refreshToken).toBe('refresh-456');
      expect(tokens.expiresAt).toBe(1700000000000);
    });
  });

  describe('oauthTokensToTokenFile', () => {
    it('should convert OAuthTokens to token file data', () => {
      const tokens = {
        accessToken: 'access-789',
        refreshToken: 'refresh-012',
        expiresAt: 1700000000000,
      };

      const fileData = oauthTokensToTokenFile(tokens, 'client-id', 'client-secret');

      expect(fileData.access_token).toBe('access-789');
      expect(fileData.refresh_token).toBe('refresh-012');
      expect(fileData.expires_at).toBe(1700000000000);
      expect(fileData.client_id).toBe('client-id');
      expect(fileData.client_secret).toBe('client-secret');
    });

    it('should work without client credentials', () => {
      const tokens = {
        accessToken: 'access-only',
      };

      const fileData = oauthTokensToTokenFile(tokens);

      expect(fileData.access_token).toBe('access-only');
      expect(fileData.client_id).toBeUndefined();
      expect(fileData.client_secret).toBeUndefined();
    });
  });
});
