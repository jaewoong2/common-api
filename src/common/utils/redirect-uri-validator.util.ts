import { BadRequestException } from '@nestjs/common';

/**
 * Redirect URI Validator Utility
 * @description Validates redirect URIs against domain whitelist to prevent open redirect vulnerabilities
 */
export class RedirectUriValidator {
  /**
   * Validate redirect URI against allowed domains
   * @param redirectUri - The redirect URI to validate
   * @param allowedDomains - Array of allowed domain patterns
   * @param isDevelopment - Whether in development mode (allows localhost)
   * @throws BadRequestException if redirect URI is not in whitelist
   */
  static validate(
    redirectUri: string,
    allowedDomains: string[] | null,
    isDevelopment = false
  ): void {
    if (!redirectUri) {
      throw new BadRequestException('redirect_uri is required');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(redirectUri);
    } catch (error) {
      throw new BadRequestException('redirect_uri must be a valid URL');
    }

    // In development, allow localhost
    if (isDevelopment && this.isLocalhost(parsedUrl)) {
      return;
    }

    // Enforce HTTPS in production
    if (!isDevelopment && parsedUrl.protocol !== 'https:') {
      throw new BadRequestException(
        'redirect_uri must use HTTPS in production'
      );
    }

    // Check against whitelist
    if (!allowedDomains || allowedDomains.length === 0) {
      throw new BadRequestException(
        'No allowed redirect domains configured for this app'
      );
    }

    const redirectOrigin = `${parsedUrl.protocol}//${parsedUrl.host}`;

    const isAllowed = allowedDomains.some((allowedDomain) => {
      return this.matchesDomain(redirectOrigin, allowedDomain);
    });

    if (!isAllowed) {
      throw new BadRequestException(
        `redirect_uri domain not in whitelist. Got: ${redirectOrigin}`
      );
    }
  }

  /**
   * Check if URL is localhost
   */
  private static isLocalhost(url: URL): boolean {
    const localhostPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '[::1]',
      '::1',
    ];
    return localhostPatterns.some((pattern) => url.hostname === pattern);
  }

  /**
   * Match redirect origin against allowed domain pattern
   * @param redirectOrigin - Full origin (protocol + host)
   * @param allowedDomain - Allowed domain pattern
   */
  private static matchesDomain(
    redirectOrigin: string,
    allowedDomain: string
  ): boolean {
    // Exact match
    if (redirectOrigin === allowedDomain) {
      return true;
    }

    // Wildcard subdomain matching (*.example.com)
    if (allowedDomain.startsWith('*.')) {
      const baseDomain = allowedDomain.substring(2); // Remove "*."
      try {
        const redirectUrl = new URL(redirectOrigin);
        const allowedUrl = new URL(`https://${baseDomain}`); // Use https as dummy protocol

        // Check if redirect hostname ends with base domain
        if (
          redirectUrl.hostname.endsWith(`.${allowedUrl.hostname}`) ||
          redirectUrl.hostname === allowedUrl.hostname
        ) {
          // Protocol must match
          return redirectUrl.protocol === allowedUrl.protocol;
        }
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  /**
   * Extract domain from redirect URI for logging
   */
  static extractDomain(redirectUri: string): string {
    try {
      const url = new URL(redirectUri);
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      return redirectUri;
    }
  }
}
