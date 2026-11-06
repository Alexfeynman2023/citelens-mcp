/**
 * Bing Webmaster Tools Authentication
 * 
 * Supports two authentication methods per Microsoft's docs:
 * 1. API Key: Simple key passed as query parameter (for local/open-source use)
 * 2. OAuth 2.0: Bearer token in Authorization header (for hosted service)
 * 
 * OAuth 2.0 flow (per https://learn.microsoft.com/en-us/bingwebmaster/oauth2):
 * - Authorization URL: https://www.bing.com/webmasters/oauth/authorize
 * - Token URL: https://www.bing.com/webmasters/oauth/token
 * - Scopes: webmaster.read, webmaster.manage (NOTE: token response may return "Manage" or "Read" instead)
 * - Authorization code valid for 5 minutes
 * - Access token expires in ~3600 seconds
 * - Refresh token valid until user revocation
 * 
 * IMPORTANT (verified 2026-11-05):
 * - Refresh token responses do NOT include a new refresh_token - persist the original
 * - Token scope in response may be "Manage" instead of "webmaster.manage"
 * - Refresh works without redirect_uri parameter
 */

export interface BingAuthProvider {
  type: 'apikey' | 'oauth';
  applyAuth(url: URL, headers: Headers): void;
}

export class ApiKeyAuth implements BingAuthProvider {
  readonly type = 'apikey' as const;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Bing Webmaster API key is required');
    }
    this.apiKey = apiKey;
  }

  applyAuth(url: URL, _headers: Headers): void {
    url.searchParams.set('apikey', this.apiKey);
  }
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export type TokenRefreshCallback = (tokens: OAuthTokens) => Promise<OAuthTokens>;

export class OAuthAuth implements BingAuthProvider {
  readonly type = 'oauth' as const;
  private tokens: OAuthTokens;
  private onTokenRefresh?: TokenRefreshCallback;

  static readonly AUTH_URL = 'https://www.bing.com/webmasters/oauth/authorize';
  static readonly TOKEN_URL = 'https://www.bing.com/webmasters/oauth/token';
  /**
   * Scopes for authorization request.
   * NOTE: Token response may return simplified scope names like "Manage" or "Read"
   * instead of "webmaster.manage" or "webmaster.read"
   */
  static readonly SCOPES = ['webmaster.read', 'webmaster.manage'] as const;

  constructor(tokens: OAuthTokens, onTokenRefresh?: TokenRefreshCallback) {
    if (!tokens.accessToken) {
      throw new Error('OAuth access token is required');
    }
    this.tokens = tokens;
    this.onTokenRefresh = onTokenRefresh;
  }

  applyAuth(_url: URL, headers: Headers): void {
    headers.set('Authorization', `Bearer ${this.tokens.accessToken}`);
  }

  isExpired(): boolean {
    if (!this.tokens.expiresAt) return false;
    return Date.now() >= this.tokens.expiresAt - 60000;
  }

  async refreshIfNeeded(): Promise<void> {
    if (this.isExpired() && this.tokens.refreshToken && this.onTokenRefresh) {
      this.tokens = await this.onTokenRefresh(this.tokens);
    }
  }

  getTokens(): OAuthTokens {
    return { ...this.tokens };
  }

  static buildAuthorizationUrl(clientId: string, redirectUri: string, state?: string): string {
    const url = new URL(OAuthAuth.AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', OAuthAuth.SCOPES.join(' '));
    if (state) {
      url.searchParams.set('state', state);
    }
    return url.toString();
  }

  static async exchangeCodeForTokens(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const response = await fetch(OAuthAuth.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OAuth token exchange failed: ${response.status} ${text}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type: string;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }

  /**
   * Refresh an access token using a refresh token.
   * 
   * IMPORTANT: The response does NOT include a new refresh_token.
   * The original refresh_token remains valid and should be persisted.
   * 
   * @param clientId - OAuth client ID
   * @param clientSecret - OAuth client secret
   * @param refreshToken - The refresh token to use
   * @returns New tokens (refreshToken will be the same as input since server doesn't return a new one)
   */
  static async refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const response = await fetch(OAuthAuth.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OAuth token refresh failed: ${response.status} ${text}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type: string;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      // Server does NOT return refresh_token on refresh - keep the original
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }
}

export function createAuthProvider(config: {
  apiKey?: string;
  oauthTokens?: OAuthTokens;
  onTokenRefresh?: TokenRefreshCallback;
}): BingAuthProvider {
  if (config.oauthTokens) {
    return new OAuthAuth(config.oauthTokens, config.onTokenRefresh);
  }
  if (config.apiKey) {
    return new ApiKeyAuth(config.apiKey);
  }
  throw new Error('Either apiKey or oauthTokens must be provided');
}
