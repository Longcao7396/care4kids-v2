import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { supportersService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';
import '../admin/AdminForm.css';

const TYPE_OPTIONS = [
  'Supporter', 'Partner', 'NGO', 'Corporate', 'Government', 'Other'
];
const CONTRIBUTION_TYPES = [
  '', 'Cash', 'In-kind', 'Cash + In-kind', 'Volunteer hours',
  'Technical assistance', 'Sponsorship', 'Cash + Technology', 'Other'
];

/* ── Validation ───────────────────────────────────── */
function validate(data, isUpdate = false) {
  const errs = {};
  if (!data.organizationName?.trim())
    errs.organizationName = 'Organization name is required.';
  if (!data.organizationType?.trim())
    errs.organizationType = 'Organization type is required.';
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail))
    errs.contactEmail = 'Enter a valid email address.';
  if (data.websiteUrl && !/^https?:\/\/.+/i.test(data.websiteUrl))
    errs.websiteUrl = 'Website must start with http:// or https://';
  if (data.contributionAmount && isNaN(Number(data.contributionAmount)))
    errs.contributionAmount = 'Must be a valid number.';
  if (data.displayOrder && isNaN(Number(data.displayOrder)))
    errs.displayOrder = 'Must be a valid integer.';
  return errs;
}

const EMPTY_FORM = {
  organizationName: '',
  organizationType: 'NGO',
  description: '',
  logoUrl: '',
  websiteUrl: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  registrationNumber: '',
  mission: '',
  vision: '',
  contributionAmount: '',
  contributionType: '',
  displayOrder: 0,
  isActive: true,
  isFeatured: false,
};

/* ── Form field helpers ────────────────────────────── */
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

function TextArea({ value, onChange, invalid, rows = 3, ...rest }) {
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

/* ── Partner Form Modal ────────────────────────────── */
function PartnerFormModal({ show, editing, initial, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm(
        editing
          ? {
              ...EMPTY_FORM,
              ...initial,
              contributionAmount:
                initial.contributionAmount === null ||
                initial.contributionAmount === undefined
                  ? ''
                  : String(initial.contributionAmount),
              displayOrder: initial.displayOrder ?? 0,
            }
          : EMPTY_FORM
      );
      setErrors({});
    }
  }, [show, editing, initial]);

  const set = useCallback(
    (field) => (e) => {
      const v = e?.target ? e.target.value : e;
      setForm((f) => ({ ...f, [field]: v }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const toggle = useCallback(
    (field) => (e) => {
      const v = e?.target ? e.target.checked : !!e;
      setForm((f) => ({ ...f, [field]: v }));
    },
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, !!editing);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        organizationName: form.organizationName.trim(),
        organizationType: form.organizationType.trim(),
        contributionAmount:
          form.contributionAmount === '' || form.contributionAmount === null
            ? null
            : parseFloat(form.contributionAmount),
        displayOrder: parseInt(form.displayOrder, 10) || 0,
      };
      await onSave(payload);
    } catch (err) {
      // Surface server validation errors back to the form.
      const msg = err?.message || 'Could not save the partner. Please try again.';
      setErrors((prev) => ({ ...prev, _form: msg }));
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
      className="af-form-modal partner-form-modal"
      backdrop="static"
      aria-labelledby="partner-form-title"
    >
      {/* ───── Header ───── */}
      <Modal.Header closeButton>
        <div className="partner-form-header">
          <div className="partner-form-header-icon" aria-hidden="true">
            <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'}`}></i>
          </div>
          <div>
            <Modal.Title id="partner-form-title">
              {editing ? 'Edit Partner' : 'Add New Partner'}
            </Modal.Title>
            <p className="partner-form-header-sub">
              {editing
                ? 'Update this organization’s information shown on the public Our Partners page.'
                : 'Add an organization to display on the Our Partners page.'}
            </p>
          </div>
        </div>
      </Modal.Header>

      <form onSubmit={handleSubmit} noValidate>
        {/* ───── Body ───── */}
        <Modal.Body>
          {errors._form && (
            <div className="af-banner af-banner-error mb-3" role="alert">
              <span>{errors._form}</span>
            </div>
          )}

          {/* SECTION 1 — Organization Information */}
          <section className="partner-form-section" aria-labelledby="sec-org-info">
            <header className="partner-form-section-header">
              <h6 id="sec-org-info" className="partner-form-section-title">
                <i className="bi bi-buildings" aria-hidden="true"></i>
                Organization Information
              </h6>
              <span className="partner-form-section-meta">Required details about the partner</span>
            </header>

            <div className="af-field-row">
              <Field
                label="Organization Name"
                required
                error={errors.organizationName}
                full
              >
                <TextInput
                  type="text"
                  value={form.organizationName}
                  onChange={set('organizationName')}
                  invalid={!!errors.organizationName}
                  placeholder="e.g. UNICEF Vietnam"
                  autoFocus
                  maxLength={150}
                />
              </Field>

              <Field label="Organization Type" required error={errors.organizationType}>
                <SelectInput
                  value={form.organizationType}
                  onChange={set('organizationType')}
                  invalid={!!errors.organizationType}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <Field
              label="Description"
              hint="A short summary of the organization’s mission and activities."
              full
            >
              <TextArea
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Brief description shown on the partner card and detail view."
                maxLength={2000}
              />
            </Field>
          </section>

          {/* SECTION 2 — Contact & Online Presence */}
          <section className="partner-form-section" aria-labelledby="sec-contact">
            <header className="partner-form-section-header">
              <h6 id="sec-contact" className="partner-form-section-title">
                <i className="bi bi-globe2" aria-hidden="true"></i>
                Contact &amp; Online Presence
              </h6>
              <span className="partner-form-section-meta">How people reach the organization</span>
            </header>

            <div className="af-field-row">
              <Field label="Logo URL" hint="Square logo works best (PNG, JPG, or SVG).">
                <TextInput
                  type="url"
                  value={form.logoUrl}
                  onChange={set('logoUrl')}
                  placeholder="https://example.org/logo.png"
                  maxLength={255}
                />
              </Field>

              <Field label="Website URL" error={errors.websiteUrl}>
                <TextInput
                  type="url"
                  value={form.websiteUrl}
                  onChange={set('websiteUrl')}
                  invalid={!!errors.websiteUrl}
                  placeholder="https://example.org"
                  maxLength={200}
                />
              </Field>

              <Field label="Contact Email" error={errors.contactEmail}>
                <TextInput
                  type="email"
                  value={form.contactEmail}
                  onChange={set('contactEmail')}
                  invalid={!!errors.contactEmail}
                  placeholder="contact@example.org"
                  maxLength={100}
                />
              </Field>

              <Field label="Contact Phone" hint="Include country code, e.g. +84 …">
                <TextInput
                  type="tel"
                  value={form.contactPhone}
                  onChange={set('contactPhone')}
                  placeholder="+84 24 0000 0000"
                  maxLength={20}
                />
              </Field>

              <Field label="Registration Number" hint="Official legal/charity registration ID, if any.">
                <TextInput
                  type="text"
                  value={form.registrationNumber}
                  onChange={set('registrationNumber')}
                  placeholder="REG-XXXXXX"
                  maxLength={50}
                />
              </Field>

              <Field label="Address" hint="Street, district, city.">
                <TextInput
                  type="text"
                  value={form.address}
                  onChange={set('address')}
                  placeholder="123 Street, District, City"
                  maxLength={255}
                />
              </Field>
            </div>
          </section>

          {/* SECTION 3 — Organization Profile */}
          <section className="partner-form-section" aria-labelledby="sec-profile">
            <header className="partner-form-section-header">
              <h6 id="sec-profile" className="partner-form-section-title">
                <i className="bi bi-card-text" aria-hidden="true"></i>
                Organization Profile
              </h6>
              <span className="partner-form-section-meta">Long-form context for the detail modal</span>
            </header>

            <div className="af-field-row">
              <Field label="Mission" full>
                <TextArea
                  value={form.mission}
                  onChange={set('mission')}
                  rows={3}
                  placeholder="The organization’s mission statement."
                  maxLength={500}
                />
              </Field>

              <Field label="Vision" full>
                <TextArea
                  value={form.vision}
                  onChange={set('vision')}
                  rows={3}
                  placeholder="The organization’s vision statement."
                  maxLength={500}
                />
              </Field>
            </div>
          </section>

          {/* SECTION 4 — Partnership Details */}
          <section className="partner-form-section" aria-labelledby="sec-partnership">
            <header className="partner-form-section-header">
              <h6 id="sec-partnership" className="partner-form-section-title">
                <i className="bi bi-cash-stack" aria-hidden="true"></i>
                Partnership Details
              </h6>
              <span className="partner-form-section-meta">Visible to admins; contribution stats power the public page</span>
            </header>

            <div className="af-field-row">
              <Field
                label="Contribution Amount (VND)"
                error={errors.contributionAmount}
                hint="Numeric value in Vietnamese đồng (VND)."
              >
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1000"
                  value={form.contributionAmount}
                  onChange={set('contributionAmount')}
                  invalid={!!errors.contributionAmount}
                  placeholder="10000000"
                />
              </Field>

              <Field label="Contribution Type">
                <SelectInput
                  value={form.contributionType}
                  onChange={set('contributionType')}
                >
                  {CONTRIBUTION_TYPES.map((t) => (
                    <option key={t || 'none'} value={t}>{t || '— Select —'}</option>
                  ))}
                </SelectInput>
              </Field>

              <Field
                label="Display Order"
                error={errors.displayOrder}
                hint="Lower numbers appear first on the public page."
              >
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={form.displayOrder}
                  onChange={set('displayOrder')}
                  invalid={!!errors.displayOrder}
                  placeholder="0"
                />
              </Field>

              <div className="af-field">
                <label className="af-label">Visibility</label>
                <div className="partner-form-toggles">
                  <label className="af-checkbox-row" htmlFor="is-active">
                    <input
                      id="is-active"
                      type="checkbox"
                      checked={!!form.isActive}
                      onChange={toggle('isActive')}
                    />
                    <span>
                      <strong>Active</strong>
                      <small className="partner-form-toggle-hint">
                        Shown on the public Our Partners page when on.
                      </small>
                    </span>
                  </label>

                  <label className="af-checkbox-row" htmlFor="is-featured">
                    <input
                      id="is-featured"
                      type="checkbox"
                      checked={!!form.isFeatured}
                      onChange={toggle('isFeatured')}
                    />
                    <span>
                      <strong>Featured</strong>
                      <small className="partner-form-toggle-hint">
                        Highlighted in the public page header summary.
                      </small>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </Modal.Body>

        {/* ───── Footer ───── */}
        <Modal.Footer className="partner-form-footer">
          <span className="partner-form-footer-hint">
            <i className="bi bi-info-circle" aria-hidden="true"></i>
            Changes apply to both the admin table and the public Our Partners page.
          </span>
          <div className="partner-form-footer-actions">
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
                  <span>{editing ? 'Saving…' : 'Adding…'}</span>
                </>
              ) : (
                <>
                  <i className={`bi ${editing ? 'bi-check-circle' : 'bi-plus-circle'}`} aria-hidden="true"></i>
                  <span>{editing ? 'Save Changes' : 'Add Partner'}</span>
                </>
              )}
            </button>
          </div>
        </Modal.Footer>
      </form>

      <style>{`
        /* ==========================================================
           Partner form — overrides to align with the af-form-modal
           design system used by all admin CRUD pages.
           ========================================================== */
        .partner-form-modal .modal-content {
          border: 0;
          border-radius: 16px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
          overflow: hidden;
        }

        /* Header */
        .partner-form-modal .modal-header {
          padding: 22px 26px 18px;
          border-bottom: 1px solid var(--c4k-gray-100, #F3F4F6);
          background: linear-gradient(180deg, #FAFBFC 0%, #FFFFFF 100%);
          align-items: flex-start;
        }
        .partner-form-modal .modal-header .btn-close {
          margin-top: 6px;
        }
        .partner-form-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          width: 100%;
        }
        .partner-form-header-icon {
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
        .partner-form-modal .modal-title {
          font-family: var(--font-serif, Georgia, serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--c4k-charcoal, #1A1A1A);
          letter-spacing: -0.02em;
          line-height: 1.25;
          margin: 0;
        }
        .partner-form-header-sub {
          margin: 4px 0 0;
          font-size: 0.8125rem;
          color: var(--c4k-gray-600, #4B5563);
          line-height: 1.45;
          max-width: 64ch;
        }

        /* Body */
        .partner-form-modal .modal-body {
          padding: 22px 26px 8px;
        }

        /* Sections */
        .partner-form-section {
          padding: 18px 0 22px;
          border-bottom: 1px dashed var(--c4k-gray-200, #E5E7EB);
        }
        .partner-form-section:first-child { padding-top: 4px; }
        .partner-form-section:last-of-type { border-bottom: 0; padding-bottom: 4px; }

        .partner-form-section-header {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }
        .partner-form-section-title {
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
        .partner-form-section-title i {
          font-size: 0.95rem;
          color: var(--c4k-coral, #E76F51);
        }
        .partner-form-section-meta {
          font-size: 0.75rem;
          color: var(--c4k-gray-500, #6B7280);
        }

        /* Field grid: 2 columns desktop, 1 column mobile */
        .partner-form-section .af-field-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 16px;
        }
        .partner-form-section .af-field-row > .af-field-full {
          grid-column: 1 / -1;
        }
        @media (max-width: 575px) {
          .partner-form-section .af-field-row { grid-template-columns: 1fr; }
        }

        /* Inline error state on inputs */
        .partner-form-modal .af-input.is-invalid,
        .partner-form-modal .af-textarea.is-invalid,
        .partner-form-modal .af-select.is-invalid {
          border-color: var(--c4k-danger, #B91C1C);
          box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.10);
        }

        /* Toggles */
        .partner-form-toggles {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 575px) {
          .partner-form-toggles { grid-template-columns: 1fr; }
        }
        .partner-form-toggles .af-checkbox-row {
          flex-direction: row;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
        }
        .partner-form-toggles .af-checkbox-row input {
          margin-top: 2px;
          width: 16px;
          height: 16px;
        }
        .partner-form-toggles .af-checkbox-row span {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.875rem;
        }
        .partner-form-toggle-hint {
          font-size: 0.75rem;
          color: var(--c4k-gray-500, #6B7280);
          font-weight: 400;
        }

        /* Footer */
        .partner-form-footer {
          padding: 16px 26px 20px;
          border-top: 1px solid var(--c4k-gray-100, #F3F4F6);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .partner-form-footer-hint {
          font-size: 0.75rem;
          color: var(--c4k-gray-500, #6B7280);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .partner-form-footer-actions {
          display: inline-flex;
          gap: 10px;
          flex-shrink: 0;
        }

        @media (max-width: 575px) {
          .partner-form-footer {
            flex-direction: column-reverse;
            align-items: stretch;
          }
          .partner-form-footer-actions { width: 100%; }
          .partner-form-footer-actions .af-btn { flex: 1; }
        }
      `}</style>
    </Modal>
  );
}

/* ── Admin Partners Page ───────────────────────────── */
function AdminPartnersPage() {
  const { user } = useAuth();
  const canAccess = user?.role === 'Admin';

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = add, else edit
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { activeOnly: false };
      const response = await supportersService.getAll(params);
      setPartners(Array.isArray(response) ? response : (response?.items || []));
    } catch {
      setError('Failed to load partners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) fetchPartners();
  }, [canAccess, fetchPartners]);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setShowForm(true); };

  const handleSave = async (payload) => {
    try {
      if (editing) {
        await supportersService.update(editing.organizationId, payload);
        setSuccess('Partner updated successfully.');
      } else {
        await supportersService.create(payload);
        setSuccess('Partner added successfully.');
      }
      setShowForm(false);
      setError(null);
      await fetchPartners();
    } catch (err) {
      // Re-throw so the modal can display the inline error.
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await supportersService.remove(deleteConfirm);
      setSuccess('Partner deactivated.');
    } catch (err) {
      setError('Failed to deactivate partner.');
    } finally {
      setDeleteConfirm(null);
      fetchPartners();
    }
  };

  // Auto-dismiss success banner.
  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((p) => p[0]).join('').toUpperCase();
  };

  const filtered = partners.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      p.organizationName?.toLowerCase().includes(s) ||
      p.contactEmail?.toLowerCase().includes(s);
    const matchType = !typeFilter || p.organizationType === typeFilter;
    const matchStatus = !statusFilter ||
      (statusFilter === 'active' && p.isActive) ||
      (statusFilter === 'inactive' && !p.isActive);
    return matchSearch && matchType && matchStatus;
  });

  if (!canAccess) {
    return (
      <AdminPageFrame title="Partner management">
        <div className="af-banner af-banner-error" role="alert">
          <span>You do not have permission to access this page.</span>
        </div>
      </AdminPageFrame>
    );
  }

  return (
    <AdminPageFrame
      eyebrow="People · Partners & supporters"
      title="Partner management"
      sub="Manage partner organizations displayed on the Our Partners page."
      error={error}
      success={success}
      actions={
        <button type="button" className="af-btn af-btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-circle" aria-hidden="true"></i>
          <span>Add partner</span>
        </button>
      }
    >
      {/* Toolbar */}
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
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="af-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        <select className="af-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select className="af-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div className="af-toolbar-spacer" />
        <span className="af-meta-count">{filtered.length} of {partners.length}</span>
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="af-empty">
          <div className="af-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <h3 className="af-empty-title">No partners found</h3>
          <p className="af-empty-text">
            {search || typeFilter || statusFilter
              ? 'Try adjusting your filters.'
              : 'Click "Add partner" to onboard your first partner organization.'}
          </p>
          {!search && !typeFilter && !statusFilter && (
            <button type="button" className="af-btn af-btn-primary" onClick={openAdd}>
              <i className="bi bi-plus-circle" aria-hidden="true"></i>
              <span>Add first partner</span>
            </button>
          )}
        </div>
      ) : (
        <div className="af-panel">
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Logo</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Contribution</th>
                  <th style={{ width: 70 }}>Order</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.organizationId}>
                    <td>
                      {p.logoUrl ? (
                        <img
                          src={p.logoUrl}
                          alt={p.organizationName}
                          className="af-logo"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement.innerHTML =
                              `<span class="af-logo-fallback">${getInitials(p.organizationName)}</span>`;
                          }}
                        />
                      ) : (
                        <span className="af-logo-fallback">{getInitials(p.organizationName)}</span>
                      )}
                    </td>
                    <td>
                      <div className="af-cell-strong">{p.organizationName}</div>
                      {p.websiteUrl && (
                        <div className="af-cell-meta">
                          <i className="bi bi-box-arrow-up-right"></i>{' '}
                          {p.websiteUrl.replace(/^https?:\/\//, '').slice(0, 32)}
                        </div>
                      )}
                      {p.isFeatured && (
                        <span className="af-tag af-tag-accent" style={{ marginTop: 4 }}>★ Featured</span>
                      )}
                    </td>
                    <td>
                      <span className={`af-tag af-tag-${(p.organizationType || '').toLowerCase()}`}>
                        {p.organizationType}
                      </span>
                    </td>
                    <td>
                      {p.contactEmail && <div className="af-cell-meta">{p.contactEmail}</div>}
                      {p.contactPhone && <div className="af-cell-meta">{p.contactPhone}</div>}
                    </td>
                    <td>
                      {p.contributionAmount != null ? (
                        <>
                          <div className="af-cell-strong">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(p.contributionAmount)}
                          </div>
                          {p.contributionType && <div className="af-cell-meta">{p.contributionType}</div>}
                        </>
                      ) : (
                        <span className="af-cell-meta">—</span>
                      )}
                    </td>
                    <td>
                      <span className="af-code">{p.displayOrder}</span>
                    </td>
                    <td>
                      <span className={`af-pill af-pill-${p.isActive ? 'active' : 'completed'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="af-row-actions">
                        <button type="button" className="af-icon-btn" onClick={() => openEdit(p)} title="Edit" aria-label="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {user?.role === 'Admin' && (
                          <button type="button" className="af-icon-btn danger" onClick={() => setDeleteConfirm(p.organizationId)} title="Deactivate" aria-label="Deactivate">
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

      {/* Form Modal */}
      <PartnerFormModal
        show={showForm}
        editing={!!editing}
        initial={editing || EMPTY_FORM}
        onSave={handleSave}
        onClose={() => setShowForm(false)}
      />

      {/* Delete Confirm */}
      <Modal
        show={!!deleteConfirm}
        onHide={() => setDeleteConfirm(null)}
        centered
        className="af-confirm-modal"
      >
        <Modal.Body>
          <div className="af-confirm-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 className="af-confirm-title">Deactivate partner?</h3>
          <p className="af-confirm-text">
            This organization will no longer appear on the public Our Partners
            page. Linked campaigns and donations are preserved and the record
            can be reactivated later.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="af-btn af-btn-secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </button>
          <button type="button" className="af-btn af-btn-danger" onClick={handleDelete}>
            <i className="bi bi-trash" aria-hidden="true"></i>
            <span>Deactivate</span>
          </button>
        </Modal.Footer>
      </Modal>
    </AdminPageFrame>
  );
}

export default AdminPartnersPage;
