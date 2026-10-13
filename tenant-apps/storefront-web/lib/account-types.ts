export type CustomerAddress = {
  id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  countryCode?: string | null;
  isDefault: boolean;
};

export type CustomerProfile = {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  profileImageUrl?: string | null;
  creditLimit: string | number;
  creditBalance: string | number;
  addresses: CustomerAddress[];
};

export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string | string[];
};
