import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/**
 * Email Service
 * @description Handles email sending via AWS SES
 * @note Production-ready implementation with AWS SES
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    // Initialize AWS SES Client
    this.sesClient = new SESClient({
      region: this.configService.get<string>("aws.ses.ap-northeast-2"),
    });
    this.fromEmail = this.configService.get<string>("aws.ses.fromEmail");
  }

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
    code: string,
    redirectUrl?: string
  ): Promise<void> {
    const magicLink = redirectUrl
      ? `${redirectUrl}?verificationCode=${code}`
      : `https://biizbiiz.com/auth/verify?verificationCode=${code}`;

    const htmlBody = this.buildHtmlTemplate(magicLink, code);

    try {
      // Production: Use AWS SES
      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: "Your Login Link" },
          Body: {
            Html: { Data: htmlBody },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`Magic link email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      // Re-throw to let caller handle the error
      throw error;
    }
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
