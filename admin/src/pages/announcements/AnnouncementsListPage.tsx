import { useState, type FormEvent } from 'react';
import { AlertTriangle, Info, Megaphone, Wrench } from 'lucide-react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useAnnouncements } from '@/components/announcements/AnnouncementsContext';
import {
  AUDIENCE_LABELS,
  LOCATION_LABELS,
  TYPE_LABELS,
  type AnnouncementRow,
  type AnnouncementStatus,
  type AnnouncementType,
  type Audience,
} from '@/lib/announcementsDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';
import { ALL_LOCATIONS, toggleLocation, type AnnouncementFormState } from '@/pages/announcements/announcementFormUtils';

function typeIcon(t: AnnouncementType) {
  const cl = 'h-5 w-5';
  switch (t) {
    case 'warning':
      return <AlertTriangle className={`${cl} text-amber-600`} aria-hidden />;
    case 'maintenance':
      return <Wrench className={`${cl} text-slate-600`} aria-hidden />;
    case 'promotion':
      return <Megaphone className={`${cl} text-indigo-600`} aria-hidden />;
    default:
      return <Info className={`${cl} text-sky-600`} aria-hidden />;
  }
}

function toForm(row: AnnouncementRow): AnnouncementFormState {
  return {
    title: row.title,
    message: row.message,
    type: row.type,
    audience: row.audience,
    audienceNote: row.audienceNote,
    displayLocations: [...row.displayLocations],
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
  };
}

export function AnnouncementsListPage() {
  const { announcements, updateAnnouncement, deleteAnnouncement } = useAnnouncements();
  const [preview, setPreview] = useState<AnnouncementRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState<AnnouncementFormState | null>(null);

  function openEdit(row: AnnouncementRow) {
    setEditing(row);
    setForm(toForm(row));
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditing(null);
    setForm(null);
  }

  function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !form) return;
    updateAnnouncement(editing.announcementId, {
      ...form,
      displayLocations: [...form.displayLocations],
    });
    closeEdit();
  }

  return (
    <ResourcePanel title="Announcements">
      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="border-b border-amber-100 bg-amber-50/60 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {typeIcon(preview.type)}
                {preview.title}
              </div>
              <div className="text-[10px] text-slate-500">{TYPE_LABELS[preview.type]} · {AUDIENCE_LABELS[preview.audience]}</div>
            </div>
            <div className="whitespace-pre-wrap px-4 py-3 text-sm text-slate-800">{preview.message}</div>
            <div className="border-t border-slate-100 px-4 py-3">
              <button type="button" className={adminBtnPrimary} onClick={() => setPreview(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen && form && editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={closeEdit}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={onSaveEdit}>
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Edit announcement</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Title</label>
                  <input className={setInp} value={form.title} onChange={(e) => setForm((f) => f && { ...f, title: e.target.value })} required />
                </div>
                <div>
                  <label className={setLbl}>Message</label>
                  <textarea className={`${setInp} min-h-[5rem]`} value={form.message} onChange={(e) => setForm((f) => f && { ...f, message: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={setLbl}>Type</label>
                    <select className={setInp} value={form.type} onChange={(e) => setForm((f) => f && { ...f, type: e.target.value as AnnouncementType })}>
                      <option value="information">Information</option>
                      <option value="warning">Warning</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="promotion">Promotion</option>
                    </select>
                  </div>
                  <div>
                    <label className={setLbl}>Audience</label>
                    <select className={setInp} value={form.audience} onChange={(e) => setForm((f) => f && { ...f, audience: e.target.value as Audience })}>
                      <option value="all_tenants">All tenants</option>
                      <option value="free_plan">Free plan users</option>
                      <option value="paid_plan">Paid plan users</option>
                      <option value="specific_tenant">Specific tenant</option>
                      <option value="admin_users">Admin users</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={setLbl}>Audience note (tenant name / id)</label>
                  <input className={setInp} value={form.audienceNote} onChange={(e) => setForm((f) => f && { ...f, audienceNote: e.target.value })} />
                </div>
                <div>
                  <div className={setLbl}>Display locations</div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LOCATIONS.map((loc) => (
                      <label key={loc} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300"
                          checked={form.displayLocations.includes(loc)}
                          onChange={() => setForm((f) => f && { ...f, displayLocations: toggleLocation(f.displayLocations, loc) })}
                        />
                        {LOCATION_LABELS[loc]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={setLbl}>Start date</label>
                    <input type="date" className={setInp} value={form.startDate} onChange={(e) => setForm((f) => f && { ...f, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className={setLbl}>End date</label>
                    <input type="date" className={setInp} value={form.endDate} onChange={(e) => setForm((f) => f && { ...f, endDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={setLbl}>Status</label>
                  <select className={setInp} value={form.status} onChange={(e) => setForm((f) => f && { ...f, status: e.target.value as AnnouncementStatus })}>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 't', header: 'Title', cell: (r: AnnouncementRow) => r.title },
          { id: 'a', header: 'Audience', cell: (r: AnnouncementRow) => AUDIENCE_LABELS[r.audience] + (r.audienceNote ? ` (${r.audienceNote})` : '') },
          {
            id: 's',
            header: 'Status',
            cell: (r: AnnouncementRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : r.status === 'draft' ? 'text-amber-800' : 'text-slate-500'}>
                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </span>
            ),
          },
          { id: 'sd', header: 'Start', cell: (r: AnnouncementRow) => r.startDate },
          { id: 'ed', header: 'End', cell: (r: AnnouncementRow) => r.endDate },
          { id: 'cb', header: 'Created by', cell: (r: AnnouncementRow) => r.createdBy },
          {
            id: 'act',
            header: 'Actions',
            cell: (r: AnnouncementRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button type="button" className={adminBtnSecondary} onClick={() => setPreview(r)}>
                  Preview
                </button>
                <button
                  type="button"
                  className={adminBtnSecondary}
                  onClick={() => updateAnnouncement(r.announcementId, { status: r.status === 'disabled' ? 'active' : 'disabled' })}
                >
                  {r.status === 'disabled' ? 'Enable' : 'Disable'}
                </button>
                <button
                  type="button"
                  className={adminBtnDanger}
                  onClick={() => {
                    if (window.confirm(`Delete “${r.title}”? It moves to history.`)) deleteAnnouncement(r);
                  }}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        rows={[...announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
        rowKey={(r) => r.announcementId}
      />
    </ResourcePanel>
  );
}
