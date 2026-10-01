import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Form, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { donationsService } from '../services';
import api from '../services/api';
import './DonatePage.css';

/* ============================================================
// Card validation utilities (client-side only — PCI-DSS safe)
// ============================================================ */

/**
 * Luhn algorithm — validates card number structure.
 * Does NOT transmit card data; only validates locally.
 */
function validateLuhn(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  if (!digits) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/**
 * Returns the card brand based on number prefix.
 */
function getCardBrand(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  return null;
}

/**
 * Validates card expiry string (MM/YY).
 * Returns { valid, expired, month, year }.
 */
function validateExpiry(expiryStr) {
  const match = expiryStr.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return { valid: false, expired: false, month: null, year: null };
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return { valid: false, expired: false, month, year };
  const expDate = new Date(year, month);
  return { valid: true, expired: expDate <= new Date(), month, year };
}

/**
 * Validates CVV — 3 digits for most cards, 4 for Amex.
 */
function validateCvv(cvv, isAmex) {
  const digits = cvv.replace(/\D/g, '');
  if (isAmex) return digits.length === 4;
  return digits.length >= 3 && digits.length <= 4;
}

/**
 * Deduplicate an array by `causeId` (or `campaignId`/`id`) — keep
 * the first occurrence. Protects against repeated responses from
 * cached interceptors / retries / accidentally duplicated DB rows.
 */
function dedupeById(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const id = item.causeId ?? item.campaignId ?? item.id;
    if (id == null) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

/* ============================================================
// DonatePage
// ============================================================ */

const DonatePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [causes, setCauses] = useState([]);
  const [causeTree, setCauseTree] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [subCauses, setSubCauses] = useState([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState('');  // NEW: surface API failure to user
  const [formData, setFormData] = useState({
    causeId: location.state?.causeId != null ? String(location.state.causeId) : '',
    campaignId: location.state?.campaignId != null ? String(location.state.campaignId) : '',
    amount: '500000',
    paymentMethod: 'BankTransfer',
    // Card fields — PCI-DSS: never sent to server
    cardNumber: '',
    cardHolderName: '',
    expiryDate: '',
    cvv: '',
    // ──
    message: '',
    isAnonymous: false
  });
  const [cardErrors, setCardErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─────────────────────────────────────────────────────────────
  // Cause source-of-truth.
//
// The Donation page dropdown is populated from the SAME
// GET /api/v1/causes/tree endpoint used by CampaignsPage and the
// public /campaigns page. That endpoint already filters
// IsActive = true on the server, so any cause that appears in the
// response has been promoted by the same admin tooling that powers
// the rest of the site. The frontend MUST NOT maintain its own
// whitelist of cause codes — that would create a second source of
// truth and risk hiding legitimate future causes.
//
// The only client-side filtering we apply here is purely defensive:
//   1) skip null / malformed entries,
//   2) honour IsActive (belt-and-suspenders in case the response
//      ever contains an inactive cause for any reason),
//   3) deduplicate by id so a cached/repeated response cannot show
//      two of the same cause.
// ─────────────────────────────────────────────────────────────

  // Card brand auto-detection
  const cardBrand = useMemo(() => getCardBrand(formData.cardNumber), [formData.cardNumber]);
  const showCardForm = formData.paymentMethod === 'CreditCard' || formData.paymentMethod === 'DebitCard';

  // Auto-format card number: 1234 5678 9012 3456
  const handleCardNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    setFormData((prev) => ({ ...prev, cardNumber: formatted }));
    if (cardErrors.cardNumber) setCardErrors((p) => ({ ...p, cardNumber: '' }));
  };

  // Auto-format expiry: MM/YY
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) raw = raw.slice(0, 2) + '/' + raw.slice(2);
    else if (raw.length === 2) raw = raw + '/';
    setFormData((prev) => ({ ...prev, expiryDate: raw }));
    if (cardErrors.expiryDate) setCardErrors((p) => ({ ...p, expiryDate: '' }));
  };

  /* ── Card field validation ────────────────────────────── */
  const validateCardFields = () => {
    const errs = {};
    const { cardNumber, cardHolderName, expiryDate, cvv, paymentMethod } = formData;

    if (paymentMethod === 'CreditCard' || paymentMethod === 'DebitCard') {
      if (!cardHolderName.trim() || cardHolderName.trim().length < 2) {
        errs.cardHolderName = 'Enter the name as shown on your card.';
      }
      const rawCard = cardNumber.replace(/\s/g, '');
      if (!rawCard) {
        errs.cardNumber = 'Card number is required.';
      } else if (rawCard.length < 13 || rawCard.length > 19) {
        errs.cardNumber = 'Enter a valid card number.';
      } else if (!validateLuhn(rawCard)) {
        errs.cardNumber = 'Card number is invalid (check for typos).';
      }
      if (!expiryDate) {
        errs.expiryDate = 'Expiry date is required.';
      } else {
        const exp = validateExpiry(expiryDate);
        if (!exp.valid) errs.expiryDate = 'Enter expiry as MM/YY.';
        else if (exp.expired) errs.expiryDate = 'Your card has expired.';
      }
      if (!cvv) {
        errs.cvv = 'CVV is required.';
      } else if (!validateCvv(cvv, cardBrand === 'Amex')) {
        errs.cvv = cardBrand === 'Amex' ? 'Amex CVV is 4 digits.' : 'CVV must be 3-4 digits.';
      }
    }
    return errs;
  };

  useEffect(() => {
    const ac = new AbortController();
    const loadTree = async () => {
      try {
        const treeResp = await api.get('/causes/tree', {
          params: { activeOnly: true }, signal: ac.signal
        });
        // Interceptor strips the envelope → treeResp is the data array directly.
        // Each element is a PARENT cause: { causeId, causeName, ..., subCauses: [...] }.
        // No `parent` wrapper — `causeId` lives at the element root.
        const rawTree = Array.isArray(treeResp) ? treeResp : [];
        const safeTree = rawTree.filter((n) => n && typeof n === 'object');

        // Defensive client-side filter: keep entries that look like
        // a cause with a positive id, honour IsActive if the field is
        // present (the API already filters activeOnly=true), and drop
        // anything that fails these checks. We do NOT maintain a second
        // cause-code whitelist here — the backend IsActive flag is the
        // single source of truth for what should be shown to donors.
        const filteredTree = safeTree
          .filter((node) => node && node.causeId != null && node.isActive !== false)
          .map((node) => ({
            ...node,
            // Same defensive treatment for sub-causes.
            subCauses: Array.isArray(node.subCauses)
              ? node.subCauses.filter((s) =>
                  s && typeof s === 'object' && s.causeId != null && s.isActive !== false
                )
              : []
          }));

        // Deduplicate by causeId (defensive against cached/repeated responses).
        const dedupedTree = dedupeById(filteredTree);

        setCauseTree(dedupedTree);

        // Build flat list: parent + all its sub-causes, dropping null/invalid entries.
        const flat = [];
        dedupedTree.forEach((node) => {
          if (node.causeId != null) flat.push(node);
          (Array.isArray(node.subCauses) ? node.subCauses : []).forEach((s) => {
            if (s && typeof s === 'object' && s.causeId != null) flat.push(s);
          });
        });
        setCauses(flat);
        // If we successfully received an empty list, surface that to the user.
        if (dedupedTree.length === 0) {
          setTreeError('No donation causes are currently available. Please check back later.');
        } else {
          setTreeError('');
        }
      } catch (e) {
        if (e.name !== 'CanceledError') {
          console.error('[DonatePage] Failed to load causes tree:', e);
          setTreeError('Could not load donation causes right now. Please refresh the page or try again shortly.');
        }
      } finally {
        if (!ac.signal.aborted) setTreeLoading(false);
      }
    };
    const loadCampaigns = async () => {
      try {
        const r = await api.get('/campaigns', {
          params: { status: 'Active' }, signal: ac.signal
        });
        // Interceptor returns body.data → { items, page, pageSize, totalCount }
        const items = Array.isArray(r?.items) ? r.items
                    : Array.isArray(r) ? r
                    : [];
        // Defensive: filter out entries missing required fields and dedupe.
        const safeItems = items
          .filter((c) => c && typeof c === 'object' && c.campaignId != null)
          .filter((c) => c.status === 'Active');
        setCampaigns(dedupeById(safeItems));
      } catch (e) {
        if (e.name !== 'CanceledError') console.error('Failed to load campaigns:', e);
      }
    };
    loadTree();
    loadCampaigns();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const causeId = formData.causeId;
    if (causeId !== '' && causeId !== null && causeId !== undefined) {
      loadCampaignsByCause(causeId);
      const sel = (causes || []).find((c) => c && String(c.causeId) === String(causeId));
      const parentId = sel?.parentCauseId ?? sel?.causeId;
      const subs = (causeTree || []).find(
        (n) => n && n.causeId === parentId
      )?.subCauses || [];
      // Defensive: filter out null/invalid sub-cause entries before storing.
      setSubCauses(
        Array.isArray(subs) ? subs.filter((s) => s && typeof s === 'object' && s.causeId != null) : []
      );
    } else {
      setSubCauses([]);
    }
  }, [formData.causeId, causeTree, causes]);

  // SECURITY/PCI-DSS: zero out sensitive form state (card number, CVV, expiry,
  // amount) when the component unmounts. The state lives in React memory; if
  // the user navigates away mid-form, those values would otherwise stay in JS
  // heap until garbage collection. Wiping them now shrinks the window where a
  // browser extension or XSS payload could read them.
  //
  // Only clears when the user is NOT staying on the form (i.e. on unmount).
  useEffect(() => {
    return () => {
      setFormData((prev) => ({
        ...prev,
        cardNumber: '',
        cardHolderName: '',
        expiryDate: '',
        cvv: '',
        amount: '',
      }));
      setCardErrors({});
    };
  }, []);

  const loadCampaignsByCause = async (causeId) => {
    try {
      const r = await api.get('/campaigns', { params: { status: 'Active', causeId } });
      const items = r?.items || (Array.isArray(r) ? r : []);
      const safeItems = items
        .filter((c) => c && typeof c === 'object' && c.campaignId != null)
        .filter((c) => c.status === 'Active');
      setCampaigns(dedupeById(safeItems));
    } catch (e) { console.error(e); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (cardErrors[name]) setCardErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleQuickAmount = (amount) => {
    setFormData((prev) => ({ ...prev, amount: amount.toString() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.causeId) { setError('Please select a cause to support.'); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { setError('Please enter a valid donation amount.'); return; }

    // Defensive: ensure the selected cause is still in the loaded tree.
    // Guards against a stale form value pointing at a cause that has
    // since been deactivated or removed on the server.
    const selectedNumId = Number(formData.causeId);
    const stillExists = (causeTree || []).some(
      (n) => n && (
        n.causeId === selectedNumId ||
        (Array.isArray(n.subCauses) && n.subCauses.some((s) => s && s.causeId === selectedNumId))
      )
    );
    if (!stillExists) {
      setError('The selected cause is no longer available. Please pick another.');
      return;
    }

    const errs = validateCardFields();
    if (Object.keys(errs).length > 0) { setCardErrors(errs); setError('Please correct the payment details below.'); return; }

    setLoading(true);
    try {
      const idempotencyKey = `don-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const donationData = {
        causeId: parseInt(formData.causeId),
        campaignId: formData.campaignId ? parseInt(formData.campaignId) : null,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        message: formData.message || null,
        isAnonymous: formData.isAnonymous,
        idempotencyKey
      };
      await donationsService.create(donationData);
      setSuccess('Thank you for your generous donation. You will receive a receipt via email.');
      setTimeout(() => navigate('/my-donations'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Donation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount || 0);

  const quickAmounts = [100000, 250000, 500000, 1000000, 2500000, 5000000];
  const impactPreview = useMemo(() => {
    const a = parseFloat(formData.amount) || 0;
    if (a <= 0) return null;
    return { meals: Math.floor(a / 25000), supplies: Math.floor(a / 150000), healthcare: Math.floor(a / 500000) };
  }, [formData.amount]);

  return (
    <div className="dp-page">

      {/* ─── HERO ─── */}
      <section className="dp-hero">
        <div className="dp-hero-bg">
          <img
            src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337379/giveaid/replacement/thang2-7378-1396341890_sh4unx.webp"
            alt="Helping hands"
          />
          <div className="dp-hero-overlay" />
        </div>
        <Container className="dp-hero-content">
          <p className="eyebrow" style={{ color: '#FAE6DD' }}>Make a Difference</p>
          <h1 className="dp-hero-title">Your Donation<br />Changes Lives</h1>
          <p className="dp-hero-sub">
            100% of your donation goes directly to programmes supporting children's welfare — food, education, healthcare and safe homes.
          </p>
        </Container>
      </section>

      {/* ─── FORM ─── */}
      <section className="dp-form-section">
        <Container>
          <Row className="dp-form-row">

            {/* Left — Form */}
            <Col lg={7} className="dp-form-col">
              <div className="dp-form-card">
                {error && <Alert variant="danger" className="dp-alert">{error}</Alert>}
                {success && <Alert variant="success" className="dp-alert">{success}</Alert>}

                <Form onSubmit={handleSubmit}>

                  {/* Step 1 — Cause */}
                  <div className="dp-step">
                    <p className="dp-step-num">Step 1</p>
                    <h3 className="dp-step-title">Choose a Cause</h3>
                    <p className="dp-step-desc">Select the area you'd like your donation to support.</p>
                    {treeError && causeTree.length === 0 ? (
                      <Alert variant="warning" className="dp-alert" data-testid="cause-load-error">
                        {treeError}
                      </Alert>
                    ) : (
                      <Form.Select
                        name="parentCauseId"
                        disabled={treeLoading || causeTree.length === 0}
                        value={(() => {
                          const selectedId = formData.causeId;
                          if (selectedId === '' || selectedId === null || selectedId === undefined) return '';
                          const numId = Number(selectedId);
                          if (!Number.isFinite(numId) || numId === 0) return '';
                          const found = (causeTree || []).find((n) =>
                            n && (
                              n.causeId === numId ||
                              (Array.isArray(n.subCauses) && n.subCauses.some((s) => s && s.causeId === numId))
                            )
                          );
                          return found?.causeId != null ? String(found.causeId) : '';
                        })()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parentId = Number(raw);
                          if (!raw || !Number.isFinite(parentId) || parentId === 0) {
                            setFormData((p) => ({ ...p, causeId: '', campaignId: '' }));
                            return;
                          }
                          const parent = (causeTree || []).find(
                            (n) => n && n.causeId === parentId
                          );
                          setFormData((p) => ({
                            ...p,
                            causeId: parent?.causeId != null ? String(parent.causeId) : '',
                            campaignId: ''
                          }));
                        }}
                        required
                        className="dp-select"
                      >
                        <option value="">
                          {treeLoading
                            ? 'Loading causes…'
                            : causeTree.length === 0
                              ? 'No causes available'
                              : 'Choose a cause…'}
                        </option>
                        {(causeTree || [])
                          .filter((n) => n && n.causeId != null)
                          .map((node) => (
                            <option key={node.causeId} value={node.causeId}>
                              {node.causeName}
                            </option>
                          ))}
                      </Form.Select>
                    )}
                  </div>

                  {/* Step 1b — Sub-cause */}
                  {subCauses.length > 0 && (
                    <div className="dp-step dp-step-sub">
                      <p className="dp-step-num">Step 1b · Optional</p>
                      <h3 className="dp-step-title">Specific Need</h3>
                      <p className="dp-step-desc">Pick a specific area, or leave blank to support the whole cause.</p>
                      <Form.Select name="causeId" value={formData.causeId} onChange={handleChange} className="dp-select">
                        <option value="">Support the whole cause</option>
                        {subCauses
                          .filter((s) => s && typeof s === 'object' && s.causeId != null)
                          .map((sub) => (
                            <option key={sub.causeId} value={sub.causeId}>{sub.causeName}</option>
                          ))}
                      </Form.Select>
                    </div>
                  )}

                  {/* Step 2 — Campaign */}
                  {campaigns.length > 0 && formData.causeId && (
                    <div className="dp-step">
                      <p className="dp-step-num">Step 2 · Optional</p>
                      <h3 className="dp-step-title">Select a Campaign</h3>
                      <p className="dp-step-desc">Choose a specific campaign, or leave blank for a general donation.</p>
                      <Form.Select name="campaignId" value={formData.campaignId} onChange={handleChange} className="dp-select">
                        <option value="">General donation to this cause</option>
                        {campaigns
                          .filter((c) => c && typeof c === 'object' && c.campaignId != null)
                          .map((c) => (
                            <option key={c.campaignId} value={c.campaignId}>
                              {c.campaignName} — {c.percentageReached?.toFixed(0) || 0}% funded
                            </option>
                          ))}
                      </Form.Select>
                    </div>
                  )}

                  {/* Step 3 — Amount */}
                  <div className="dp-step">
                    <p className="dp-step-num">{campaigns.length > 0 && formData.causeId ? 'Step 3' : 'Step 2'}</p>
                    <h3 className="dp-step-title">Donation Amount</h3>
                    <p className="dp-step-desc">Choose a preset amount or enter your own.</p>
                    <div className="dp-quick-amounts">
                      {quickAmounts.map((a) => (
                        <button
                          type="button" key={a}
                          className={`dp-quick-btn ${formData.amount === a.toString() ? 'is-active' : ''}`}
                          onClick={() => handleQuickAmount(a)}
                        >
                          {formatCurrency(a)}
                        </button>
                      ))}
                    </div>
                    <Form.Group className="mt-3">
                      <Form.Label className="dp-label">Custom amount (VND)</Form.Label>
                      <Form.Control
                        type="number" name="amount"
                        placeholder="Enter any amount"
                        value={formData.amount}
                        onChange={handleChange}
                        min="1000" step="1000"
                        required className="dp-input dp-input-large"
                      />
                    </Form.Group>
                  </div>

                  {/* Step 4 — Payment Method + Card */}
                  <div className="dp-step">
                    <p className="dp-step-num">Payment Information</p>
                    <h3 className="dp-step-title">Choose Payment Method</h3>
                    <Form.Select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="dp-select">
                      <option value="BankTransfer">Bank Transfer (Recommended)</option>
                      <option value="NetBanking">Net Banking</option>
                      <option value="CreditCard">Credit Card</option>
                      <option value="DebitCard">Debit Card</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Card details are validated locally and never transmitted or stored.
                    </Form.Text>

                    {/* ── Card form (only for Credit/Debit) ── */}
                    {showCardForm && (
                      <div className="dp-card-form">
                        <div className="dp-card-form-header">
                          <span className="dp-card-form-title">Card Details</span>
                          <div className="dp-card-logos">
                            <span className="dp-card-logo">Visa</span>
                            <span className="dp-card-logo">MC</span>
                            <span className="dp-card-logo">Amex</span>
                            <span className="dp-card-logo">Disc</span>
                          </div>
                        </div>

                        {/* Card number */}
                        <Form.Group className="mb-3">
                          <Form.Label className="dp-label">Card Number</Form.Label>
                          <div className="dp-card-input-wrap">
                            <Form.Control
                              type="text" inputMode="numeric"
                              placeholder="1234 5678 9012 3456"
                              value={formData.cardNumber}
                              onChange={handleCardNumberChange}
                              className={`dp-input ${cardErrors.cardNumber ? 'is-invalid' : ''}`}
                              maxLength={19} autoComplete="cc-number"
                            />
                            {cardBrand && <span className="dp-card-brand-tag">{cardBrand}</span>}
                          </div>
                          {cardErrors.cardNumber && <div className="dp-field-error">{cardErrors.cardNumber}</div>}
                          {formData.cardNumber && !cardErrors.cardNumber && (
                            <div className="dp-field-ok">Valid format</div>
                          )}
                        </Form.Group>

                        {/* Cardholder name */}
                        <Form.Group className="mb-3">
                          <Form.Label className="dp-label">Cardholder Name</Form.Label>
                          <Form.Control
                            type="text" placeholder="NGUYEN VAN A"
                            value={formData.cardHolderName}
                            onChange={handleChange}
                            name="cardHolderName"
                            className={`dp-input ${cardErrors.cardHolderName ? 'is-invalid' : ''}`}
                            autoComplete="cc-name"
                          />
                          {cardErrors.cardHolderName && <div className="dp-field-error">{cardErrors.cardHolderName}</div>}
                        </Form.Group>

                        <Row>
                          {/* Expiry */}
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="dp-label">Expiry Date (MM/YY)</Form.Label>
                              <Form.Control
                                type="text" inputMode="numeric" placeholder="MM/YY"
                                value={formData.expiryDate}
                                onChange={handleExpiryChange}
                                className={`dp-input ${cardErrors.expiryDate ? 'is-invalid' : ''}`}
                                maxLength={5} autoComplete="cc-exp"
                              />
                              {cardErrors.expiryDate && <div className="dp-field-error">{cardErrors.expiryDate}</div>}
                            </Form.Group>
                          </Col>
                          {/* CVV */}
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="dp-label">
                                CVV {cardBrand === 'Amex' ? '(4 digits)' : '(3 digits)'}
                              </Form.Label>
                              <Form.Control
                                type="password" inputMode="numeric"
                                placeholder={cardBrand === 'Amex' ? '1234' : '123'}
                                value={formData.cvv}
                                onChange={handleChange}
                                name="cvv"
                                className={`dp-input ${cardErrors.cvv ? 'is-invalid' : ''}`}
                                maxLength={4} autoComplete="cc-csc"
                              />
                              {cardErrors.cvv && <div className="dp-field-error">{cardErrors.cvv}</div>}
                            </Form.Group>
                          </Col>
                        </Row>

                        <div className="dp-card-security-note">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          Your card details are encrypted and never stored on our servers.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 5 — Message */}
                  <div className="dp-step">
                    <p className="dp-step-num">Final Touch</p>
                    <h3 className="dp-step-title">Add a Message</h3>
                    <Form.Group className="mb-3">
                      <Form.Control
                        as="textarea" rows={3} name="message"
                        placeholder="Share why you're supporting this cause..."
                        value={formData.message}
                        onChange={handleChange} className="dp-input"
                      />
                    </Form.Group>
                    <label className="dp-checkbox dp-checkbox-small">
                      <input type="checkbox" name="isAnonymous" checked={formData.isAnonymous} onChange={handleChange} />
                      <span className="dp-checkbox-mark"></span>
                      <span className="dp-checkbox-label">Display my donation anonymously</span>
                    </label>
                  </div>

                  <button type="submit" className="btn-coral btn-lg dp-submit" disabled={loading}>
                    {loading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</>
                    ) : (
                      <>Complete Donation — {formatCurrency(parseFloat(formData.amount) || 0)}</>
                    )}
                  </button>
                  <p className="dp-secure-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Your payment is secure and encrypted. We never store card details.
                  </p>
                </Form>
              </div>
            </Col>

            {/* Right — Summary */}
            <Col lg={5} className="dp-summary-col">
              <div className="dp-summary-card">
                <div className="dp-summary-header">
                  <p className="eyebrow">Your Donation</p>
                  <div className="dp-summary-amount">
                    {formatCurrency(parseFloat(formData.amount) || 0)}
                  </div>
                </div>
                <div className="dp-summary-detail">
                  <div className="dp-summary-row">
                    <span className="dp-summary-label">Cause</span>
                    <span className="dp-summary-value">
                      {(() => {
                        const id = Number(formData.causeId);
                        if (!id) return 'Not selected';
                        return causes.find((c) => Number(c.causeId) === id)?.causeName || 'Not selected';
                      })()}
                    </span>
                  </div>
                  {formData.campaignId && (
                    <div className="dp-summary-row">
                      <span className="dp-summary-label">Campaign</span>
                      <span className="dp-summary-value">
                        {(() => {
                          const id = Number(formData.campaignId);
                          if (!id) return '—';
                          return campaigns.find((c) => Number(c.campaignId) === id)?.campaignName || '—';
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                {impactPreview && impactPreview.meals > 0 && (
                  <div className="dp-impact-preview">
                    <p className="dp-impact-title">Your Impact</p>
                    <div className="dp-impact-items">
                      {impactPreview.meals > 0 && (
                        <div className="dp-impact-item">
                          <div className="dp-impact-num">{impactPreview.meals.toLocaleString('vi-VN')}</div>
                          <div className="dp-impact-lbl">Nutritious meals</div>
                        </div>
                      )}
                      {impactPreview.supplies > 0 && (
                        <div className="dp-impact-item">
                          <div className="dp-impact-num">{impactPreview.supplies}</div>
                          <div className="dp-impact-lbl">Supply packs</div>
                        </div>
                      )}
                      {impactPreview.healthcare > 0 && (
                        <div className="dp-impact-item">
                          <div className="dp-impact-num">{impactPreview.healthcare}</div>
                          <div className="dp-impact-lbl">Health check-ups</div>
                        </div>
                      )}
                    </div>
                    <p className="dp-impact-note">
                      Estimated impact based on average programme costs.
                    </p>
                  </div>
                )}

                <div className="dp-trust-mini">
                  <div className="dp-trust-mini-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>Secure encrypted payment</span>
                  </div>
                  <div className="dp-trust-mini-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span>Tax deductible receipt</span>
                  </div>
                  <div className="dp-trust-mini-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    <span>Transparent reporting</span>
                  </div>
                </div>
              </div>
            </Col>

          </Row>
        </Container>
      </section>

    </div>
  );
};

export default DonatePage;
