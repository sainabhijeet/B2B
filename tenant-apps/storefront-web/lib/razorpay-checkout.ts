type CheckoutResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, callback: (event: { error?: { description?: string } }) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

type ApiEnvelope<T> = { data?: T; message?: string | string[] };
type PaymentSession = {
  alreadyPaid?: boolean;
  razorpayKeyId?: string;
  razorpayOrderId?: string;
  amountPaise?: number;
  currency?: string;
  orderNumber?: string;
};

export type RazorpayCheckoutResult =
  | { status: "verified" }
  | { status: "cancelled"; message: string }
  | { status: "pending"; message: string };

export class RazorpayCheckoutError extends Error {
  constructor(message: string, public readonly paymentMayHaveSucceeded = false) {
    super(message);
    this.name = "RazorpayCheckoutError";
  }
}

function apiMessage(payload: ApiEnvelope<unknown> | null, fallback: string): string {
  const message = payload?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message) && message.length) return message.join(", ");
  return fallback;
}

async function post<T>(path: string, body?: Record<string, string>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.data) {
    throw new RazorpayCheckoutError(apiMessage(payload, `Payment request failed (${response.status}).`));
  }
  return payload.data;
}

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new RazorpayCheckoutError("Payment is only available in the browser."));
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => window.Razorpay ? resolve() : reject(new RazorpayCheckoutError("Razorpay checkout did not load."));
      script.onerror = () => reject(new RazorpayCheckoutError("Razorpay checkout could not load. Check your connection and try again."));
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      scriptPromise = null;
      throw error;
    });
  }
  return scriptPromise;
}

async function reconcilePayment(path: string): Promise<boolean> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    try {
      const session = await post<PaymentSession>(path);
      if (session.alreadyPaid === true) return true;
    } catch {
      // A temporary API/provider error must not turn a possible payment into cancellation.
    }
  }
  return false;
}

function normalizedContact(value: string | undefined): string {
  const raw = value?.trim() ?? "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return digits;
}

export async function payWithRazorpay(input: {
  orderId: string;
  orderNumber: string;
  merchantName?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
}): Promise<RazorpayCheckoutResult> {
  await loadRazorpayCheckout();
  const base = `/api/storefront/orders/${encodeURIComponent(input.orderId)}/razorpay`;
  const sessionPath = `${base}/order`;
  const session = await post<PaymentSession>(sessionPath);
  if (session.alreadyPaid === true) return { status: "verified" };

  const providerOrderId = session.razorpayOrderId?.trim() ?? "";
  const keyId = session.razorpayKeyId?.trim() ?? "";
  const amountPaise = Number(session.amountPaise);
  if (!/^order_[A-Za-z0-9]+$/.test(providerOrderId) || !/^rzp_(test|live)_/.test(keyId) ||
      !Number.isSafeInteger(amountPaise) || amountPaise < 100 || session.currency !== "INR") {
    throw new RazorpayCheckoutError("The online payment session is incomplete. Please try again.");
  }
  const Checkout = window.Razorpay;
  if (!Checkout) throw new RazorpayCheckoutError("Razorpay checkout did not load.");

  return new Promise<RazorpayCheckoutResult>((resolve) => {
    let settling = false;
    let callbackStarted = false;
    let finished = false;
    let paymentFailed = false;
    let failureMessage = "Online payment failed. Check Orders before trying again.";
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: RazorpayCheckoutResult) => {
      if (finished) return;
      finished = true;
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };
    const settleAfterClose = async () => {
      if (settling || finished) return;
      settling = true;
      const verified = await reconcilePayment(sessionPath);
      if (callbackStarted || finished) return;
      finish(verified ? { status: "verified" } : paymentFailed
        ? { status: "pending", message: failureMessage }
        : { status: "cancelled", message: "Online payment was cancelled." });
    };
    const verify = async (response: CheckoutResponse) => {
      if (callbackStarted || finished) return;
      callbackStarted = true;
      const paymentId = response.razorpay_payment_id?.trim() ?? "";
      const callbackOrderId = response.razorpay_order_id?.trim() ?? "";
      const signature = response.razorpay_signature?.trim() ?? "";
      if (paymentId && callbackOrderId === providerOrderId && signature) {
        try {
          const verified = await post<{ paymentStatus?: string }>(`${base}/verify`, {
            razorpayOrderId: providerOrderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
          });
          if (verified.paymentStatus === "VERIFIED") {
            finish({ status: "verified" });
            return;
          }
        } catch {
          // Reconcile below; the bank may already have captured the payment.
        }
      }
      const reconciled = await reconcilePayment(sessionPath);
      finish(reconciled ? { status: "verified" } : {
        status: "pending",
        message: "Payment may have succeeded, but server verification is pending. Check Orders before retrying.",
      });
    };

    try {
      const checkout = new Checkout({
        key: keyId,
        amount: amountPaise,
        currency: "INR",
        order_id: providerOrderId,
        method: "upi",
        name: input.merchantName?.trim() || "B2B Commerce",
        description: `Payment for order ${session.orderNumber || input.orderNumber}`,
        timeout: 300,
        retry: { enabled: false },
        prefill: {
          ...(input.customerName?.trim() ? { name: input.customerName.trim() } : {}),
          ...(normalizedContact(input.customerPhone) ? { contact: normalizedContact(input.customerPhone) } : {}),
          ...(input.customerEmail?.trim() ? { email: input.customerEmail.trim() } : {}),
        },
        config: {
          display: {
            blocks: { upi: { name: "Pay via UPI", instruments: [{ method: "upi", flows: ["collect", "intent", "qr"] }] } },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true },
          },
        },
        theme: { color: "#4f46e5" },
        handler: (response: CheckoutResponse) => { void verify(response); },
        modal: { ondismiss: () => { void settleAfterClose(); } },
      });
      checkout.on("payment.failed", (event) => {
        paymentFailed = true;
        failureMessage = event.error?.description?.trim() || failureMessage;
      });
      checkout.open();
      timeout = setTimeout(() => { void settleAfterClose(); }, 6 * 60 * 1000);
    } catch {
      void settleAfterClose();
    }
  });
}
