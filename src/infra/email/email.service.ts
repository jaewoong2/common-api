import { Injectable, Logger } from '@nestjs/common';

/**
 * Email Service
 * @description Handles email sending (AWS SES)
 * @note For MVP: logs to console. Production: use AWS SES
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Send magic link email
   * @param to - Recipient email
   * @param token - JWT token for magic link
   * @param code - 6-digit verification code
   * @param redirectUrl - Optional redirect URL after auth
   * @example
   * sendMagicLinkEmail('user@example.com', 'jwt-token', '123456', 'https://app.example.com/auth/callback')
   */
  async sendMagicLinkEmail(
    to: string,
    token: string,
    code: string,
    redirectUrl?: string,
  ): Promise<void> {
    const magicLink = redirectUrl
      ? `${redirectUrl}?token=${token}`
      : `https://yourdomain.com/auth/verify?token=${token}`;

    const htmlBody = this.buildHtmlTemplate(magicLink, code);
    const textBody = this.buildTextTemplate(magicLink, code);

    // For MVP: log to console
    this.logger.log(`
========================================
EMAIL: Magic Link
TO: ${to}
SUBJECT: Your Login Link
----------------------------------------
${textBody}
========================================
    `);

    // Production: Use AWS SES
    // const ses = new SESClient({ region: process.env.AWS_REGION });
    // await ses.send(new SendEmailCommand({
    //   Source: process.env.AWS_SES_FROM_EMAIL,
    //   Destination: { ToAddresses: [to] },
    //   Message: {
    //     Subject: { Data: 'Your Login Link' },
    //     Body: {
    //       Html: { Data: htmlBody },
    //       Text: { Data: textBody },
    //     },
    //   },
    // }));
  }

  /**
   * Build HTML email template
   * @private
   */
  private buildHtmlTemplate(magicLink: string, code: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Link</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #007bff; color: #fff !important; text-decoration: none; border-radius: 4px; }
    .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #007bff; margin: 20px 0; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Login to Your Account</h1>
    <p>Click the button below to login instantly:</p>
    <p><a href="${magicLink}" class="button">Login Now</a></p>
    <p>Or enter this verification code:</p>
    <div class="code">${code}</div>
    <p>This link and code will expire in 10 minutes.</p>
    <div class="footer">
      <p>If you didn't request this login, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build text email template
   * @private
   */
  private buildTextTemplate(magicLink: string, code: string): string {
    return `
Login to Your Account

Click the link below to login instantly:
${magicLink}

Or enter this verification code:
${code}

This link and code will expire in 10 minutes.

If you didn't request this login, please ignore this email.
    `.trim();
  }
}
