import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('smtp.host'),
      port: this.configService.getOrThrow<number>('smtp.port'),
      secure: this.configService.getOrThrow<boolean>('smtp.secure'),
      auth: {
        user: this.configService.getOrThrow<string>('smtp.user'),
        pass: this.configService.getOrThrow<string>('smtp.pass'),
      },
    });
  }

  async sendEmail(toEmail: string, subject: string, text: string, html?: string): Promise<void> {
    const fromName = this.configService.getOrThrow<string>('smtp.fromName');
    const fromEmail = this.configService.getOrThrow<string>('smtp.fromEmail');

    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject,
      text,
      html: html ?? `<p>${text}</p>`,
    });
    this.logger.log(`Email sent to ${toEmail}: ${subject}`);
  }

  async sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
    await this.sendEmail(
      toEmail,
      'Reset your password',
      `You requested a password reset. Open this link: ${resetLink}`,
      `
        <p>You requested a password reset.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    );
  }
}
