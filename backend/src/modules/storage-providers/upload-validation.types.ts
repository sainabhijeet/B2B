export type UploadValidationCategory =
  | 'media_library'
  | 'tenant_media'
  | 'product_image'
  | 'theme_preview'
  | 'ai_logo'
  | 'payment_proof'
  | 'invoice_document'
  | 'customer_avatar'
  | 'customer_gst_certificate'
  | 'theme_zip';

export type UploadValidationInput = {
  category: UploadValidationCategory;
  filename: string;
  declaredMimeType?: string | null;
  sizeBytes?: number | null;
  content?: Buffer | Uint8Array | null;
  objectKey?: string | null;
};

export type UploadValidationFileInput = {
  category: UploadValidationCategory;
  file: Pick<
    Express.Multer.File,
    'originalname' | 'mimetype' | 'size' | 'buffer'
  >;
  objectKey?: string | null;
};

export type UploadValidationIssue = {
  code: string;
  message: string;
  field?: string;
};

export type UploadValidationPolicy = {
  category: UploadValidationCategory;
  maxBytes: number;
  allowedTypes: UploadFileType[];
  inspectZip?: boolean;
};

export type UploadFileType = 'jpeg' | 'png' | 'webp' | 'pdf' | 'zip';

export type ValidatedUpload = {
  category: UploadValidationCategory;
  filename: string;
  extension: string;
  declaredMimeType: string | null;
  detectedMimeType: string;
  sizeBytes: number;
  objectKey: string | null;
  warnings: UploadValidationIssue[];
};

export type UploadValidationResult =
  | {
      ok: true;
      upload: ValidatedUpload;
    }
  | {
      ok: false;
      errors: UploadValidationIssue[];
      warnings: UploadValidationIssue[];
    };
