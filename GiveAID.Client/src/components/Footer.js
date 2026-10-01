import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="c4k-footer">
      <div className="c4k-footer-main">
        <Container>
          <Row className="c4k-footer-grid">
            {/* Col 1: Brand + Mission + Social */}
            <Col lg={4} md={6} className="c4k-footer-col">
              <Link to="/" className="c4k-footer-brand">
                <img 
                  src="/images/branding/Care4Kids_logo_clean.svg" 
                  alt="Care4Kids" 
                  className="c4k-footer-brand-logo"
                />
              </Link>
              <p className="c4k-footer-mission">
                We provide vulnerable children with food, education, healthcare and safe homes — building a future where every child can thrive.
              </p>
              <div className="c4k-footer-social">
                <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="c4k-social-link" aria-label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="c4k-social-link" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" className="c4k-social-link" aria-label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                </a>
                <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" className="c4k-social-link" aria-label="YouTube">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"/></svg>
                </a>
              </div>
            </Col>

            {/* Col 2: About */}
            <Col lg={2} md={6} className="c4k-footer-col">
              <h4 className="c4k-footer-heading">About</h4>
              <ul className="c4k-footer-links">
                <li><Link to="/about">Our Story</Link></li>
                <li><Link to="/about/team">Our Team</Link></li>
                <li><Link to="/about/achievements">Achievements</Link></li>
                <li><Link to="/about/supporters">Supporters</Link></li>
                <li><Link to="/about/partners">Partners</Link></li>
                <li><Link to="/careers">Careers</Link></li>
              </ul>
            </Col>

            {/* Col 3: Get Involved */}
            <Col lg={3} md={6} className="c4k-footer-col">
              <h4 className="c4k-footer-heading">Get Involved</h4>
              <ul className="c4k-footer-links">
                <li><Link to="/donate">Donate</Link></li>
                <li><Link to="/campaigns">Volunteer</Link></li>
                <li><Link to="/about/partners">Partner With Us</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/raise-query">Raise a Query</Link></li>
              </ul>
            </Col>

            {/* Col 4: Resources + Legal */}
            <Col lg={3} md={6} className="c4k-footer-col">
              <h4 className="c4k-footer-heading">Resources</h4>
              <ul className="c4k-footer-links">
                <li><Link to="/gallery">Gallery</Link></li>
                <li><Link to="/help-centre">Help Centre</Link></li>
                <li><Link to="/programmes">Programmes</Link></li>
              </ul>

              <h4 className="c4k-footer-heading c4k-footer-heading-legal">Legal</h4>
              <ul className="c4k-footer-links">
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
              </ul>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Bottom bar */}
      <div className="c4k-footer-bottom">
        <Container>
          <div className="c4k-footer-bottom-inner">
            <p className="c4k-footer-copy">
              &copy; {currentYear} Care4Kids. A registered charity. All rights reserved.
            </p>
            <p className="c4k-footer-tagline">
              Every child deserves food, education, healthcare and love.
            </p>
          </div>
        </Container>
      </div>
    </footer>
  );
};

export default Footer;
