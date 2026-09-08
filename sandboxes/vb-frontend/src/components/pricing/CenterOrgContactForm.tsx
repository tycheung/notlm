import React, { useEffect, useState } from 'react';
import { TdAccessAPI } from '../../api/tdAccess';
import { getErrorMessage } from '../../api/apiErrors';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../common/Alert';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';

type OrgType = 'bowling_center' | 'association' | 'multi_td_org' | 'other';

const fieldClass =
  'mt-1 block w-full rounded-md border border-border bg-surface-light px-3 py-2 text-sm text-text';

const CenterOrgContactForm: React.FC = () => {
  const { user } = useAuth();
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState<OrgType | ''>('');
  const [directorCount, setDirectorCount] = useState('');
  const [annualEvents, setAnnualEvents] = useState('');
  const [annualParticipants, setAnnualParticipants] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    setContactName((prev) =>
      prev.trim()
        ? prev
        : [user.first_name, user.last_name].filter(Boolean).join(' ')
    );
    setEmail((prev) => prev.trim() || user.email || '');
  }, [user]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!organizationType) {
      setError('Choose an organization type.');
      return;
    }
    const parseOptionalCount = (raw: string, label: string): number | null => {
      if (raw.trim() === '') return null;
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`${label} must be a whole number, or left blank.`);
      }
      return parsed;
    };
    let parsedCount: number | null;
    let parsedEvents: number | null;
    let parsedParticipants: number | null;
    try {
      parsedCount = parseOptionalCount(directorCount, 'Directors / users');
      parsedEvents = parseOptionalCount(annualEvents, 'Annual events');
      parsedParticipants = parseOptionalCount(
        annualParticipants,
        'Annual participants'
      );
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : 'Check the number fields.'
      );
      return;
    }
    setBusy(true);
    try {
      await TdAccessAPI.submitCenterOrgInquiry({
        contact_name: contactName.trim(),
        email: email.trim(),
        organization_name: organizationName.trim(),
        organization_type: organizationType,
        director_count: parsedCount,
        annual_events: parsedEvents,
        annual_participants: parsedParticipants,
        phone: phone.trim() || null,
        message: message.trim() || null,
        website: website.trim() || null,
      });
      setSent(true);
    } catch (err) {
      setError(
        getErrorMessage(err, 'Could not send the inquiry. Try again in a moment.')
      );
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Alert
        variant="success"
        message="Thanks — we received your inquiry and will follow up at the email you provided."
        isDismissible={false}
      />
    );
  }

  if (!showForm) {
    return (
      <div className="mt-4">
        <Button type="button" variant="primary" onClick={() => setShowForm(true)}>
          Contact us
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative mt-4 space-y-3">
      {error && (
        <Alert variant="error" message={error} onDismiss={() => setError(null)} />
      )}
      <Input
        label="Your name"
        required
        fullWidth
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        autoComplete="name"
      />
      <Input
        label="Email"
        type="email"
        required
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <Input
        label="Organization name"
        required
        fullWidth
        value={organizationName}
        onChange={(e) => setOrganizationName(e.target.value)}
        autoComplete="organization"
      />
      <div>
        <Label htmlFor="center-org-type" required>
          Organization type
        </Label>
        <select
          id="center-org-type"
          className={fieldClass}
          value={organizationType}
          onChange={(e) => setOrganizationType(e.target.value as OrgType | '')}
          required
        >
          <option value="">Select…</option>
          <option value="bowling_center">Bowling center</option>
          <option value="association">Association</option>
          <option value="multi_td_org">Multi-TD organization</option>
          <option value="other">Other</option>
        </select>
      </div>
      <Input
        label="Approx. directors / users"
        type="number"
        min={1}
        max={500}
        fullWidth
        value={directorCount}
        onChange={(e) => setDirectorCount(e.target.value)}
        helperText="Optional. How many people would need Victory access."
      />
      <Input
        label="Approx. annual events"
        type="number"
        min={1}
        max={500}
        fullWidth
        value={annualEvents}
        onChange={(e) => setAnnualEvents(e.target.value)}
        helperText="Optional. Tournaments / events per year."
      />
      <Input
        label="Approx. annual participants"
        type="number"
        min={1}
        max={200000}
        fullWidth
        value={annualParticipants}
        onChange={(e) => setAnnualParticipants(e.target.value)}
        helperText="Optional. Unique bowlers across those events, roughly."
      />
      <Input
        label="Phone"
        type="tel"
        fullWidth
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
      />
      <div>
        <Label htmlFor="center-org-notes">Notes</Label>
        <textarea
          id="center-org-notes"
          className={`${fieldClass} min-h-[88px]`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          placeholder="Optional — locations, current software, or anything we should know."
        />
      </div>
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="center-org-website">Website</label>
        <input
          id="center-org-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <Button type="submit" variant="primary" disabled={busy} isLoading={busy}>
        Send inquiry
      </Button>
    </form>
  );
};

export default CenterOrgContactForm;
