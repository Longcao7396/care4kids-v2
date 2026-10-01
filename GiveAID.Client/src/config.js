// API Base URL Configuration — v2.0
// Backend runs on port 5231 (Kestrel with --urls http://localhost:5231)
// Override via environment variable REACT_APP_API_URL or REACT_APP_API_URL_BACKUP

const BACKEND_PRIMARY = process.env.REACT_APP_API_URL || 'http://localhost:5231/api/v1';
const BACKEND_FALLBACK = process.env.REACT_APP_API_URL_BACKUP || 'http://localhost:5000/api/v1';

export const API_BASE_URL = BACKEND_PRIMARY;

export const BACKEND_CANDIDATES = [BACKEND_PRIMARY, BACKEND_FALLBACK];

export { BACKEND_PRIMARY, BACKEND_FALLBACK };

// API Endpoints — v2.0 (all reference API_BASE_URL for flexibility)
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    ME: `${API_BASE_URL}/auth/me`,
  },

  // Causes
  CAUSES: {
    LIST: `${API_BASE_URL}/causes`,
    TREE: `${API_BASE_URL}/causes/tree`,
    DETAIL: (id) => `${API_BASE_URL}/causes/${id}`,
    CREATE: `${API_BASE_URL}/causes`,
    UPDATE: (id) => `${API_BASE_URL}/causes/${id}`,
    DELETE: (id) => `${API_BASE_URL}/causes/${id}`,
    STATS: `${API_BASE_URL}/causes/stats`,
  },

  // Donations
  DONATIONS: {
    LIST: `${API_BASE_URL}/donations`,
    DETAIL: (id) => `${API_BASE_URL}/donations/${id}`,
    CREATE: `${API_BASE_URL}/donations`,
    STATS: `${API_BASE_URL}/donations/stats`,
  },

  // Campaigns
  CAMPAIGNS: {
    LIST: `${API_BASE_URL}/campaigns`,
    DETAIL: (id) => `${API_BASE_URL}/campaigns/${id}`,
    CREATE: `${API_BASE_URL}/campaigns`,
    UPDATE: (id) => `${API_BASE_URL}/campaigns/${id}`,
    DELETE: (id) => `${API_BASE_URL}/campaigns/${id}`,
    FEATURED: `${API_BASE_URL}/campaigns/featured`,
    REGISTER: (id) => `${API_BASE_URL}/campaigns/${id}/register`,
    REGISTRATIONS: (id) => `${API_BASE_URL}/campaigns/${id}/registrations`,
    MY_REGISTRATIONS: `${API_BASE_URL}/campaigns/my-registrations`,
  },

  // Team
  TEAM: {
    LIST: `${API_BASE_URL}/team`,
    DETAIL: (id) => `${API_BASE_URL}/team/${id}`,
    CREATE: `${API_BASE_URL}/team`,
    UPDATE: (id) => `${API_BASE_URL}/team/${id}`,
    DELETE: (id) => `${API_BASE_URL}/team/${id}`,
  },

  // Achievements
  ACHIEVEMENTS: {
    LIST: `${API_BASE_URL}/achievements`,
    STATS: `${API_BASE_URL}/achievements/stats`,
    DETAIL: (id) => `${API_BASE_URL}/achievements/${id}`,
    CREATE: `${API_BASE_URL}/achievements`,
    UPDATE: (id) => `${API_BASE_URL}/achievements/${id}`,
    DELETE: (id) => `${API_BASE_URL}/achievements/${id}`,
  },

  // Careers
  CAREERS: {
    LIST: `${API_BASE_URL}/careers`,
    DETAIL: (id) => `${API_BASE_URL}/careers/${id}`,
    APPLY: (id) => `${API_BASE_URL}/careers/${id}/apply`,
    APPLICATIONS: (id) => `${API_BASE_URL}/careers/${id}/applications`,
    CREATE: `${API_BASE_URL}/careers`,
    UPDATE: (id) => `${API_BASE_URL}/careers/${id}`,
    DELETE: (id) => `${API_BASE_URL}/careers/${id}`,
  },

  // Supporters
  SUPPORTERS: {
    LIST: `${API_BASE_URL}/supporters`,
    STATS: `${API_BASE_URL}/supporters/stats`,
    DETAIL: (id) => `${API_BASE_URL}/supporters/${id}`,
    CREATE: `${API_BASE_URL}/supporters`,
    UPDATE: (id) => `${API_BASE_URL}/supporters/${id}`,
    DELETE: (id) => `${API_BASE_URL}/supporters/${id}`,
  },

  // CMS
  CMS: {
    PAGES: `${API_BASE_URL}/cms/pages`,
    PAGE_BY_KEY: (key) => `${API_BASE_URL}/cms/pages/${key}`,
    UPDATE_PAGE: (id) => `${API_BASE_URL}/cms/pages/${id}`,
  },

  // FAQs
  FAQS: {
    LIST: `${API_BASE_URL}/faqs`,
    CATEGORIES: `${API_BASE_URL}/faqs/categories`,
    DETAIL: (id) => `${API_BASE_URL}/faqs/${id}`,
    CREATE: `${API_BASE_URL}/faqs`,
    UPDATE: (id) => `${API_BASE_URL}/faqs/${id}`,
    DELETE: (id) => `${API_BASE_URL}/faqs/${id}`,
  },

  // Contacts
  CONTACTS: {
    SUBMIT: `${API_BASE_URL}/contacts`,
    LIST: `${API_BASE_URL}/contacts`,
    DETAIL: (id) => `${API_BASE_URL}/contacts/${id}`,
    REPLY: (id) => `${API_BASE_URL}/contacts/${id}/reply`,
    READ: (id) => `${API_BASE_URL}/contacts/${id}/read`,
    DELETE: (id) => `${API_BASE_URL}/contacts/${id}`,
    STATS: `${API_BASE_URL}/contacts/stats`,
  },

  // Invitations
  INVITATIONS: {
    SEND: `${API_BASE_URL}/invitations`,
    MINE: `${API_BASE_URL}/invitations/mine`,
    LIST: `${API_BASE_URL}/invitations`,
    STATS: `${API_BASE_URL}/invitations/stats`,
    CANCEL: (id) => `${API_BASE_URL}/invitations/${id}/cancel`,
    ACCEPT: (token) => `${API_BASE_URL}/invitations/accept/${token}`,
  },

  // Conversations
  CONVERSATIONS: {
    CREATE: `${API_BASE_URL}/conversations`,
    MINE: `${API_BASE_URL}/conversations/mine`,
    LIST: `${API_BASE_URL}/conversations`,
    STATS: `${API_BASE_URL}/conversations/stats`,
    DETAIL: (id) => `${API_BASE_URL}/conversations/${id}`,
    MESSAGES: (id) => `${API_BASE_URL}/conversations/${id}/messages`,
    CLOSE: (id) => `${API_BASE_URL}/conversations/${id}/close`,
    ASSIGN: (id) => `${API_BASE_URL}/conversations/${id}/assign`,
  },

  // Gallery
  GALLERY: {
    LIST: `${API_BASE_URL}/gallery`,
    CATEGORIES: `${API_BASE_URL}/gallery/categories`,
    PROGRAMMES: `${API_BASE_URL}/gallery/programmes`,
    DETAIL: (id) => `${API_BASE_URL}/gallery/${id}`,
    CREATE: `${API_BASE_URL}/gallery`,
    UPDATE: (id) => `${API_BASE_URL}/gallery/${id}`,
    DELETE: (id) => `${API_BASE_URL}/gallery/${id}`,
    // Multipart upload endpoints (Cloudinary via server)
    UPLOAD: `${API_BASE_URL}/gallery/upload`,
    UPLOAD_UPDATE: (id) => `${API_BASE_URL}/gallery/${id}/upload`,
  },

  // Campaign Reports
  CAMPAIGN_REPORTS: {
    LIST: `${API_BASE_URL}/campaign-reports`,
    BY_CAMPAIGN: (id) => `${API_BASE_URL}/campaign-reports/campaign/${id}`,
    DETAIL: (id) => `${API_BASE_URL}/campaign-reports/${id}`,
    STATS: `${API_BASE_URL}/campaign-reports/stats`,
    CREATE: `${API_BASE_URL}/campaign-reports`,
    UPDATE: (id) => `${API_BASE_URL}/campaign-reports/${id}`,
    DELETE: (id) => `${API_BASE_URL}/campaign-reports/${id}`,
  },

  // Email Logs (admin)
  EMAILS: {
    LIST: `${API_BASE_URL}/admin/emails`,
    STATS: `${API_BASE_URL}/admin/emails/stats`,
    RETRY_ALL: `${API_BASE_URL}/admin/emails/retry-all`,
    RESEND: (id) => `${API_BASE_URL}/admin/emails/${id}/resend`,
  },

  // Statistics
  STATISTICS: {
    DASHBOARD: `${API_BASE_URL}/statistics/dashboard`,
    CAMPAIGNS_PERFORMANCE: `${API_BASE_URL}/statistics/campaigns/performance`,
    MONTHLY_DONATIONS: `${API_BASE_URL}/statistics/donations/monthly`,
    TOP_DONORS: `${API_BASE_URL}/statistics/top-donors`,
  },
};

// App Settings
export const APP_DESCRIPTION = "Children's Welfare & Donation Management System";

// Pagination
export const DEFAULT_PAGE_SIZE = 10;

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'giveaid_token',
  USER: 'giveaid_user',
};

// User Roles. The application has a single highest administrative role,
// "Admin". There is no SuperAdmin role.
export const USER_ROLES = {
  ADMIN: 'Admin',
  CONTENT_MANAGER: 'ContentManager',
  USER: 'User',
};

// Payment Methods
export const PAYMENT_METHODS = {
  CREDIT_CARD: 'CreditCard',
  DEBIT_CARD: 'DebitCard',
  NET_BANKING: 'NetBanking',
};

// NOTE: Cause codes are now driven by the backend `causes` table (single
// source of truth). The Causes API is the authoritative source; the admin
// UI should never hard-code a Care4Kids Cause whitelist.
