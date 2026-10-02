import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { donationsService } from '../services';
import './DonatePage.css';

/* ============================================================
// PaymentMockConfirmPage
//
// Development-only stand-in for the VNPay sandbox payment page.
// Reached via window.location.href = PaymentUrl returned by the
// backend when PaymentGateway:Type = "mock".
//
// This page simulates the same contract a real VNPay page would
// offer:
//   - Show transaction context (id, donation, amount).
//   - User MUST explicitly click "Confirm" or "Cancel".
//   - On Confirm → POST /api/v1/donations/{donationId}/mock-confirm
//     → backend runs ManualConfirmCommand (atomic Pending -> Completed
//     + aggregate update).
//   - On Cancel → leave it as Pending; redirect to /payment/result.
//   - Either way → redirect to /payment/result?id={donationId} which
//     polls the backend for the authoritative status.
//
// IMPORTANT: this page is mounted only when the configured gateway
// is "mock". The backend endpoint enforces the same guard server-side.
// ============================================================ */

const PaymentMockConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const txn = searchParams.get('txn') || searchParams.get('orderId') || '';
  const donationId = searchParams.get('donation') || '';
  const amountParam = searchParams.get('amount');

  const [status, setStatus] = useState('ready'); // ready | confirming | failed
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  // Convert smallest-unit (amount * 100) back to VND for display.
  const amountVnd = amountParam ? Math.round(parseInt(amountParam, 10) / 100) : null;

  // Auto-redirect safety: if user lands here with no donationId, send them home.
  useEffect(() => {
    if (!donationId) {
      setError('Missing donation reference. Returning to home...');
      const id = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(id);
    }
  }, [donationId, navigate]);

  const handleConfirm = async () => {
    setStatus('confirming');
    setError('');
    try {
      // Hit the dev-only confirm endpoint. Backend only allows this when
      // PaymentGateway:Type = "mock" — production gateway config returns 403.
      const resp = await donationsService.mockConfirm(donationId);
      if (resp && (resp.success === true || resp.success === undefined)) {
        // Redirect to the result page which will poll and show "Completed".
        navigate(`/payment/result?id=${donationId}`);
      } else {
        setError(resp?.message || 'Mock confirm returned an unexpected response.');
        setStatus('failed');
      }
    } catch (e) {
      setError(
        e.response?.data?.message ||
        e.message ||
        'Could not confirm mock payment. Please try again.'
      );
      setStatus('failed');
    }
  };

  const handleCancel = async () => {
    // No backend call — donation stays Pending. Just send user to result page
    // so they see the current (Pending) state and can retry from there.
    navigate(`/payment/result?id=${donationId}`);
  };

  // Subtle countdown — never auto-confirms; only a UX hint.
  useEffect(() => {
    if (status !== 'ready') return;
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown, status]);

  if (!donationId) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error || 'Invalid payment reference.'}</Alert>
      </Container>
    );
  }

  return (
    <div className="dp-page">
      <section className="dp-form-section">
        <Container>
          <Row className="justify-content-center">
            <Col lg={7}>
              <div className="dp-form-card">
                <div className="dp-step" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                  <p className="eyebrow" style={{ color: '#888' }}>Mock payment gateway</p>
                  <h3 className="dp-step-title">Confirm payment (sandbox)</h3>
                  <p className="dp-step-desc">
                    This page simulates the VNPay payment gateway used in non-production environments.
                    In production, donors are redirected to the real VNPay gateway and returned
                    to the system after the payment is completed.
                  </p>
                </div>

                <div className="dp-summary-card mt-4">
                  <div className="dp-summary-header">
                    <p className="eyebrow">Transaction</p>
                    <div className="dp-summary-amount">
                      {amountVnd != null
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amountVnd)
                        : '—'}
                    </div>
                  </div>
                  <div className="dp-summary-detail">
                    <div className="dp-summary-row">
                      <span className="dp-summary-label">Donation reference</span>
                      <span className="dp-summary-value">#{donationId}</span>
                    </div>
                    <div className="dp-summary-row">
                      <span className="dp-summary-label">Mock transaction ID</span>
                      <span className="dp-summary-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {txn || '—'}
                      </span>
                    </div>
                    <div className="dp-summary-row">
                      <span className="dp-summary-label">Gateway</span>
                      <span className="dp-summary-value">mock (dev sandbox)</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="danger" className="dp-alert mt-3">{error}</Alert>
                )}

                <Alert variant="info" className="dp-alert mt-3">
                  Click <strong>Confirm payment</strong> to mark it as <strong>Completed</strong>
                  and update the campaign's raised total. The donation stays in
                  <strong> Pending</strong> status until you confirm.
                </Alert>

                <div className="d-flex gap-2 mt-3 flex-wrap">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleConfirm}
                    disabled={status === 'confirming'}
                  >
                    {status === 'confirming' ? (
                      <><Spinner animation="border" size="sm" className="me-2" />Confirming...</>
                    ) : (
                      <>✅ Confirm payment</>
                    )}
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="lg"
                    onClick={handleCancel}
                    disabled={status === 'confirming'}
                  >
                    ❌ Cancel (keep Pending)
                  </Button>
                </div>

                {status === 'ready' && countdown > 0 && (
                  <p className="text-muted small mt-2">
                    Tip: you can confirm right away — no need to wait the full {countdown}s.
                  </p>
                )}

                <hr className="my-4" />
                <p className="text-muted small mb-0">
                  After confirming, you will be redirected to the payment result page where you
                  can view the final status. If you need help, please contact an admin with the
                  transaction ID shown above.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default PaymentMockConfirmPage;