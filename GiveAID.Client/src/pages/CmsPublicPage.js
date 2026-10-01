import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { cmsService } from '../services';
import { sanitizeHtml } from '../utils/safeHtml';
import '../styles/AboutPages.css';

/**
 * Generic public page that renders the content of a CMS page identified by
 * PageKey. Used by /privacy and /terms so the public site has a single
 * canonical source of truth for these documents — the CMS.
 *
 * If the corresponding CMS row is missing or inactive, the component shows
 * a clearly labelled "not yet published" state. It does NOT invent legal
 * content as a fallback.
 */
function CmsPublicPage({ pageKey, fallbackTitle, notPublishedMessage }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Single-page lookup uses /cms/pages/{key}, which is anonymous-safe
      // and only returns active pages for public consumers (Phase 4 contract).
      const res = await cmsService.getByKey(pageKey);
      const data = res?.data ?? res ?? null;
      setPage(data && data.isActive !== false ? data : null);
    } catch (err) {
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [pageKey]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="about-subpage">
        <Container className="page-header">
          <div className="text-center py-5">
            <Spinner animation="border" role="status" aria-hidden="true" />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="about-subpage">
      <header className="page-header">
        <Container>
          <p className="eyebrow">Legal</p>
          <h1>{page?.pageTitle || fallbackTitle}</h1>
        </Container>
      </header>

      <section className="container-c4k py-5">
        {page?.content ? (
          <article
            className="card card-body cms-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
          />
        ) : (
          <Alert variant="info">
            <Alert.Heading>Document not yet published</Alert.Heading>
            <p className="mb-2">{notPublishedMessage}</p>
            <p className="mb-0">
              If you have an urgent question, please <Link to="/contact">contact us</Link>.
            </p>
          </Alert>
        )}
      </section>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <CmsPublicPage
      pageKey="privacy_policy"
      fallbackTitle="Privacy Policy"
      notPublishedMessage="Our Privacy Policy has not been published yet. Please check back later."
    />
  );
}

export function TermsOfServicePage() {
  return (
    <CmsPublicPage
      pageKey="terms_of_service"
      fallbackTitle="Terms of Service"
      notPublishedMessage="Our Terms of Service have not been published yet. Please check back later."
    />
  );
}

export default CmsPublicPage;
