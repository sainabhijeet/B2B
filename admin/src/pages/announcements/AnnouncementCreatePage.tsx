import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useAnnouncements } from '@/components/announcements/AnnouncementsContext';
import { LOCATION_LABELS, type AnnouncementStatus, type AnnouncementType, type Audience, type DisplayLocation } from '@/lib/announcementsDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';
import { ALL_LOCATIONS, toggleLocation } from '@/pages/announcements/announcementFormUtils';

const emptyLocs: DisplayLocation[] = ['distributor_dashboard'];

export function AnnouncementCreatePage() {
  const navigate = useNavigate();
  const { addAnnouncement } = useAnnouncements();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('information');
  const [audience, setAudience] = useState<Audience>('all_tenants');
  const [audienceNote, setAudienceNote] = useState('');
  const [displayLocations, setDisplayLocations] = useState<DisplayLocation[]>(emptyLocs);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  const [status, setStatus] = useState<AnnouncementStatus>('draft');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addAnnouncement({
      title: title.trim(),
      message: message.trim(),
      type,
      audience,
      audienceNote: audienceNote.trim(),
      displayLocations: displayLocations.length ? displayLocations : ['distributor_dashboard'],
      startDate,
      endDate,
      status,
      createdBy: 'You (demo)',
    });
    setTitle('');
    setMessage('');
    navigate('/announcements/list');
  }

  return (
    <ResourcePanel title="Create announcement">
      <form className="max-w-xl space-y-4 p-3" onSubmit={onSubmit}>
        <div>
          <label className={setLbl}>Title</label>
          <input className={setInp} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className={setLbl}>Message</label>
          <textarea className={`${setInp} min-h-[6rem]`} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={setLbl}>Type</label>
            <select className={setInp} value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
              <option value="information">Information</option>
              <option value="warning">Warning</option>
              <option value="maintenance">Maintenance</option>
              <option value="promotion">Promotion</option>
            </select>
          </div>
          <div>
            <label className={setLbl}>Audience</label>
            <select className={setInp} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              <option value="all_tenants">All tenants</option>
              <option value="free_plan">Free plan users</option>
              <option value="paid_plan">Paid plan users</option>
              <option value="specific_tenant">Specific tenant</option>
              <option value="admin_users">Admin users</option>
            </select>
          </div>
        </div>
        <div>
          <label className={setLbl}>Specific tenant / note (optional)</label>
          <input className={setInp} value={audienceNote} onChange={(e) => setAudienceNote(e.target.value)} placeholder="Tenant name or ID" />
        </div>
        <div>
          <div className={setLbl}>Display locations</div>
          <div className="flex flex-col gap-1.5">
            {ALL_LOCATIONS.map((loc) => (
              <label key={loc} className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={displayLocations.includes(loc)}
                  onChange={() => setDisplayLocations((list) => toggleLocation(list, loc))}
                />
                {LOCATION_LABELS[loc]}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={setLbl}>Start date</label>
            <input type="date" className={setInp} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={setLbl}>End date</label>
            <input type="date" className={setInp} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={setLbl}>Status</label>
          <select className={setInp} value={status} onChange={(e) => setStatus(e.target.value as AnnouncementStatus)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <button type="submit" className={adminBtnPrimary}>
          Save announcement
        </button>
      </form>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        After save, trigger push + banner via your jobs pipeline (<span className="font-mono">announcement_targets</span> maps optional tenant/plan).
      </p>
    </ResourcePanel>
  );
}
