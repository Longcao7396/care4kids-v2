import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Alert, Spinner, Button } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { donationsService } from '../services';
import './DonatePage.css';

/* ============================================================
// PaymentResultPage
//
// Displayed after the user returns from a payment gateway.
// IMPORTANT: the gateway redirect is NOT authoritative. We poll our backend
// (which is updated by the gateway's server-to-server IPN/webhook) and
// present the authoritative status.
//
// Status mapping:
//   "Completed"  → "Thank you! Your donation has been successfully received."
//   "Pending"    → "Your payment is being verified. Please wait."
//   "Failed"     → "Your payment could not be completed."
//   "Refunded"   → "This donation has been refunded."
// ============================================================ */

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const donationIdFromUrl = searchParams.get('id');
  const donationIdFromStorage = (() => {
    try { return sessionStorage.getItem('pendingDonationId'); } catch { return null; }
  })();
  const donationId = donationIdFromUrl || donationIdFromStorage;

  const [status, setStatus] = useState('Pending');
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!donationId) {
      setError('Donation reference not found. Please double-check the link or contact support.');
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const resp = await donationsService.getPaymentStatus(donationId);
        const data = resp?.data ?? resp;
        if (cancelled) return;
        setPayment(data);
        setStatus(data?.paymentStatus || 'Pending');
        setPollCount(c => c + 1);

        // Stop polling once we reach a terminal state.
        if (data?.paymentStatus === 'Completed' || data?.paymentStatus === 'Failed' ||
            data?.paymentStatus === 'Refunded') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          try { sessionStorage.removeItem('pendingDonationId'); } catch (_) {}
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Could not check payment status.');
      }
    };

    poll(); // initial fetch
    intervalRef.current = setInterval(poll, 4000); // poll every 4s
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [donationId]);

  const formatCurrency = (amount, currency = 'VND') => new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 0
  }).format(amount || 0);

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Something went wrong</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => navigate('/')}>Back to home</Button>
        </Alert>
      </Container>
    );
  }

  const banner = (() => {
    switch (status) {
      case 'Completed':
        return {
          variant: 'success',
          icon: '✅',
          title: 'Thank you! Your donation has been received.',
          body: 'A receipt will be emailed to you shortly.'
        };
      case 'Failed':
        return {
          variant: 'danger',
          icon: '❌',
          title: 'Payment could not be completed',
          body: 'Please try again or use a different payment method.'
        };
      case 'Refunded':
        return {
          variant: 'warning',
          icon: '↩️',
          title: 'This donation has been refunded',
          body: 'Please contact support if you have any questions.'
        };
      default:
        return {
          variant: 'info',
          icon: <Spinner animation="border" size="sm" />,
          title: 'Verifying your payment...',
          body: 'Please hold on while we confirm the transaction with the payment gateway.'
        };
    }
  })();

  return (
    <div className="dp-page">
      <section className="dp-form-section">
        <Container>
          <Row className="justify-content-center">
            <Col lg={7}>
              <div className="dp-form-card">
                <Alert variant={banner.variant} className="dp-alert">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span style={{ fontSize: '1.5rem' }}>{banner.icon}</span>
                    <h4 className="mb-0">{banner.title}</h4>
                  </div>
                  <p className="mb-0">{banner.body}</p>
                </Alert>

                {payment && (
                  <div className="dp-summary-card mt-4">
                    <div className="dp-summary-detail">
                      <div className="dp-summary-row">
                        <span className="dp-summary-label">Donation reference</span>
                        <span className="dp-summary-value">#{payment.donationId}</span>
                      </div>
                      {payment.amount && (
                        <div className="dp-summary-row">
                          <span className="dp-summary-label">Amount</span>
                          <span className="dp-summary-value">{formatCurrency(payment.amount, payment.currency || 'VND')}</span>
                        </div>
                      )}
                      {payment.paymentGateway && (
                        <div className="dp-summary-row">
                          <span className="dp-summary-label">Payment gateway</span>
                          <span className="dp-summary-value">{payment.paymentGateway.toUpperCase()}</span>
                        </div>
                      )}
                      {payment.transactionId && (
                        <div className="dp-summary-row">
                          <span className="dp-summary-label">Transaction ID</span>
                          <span className="dp-summary-value">{payment.transactionId}</span>
                        </div>
                      )}
                      {payment.paymentConfirmedAt && (
                        <div className="dp-summary-row">
                          <span className="dp-summary-label">Confirmed at</span>
                          <span className="dp-summary-value">{new Date(payment.paymentConfirmedAt).toLocaleString('en-GB')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2 mt-4">
                  <Button variant="primary" onClick={() => navigate('/my-donations')}>
                    My donations
                  </Button>
                  <Button variant="outline-secondary" onClick={() => navigate('/')}>
                    Back to home
                  </Button>
                  {status === 'Pending' && pollCount < 30 && (
                    <span className="ms-2 text-muted small align-self-center">
                      Checking... ({pollCount}/30)
                    </span>
                  )}
                </div>

                {status === 'Pending' && pollCount >= 30 && (
                  <Alert variant="warning" className="dp-alert mt-3">
                    We are still waiting for confirmation from the payment gateway. If you have
                    already paid successfully on VNPay, please wait a few minutes or contact
                    support with the transaction ID.
                  </Alert>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default PaymentResultPage;