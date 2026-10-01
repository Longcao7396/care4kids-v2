import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Collapse, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { causesService } from '../services';
import './CausesPage.css';

/**
 * CausesPage
 *
 * Renders the 2-level cause taxonomy from the backend:
 *   - Top-level causes (e.g. "Giáo dục cho trẻ em")
 *     - Sub-causes (e.g. "Mua sách vở, đồng phục, dụng cụ học tập")
 *
 * Sub-causes are revealed via Bootstrap Collapse so users can either donate
 * to the whole category (top-level) or pick a specific sub-item that maps
 * to one of the items in the Care4Kids brief.
 */
const CausesPage = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({}); // causeId -> bool

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    try {
      // The tree endpoint returns an array of nodes where each node IS
      // the parent cause itself with an embedded `subCauses` array.
      // Older backends wrapped the parent in `{ parent, subCauses }`.
      // Normalise both shapes so the renderer doesn't blow up.
      const response = await causesService.getTree(true);
      let nodes = Array.isArray(response) ? response : (response?.items || []);

      const normalised = nodes
        .map((node) => {
          if (!node) return null;
          // Unwrap legacy `{ parent, subCauses }` envelope.
          const parent = node.parent && node.parent.causeId != null
            ? node.parent
            : node.causeId != null
              ? node
              : null;
          if (!parent) return null;
          const subs = Array.isArray(node.subCauses)
            ? node.subCauses.filter((s) => s && typeof s === 'object' && s.causeId != null)
            : [];
          return { parent, subCauses: subs };
        })
        .filter((n) => n !== null);

      if (!normalised.length) {
        // Backwards compatibility: older backends may only expose /api/causes
        const flat = await causesService.getAll(true);
        const list = Array.isArray(flat) ? flat : (flat?.items || []);
        const safeList = list.filter((c) => c && typeof c === 'object' && c.causeId != null);
        const parents = safeList.filter((c) => !c.parentCauseId);
        const subs = safeList.filter((c) => c.parentCauseId);
        parents.forEach((p) => {
          normalised.push({
            parent: p,
            subCauses: subs.filter((s) => s.parentCauseId === p.causeId),
          });
        });
      }

      setTree(normalised);
      // Expand all parents by default so the user immediately sees the brief
      const initial = {};
      normalised.forEach((node) => {
        if (node.subCauses?.length) initial[node.parent.causeId] = true;
      });
      setExpanded(initial);
    } catch (error) {
      console.error('Error loading causes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount || 0);

  return (
    <div className="causes-page">
      <section className="page-header">
        <Container>
          <h1 className="page-title">Our Causes</h1>
          <p className="page-subtitle">
            Support child welfare causes that make a real difference.
            Pick a top-level category or a specific sub-item below.
          </p>
        </Container>
      </section>

      <Container className="py-5">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : tree.length > 0 ? (
          <Row className="g-4">
            {tree.map(({ parent, subCauses = [] }) => (
              <Col key={parent.causeId} md={6} lg={6} xl={4}>
                <Card className="h-100 cause-card">
                  <div className="cause-image">
                    <img
                      src={parent.imageUrl || '/images/placeholder-cause.jpg'}
                      alt={parent.causeName}
                      style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                    />
                    <div className="cause-icon-overlay">
                      <i className={`bi bi-${parent.icon || 'heart'}`}></i>
                    </div>
                  </div>
                  <Card.Body className="d-flex flex-column">
                    <Card.Title>{parent.causeName}</Card.Title>
                    <Card.Text className="text-muted">
                      {parent.description}
                    </Card.Text>

                    {parent.targetAmount > 0 && (
                      <div className="mt-3">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="fw-bold text-accent">
                            {formatCurrency(parent.raisedAmount)}
                          </span>
                          <span className="text-muted">
                            Goal: {formatCurrency(parent.targetAmount)}
                          </span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div
                            className="progress-bar"
                            style={{
                              width: `${Math.min(parent.percentageReached || 0, 100)}%`
                            }}
                          ></div>
                        </div>
                        <small className="text-muted">
                          {Math.round(parent.percentageReached || 0)}% Funded
                        </small>
                      </div>
                    )}

                    {subCauses.length > 0 && (
                      <div className="sub-cause-block mt-3">
                        <Button
                          variant="link"
                          className="sub-cause-toggle p-0 text-decoration-none"
                          onClick={() => toggle(parent.causeId)}
                          aria-expanded={!!expanded[parent.causeId]}
                          aria-controls={`subs-${parent.causeId}`}
                        >
                          <i
                            className={`bi ${
                              expanded[parent.causeId] ? 'bi-chevron-down' : 'bi-chevron-right'
                            } me-2`}
                          ></i>
                          {subCauses.length} specific sub-causes
                        </Button>
                        <Collapse in={!!expanded[parent.causeId]}>
                          <ul
                            id={`subs-${parent.causeId}`}
                            className="list-unstyled sub-cause-list mt-2"
                          >
                            {subCauses.map((sub) => (
                              <li key={sub.causeId} className="sub-cause-item">
                                <Link
                                  to="/donate"
                                  state={{ causeId: sub.causeId }}
                                  className="sub-cause-link"
                                >
                                  <i className="bi bi-dot"></i>
                                  {sub.causeName}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </Collapse>
                      </div>
                    )}

                    <Button
                      as={Link}
                      to="/donate"
                      state={{ causeId: parent.causeId }}
                      variant="primary"
                      className="w-100 mt-auto pt-3"
                    >
                      <i className="bi bi-heart-fill me-2"></i>
                      Donate to this Cause
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="empty-state text-center py-5">
            <i className="bi bi-heart" style={{ fontSize: '3rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No causes found</h5>
            <p className="text-muted">
              There are currently no causes available. Please check back soon.
            </p>
          </div>
        )}
      </Container>
    </div>
  );
};

export default CausesPage;
