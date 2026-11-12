import AdmZip = require('adm-zip');
import {
  UPLOAD_SIGNATURE_READ_LIMIT_BYTES,
  UploadValidationException,
  UploadValidationService,
} from './upload-validation.service';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
]);
const webp = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);
const pdf = Buffer.from('%PDF-1.7\n', 'ascii');
const svg = Buffer.from('<svg><script>alert(1)</script></svg>', 'utf8');

function zipWith(entries: Array<{ name: string; body: string }>): Buffer {
  const zip = new AdmZip();
  for (const entry of entries) zip.addFile(entry.name, Buffer.from(entry.body));
  return zip.toBuffer();
}

function zipWithRawEntryName(rawName: string): Buffer {
  const safeName = 'aa/evil.txt';
  if (rawName.length !== safeName.length) {
    throw new Error('raw fixture name must match safe fixture name length');
  }
  const content = zipWith([{ name: safeName, body: 'x' }]);
  const safeBytes = Buffer.from(safeName, 'ascii');
  const rawBytes = Buffer.from(rawName, 'ascii');
  let offset = content.indexOf(safeBytes);
  while (offset >= 0) {
    rawBytes.copy(content, offset);
    offset = content.indexOf(safeBytes, offset + rawBytes.length);
  }
  return content;
}
function expectCodes(result: ReturnType<UploadValidationService['validate']>) {
  if (result.ok) return [];
  return result.errors.map((error) => error.code);
}

describe('UploadValidationService', () => {
  let service: UploadValidationService;

  beforeEach(() => {
    service = new UploadValidationService();
  });
  it('accepts media library uploads for images, PDFs and safe ZIPs only', () => {
    const image = service.validate({
      category: 'media_library',
      filename: 'banner.png',
      declaredMimeType: 'image/png',
      sizeBytes: png.length,
      content: png,
    });
    const document = service.validate({
      category: 'media_library',
      filename: 'guide.pdf',
      declaredMimeType: 'application/pdf',
      sizeBytes: pdf.length,
      content: pdf,
    });
    const archiveContent = zipWith([{ name: 'docs/readme.txt', body: 'ok' }]);
    const archive = service.validate({
      category: 'media_library',
      filename: 'docs.zip',
      declaredMimeType: 'application/zip',
      sizeBytes: archiveContent.length,
      content: archiveContent,
    });
    const svgResult = service.validate({
      category: 'media_library',
      filename: 'icon.svg',
      declaredMimeType: 'image/svg+xml',
      sizeBytes: svg.length,
      content: svg,
    });

    expect(image.ok).toBe(true);
    expect(document.ok).toBe(true);
    expect(archive.ok).toBe(true);
    expect(expectCodes(svgResult)).toContain('UPLOAD_SVG_NOT_ALLOWED');
  });

  it.each([
    ['product.jpg', 'image/jpeg', jpeg, 'image/jpeg'],
    ['product.png', 'image/png', png, 'image/png'],
    ['product.webp', 'image/webp', webp, 'image/webp'],
  ])(
    'accepts valid supported image upload %s',
    (filename, mime, content, detected) => {
      const result = service.validate({
        category: 'product_image',
        filename,
        declaredMimeType: mime,
        sizeBytes: content.length,
        content,
        objectKey: `products/${filename}`,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.upload.detectedMimeType).toBe(detected);
        expect(result.upload.objectKey).toBe(`products/${filename}`);
      }
    },
  );

  it('accepts PDFs only for document categories that allow them', () => {
    const accepted = service.validate({
      category: 'invoice_document',
      filename: 'invoice.pdf',
      declaredMimeType: 'application/pdf',
      sizeBytes: pdf.length,
      content: pdf,
    });
    const rejected = service.validate({
      category: 'product_image',
      filename: 'invoice.pdf',
      declaredMimeType: 'application/pdf',
      sizeBytes: pdf.length,
      content: pdf,
    });

    expect(accepted.ok).toBe(true);
    expect(expectCodes(rejected)).toContain('UPLOAD_EXTENSION_NOT_ALLOWED');
    expect(expectCodes(rejected)).toContain('UPLOAD_MIME_NOT_ALLOWED');
    expect(expectCodes(rejected)).toContain('UPLOAD_SIGNATURE_NOT_ALLOWED');
  });

  it('rejects MIME and extension mismatches', () => {
    const result = service.validate({
      category: 'product_image',
      filename: 'product.jpg',
      declaredMimeType: 'image/png',
      sizeBytes: png.length,
      content: png,
    });

    expect(expectCodes(result)).toEqual(
      expect.arrayContaining([
        'UPLOAD_MIME_EXTENSION_MISMATCH',
        'UPLOAD_SIGNATURE_EXTENSION_MISMATCH',
      ]),
    );
  });

  it('rejects spoofed content type and corrupted images', () => {
    const spoofed = service.validate({
      category: 'product_image',
      filename: 'product.png',
      declaredMimeType: 'image/png',
      sizeBytes: 14,
      content: Buffer.from('not an image'),
    });

    expect(expectCodes(spoofed)).toContain('UPLOAD_SIGNATURE_UNSUPPORTED');
  });

  it('rejects mismatched declared size and uploaded bytes', () => {
    const result = service.validate({
      category: 'product_image',
      filename: 'product.jpg',
      declaredMimeType: 'image/jpeg',
      sizeBytes: jpeg.length + 1,
      content: jpeg,
    });

    expect(expectCodes(result)).toContain('UPLOAD_SIZE_MISMATCH');
  });

  it('rejects empty and oversized files', () => {
    const empty = service.validate({
      category: 'product_image',
      filename: 'product.jpg',
      declaredMimeType: 'image/jpeg',
      sizeBytes: 0,
      content: Buffer.alloc(0),
    });
    const oversized = service.validate({
      category: 'ai_logo',
      filename: 'logo.jpg',
      declaredMimeType: 'image/jpeg',
      sizeBytes: 6 * 1024 * 1024,
      content: jpeg,
    });

    expect(expectCodes(empty)).toContain('UPLOAD_EMPTY');
    expect(expectCodes(empty)).toContain('UPLOAD_SIGNATURE_MISSING');
    expect(expectCodes(oversized)).toContain('UPLOAD_TOO_LARGE');
  });

  it.each([
    '../avatar.jpg',
    'folder/avatar.jpg',
    'folder\\avatar.jpg',
    'C:\\temp\\avatar.jpg',
    '..avatar.jpg',
    'avatar.jpg\0',
  ])('rejects unsafe original filename %s', (filename) => {
    const result = service.validate({
      category: 'tenant_media',
      filename,
      declaredMimeType: 'image/jpeg',
      sizeBytes: jpeg.length,
      content: jpeg,
    });

    expect(expectCodes(result)).toContain('UPLOAD_FILENAME_UNSAFE');
  });

  it.each([
    '../outside.jpg',
    '/absolute.jpg',
    'tenant/../../outside.jpg',
    'C:/absolute.jpg',
    'tenant\\windows.jpg',
    'tenant//blank.jpg',
    'tenant/./dot.jpg',
    'tenant/%2e%2e/outside.jpg',
  ])('rejects unsafe object key %s', (objectKey) => {
    const result = service.validate({
      category: 'tenant_media',
      filename: 'avatar.jpg',
      declaredMimeType: 'image/jpeg',
      sizeBytes: jpeg.length,
      content: jpeg,
      objectKey,
    });

    expect(expectCodes(result)).toContain('UPLOAD_OBJECT_KEY_UNSAFE');
  });

  it('rejects unsupported extensions and unsupported MIME types', () => {
    const result = service.validate({
      category: 'tenant_media',
      filename: 'notes.txt',
      declaredMimeType: 'text/plain',
      sizeBytes: 5,
      content: Buffer.from('hello'),
    });

    expect(expectCodes(result)).toEqual(
      expect.arrayContaining([
        'UPLOAD_EXTENSION_NOT_ALLOWED',
        'UPLOAD_MIME_UNSUPPORTED',
        'UPLOAD_SIGNATURE_UNSUPPORTED',
      ]),
    );
  });

  it('rejects SVG uploads by default, including malicious SVG content', () => {
    const result = service.validate({
      category: 'tenant_media',
      filename: 'icon.svg',
      declaredMimeType: 'image/svg+xml',
      sizeBytes: svg.length,
      content: svg,
    });

    expect(expectCodes(result)).toEqual(
      expect.arrayContaining([
        'UPLOAD_SVG_NOT_ALLOWED',
        'UPLOAD_EXTENSION_NOT_ALLOWED',
        'UPLOAD_MIME_UNSUPPORTED',
      ]),
    );
  });

  it('accepts safe theme ZIP uploads after inspecting entries', () => {
    const content = zipWith([
      { name: 'theme/theme.json', body: '{}' },
      { name: 'theme/templates/home.json', body: '{}' },
    ]);

    const result = service.validate({
      category: 'theme_zip',
      filename: 'theme.zip',
      declaredMimeType: 'application/zip',
      sizeBytes: content.length,
      content,
    });

    expect(result.ok).toBe(true);
  });

  it('rejects malformed ZIP uploads', () => {
    const content = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

    const result = service.validate({
      category: 'theme_zip',
      filename: 'theme.zip',
      declaredMimeType: 'application/zip',
      sizeBytes: content.length,
      content,
    });

    expect(expectCodes(result)).toContain('UPLOAD_ZIP_INVALID');
  });

  it('rejects ZIP traversal and backslash paths without extracting', () => {
    const traversal = service.validate({
      category: 'theme_zip',
      filename: 'theme.zip',
      declaredMimeType: 'application/zip',
      sizeBytes: 1024,
      content: zipWithRawEntryName('../evil.txt'),
    });
    const backslash = service.validate({
      category: 'theme_zip',
      filename: 'theme.zip',
      declaredMimeType: 'application/zip',
      sizeBytes: 1024,
      content: zipWithRawEntryName('aa\\evil.txt'),
    });

    expect(expectCodes(traversal)).toContain('UPLOAD_ZIP_ENTRY_UNSAFE');
    expect(expectCodes(backslash)).toContain('UPLOAD_ZIP_ENTRY_UNSAFE');
  });

  it('serializes safe validation errors without roots, paths, stacks, or secrets', () => {
    expect(() =>
      service.validateOrThrow({
        category: 'tenant_media',
        filename: 'C:\\secrets\\token.svg',
        declaredMimeType: 'image/svg+xml',
        sizeBytes: svg.length,
        content: svg,
        objectKey: '../secret-token.svg',
      }),
    ).toThrow(UploadValidationException);

    try {
      service.validateOrThrow({
        category: 'tenant_media',
        filename: 'C:\\secrets\\token.svg',
        declaredMimeType: 'image/svg+xml',
        sizeBytes: svg.length,
        content: svg,
        objectKey: '../secret-token.svg',
      });
    } catch (error) {
      const serialized = JSON.stringify(
        (error as UploadValidationException).getResponse(),
      );
      expect(serialized).not.toContain('C:\\secrets');
      expect(serialized).not.toContain('secret-token');
      expect(serialized).not.toContain('stack');
    }
  });

  it('keeps signature inspection bounded by an explicit constant', () => {
    expect(UPLOAD_SIGNATURE_READ_LIMIT_BYTES).toBe(560);
  });
});
