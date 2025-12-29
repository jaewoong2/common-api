import { HttpStatus } from "@nestjs/common";
import { AppException } from "@common/exceptions/app.exception";
import { ERROR_CODE } from "@common/exceptions/error-codes";

/**
 * Raised when an OAuth provider does not return an email for the user.
 */
export class OAuthEmailRequiredException extends AppException {
  constructor(provider: string) {
    super(
      ERROR_CODE.OAUTH_EMAIL_REQUIRED,
      "Email not provided by OAuth provider",
      HttpStatus.UNAUTHORIZED,
      { provider }
    );
  }
}

/**
 * Raised when required OAuth provider credentials are missing in configuration.
 */
export class OAuthProviderConfigMissingException extends AppException {
  constructor(provider: string) {
    super(
      ERROR_CODE.OAUTH_PROVIDER_CONFIG_MISSING,
      `${provider} OAuth provider is not configured`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { provider }
    );
  }
}
