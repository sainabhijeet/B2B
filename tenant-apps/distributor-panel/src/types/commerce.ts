/** Order row from `GET /orders` (tenant catalog). */
export type OrderRow = {
  id: string;
  tenantId: string;
  userId: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paymentStatus: string;
  shippingAddressId: string | null;
  paymentMode: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemRow = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  variantSku: string | null;
  quantity: number;
  price: string;
  taxRate: string;
  taxAmount: string;
  totalPrice: string;
};

export type OrderPaymentRow = {
  id: string;
  orderId: string;
  tenantId: string;
  paymentReference: string | null;
  paymentScreenshotUrl: string | null;
  paymentNote: string | null;
  paymentMethod: string;
  utrNumber: string | null;
  amount: string | null;
  status: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderRequestRow = {
  id: string;
  orderId: string;
  tenantId: string;
  distributorId: string;
  type: "REPLACEMENT" | "CANCEL";
  reason: string;
  description: string | null;
  photoUrls: string[];
  status: "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "REPLACEMENT_SHIPPED" | "COMPLETED";
  reviewNote: string | null;
  createdAt: string;
  replacementShipment?: {
    id: string;
    status: "CREATED" | "SHIPPED" | "COMPLETED";
    shippedAt: string | null;
    completedAt: string | null;
  } | null;
};

export type OrderWithItems = OrderRow & {
  items: OrderItemRow[];
  payment?: OrderPaymentRow | null;
  requests?: OrderRequestRow[];
};

export type OrdersListEnvelope = {
  success: boolean;
  data: OrderRow[];
  meta: Record<string, unknown>;
  message: string;
};

export type OrderDetailEnvelope = {
  success: boolean;
  data: OrderWithItems;
  meta: Record<string, unknown>;
  message: string;
};

export type CustomerRow = {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  email: string | null;
  status: string;
  creditLimit: string;
  creditBalance: string;
  createdAt?: string;
};

export type CustomerAddressRow = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  countryCode: string;
  isDefault: boolean;
};

export type CustomersListEnvelope = {
  success: boolean;
  data: CustomerRow[];
  meta: { page: number; limit: number; total: number; total_pages: number };
  message: string;
};

export type CustomerWhatsappPermissionsRow = {
  customerId: string;
  tenantId: string;
  canViewStatus: boolean;
  canViewInvoice: boolean;
  canPlaceOrder: boolean;
  canRepeatOrder: boolean;
  canViewCredit: boolean;
  canReceiveBroadcast: boolean;
};

export type CustomerDetailEnvelope = {
  success: boolean;
  data: CustomerRow & {
    addresses?: CustomerAddressRow[];
    whatsappPermissions?: CustomerWhatsappPermissionsRow | null;
  };
  meta: Record<string, unknown>;
  message: string;
};

export type CustomerWhatsappPermissionsEnvelope = {
  success: boolean;
  data: CustomerWhatsappPermissionsRow;
  meta: Record<string, unknown>;
  message: string;
};

export type CreateCustomerBody = {
  name: string;
  mobile: string;
  email?: string;
  creditLimit?: string;
  status?: string;
};

export type UpdateCustomerBody = Partial<{
  name: string;
  mobile: string;
  email: string;
  status: string;
  creditLimit: string;
  creditBalance: string;
}>;

export type CreditLedgerRow = {
  id: string;
  tenantId: string;
  customerId: string;
  type: string;
  amount: string;
  referenceType: string;
  referenceId: string | null;
  balanceAfter: string;
  createdAt: string;
  createdBy: string | null;
};

export type CreditLedgerEnvelope = {
  success: boolean;
  data: CreditLedgerRow[];
  meta: { page: number; limit: number; total: number; total_pages: number };
  message: string;
};

export type InvoiceRow = {
  id: string;
  tenantId: string;
  orderId: string;
  invoiceNumber: string;
  invoicePrefix: string;
  invoiceFormat: string;
  invoiceDate: string;
  gstNumber: string | null;
  totalAmount: string;
  status: string;
  createdAt: string;
};

export type InvoicesListEnvelope = {
  success: boolean;
  data: InvoiceRow[];
  meta: Record<string, unknown>;
  message: string;
};

export type InvoiceDownloadEnvelope = {
  success: boolean;
  data: {
    invoiceId: string;
    invoiceNumber: string;
    status: string;
    note: string;
  };
  meta: Record<string, unknown>;
  message: string;
};
