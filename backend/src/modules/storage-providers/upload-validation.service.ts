import { BadRequestException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- adm-zip is CommonJS in this project runtime.
import AdmZip = require('adm-zip');
import * as path from 'node:path';
import { normalizeStorageObjectKey } from './storage-object-key.util';
import {
  UploadFileType,
  UploadValidationCategory,
  UploadValidationFileInput,
  UploadValidationInput,
  UploadValidationIssue,
  UploadValidationPolicy,
  UploadValidationResult,
  ValidatedUpload,
} from './upload-validation.types';

export const UPLOAD_SIGNATURE_READ_LIMIT_BYTES = 560;

const MB = 1024 * 1024;
const MAX_ZIP_ENTRY_COUNT = 2000;
const MAX_ZIP_UNCOMPRESSED_BYTES = 150 * MB;
const MAX_ZIP_COMPRESSION_RATIO = 100;
const ENCODED_PATH_META_PATTERN = /%(?:00|2e|2f|3a|5c)/i;

const FILE_TYPES: Record<
  UploadFileType,
  {
    canonicalMime: string;
    mimes: string[];
    extensions: string[];
  }
> = {
  jpeg: {
    canonicalMime: 'image/jpeg',
    mimes: ['image/jpeg'],
    extensions: ['.jpg', '.jpeg'],
  },
  png: {
    canonicalMime: 'image/png',
    mimes: ['image/png'],
    extensions: ['.png'],
  },
  webp: {
    canonicalMime: 'image/webp',
    mimes: ['image/webp'],
    extensions: ['.webp'],
  },
  pdf: {
    canonicalMime: 'application/pdf',
    mimes: ['application/pdf'],
    extensions: ['.pdf'],
  },
  zip: {
    canonicalMime: 'application/zip',
    mimes: [
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip',
    ],
    extensions: ['.zip'],
  },
};

export const UPLOAD_VALIDATION_POLICIES: Record<
  UploadValidationCategory,
  UploadValidationPolicy
> = {
  media_library: {
    category: 'media_library',
    maxBytes: 25 * MB,
    allowedTypes: ['jpeg', 'png', 'webp', 'pdf', 'zip'],
    inspectZip: true,
  },
  tenant_media: {
    category: 'tenant_media',
    maxBytes: 25 * MB,
    allowedTypes: ['jpeg', 'png', 'webp'],
  },
  product_image: {
    category: 'product_image',
    maxBytes: 25 * MB,
    allowedTypes: ['jpeg', 'png', 'webp'],
  },
  theme_preview: {
    category: 'theme_preview',
    maxBytes: 25 * MB,
    allowedTypes: ['jpeg', 'png', 'webp'],
  },
  ai_logo: {
    category: 'ai_logo',
    maxBytes: 5 * MB,
    allowedTypes: ['jpeg', 'png', 'webp'],
  },
  payment_proof: {
    category: 'payment_proof',
    maxBytes: 10 * MB,
    allowedTypes: ['jpeg', 'png', 'webp', 'pdf'],
  },
  invoice_document: {
    category: 'invoice_document',
    maxBytes: 10 * MB,
    allowedTypes: ['pdf'],
  },
  customer_avatar: {
    category: 'customer_avatar',
    maxBytes: 5 * MB,
    allowedTypes: ['jpeg', 'png', 'webp'],
  },
  customer_gst_certificate: {
    category: 'customer_gst_certificate',
    maxBytes: 10 * MB,
    allowedTypes: ['jpeg', 'png', 'pdf'],
  },
  theme_zip: {
    category: 'theme_zip',
    maxBytes: 50 * MB,
    allowedTypes: ['zip'],
    inspectZip: true,
  },
};

export class UploadValidationException extends BadRequestException {
  constructor(errors: UploadValidationIssue[]) {
    super({
      message: 'Upload validation failed.',
      errors,
    });
  }
}

@Injectable()
export class UploadValidationService {
  validateFile(input: UploadValidationFileInput): UploadValidationResult {
    return this.validate({
      category: input.category,
      filename: input.file.originalname,
      declaredMimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      content: input.file.buffer,
      objectKey: input.objectKey,
    });
  }

  validateFileOrThrow(input: UploadValidationFileInput): ValidatedUpload {
    return this.validateOrThrow({
      category: input.category,
      filename: input.file.originalname,
      declaredMimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      content: input.file.buffer,
      objectKey: input.objectKey,
    });
  }

  validateOrThrow(input: UploadValidationInput): ValidatedUpload {
    const result = this.validate(input);
    if (!result.ok) throw new UploadValidationException(result.errors);
    return result.upload;
  }

  validate(input: UploadValidationInput): UploadValidationResult {
    const policy = UPLOAD_VALIDATION_POLICIES[input.category];
    const errors: UploadValidationIssue[] = [];
    const warnings: UploadValidationIssue[] = [];
    const filename = this.validateFilename(input.filename, policy, errors);
    const declaredMimeType = this.normalizeMimeType(input.declaredMimeType);
    const content = this.toBuffer(input.content);
    const signature = content.subarray(0, UPLOAD_SIGNATURE_READ_LIMIT_BYTES);
    const sizeBytes = this.resolveSize(input.sizeBytes, content);

    if (sizeBytes === null) {
      errors.push(
        issue('UPLOAD_SIZE_MISSING', 'Upload size is required.', 'size'),
      );
    } else if (sizeBytes === 0) {
      errors.push(issue('UPLOAD_EMPTY', 'Uploaded file is empty.', 'size'));
    } else if (sizeBytes > policy.maxBytes) {
      errors.push(
        issue(
          'UPLOAD_TOO_LARGE',
          `Uploaded file exceeds the ${policy.maxBytes} byte limit.`,
          'size',
        ),
      );
    }

    if (!declaredMimeType) {
      errors.push(
        issue(
          'UPLOAD_MIME_MISSING',
          'Declared content type is required.',
          'declaredMimeType',
        ),
      );
    }

    if (
      typeof input.sizeBytes === 'number' &&
      Number.isFinite(input.sizeBytes) &&
      content.length > 0 &&
      Math.floor(input.sizeBytes) !== content.length
    ) {
      errors.push(
        issue(
          'UPLOAD_SIZE_MISMATCH',
          'Declared upload size does not match the uploaded bytes.',
          'size',
        ),
      );
    }

    if (!content.length) {
      errors.push(
        issue(
          'UPLOAD_SIGNATURE_MISSING',
          'File signature bytes are required.',
          'content',
        ),
      );
    }

    const extension = filename ? path.extname(filename).toLowerCase() : '';
    const extensionType = this.typeFromExtension(extension);
    const declaredType = declaredMimeType
      ? this.typeFromMimeType(declaredMimeType)
      : null;
    const detectedType = this.detectFileType(signature);

    if (
      declaredMimeType === 'image/svg+xml' ||
      extension === '.svg' ||
      detectedType === 'svg'
    ) {
      errors.push(
        issue(
          'UPLOAD_SVG_NOT_ALLOWED',
          'SVG uploads are not allowed by the central upload policy.',
          'filename',
        ),
      );
    }

    if (extensionType && !policy.allowedTypes.includes(extensionType)) {
      errors.push(
        issue(
          'UPLOAD_EXTENSION_NOT_ALLOWED',
          'File extension is not allowed for this upload category.',
          'filename',
        ),
      );
    }

    if (!extensionType && extension) {
      errors.push(
        issue(
          'UPLOAD_EXTENSION_UNSUPPORTED',
          'File extension is not supported.',
          'filename',
        ),
      );
    }

    if (declaredType && !policy.allowedTypes.includes(declaredType)) {
      errors.push(
        issue(
          'UPLOAD_MIME_NOT_ALLOWED',
          'Declared content type is not allowed for this upload category.',
          'declaredMimeType',
        ),
      );
    }

    if (!declaredType && declaredMimeType) {
      errors.push(
        issue(
          'UPLOAD_MIME_UNSUPPORTED',
          'Declared content type is not supported.',
          'declaredMimeType',
        ),
      );
    }

    if (!detectedType) {
      errors.push(
        issue(
          'UPLOAD_SIGNATURE_UNSUPPORTED',
          'File signature does not match a supported file type.',
          'content',
        ),
      );
    } else if (
      detectedType !== 'svg' &&
      !policy.allowedTypes.includes(detectedType)
    ) {
      errors.push(
        issue(
          'UPLOAD_SIGNATURE_NOT_ALLOWED',
          'Detected file type is not allowed for this upload category.',
          'content',
        ),
      );
    }

    if (
      declaredType &&
      extensionType &&
      declaredType !== extensionType &&
      this.isPolicyType(policy, declaredType) &&
      this.isPolicyType(policy, extensionType)
    ) {
      errors.push(
        issue(
          'UPLOAD_MIME_EXTENSION_MISMATCH',
          'Declared content type does not match the file extension.',
          'filename',
        ),
      );
    }

    if (
      detectedType &&
      detectedType !== 'svg' &&
      extensionType &&
      detectedType !== extensionType
    ) {
      errors.push(
        issue(
          'UPLOAD_SIGNATURE_EXTENSION_MISMATCH',
          'File signature does not match the file extension.',
          'content',
        ),
      );
    }

    if (
      detectedType &&
      detectedType !== 'svg' &&
      declaredType &&
      detectedType !== declaredType
    ) {
      errors.push(
        issue(
          'UPLOAD_SIGNATURE_MIME_MISMATCH',
          'File signature does not match the declared content type.',
          'content',
        ),
      );
    }

    if (input.objectKey !== undefined && input.objectKey !== null) {
      try {
        normalizeStorageObjectKey(input.objectKey);
      } catch {
        errors.push(
          issue(
            'UPLOAD_OBJECT_KEY_UNSAFE',
            'Storage object key is invalid.',
            'objectKey',
          ),
        );
      }
    }

    if (policy.inspectZip && detectedType === 'zip' && content.length) {
      const zipIssues = this.inspectZipBuffer(content);
      errors.push(...zipIssues.errors);
      warnings.push(...zipIssues.warnings);
    }

    if (errors.length) return { ok: false, errors, warnings };

    const canonicalType = detectedType as UploadFileType;
    return {
      ok: true,
      upload: {
        category: input.category,
        filename,
        extension,
        declaredMimeType,
        detectedMimeType: FILE_TYPES[canonicalType].canonicalMime,
        sizeBytes: sizeBytes ?? content.length,
        objectKey:
          input.objectKey === undefined || input.objectKey === null
            ? null
            : normalizeStorageObjectKey(input.objectKey),
        warnings,
      },
    };
  }

  private validateFilename(
    raw: string,
    policy: UploadValidationPolicy,
    errors: UploadValidationIssue[],
  ): string {
    const filename = String(raw ?? '').trim();
    if (!filename) {
      errors.push(
        issue('UPLOAD_FILENAME_MISSING', 'Filename is required.', 'filename'),
      );
      return '';
    }
    if (
      filename === '.' ||
      filename === '..' ||
      filename.includes('\0') ||
      /[\u0000-\u001f\u007f]/.test(filename) ||
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('..') ||
      /^[a-zA-Z]:[\\/]/.test(filename) ||
      path.isAbsolute(filename)
    ) {
      errors.push(
        issue('UPLOAD_FILENAME_UNSAFE', 'Filename is unsafe.', 'filename'),
      );
    }
    const base = path.basename(filename);
    if (base !== filename) {
      errors.push(
        issue('UPLOAD_FILENAME_UNSAFE', 'Filename is unsafe.', 'filename'),
      );
    }
    const extension = path.extname(filename).toLowerCase();
    if (!extension) {
      errors.push(
        issue(
          'UPLOAD_EXTENSION_MISSING',
          'Filename must include an extension.',
          'filename',
        ),
      );
    } else if (!this.isPolicyExtension(policy, extension)) {
      errors.push(
        issue(
          'UPLOAD_EXTENSION_NOT_ALLOWED',
          'File extension is not allowed for this upload category.',
          'filename',
        ),
      );
    }
    return filename;
  }

  private inspectZipBuffer(content: Buffer): {
    errors: UploadValidationIssue[];
    warnings: UploadValidationIssue[];
  } {
    const errors: UploadValidationIssue[] = [];
    const warnings: UploadValidationIssue[] = [];
    let zip: AdmZip;
    try {
      zip = new AdmZip(content);
    } catch {
      return {
        errors: [
          issue(
            'UPLOAD_ZIP_INVALID',
            'ZIP archive is not readable.',
            'content',
          ),
        ],
        warnings,
      };
    }

    const entries = zip.getEntries();
    if (!entries.length) {
      errors.push(
        issue(
          'UPLOAD_ZIP_EMPTY',
          'ZIP archive contains no entries.',
          'content',
        ),
      );
    }
    if (entries.length > MAX_ZIP_ENTRY_COUNT) {
      errors.push(
        issue(
          'UPLOAD_ZIP_TOO_MANY_ENTRIES',
          'ZIP archive contains too many entries.',
          'content',
        ),
      );
    }

    const names = new Set<string>();
    let totalUncompressedBytes = 0;
    for (const entry of entries) {
      const rawName = String(entry.entryName ?? '');
      const name = rawName.replace(/\/+$/u, '');
      const header = entry.header as unknown as {
        compressedSize?: number;
        size?: number;
      };
      const compressedSize = Math.max(0, Number(header.compressedSize ?? 0));
      const uncompressedSize = Math.max(0, Number(header.size ?? 0));
      totalUncompressedBytes += uncompressedSize;

      if (!this.isSafeZipEntryName(name)) {
        errors.push(
          issue(
            'UPLOAD_ZIP_ENTRY_UNSAFE',
            'ZIP archive contains an unsafe entry path.',
            'content',
          ),
        );
      } else {
        const normalized = path.posix.normalize(name);
        if (names.has(normalized)) {
          errors.push(
            issue(
              'UPLOAD_ZIP_DUPLICATE_ENTRY',
              'ZIP archive contains duplicate normalized entries.',
              'content',
            ),
          );
        }
        names.add(normalized);
      }

      if (totalUncompressedBytes > MAX_ZIP_UNCOMPRESSED_BYTES) {
        errors.push(
          issue(
            'UPLOAD_ZIP_EXPANDS_TOO_LARGE',
            'ZIP archive expands beyond the configured limit.',
            'content',
          ),
        );
        break;
      }
      if (compressedSize === 0 && uncompressedSize > 0) {
        errors.push(
          issue(
            'UPLOAD_ZIP_SUSPICIOUS_COMPRESSION',
            'ZIP archive contains suspicious compression metadata.',
            'content',
          ),
        );
      } else if (
        compressedSize > 0 &&
        uncompressedSize / compressedSize > MAX_ZIP_COMPRESSION_RATIO
      ) {
        errors.push(
          issue(
            'UPLOAD_ZIP_SUSPICIOUS_COMPRESSION',
            'ZIP archive compression ratio exceeds the configured limit.',
            'content',
          ),
        );
      }
    }
    return { errors, warnings };
  }

  private inspectRawZipEntryNames(content: Buffer): UploadValidationIssue[] {
    const errors: UploadValidationIssue[] = [];
    for (let offset = 0; offset <= content.length - 4; offset += 1) {
      const signature = content.readUInt32LE(offset);
      if (signature === 0x04034b50 && offset + 30 <= content.length) {
        const filenameLength = content.readUInt16LE(offset + 26);
        const extraLength = content.readUInt16LE(offset + 28);
        const nameStart = offset + 30;
        const nameEnd = nameStart + filenameLength;
        if (nameEnd <= content.length) {
          this.collectRawZipEntryNameError(
            content.subarray(nameStart, nameEnd).toString('utf8'),
            errors,
          );
        }
        offset = Math.max(offset, nameEnd + extraLength - 1);
      } else if (signature === 0x02014b50 && offset + 46 <= content.length) {
        const filenameLength = content.readUInt16LE(offset + 28);
        const extraLength = content.readUInt16LE(offset + 30);
        const commentLength = content.readUInt16LE(offset + 32);
        const nameStart = offset + 46;
        const nameEnd = nameStart + filenameLength;
        if (nameEnd <= content.length) {
          this.collectRawZipEntryNameError(
            content.subarray(nameStart, nameEnd).toString('utf8'),
            errors,
          );
        }
        offset = Math.max(offset, nameEnd + extraLength + commentLength - 1);
      }
    }
    return errors;
  }

  private collectRawZipEntryNameError(
    rawName: string,
    errors: UploadValidationIssue[],
  ): void {
    const name = rawName.replace(/\/+$/u, '');
    if (!this.isSafeZipEntryName(name)) {
      errors.push(
        issue(
          'UPLOAD_ZIP_ENTRY_UNSAFE',
          'ZIP archive contains an unsafe entry path.',
          'content',
        ),
      );
    }
  }

  private isSafeZipEntryName(value: string): boolean {
    if (
      !value ||
      value.includes('\0') ||
      /[\u0000-\u001f\u007f]/.test(value) ||
      value.includes('\\') ||
      value.includes(':') ||
      value.startsWith('/') ||
      /^[a-zA-Z]:[\\/]/.test(value) ||
      ENCODED_PATH_META_PATTERN.test(value)
    ) {
      return false;
    }
    const normalized = path.posix.normalize(value);
    if (normalized !== value || normalized === '.' || normalized === '..') {
      return false;
    }
    return !value
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..');
  }

  private detectFileType(signature: Buffer): UploadFileType | 'svg' | null {
    if (this.isSvg(signature)) return 'svg';
    if (
      signature.length >= 4 &&
      signature[0] === 0xff &&
      signature[1] === 0xd8 &&
      signature[2] === 0xff
    ) {
      return 'jpeg';
    }
    if (
      signature.length >= 24 &&
      signature
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ) &&
      signature.subarray(12, 16).toString('ascii') === 'IHDR'
    ) {
      return 'png';
    }
    if (
      signature.length >= 12 &&
      signature.subarray(0, 4).toString('ascii') === 'RIFF' &&
      signature.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'webp';
    }
    if (
      signature.length >= 5 &&
      signature.subarray(0, 5).toString('ascii') === '%PDF-'
    ) {
      return 'pdf';
    }
    if (
      signature.length >= 4 &&
      signature[0] === 0x50 &&
      signature[1] === 0x4b &&
      ((signature[2] === 0x03 && signature[3] === 0x04) ||
        (signature[2] === 0x05 && signature[3] === 0x06) ||
        (signature[2] === 0x07 && signature[3] === 0x08))
    ) {
      return 'zip';
    }
    return null;
  }

  private isSvg(signature: Buffer): boolean {
    const sample = signature.subarray(0, 256).toString('utf8').trimStart();
    return (
      /^<\?xml[\s\S]*<svg[\s>]/i.test(sample) || /^<svg[\s>]/i.test(sample)
    );
  }

  private normalizeMimeType(value: string | null | undefined): string | null {
    const normalized = String(value ?? '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    return normalized || null;
  }

  private resolveSize(
    declaredSize: number | null | undefined,
    content: Buffer,
  ): number | null {
    if (typeof declaredSize === 'number' && Number.isFinite(declaredSize)) {
      return Math.max(0, Math.floor(declaredSize));
    }
    return content.length || null;
  }

  private toBuffer(value: Buffer | Uint8Array | null | undefined): Buffer {
    if (!value) return Buffer.alloc(0);
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
  }

  private typeFromMimeType(mime: string): UploadFileType | null {
    return (
      (Object.entries(FILE_TYPES).find(([, cfg]) =>
        cfg.mimes.includes(mime),
      )?.[0] as UploadFileType | undefined) ?? null
    );
  }

  private typeFromExtension(extension: string): UploadFileType | null {
    return (
      (Object.entries(FILE_TYPES).find(([, cfg]) =>
        cfg.extensions.includes(extension),
      )?.[0] as UploadFileType | undefined) ?? null
    );
  }

  private isPolicyExtension(
    policy: UploadValidationPolicy,
    extension: string,
  ): boolean {
    return policy.allowedTypes.some((type) =>
      FILE_TYPES[type].extensions.includes(extension),
    );
  }

  private isPolicyType(
    policy: UploadValidationPolicy,
    type: UploadFileType,
  ): boolean {
    return policy.allowedTypes.includes(type);
  }
}

function issue(
  code: string,
  message: string,
  field?: string,
): UploadValidationIssue {
  return field ? { code, message, field } : { code, message };
}
