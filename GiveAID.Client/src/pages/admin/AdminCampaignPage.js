import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Alert, Button, Modal, Form,
  Spinner, Badge, ProgressBar, Table
} from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';
import './AdminForm.css';

/* ── Constants ────────────────────────────── */
const CAMPAIGN_STATUSES = ['Active', 'Ongoing', 'Completed', 'Cancelled', 'Upcoming'];
const CAMPAIGN_STATUS_COLORS = {
  Active: 'success', Ongoing: 'primary', Completed: 'secondary',
  Cancelled: 'danger', Upcoming: 'info',
};

/* ── Validation ────────────────────────────── */
function validate(data, isUpdate = false) {
  const errs = {};
  if (!isUpdate && !data.campaignName?.trim())
    errs.campaignName = 'Campaign name is required.';
  if (!isUpdate && !data.causeId)
    errs.causeId = 'Please select a cause.';
  if (!isUpdate && !data.goalAmount)
    errs.goalAmount = 'Goal amount is required.';
  if (data.goalAmount && isNaN(Number(data.goalAmount)))
    errs.goalAmount = 'Must be a valid number.';
  // startDate is [Required] on the backend entity so it must be supplied by
  // the form for both create and update paths.
  if (!data.startDate)
    errs.startDate = 'Start date is required.';
  if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate))
    errs.endDate = 'End date must be after start date.';
  if (data.status && !CAMPAIGN_STATUSES.includes(data.status))
    errs.status = 'Invalid status value.';
  return errs;
}

const EMPTY_FORM = {
  causeId: '', campaignName: '', campaignCode: '', description: '',
  goalAmount: '', startDate: '', endDate: '', imageUrl: '',
  beneficiariesCount: '', location: '',
  status: 'Active', isFeatured: false, displayOrder: 0,
};

/* ── Form field helpers (shared style system with partner/causes admin) ── */
function Field({
  label, required, error, hint, children, full,
}) {
  return (
    <div className={`af-field ${full ? 'af-field-full' : ''}`}>
      <label className="af-label">
        {label}
        {required && <span className="af-required" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <div className="af-hint">{hint}</div>}
      {error && <div className="af-error" role="alert">{error}</div>}
    </div>
  );
}

function TextInput({ value, onChange, invalid, ...rest }) {
  return (
    <input
      className={`af-input ${invalid ? 'is-invalid' : ''}`}
      value={value ?? ''}
      onChange={onChange}
      {...rest}
    />
  );
}

function TextArea({ value, onChange, invalid, rows = 4, ...rest }) {
  return (
    <textarea
      className={`af-textarea ${invalid ? 'is-invalid' : ''}`}
      value={value ?? ''}
      onChange={onChange}
      rows={rows}
      {...rest}
    />
  );
}

function SelectInput({ value, onChange, invalid, children, ...rest }) {
  return (
    <select
      className={`af-select ${invalid ? 'is-invalid' : ''}`}
      value={value ?? ''}
      onChange={onChange}
      {...rest}
    >
      {children}
    </select>
  );
}

/* ── Campaign Form Modal ────────────────────── */
function CampaignFormModal({ show, editing, initial, causes, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm(editing ? {
        ...EMPTY_FORM,
        ...initial,
        causeId: initial.causeId ?? '',
        goalAmount: initial.goalAmount ?? '',
        beneficiariesCount: initial.beneficiariesCount ?? '',
        targetBeneficiaries: initial.targetBeneficiaries ?? '',
        startDate: initial.startDate ? initial.startDate.slice(0, 10) : '',
        endDate: initial.endDate ? initial.endDate.slice(0, 10) : '',
        status: initial.status ?? 'Active',
      } : EMPTY_FORM);
      setErrors({});
    }
  }, [show, editing, initial]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggle = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, !!editing);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        causeId: form.causeId ? parseInt(form.causeId) : null,
        goalAmount: form.goalAmount ? parseFloat(form.goalAmount) : null,
        beneficiariesCount: form.beneficiariesCount ? parseInt(form.beneficiariesCount) : null,
        targetBeneficiaries: form.targetBeneficiaries ? parseInt(form.targetBeneficiaries) : null,
        displayOrder: parseInt(form.displayOrder) || 0,
        status: form.status || 'Active',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      scrollable
      size="lg"
      className="af-form-modal campaign-form-modal"
      backdrop="static"
      aria-labelledby="campaign-form-title"
    >
      {/* ───── Header ───── */}
      <Modal.Header closeButton>
        <div className="campaign-form-header">
          <div className="campaign-form-header-icon" aria-hidden="true">
            <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'}`}></i>
          </div>
          <div>
            <Modal.Title id="campaign-form-title">
              {editing ? 'Edit Campaign' : 'Create Campaign'}
            </Modal.Title>
            <p className="campaign-form-header-sub">
              {editing
                ? 'Update this campaign\u2019s goals, dates, and visibility.'
                : 'Create a new fundraising campaign and define its goals.'}
            </p>
          </div>
        </div>
      </Modal.Header>

      <Form onSubmit={handleSubmit} noValidate>
        {/* ───── Body ───── */}
        <Modal.Body>
          {errors._form && (
            <div className="af-banner af-banner-error mb-3" role="alert">
              <span>{errors._form}</span>
            </div>
          )}

          {/* SECTION 1 — Campaign Identity */}
          <section className="campaign-form-section" aria-labelledby="sec-identity">
            <header className="campaign-form-section-header">
              <h6 id="sec-identity" className="campaign-form-section-title">
                <i className="bi bi-flag" aria-hidden="true"></i>
                Campaign Identity
              </h6>
              <span className="campaign-form-section-meta">
                Name, code and the cause this campaign supports
              </span>
            </header>

            <div className="campaign-form-grid">
              <Field label="Campaign Name" required error={errors.campaignName} full>
                <TextInput
                  type="text"
                  value={form.campaignName}
                  onChange={set('campaignName')}
                  invalid={!!errors.campaignName}
                  placeholder="Clean Water Initiative"
                  autoFocus
                  maxLength={150}
                />
              </Field>

              <Field label="Campaign Code" hint="Short identifier used in URLs and exports (optional).">
                <TextInput
                  type="text"
                  value={form.campaignCode}
                  onChange={set('campaignCode')}
                  placeholder="CWI-2025"
                  maxLength={50}
                />
              </Field>

              <Field label="Cause" required error={errors.causeId}>
                <SelectInput
                  value={form.causeId}
                  onChange={set('causeId')}
                  invalid={!!errors.causeId}
                >
                  <option value="">— Select Cause —</option>
                  {(causes || []).map((c) => (
                    <option key={c.causeId} value={String(c.causeId)}>{c.causeName}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </section>

          {/* SECTION 2 — Goal & Schedule */}
          <section className="campaign-form-section" aria-labelledby="sec-goal">
            <header className="campaign-form-section-header">
              <h6 id="sec-goal" className="campaign-form-section-title">
                <i className="bi bi-bullseye" aria-hidden="true"></i>
                Goal &amp; Schedule
              </h6>
              <span className="campaign-form-section-meta">
                Fundraising target and the campaign timeline
              </span>
            </header>

            <div className="campaign-form-grid">
              <Field label="Goal Amount (VND)" required error={errors.goalAmount}>
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1000"
                  value={form.goalAmount}
                  onChange={set('goalAmount')}
                  invalid={!!errors.goalAmount}
                  placeholder="50000000"
                />
              </Field>

              <Field label="Start Date" required error={errors.startDate}>
                <TextInput
                  type="date"
                  value={form.startDate}
                  onChange={set('startDate')}
                  invalid={!!errors.startDate}
                />
              </Field>

              <Field label="End Date" error={errors.endDate} hint="Optional. Leave blank for open-ended.">
                <TextInput
                  type="date"
                  value={form.endDate}
                  onChange={set('endDate')}
                  invalid={!!errors.endDate}
                />
              </Field>

              <Field label="Location" hint="Where this campaign takes place (optional).">
                <TextInput
                  type="text"
                  value={form.location}
                  onChange={set('location')}
                  placeholder="Ho Chi Minh City"
                  maxLength={150}
                />
              </Field>

              <Field label="Target Beneficiaries" hint="Expected number of people impacted.">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={form.targetBeneficiaries}
                  onChange={set('targetBeneficiaries')}
                  placeholder="1000"
                />
              </Field>

              <Field label="Current Beneficiaries" hint="People already impacted so far.">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={form.beneficiariesCount}
                  onChange={set('beneficiariesCount')}
                  placeholder="500"
                />
              </Field>
            </div>
          </section>

          {/* SECTION 3 — Presentation */}
          <section className="campaign-form-section" aria-labelledby="sec-presentation">
            <header className="campaign-form-section-header">
              <h6 id="sec-presentation" className="campaign-form-section-title">
                <i className="bi bi-image" aria-hidden="true"></i>
                Presentation
              </h6>
              <span className="campaign-form-section-meta">
                Image, description and how the campaign is ordered
              </span>
            </header>

            <div className="campaign-form-grid">
              <Field label="Image URL" hint="JPG/PNG/SVG. Square or 16:9 works best.">
                <TextInput
                  type="url"
                  value={form.imageUrl}
                  onChange={set('imageUrl')}
                  placeholder="https://..."
                  maxLength={500}
                />
              </Field>

              <Field label="Display Order" hint="Lower numbers appear first.">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={form.displayOrder}
                  onChange={set('displayOrder')}
                  placeholder="0"
                />
              </Field>

              <Field label="Description" required full>
                <TextArea
                  value={form.description}
                  onChange={set('description')}
                  rows={4}
                  placeholder="Describe the campaign goals, beneficiaries, and the impact donations will make..."
                  maxLength={2000}
                />
              </Field>
            </div>
          </section>

          {/* SECTION 4 — Visibility & Status */}
          <section className="campaign-form-section" aria-labelledby="sec-visibility">
            <header className="campaign-form-section-header">
              <h6 id="sec-visibility" className="campaign-form-section-title">
                <i className="bi bi-eye" aria-hidden="true"></i>
                Visibility &amp; Status
              </h6>
              <span className="campaign-form-section-meta">
                Controls who can see this campaign on the public site
              </span>
            </header>

            <div className="campaign-form-grid">
              <Field label="Status" error={errors.status} hint="Set to Completed or Cancelled to remove it from active listings.">
                <SelectInput
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  invalid={!!errors.status}
                >
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </SelectInput>
              </Field>

              <div className="af-field">
                <label className="af-label">Featured</label>
                <label className="af-checkbox-row campaign-form-featured" htmlFor="camp-is-featured">
                  <input
                    id="camp-is-featured"
                    type="checkbox"
                    checked={!!form.isFeatured}
                    onChange={toggle('isFeatured')}
                  />
                  <span>
                    <strong>Featured campaign</strong>
                    <small className="campaign-form-toggle-hint">
                      Highlighted on the homepage and in featured lists.
                    </small>
                  </span>
                </label>
              </div>
            </div>
          </section>
        </Modal.Body>

        {/* ───── Footer ───── */}
        <Modal.Footer className="campaign-form-footer">
          <span className="campaign-form-footer-hint">
            <i className="bi bi-info-circle" aria-hidden="true"></i>
            Fields marked with <span className="af-required">*</span> are required.
          </span>
          <div className="campaign-form-footer-actions">
            <button
              type="button"
              className="af-btn af-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="af-btn af-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                  <span>{editing ? 'Saving…' : 'Creating…'}</span>
                </>
              ) : (
                <>
                  <i className={`bi ${editing ? 'bi-check-circle' : 'bi-plus-circle'}`} aria-hidden="true"></i>
                  <span>{editing ? 'Save Changes' : 'Create Campaign'}</span>
                </>
              )}
            </button>
          </div>
        </Modal.Footer>
      </Form>

      <style>{`
        /* ==========================================================
           Campaign form — overrides to align with the af-form-modal
           design system used by all admin CRUD pages.
           ========================================================== */
        .campaign-form-modal .modal-dialog {
          max-width: 780px;
          width: calc(100vw - 40px);
          margin: 1.75rem auto;
        }
        .campaign-form-modal .modal-content {
          border: 0;
          border-radius: 16px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
          overflow: hidden;
        }
        .campaign-form-modal .modal-header {
          padding: 22px 26px 18px;
          border-bottom: 1px solid var(--c4k-gray-100, #F3F4F6);
          background: linear-gradient(180deg, #FAFBFC 0%, #FFFFFF 100%);
          align-items: flex-start;
        }
        .campaign-form-modal .modal-header .btn-close {
          margin-top: 6px;
        }
        .campaign-form-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          width: 100%;
        }
        .campaign-form-header-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(14,116,144,0.10), rgba(231,111,81,0.10));
          color: var(--c4k-teal-dark, #0A5C73);
          font-size: 1.15rem;
        }
        .campaign-form-modal .modal-title {
          font-family: var(--font-serif, Georgia, serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--c4k-charcoal, #1A1A1A);
          letter-spacing: -0.02em;
          line-height: 1.25;
          margin: 0;
        }
        .campaign-form-header-sub {
          margin: 4px 0 0;
          font-size: 0.8125rem;
          color: var(--c4k-gray-600, #4B5563);
          line-height: 1.45;
          max-width: 64ch;
        }

        /* Body */
        .campaign-form-modal .modal-body {
          padding: 22px 26px 8px;
        }

        /* Sections */
        .campaign-form-section {
          padding: 18px 0 22px;
          border-bottom: 1px dashed var(--c4k-gray-200, #E5E7EB);
        }
        .campaign-form-section:first-child { padding-top: 4px; }
        .campaign-form-section:last-of-type { border-bottom: 0; padding-bottom: 4px; }

        .campaign-form-section-header {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }
        .campaign-form-section-title {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--c4k-teal-dark, #0A5C73);
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .campaign-form-section-title i {
          font-size: 0.95rem;
          color: var(--c4k-coral, #E76F51);
        }
        .campaign-form-section-meta {
          font-size: 0.75rem;
          color: var(--c4k-gray-500, #6B7280);
        }

        /* Field grid: 2 columns desktop, 1 column mobile */
        .campaign-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 16px;
        }
        .campaign-form-grid > .af-field-full {
          grid-column: 1 / -1;
        }
        @media (max-width: 575px) {
          .campaign-form-grid { grid-template-columns: 1fr; }
        }

        /* Inline error state on inputs */
        .campaign-form-modal .af-input.is-invalid,
        .campaign-form-modal .af-textarea.is-invalid,
        .campaign-form-modal .af-select.is-invalid {
          border-color: var(--c4k-danger, #B91C1C);
          box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.10);
        }

        /* Featured toggle: clean horizontal layout */
        .campaign-form-featured {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
        }
        .campaign-form-featured input {
          margin-top: 2px;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          accent-color: var(--c4k-teal, #0E7490);
        }
        .campaign-form-featured span {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.875rem;
          color: var(--c4k-charcoal, #1A1A1A);
        }
        .campaign-form-toggle-hint {
          font-size: 0.75rem;
          color: var(--c4k-gray-500, #6B7280);
          font-weight: 400;
        }

        /* Footer */
        .campaign-form-footer {
          padding: 16px 26px 20px;
          border-top: 1px solid var(--c4k-gray-100, #F3F4F6);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          background: #fff;
        }
        .campaign-form-footer-hint {
          font-size: 0.75rem;
          color: var(--c4k-gray-500, #6B7280);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .campaign-form-footer-actions {
          display: inline-flex;
          gap: 10px;
          flex-shrink: 0;
        }

        @media (max-width: 575px) {
          .campaign-form-footer {
            flex-direction: column-reverse;
            align-items: stretch;
          }
          .campaign-form-footer-actions { width: 100%; }
          .campaign-form-footer-actions .af-btn { flex: 1; }
        }

        /* Constrain the modal to the viewport. The Form wraps body+footer
           so we set up the same flex column on both the modal-content and
           the form so the body fills remaining height and overflows. */
        .campaign-form-modal.show .modal-dialog {
          max-height: calc(100vh - 32px);
        }
        /* The dialog is vertically centered (align-items: center). Force the
           modal-content to stretch to the dialog's full height so the
           body can scroll inside it. */
        .campaign-form-modal .modal-content {
          align-self: stretch;
          max-height: calc(100vh - 32px);
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        /* The Form wraps body + footer; it must also be a flex column
           that fills the modal-content box. */
        .campaign-form-modal .modal-content > form {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-height: 0;
        }
        /* min-height:0 lets the body shrink below its content height so
           the overflow-y scrollbar can engage. */
        .campaign-form-modal .modal-body {
          flex: 1 1 0;
          min-height: 0;
          overflow-y: auto;
        }
        .campaign-form-modal .modal-header,
        .campaign-form-modal .modal-footer {
          flex: 0 0 auto;
        }
      `}</style>
    </Modal>
  );
}

/* ── Admin Campaign Page ────────────────────── */
export default function AdminCampaignPage() {
  const { user } = useAuth();
  const canAccess = user?.role === 'Admin';

  const [campaigns, setCampaigns] = useState([]);
  const [causes, setCauses] = useState([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [causeFilter, setCauseFilter] = useState('');
  const [activeTab, setActiveTab] = useState('campaigns');

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/campaigns', { params: { pageSize: 100, page: 1 } });
      // api interceptor unwraps envelope → res is { items, totalCount, page, pageSize }
      setCampaigns(Array.isArray(res.items) ? res.items : []);
    } catch {
      setError('Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCauses = useCallback(async () => {
    try {
      const res = await api.get('/causes', { params: { activeOnly: false } });
      // res is array of cause objects
      setCauses(Array.isArray(res) ? res : []);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    if (canAccess) { fetchCampaigns(); fetchCauses(); }
  }, [canAccess, fetchCampaigns, fetchCauses]);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (item) => { setEditing(item); setShowForm(true); };
  const openDetail = async (item) => {
    setDetailItem(null);
    try {
      const res = await api.get(`/campaigns/${item.campaignId}`);
      setDetailItem(res); // res is the campaign object itself
    } catch { setDetailItem(item); }
  };

  const handleSave = async (payload) => {
    if (editing) {
      await api.put(`/campaigns/${editing.campaignId}`, payload);
    } else {
      await api.post('/campaigns', payload);
    }
    setShowForm(false);
    fetchCampaigns();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/campaigns/${deleteConfirm}`);
      setSuccess('Campaign deleted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleteConfirm(null);
      fetchCampaigns();
    }
  };

  const filtered = campaigns.filter((c) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      c.campaignName?.toLowerCase().includes(s) ||
      c.campaignCode?.toLowerCase().includes(s);
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchCause = !causeFilter || c.causeId === parseInt(causeFilter);
    return matchSearch && matchStatus && matchCause;
  });

  const fmtVnd = (n) => n != null
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
    : '—';

  if (!canAccess) {
    return (
      <Container className="py-5">
        <Alert variant="danger">You do not have permission to access this page.</Alert>
      </Container>
    );
  }

  return (
    <AdminPageFrame
      eyebrow="Fundraising · Campaigns"
      title="Campaign management"
      sub="Create, manage and monitor fundraising campaigns and the causes they support."
      tabs={[
        { id: 'campaigns', label: 'Campaigns', count: campaigns.length, icon: 'bi-flag-fill' },
        { id: 'causes', label: 'Causes', count: causes.length, icon: 'bi-tags-fill' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      error={error}
      success={success}
      actions={activeTab === 'campaigns' ? (
        <button type="button" className="af-btn af-btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-circle" aria-hidden="true"></i>
          <span>New campaign</span>
        </button>
      ) : null}
    >

      {/* ── CAMPAIGNS TAB ── */}
      {activeTab === 'campaigns' && (
        <>
          <div className="af-toolbar">
            <div className="af-search">
              <span className="af-search-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                type="text"
                className="af-search-input"
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="af-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>

            <select className="af-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select className="af-filter" value={causeFilter} onChange={(e) => setCauseFilter(e.target.value)}>
              <option value="">All causes</option>
              {causes.map((c) => <option key={c.causeId} value={String(c.causeId)}>{c.causeName}</option>)}
            </select>

            <div className="af-toolbar-spacer" />
            <span className="af-meta-count">{filtered.length} of {campaigns.length}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="af-empty">
              <div className="af-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
              </div>
              <h3 className="af-empty-title">No campaigns found</h3>
              <p className="af-empty-text">
                {(search || statusFilter || causeFilter)
                  ? 'Try adjusting your filters.'
                  : 'Click "New campaign" to create your first fundraising campaign.'}
              </p>
              {!search && !statusFilter && !causeFilter && (
                <button type="button" className="af-btn af-btn-primary" onClick={openAdd}>
                  <i className="bi bi-plus-circle" aria-hidden="true"></i>
                  <span>Create first campaign</span>
                </button>
              )}
            </div>
          ) : (
            <div className="af-panel">
              <div className="af-table-wrap">
                <table className="af-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Cause</th>
                      <th>Goal / Raised</th>
                      <th style={{ minWidth: 160 }}>Progress</th>
                      <th>Donors</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.campaignId}>
                        <td>
                          <div className="af-cell-strong">{c.campaignName}</div>
                          <div className="af-cell-meta">
                            {c.campaignCode ? <span className="af-code">{c.campaignCode}</span> : null}
                            {c.location && <span style={{ marginLeft: 6 }}><i className="bi bi-geo-alt"></i> {c.location}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="af-tag">{c.cause?.causeName || '—'}</span>
                          {c.isFeatured && <span className="af-tag af-tag-accent" style={{ marginLeft: 6 }}>★ Featured</span>}
                        </td>
                        <td>
                          <div className="af-cell-strong">{fmtVnd(c.raisedAmount)}</div>
                          <div className="af-cell-meta">of {fmtVnd(c.goalAmount)}</div>
                          <div className="af-cell-meta">
                            {c.startDate && <>Start: {new Date(c.startDate).toLocaleDateString('en-GB')}</>}
                          </div>
                        </td>
                        <td>
                          <div className="af-progress">
                            <div className="af-progress-track">
                              <div className="af-progress-fill" style={{ width: `${Math.min(c.percentageReached || 0, 100)}%` }} />
                            </div>
                            <span className="af-progress-num">{(c.percentageReached || 0).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="af-cell-strong">{c.donorCount || 0}</div>
                          <div className="af-cell-meta">donors</div>
                        </td>
                        <td>
                          <span className={`af-pill af-pill-${(c.status || '').toLowerCase()}`}>
                            {c.status || '—'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="af-row-actions">
                            <button type="button" className="af-icon-btn" onClick={() => openDetail(c)} title="View details" aria-label="View details">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button type="button" className="af-icon-btn" onClick={() => openEdit(c)} title="Edit" aria-label="Edit">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            {user?.role === 'Admin' && (
                              <button type="button" className="af-icon-btn danger" onClick={() => setDeleteConfirm(c.campaignId)} title="Delete" aria-label="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CAUSES TAB ── */}
      {activeTab === 'causes' && <CausesAdminTab causes={causes} setCauses={setCauses} />}

      {/* ── CAMPAIGN DETAIL MODAL ── */}
      <Modal show={!!detailItem} onHide={() => setDetailItem(null)} size="lg" centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>{detailItem?.campaignName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailItem ? (
            <Row>
              <Col md={5}>
                {detailItem.imageUrl && (
                  <img src={detailItem.imageUrl} alt={detailItem.campaignName}
                    style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Badge bg={CAMPAIGN_STATUS_COLORS[detailItem.status] || 'secondary'}>
                    {detailItem.status}
                  </Badge>
                  {detailItem.cause && (
                    <Badge bg="info">{detailItem.cause.causeName}</Badge>
                  )}
                  {detailItem.isFeatured && <Badge bg="warning" text="dark">★ Featured</Badge>}
                </div>
                <div className="small">
                  {detailItem.location && (
                    <div className="mb-1"><i className="bi bi-geo-alt-fill me-1 text-accent"></i>{detailItem.location}</div>
                  )}
                  {detailItem.startDate && (
                    <div className="mb-1"><i className="bi bi-calendar-event me-1 text-accent"></i>
                      {new Date(detailItem.startDate).toLocaleDateString('en-GB')}
                      {detailItem.endDate && ` – ${new Date(detailItem.endDate).toLocaleDateString('en-GB')}`}
                    </div>
                  )}
                    {detailItem.beneficiariesCount && (
                      <div className="mb-1"><i className="bi bi-people-fill me-1 text-accent"></i>
                        {detailItem.beneficiariesCount.toLocaleString()} beneficiaries
                      </div>
                    )}
                    {detailItem.campaignCode && (
                      <div className="mb-1"><i className="bi bi-hash me-1 text-accent"></i>{detailItem.campaignCode}</div>
                    )}
                  </div>
                </Col>
                <Col md={7}>
                  <h6 className="text-light mb-2">Fundraising Progress</h6>
                  <div className="mb-1 fw-bold" style={{ color: 'var(--accent-sky)', fontSize: '1.1rem' }}>
                    {fmtVnd(detailItem.raisedAmount)} <span className="text-muted">/ {fmtVnd(detailItem.goalAmount)}</span>
                  </div>
                  <ProgressBar
                    now={Math.min(detailItem.percentageReached || 0, 100)}
                    variant={detailItem.percentageReached >= 100 ? 'success' : detailItem.percentageReached >= 50 ? 'info' : 'primary'}
                    className="mb-3"
                    style={{ height: 12 }}
                  />
                  <div className="d-flex justify-content-between small text-muted mb-3">
                    <span>{detailItem.percentageReached?.toFixed(1)}% funded</span>
                    <span>{detailItem.donorCount || 0} donors</span>
                  </div>
                  {detailItem.description && (
                    <>
                      <h6 className="text-light mb-2">Description</h6>
                      <p className="text-muted small">{detailItem.description}</p>
                    </>
                  )}
                  {detailItem.recentDonations?.length > 0 && (
                    <>
                      <h6 className="text-light mb-2 mt-3">Recent Donations</h6>
                      <div className="small">
                        {detailItem.recentDonations.map((d, i) => (
                          <div key={i} className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: 'var(--border-slate) !important' }}>
                            <span className="text-muted">{d.fullName || 'Anonymous'}</span>
                            <span style={{ color: 'var(--accent-sky)' }}>{fmtVnd(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Col>
              </Row>
            ) : (
              <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDetailItem(null)}>Close</Button>
          </Modal.Footer>
        </Modal>

        {/* ── CAMPAIGN FORM MODAL ── */}
        <CampaignFormModal
          show={showForm}
          editing={!!editing}
          initial={editing || EMPTY_FORM}
          causes={causes}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />

        {/* ── DELETE CONFIRM ── */}
        <Modal show={!!deleteConfirm} onHide={() => setDeleteConfirm(null)} centered className="admin-modal-dark">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
              Delete Campaign
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure? Campaigns with donations cannot be deleted — only cancelled.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </Modal.Footer>
        </Modal>

      <style>{`
        .cms-tabs-bar {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .cms-tab {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.55rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-gray);
          font-size: 0.875rem; font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .cms-tab:hover { background: rgba(56,189,248,0.08); color: var(--accent-sky); }
        .cms-tab.active { background: var(--accent-sky); color: var(--primary-navy); }
        .inactive-row td { opacity: 0.5; }
        .admin-table thead th {
          background: var(--primary-slate);
          border-bottom: 1px solid var(--border-slate);
          color: var(--text-gray);
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.75rem 1rem;
          white-space: nowrap;
        }
        .admin-table tbody td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-slate);
          vertical-align: middle;
        }
        .admin-table tbody tr:last-child td { border-bottom: none; }
        .admin-table tbody tr:hover td { background: rgba(56,189,248,0.03); }
        .admin-modal-dark .modal-content { background: var(--bg-card); border: 1px solid var(--border-slate); color: var(--text-light); }
        .admin-modal-dark .modal-header, .admin-modal-dark .modal-footer { border-color: var(--border-slate); }
        .admin-modal-dark .btn-close { filter: invert(1); opacity: 0.5; }
        .admin-modal-dark .form-label { color: var(--text-light); font-size: 0.875rem; font-weight: 600; }
        .admin-modal-dark .form-control, .admin-modal-dark .form-select {
          background: var(--primary-slate); border: 1px solid var(--border-slate); color: var(--text-light);
        }
        .admin-modal-dark .form-control:focus, .admin-modal-dark .form-select:focus {
          border-color: var(--accent-sky);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
          background: var(--primary-slate); color: var(--text-light);
        }
      `}</style>
    </AdminPageFrame>
  );
}

/* ── Causes Admin Tab ─────────────────────── */
function CausesAdminTab({ causes: externalCauses, setCauses: setExternalCauses }) {
  const [causes, setCauses] = useState(externalCauses || []);
  const [loading, setLoading] = useState(externalCauses ? false : true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { user: innerUser } = useAuth();
  const isAdmin = innerUser?.role === 'Admin';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/causes', { params: { activeOnly: false } });
      setCauses(Array.isArray(res) ? res : []);
    } catch {
      setError('Failed to load causes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      causeName: '', causeCode: '', description: '', imageUrl: '',
      icon: '', targetAmount: '', displayOrder: 0, isActive: true,
      parentCauseId: ''
    });
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      causeName: c.causeName || '', causeCode: c.causeCode || '',
      description: c.description || '', imageUrl: c.imageUrl || '',
      icon: c.icon || '', targetAmount: c.targetAmount ?? '',
      displayOrder: c.displayOrder || 0, isActive: c.isActive !== false,
      parentCauseId: c.parentCauseId ?? ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : null,
        displayOrder: parseInt(form.displayOrder) || 0,
        parentCauseId: form.parentCauseId === '' || form.parentCauseId === null
          ? null
          : parseInt(form.parentCauseId)
      };
      if (editing) {
        await api.put(`/causes/${editing.causeId}`, payload);
      } else {
        await api.post('/causes', payload);
      }
      setSuccess(editing ? 'Cause updated.' : 'Cause created.');
      setShowForm(false);
      load();
    } catch {
      setError('Save failed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/causes/${deleteConfirm}`);
      setSuccess('Cause deactivated.');
    } catch {
      setError('Delete failed.');
    } finally {
      setDeleteConfirm(null);
      load();
    }
  };

  const fmtVnd = (n) => n != null
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
    : '—';

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="text-light mb-0">Causes / Categories</h4>
        {isAdmin && (
          <Button variant="primary" onClick={openCreate}>
            <i className="bi bi-plus-circle me-2"></i>Add Cause
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : causes.length === 0 ? (
        <Alert variant="info">No causes yet.</Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Cause</th>
                <th>Code</th>
                <th>Type</th>
                <th>Goal / Raised</th>
                <th>Progress</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {causes
                .slice()
                .sort((a, b) => {
                  // Parents first, then sub-causes by display order.
                  const aIsParent = !a.parentCauseId ? 0 : 1;
                  const bIsParent = !b.parentCauseId ? 0 : 1;
                  if (aIsParent !== bIsParent) return aIsParent - bIsParent;
                  return (a.displayOrder || 0) - (b.displayOrder || 0);
                })
                .map((c) => {
                  const parent = c.parentCauseId
                    ? causes.find((p) => p.causeId === c.parentCauseId)
                    : null;
                  return (
                <tr key={c.causeId} className={!c.isActive ? 'inactive-row' : ''}>
                  <td>
                    <div className="fw-semibold" style={{ color: 'var(--text-light)' }}>
                      {parent ? <span className="text-muted me-1">↳</span> : null}
                      {c.causeName}
                    </div>
                    {c.description && <div className="small text-muted">{c.description.slice(0, 60)}{c.description.length > 60 ? '…' : ''}</div>}
                  </td>
                  <td><code>{c.causeCode || '—'}</code></td>
                  <td>
                    {parent
                      ? <Badge bg="info" style={{ fontSize: '0.7rem' }}>Sub of {parent.causeName}</Badge>
                      : <Badge bg="primary" style={{ fontSize: '0.7rem' }}>Parent</Badge>}
                  </td>
                  <td>
                    <div className="small fw-semibold">{fmtVnd(c.raisedAmount)}</div>
                    <div className="small text-muted">of {fmtVnd(c.targetAmount)}</div>
                  </td>
                  <td style={{ minWidth: 100 }}>
                    <div className="small mb-1">{c.percentageReached?.toFixed(0) || 0}%</div>
                    <ProgressBar
                      now={Math.min(c.percentageReached || 0, 100)}
                      variant={c.percentageReached >= 100 ? 'success' : c.percentageReached >= 50 ? 'info' : 'primary'}
                      style={{ height: 5 }}
                    />
                  </td>
                  <td>
                    <Badge bg={c.isActive ? 'success' : 'secondary'} style={{ fontSize: '0.72rem' }}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <Button variant="outline-primary" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                    {isAdmin && (
                      <Button variant="outline-danger" size="sm" className="ms-1" onClick={() => setDeleteConfirm(c.causeId)}>Delete</Button>
                    )}
                  </td>
                </tr>
                  );
                })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Cause Form Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Cause' : 'Add Cause'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group><Form.Label>Cause Name *</Form.Label>
                  <Form.Control value={form.causeName || ''} onChange={(e) => setForm((f) => ({ ...f, causeName: e.target.value }))} required />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group><Form.Label>Cause Code</Form.Label>
                  <Form.Control value={form.causeCode || ''} onChange={(e) => setForm((f) => ({ ...f, causeCode: e.target.value }))} placeholder="EDU-SUPPLIES (auto if blank)" />
                  <Form.Text className="text-muted">
                    Leave blank to auto-generate from the cause name. Required for top-level causes.
                  </Form.Text>
                </Form.Group>
              </div>
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Parent Cause</Form.Label>
                  <Form.Select
                    value={form.parentCauseId === '' || form.parentCauseId === null ? '' : String(form.parentCauseId)}
                    onChange={(e) => setForm((f) => ({ ...f, parentCauseId: e.target.value }))}
                  >
                    <option value="">— Top-level (no parent) —</option>
                    {causes
                      .filter((c) => !c.parentCauseId && (!editing || c.causeId !== editing.causeId))
                      .map((p) => (
                        <option key={p.causeId} value={String(p.causeId)}>
                          {p.causeName}
                        </option>
                      ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Pick a parent to make this a sub-cause (e.g. "Mua sách vở" under "Giáo dục cho trẻ em").
                  </Form.Text>
                </Form.Group>
              </div>
              <div className="col-12">
                <Form.Group><Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={2} value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group><Form.Label>Image URL</Form.Label>
                  <Form.Control value={form.imageUrl || ''} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group><Form.Label>Icon (Bootstrap Icons)</Form.Label>
                  <Form.Control value={form.icon || ''} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="book-fill" />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group><Form.Label>Target Amount (VND)</Form.Label>
                  <Form.Control type="number" value={form.targetAmount ?? ''} onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group><Form.Label>Display Order</Form.Label>
                  <Form.Control type="number" value={form.displayOrder || 0} onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Check type="switch" label="Active" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="mt-4" />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!deleteConfirm} onHide={() => setDeleteConfirm(null)} centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title><i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>Deactivate Cause</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to deactivate this cause?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Deactivate</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
