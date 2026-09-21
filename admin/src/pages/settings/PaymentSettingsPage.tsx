import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { paymentDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function PaymentSettingsPage() {
  const [form, setForm] = useState(paymentDefaults);

  return (
    <ResourcePanel title="Payment settings">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div>
          <label className={setLbl}>Payment gateway</label>
          <select
            className={setInp}
            value={form.paymentGateway}
            onChange={(e) => setForm((f) => ({ ...f, paymentGateway: e.target.value }))}
          >
            <option value="razorpay">Razorpay</option>
            <option value="stripe">Stripe</option>
            <option value="manual">Manual / offline</option>
          </select>
        </div>
        <div>
          <label className={setLbl}>UPI ID (QR)</label>
          <input
            className={setInp}
            value={form.upiId}
            onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
            placeholder="superhit@upi"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={setLbl}>Bank details (display)</label>
          <textarea
            className={`${setInp} min-h-[3.5rem]`}
            value={form.bankDetails}
            onChange={(e) => setForm((f) => ({ ...f, bankDetails: e.target.value }))}
          />
        </div>
        <div>
          <label className={setLbl}>Invoice prefix</label>
          <input
            className={setInp}
            value={form.invoicePrefix}
            onChange={(e) => setForm((f) => ({ ...f, invoicePrefix: e.target.value }))}
          />
        </div>
        <div>
          <label className={setLbl}>GST number</label>
          <input
            className={setInp}
            value={form.gstNumber}
            onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save payment settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
