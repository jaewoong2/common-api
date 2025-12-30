import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { AWS_SES_CLIENT } from '../aws/aws-clients.module';

/**
 * Email Service
 * @description Handles email sending via AWS SES
 * @note Production-ready implementation with AWS SES
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor(
    @Inject(AWS_SES_CLIENT)
    private readonly sesClient: SESClient,
    private readonly configService: ConfigService,
  ) {
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
          Subject: { Data: `비즈비즈 | 로그인 인증 번호 [${code}]` },
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
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>비즈비즈 로그인 인증</title>
  <style>
    @media (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 24px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f5f7fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#0f172a;">
  <div style="display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#f5f7fb;">로그인 인증 번호 ${code} 입니다.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(15, 23, 42, 0.08); border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#0f172a; padding:18px 24px; color:#ffffff; font-weight:700; font-size:18px;">
              비즈비즈
            </td>
          </tr>
          <tr>
            <td class="content" style="padding:32px 32px 28px;">
              <p style="margin:0 0 12px; font-size:14px; color:#475569;">안녕하세요,</p>
              <p style="margin:0 0 20px; font-size:16px; font-weight:600; color:#0f172a;">로그인을 위한 인증 번호를 보내드립니다.</p>
              <div style="text-align:center; margin:24px 0;">
                <div style="display:inline-block; padding:14px 18px; border-radius:12px; background:#f8fafc; border:1px dashed #cbd5e1; font-family:'SFMono-Regular', Menlo, Consolas, monospace; letter-spacing:6px; font-size:26px; font-weight:700; color:#0f172a;">${code}</div>
              </div>
              <p style="margin:0 0 16px; font-size:14px; color:#475569;">아래 버튼을 클릭하면 바로 로그인할 수 있습니다.</p>
              <div style="text-align:center; margin:20px 0 28px;">
                <a href="${magicLink}" style="display:inline-block; padding:14px 24px; background:linear-gradient(135deg, #2563eb, #4f46e5); color:#ffffff; text-decoration:none; border-radius:12px; font-weight:700; letter-spacing:0.2px;">지금 로그인하기</a>
              </div>
              <p style="margin:0 0 10px; font-size:12px; color:#94a3b8;">링크와 인증번호는 10분 동안만 유효합니다.</p>
              <p style="margin:0 0 24px; font-size:12px; color:#94a3b8;">버튼이 동작하지 않으면 아래 링크를 브라우저 주소창에 붙여넣어 주세요:<br><a href="${magicLink}" style="color:#2563eb; text-decoration:none; word-break:break-all;">${magicLink}</a></p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc; padding:16px 24px; font-size:12px; color:#94a3b8; text-align:center;">본 메일은 발신 전용입니다. 요청하지 않았다면 이 메시지를 무시하세요.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
