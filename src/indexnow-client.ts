import { randomBytes } from 'node:crypto';
import type { IndexNowSubmitResult, IndexNowKeyValidation } from './types.js';

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

export class IndexNowClient {
  private key: string | undefined;
  private keyLocation: string | undefined;

  constructor(key?: string, keyLocation?: string) {
    this.key = key;
    this.keyLocation = keyLocation;
  }

  static generateKey(length = 32): string {
    if (length < 8 || length > 128) {
      throw new Error('IndexNow key length must be between 8 and 128 characters');
    }
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
    const bytes = randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }
    return result;
  }

  async validateKeyFile(host: string, key?: string): Promise<IndexNowKeyValidation> {
    const keyToValidate = key || this.key;
    if (!keyToValidate) {
      return {
        valid: false,
        message: 'No IndexNow key provided',
      };
    }

    const keyFileUrl = this.keyLocation || `https://${host}/${keyToValidate}.txt`;

    try {
      const response = await fetch(keyFileUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
      });

      if (!response.ok) {
        return {
          valid: false,
          message: `Key file not accessible: HTTP ${response.status}`,
          keyFileUrl,
        };
      }

      const content = (await response.text()).trim();
      if (content !== keyToValidate) {
        return {
          valid: false,
          message: 'Key file content does not match the key',
          keyFileUrl,
        };
      }

      return {
        valid: true,
        message: 'Key file is valid and accessible',
        keyFileUrl,
      };
    } catch (error) {
      return {
        valid: false,
        message: `Failed to fetch key file: ${error instanceof Error ? error.message : String(error)}`,
        keyFileUrl,
      };
    }
  }

  async submitUrl(url: string, key?: string, keyLocation?: string): Promise<IndexNowSubmitResult> {
    const keyToUse = key || this.key;
    if (!keyToUse) {
      return {
        success: false,
        statusCode: 400,
        message: 'No IndexNow key provided',
      };
    }

    const parsedUrl = new URL(url);
    const endpoint = INDEXNOW_ENDPOINTS[0];
    
    const params = new URLSearchParams({
      url: url,
      key: keyToUse,
    });

    if (keyLocation || this.keyLocation) {
      params.set('keyLocation', keyLocation || this.keyLocation!);
    }

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
      });

      return this.parseResponse(response, parsedUrl.host);
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async submitUrlBatch(
    host: string,
    urls: string[],
    key?: string,
    keyLocation?: string
  ): Promise<IndexNowSubmitResult> {
    const keyToUse = key || this.key;
    if (!keyToUse) {
      return {
        success: false,
        statusCode: 400,
        message: 'No IndexNow key provided',
      };
    }

    if (urls.length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: 'No URLs provided',
      };
    }

    if (urls.length > 10000) {
      return {
        success: false,
        statusCode: 400,
        message: 'Maximum 10,000 URLs per IndexNow submission',
      };
    }

    const endpoint = INDEXNOW_ENDPOINTS[0];
    
    const body: Record<string, unknown> = {
      host,
      key: keyToUse,
      urlList: urls,
    };

    if (keyLocation || this.keyLocation) {
      body.keyLocation = keyLocation || this.keyLocation;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
      });

      return this.parseResponse(response, host);
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private parseResponse(_response: Response, _host: string): IndexNowSubmitResult {
    const statusCode = _response.status;
    
    switch (statusCode) {
      case 200:
        return {
          success: true,
          statusCode,
          message: 'URLs submitted successfully',
        };
      case 202:
        return {
          success: true,
          statusCode,
          message: 'URLs received, key validation pending',
        };
      case 400:
        return {
          success: false,
          statusCode,
          message: 'Invalid request format',
        };
      case 403:
        return {
          success: false,
          statusCode,
          message: 'Invalid key - key does not exist or is not valid',
        };
      case 422:
        return {
          success: false,
          statusCode,
          message: 'URLs do not belong to the specified host or key does not match',
        };
      case 429:
        return {
          success: false,
          statusCode,
          message: 'Too many requests - please slow down',
        };
      default:
        return {
          success: false,
          statusCode,
          message: `Unexpected response: ${statusCode}`,
        };
    }
  }
}
