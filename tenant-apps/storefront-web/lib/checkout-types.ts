export type StorefrontAddress = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  countryCode: string | null;
  isDefault: boolean;
};

export type StorefrontCustomerMe = {
  id: string;
  name: string;
  mobile?: string;
  email?: string | null;
  creditLimit?: string;
  creditBalance?: string;
  addresses?: StorefrontAddress[];
};

export type StorefrontMeEnvelope = {
  success?: boolean;
  data?: StorefrontCustomerMe;
  message?: string | string[];
};

export type PlaceOrderResponse = {
  success?: boolean;
  data?: { order_id?: string; order_number?: string; total_amount?: string };
  message?: string | string[];
};

export type CheckoutPaymentMode = "CREDIT" | "RAZORPAY" | "UPI_QR" | "NEFT" | "CASH";

export type BuyNowSelection = {
  productId: string;
  variantId: string;
  quantity: number;
  productSlug: string;
};
