import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly ivLength = 12;
  private readonly authTagLength = 16;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not configured');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
    // aes-256-gcm needs a 32-byte key — fail fast at boot rather than on the
    // first encrypt() call with a confusing low-level crypto error.
    if (this.key.length !== 32) {
      throw new Error(
        'ENCRYPTION_KEY must be 32 bytes / 64 hex characters (openssl rand -hex 32)',
      );
    }
  }

  encrypt(text: string): { encrypted: string; iv: string; keyVersion: number } {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    const combined = Buffer.concat([encrypted, authTag]);
    
    return {
      encrypted: combined.toString('base64'),
      iv: iv.toString('base64'),
      keyVersion: 1,
    };
  }

  decrypt(encrypted: string, iv: string): string {
    const encryptedBuffer = Buffer.from(encrypted, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    if (encryptedBuffer.length <= this.authTagLength) {
      throw new Error('Invalid encrypted payload');
    }

    const authTag = encryptedBuffer.slice(-this.authTagLength);
    const ciphertext = encryptedBuffer.slice(0, -this.authTagLength);
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      ivBuffer,
    );
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  }

  hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  generateApiKey(): string {
    return `apr_live_${crypto.randomBytes(32).toString('hex')}`;
  }
}
