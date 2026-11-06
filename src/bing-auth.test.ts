import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiKeyAuth, OAuthAuth, createAuthProvider } from './bing-auth.js';

describe('BingAuth', () => {
  describe('ApiKeyAuth', () => {
    it('should add apikey to URL', () => {
      const auth = new ApiKeyAuth('test-key-123');
      const url = new URL('https://ssl.bing.com/webmaster/api.svc/json/GetUserSites');
      const headers = new Headers();
      
      auth.applyAuth(url, headers);
      
      expect(url.searchParams.get('apikey')).toBe('test-key-123');
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should throw for empty key', () => {
      expect(() => new ApiKeyAuth('')).toThrow('API key is required');
    });
  });

  describe('OAuthAuth', () => {
    it('should add Bearer token to headers', () => {
      const auth = new OAuthAuth({ accessToken: 'test-token-xyz' });
      const url = new URL('https://ssl.bing.com/webmaster/api.svc/json/GetUserSites');
      const headers = new Headers();
      
      auth.applyAuth(url, headers);
      
      expect(headers.get('Authorization')).toBe('Bearer test-token-xyz');
      expect(url.searchParams.has('apikey')).toBe(false);
    });

    it('should throw for empty access token', () => {
      expect(() => new OAuthAuth({ accessToken: '' })).toThrow('access token is required');
    });

    it('should detect expired tokens', () => {
      const auth = new OAuthAuth({
        accessToken: 'test',
        expiresAt: Date.now() - 1000,
      });
      expect(auth.isExpired()).toBe(true);
    });

    it('should not mark non-expired tokens as expired', () => {
      const auth = new OAuthAuth({
        accessToken: 'test',
        expiresAt: Date.now() + 120000,
      });
      expect(auth.isExpired()).toBe(false);
    });

    it('should build correct authorization URL', () => {
      const url = OAuthAuth.buildAuthorizationUrl(
        'client-123',
        'https://myapp.com/callback',
        'random-state'
      );
      
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe('https://www.bing.com/webmasters/oauth/authorize');
      expect(parsed.searchParams.get('client_id')).toBe('client-123');
      expect(parsed.searchParams.get('redirect_uri')).toBe('https://myapp.com/callback');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('scope')).toBe('webmaster.read webmaster.manage');
      expect(parsed.searchParams.get('state')).toBe('random-state');
    });

    describe('token exchange', () => {
      const originalFetch = global.fetch;

      beforeEach(() => {
        global.fetch = vi.fn();
      });

      afterEach(() => {
        global.fetch = originalFetch;
      });

      it('should exchange code for tokens', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        });

        const tokens = await OAuthAuth.exchangeCodeForTokens(
          'client-id',
          'client-secret',
          'auth-code',
          'https://redirect.uri'
        );

        expect(tokens.accessToken).toBe('new-access-token');
        expect(tokens.refreshToken).toBe('new-refresh-token');
        expect(tokens.expiresAt).toBeGreaterThan(Date.now());

        expect(global.fetch).toHaveBeenCalledWith(
          'https://www.bing.com/webmasters/oauth/token',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
        );
      });

      it('should refresh access token', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: 'refreshed-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        });

        const tokens = await OAuthAuth.refreshAccessToken(
          'client-id',
          'client-secret',
          'old-refresh-token'
        );

        expect(tokens.accessToken).toBe('refreshed-token');
        expect(tokens.refreshToken).toBe('old-refresh-token');
      });

      it('should throw on token exchange error', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          status: 400,
          text: async () => 'invalid_grant',
        });

        await expect(
          OAuthAuth.exchangeCodeForTokens('c', 's', 'bad', 'u')
        ).rejects.toThrow('OAuth token exchange failed');
      });
    });

    describe('auto refresh', () => {
      const originalFetch = global.fetch;

      beforeEach(() => {
        global.fetch = vi.fn();
      });

      afterEach(() => {
        global.fetch = originalFetch;
      });

      it('should call refresh callback when expired', async () => {
        const mockRefresh = vi.fn().mockResolvedValue({
          accessToken: 'refreshed',
          expiresAt: Date.now() + 3600000,
        });

        const auth = new OAuthAuth(
          {
            accessToken: 'old',
            refreshToken: 'refresh-token',
            expiresAt: Date.now() - 1000,
          },
          mockRefresh
        );

        await auth.refreshIfNeeded();

        expect(mockRefresh).toHaveBeenCalled();
        expect(auth.getTokens().accessToken).toBe('refreshed');
      });

      it('should not refresh if not expired', async () => {
        const mockRefresh = vi.fn();

        const auth = new OAuthAuth(
          {
            accessToken: 'valid',
            expiresAt: Date.now() + 3600000,
          },
          mockRefresh
        );

        await auth.refreshIfNeeded();

        expect(mockRefresh).not.toHaveBeenCalled();
      });
    });
  });

  describe('createAuthProvider', () => {
    it('should create ApiKeyAuth for apiKey', () => {
      const auth = createAuthProvider({ apiKey: 'test-key' });
      expect(auth.type).toBe('apikey');
    });

    it('should create OAuthAuth for oauthTokens', () => {
      const auth = createAuthProvider({ 
        oauthTokens: { accessToken: 'token' } 
      });
      expect(auth.type).toBe('oauth');
    });

    it('should prefer OAuth over API key', () => {
      const auth = createAuthProvider({
        apiKey: 'test-key',
        oauthTokens: { accessToken: 'token' },
      });
      expect(auth.type).toBe('oauth');
    });

    it('should throw when no auth provided', () => {
      expect(() => createAuthProvider({})).toThrow('Either apiKey or oauthTokens');
    });
  });
});
