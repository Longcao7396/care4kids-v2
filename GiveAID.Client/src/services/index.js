import api from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config';

// =====================================================
// AUTH SERVICE
// =====================================================
export const authService = {
  register: async (userData) => {
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response;
  },
  login: async (credentials) => {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    if (response && response.token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      const { token, ...user } = response;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    return response;
  },
  logout: async () => {
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },
  getCurrentUser: async () => {
    const response = await api.get(API_ENDPOINTS.AUTH.ME);
    return response;
  },
  isAuthenticated: () => !!localStorage.getItem(STORAGE_KEYS.TOKEN),
  getStoredUser: () => {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  },
};

// =====================================================
// CAUSES SERVICE
// =====================================================
export const causesService = {
  getAll: async (activeOnly = true, params = {}) => {
    return await api.get(API_ENDPOINTS.CAUSES.LIST, {
      params: { activeOnly, ...params }
    });
  },
  getTree: async (activeOnly = true) => {
    return await api.get(API_ENDPOINTS.CAUSES.TREE, {
      params: { activeOnly }
    });
  },
  getSubCauses: async (parentId, activeOnly = true) => {
    return await api.get(`/causes/${parentId}/sub-causes`, {
      params: { activeOnly }
    });
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.CAUSES.DETAIL(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.CAUSES.CREATE, data);
  },
  update: async (id, data) => {
    return await api.put(API_ENDPOINTS.CAUSES.UPDATE(id), data);
  },
  remove: async (id) => {
    return await api.delete(API_ENDPOINTS.CAUSES.DELETE(id));
  },
  getStats: async () => {
    return await api.get(API_ENDPOINTS.CAUSES.STATS);
  },
};

// =====================================================
// DONATIONS SERVICE
// =====================================================
export const donationsService = {
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.DONATIONS.LIST, { params });
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.DONATIONS.DETAIL(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.DONATIONS.CREATE, data);
  },
  getStats: async () => {
    return await api.get(API_ENDPOINTS.DONATIONS.STATS);
  },
};

// =====================================================
// PROGRAMMES / CAMPAIGNS SERVICE
// =====================================================
// Programmes were merged into Campaigns in the backend.
// All campaign-level reads (including the registration endpoints that
// used to live under /api/programmes) now go through campaignsService.
// programmesService is kept as a thin alias for backward compatibility
// with any code that hasn't been migrated yet.
export const campaignsService = {
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.CAMPAIGNS.LIST, { params });
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.CAMPAIGNS.DETAIL(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.CAMPAIGNS.CREATE, data);
  },
  update: async (id, data) => {
    return await api.put(API_ENDPOINTS.CAMPAIGNS.UPDATE(id), data);
  },
  remove: async (id) => {
    const response = await api.delete(API_ENDPOINTS.CAMPAIGNS.DELETE(id));
    return response;
  },
  getFeatured: async (count = 3) => {
    return await api.get(API_ENDPOINTS.CAMPAIGNS.FEATURED, { params: { count } });
  },
  // Unified registration endpoint (replaces /api/programmes/{id}/register)
  register: async (id, data) => {
    return await api.post(API_ENDPOINTS.CAMPAIGNS.REGISTER(id), data);
  },
  getRegistrations: async (id) => {
    return await api.get(API_ENDPOINTS.CAMPAIGNS.REGISTRATIONS(id));
  },
  getMyRegistrations: async () => {
    return await api.get(API_ENDPOINTS.CAMPAIGNS.MY_REGISTRATIONS);
  },
};

// Thin alias — Programmes were merged into Campaigns. We default the
// `eventsOnly=true` filter so callers still get the same UX (events only).
export const programmesService = {
  getAll: async (params = {}) => {
    const merged = { eventsOnly: true, ...params };
    return await api.get(API_ENDPOINTS.CAMPAIGNS.LIST, { params: merged });
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.CAMPAIGNS.DETAIL(id));
  },
  register: async (id, data) => {
    return await api.post(API_ENDPOINTS.CAMPAIGNS.REGISTER(id), data);
  },
  getMyRegistrations: async () => {
    return await api.get(API_ENDPOINTS.CAMPAIGNS.MY_REGISTRATIONS);
  },
};

// =====================================================
// ABOUT US MODULE SERVICES
// =====================================================

export const teamService = {
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.TEAM.LIST, { params });
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.TEAM.DETAIL(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.TEAM.CREATE, data);
  },
  update: async (id, data) => {
    return await api.put(API_ENDPOINTS.TEAM.UPDATE(id), data);
  },
  remove: async (id) => {
    return await api.delete(API_ENDPOINTS.TEAM.DELETE(id));
  },
};

export const achievementsService = {
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.ACHIEVEMENTS.LIST, { params });
  },
  getStats: async () => {
    return await api.get(API_ENDPOINTS.ACHIEVEMENTS.STATS);
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.ACHIEVEMENTS.DETAIL(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.ACHIEVEMENTS.CREATE, data);
  },
  update: async (id, data) => {
    return await api.put(API_ENDPOINTS.ACHIEVEMENTS.UPDATE(id), data);
  },
  remove: async (id) => {
    return await api.delete(API_ENDPOINTS.ACHIEVEMENTS.DELETE(id));
  },
};

export const careersService = {
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.CAREERS.LIST, { params });
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.CAREERS.DETAIL(id));
  },
  apply: async (id, data) => {
    return await api.post(API_ENDPOINTS.CAREERS.APPLY(id), data);
  },
  getApplications: async (id) => {
    return await api.get(API_ENDPOINTS.CAREERS.APPLICATIONS(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.CAREERS.CREATE, data);
  },
  update: async (id, data) => {
    return await api.put(API_ENDPOINTS.CAREERS.UPDATE(id), data);
  },
  remove: async (id) => {
    return await api.delete(API_ENDPOINTS.CAREERS.DELETE(id));
  },
};

export const supportersService = {
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.SUPPORTERS.LIST, { params });
  },
  getStats: async () => {
    return await api.get(API_ENDPOINTS.SUPPORTERS.STATS);
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.SUPPORTERS.DETAIL(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.SUPPORTERS.CREATE, data);
  },
  update: async (id, data) => {
    return await api.put(API_ENDPOINTS.SUPPORTERS.UPDATE(id), data);
  },
  remove: async (id) => {
    return await api.delete(API_ENDPOINTS.SUPPORTERS.DELETE(id));
  },
};

export const cmsService = {
  getPages: async (keys) => {
    const params = keys ? { keys: Array.isArray(keys) ? keys.join(',') : keys } : {};
    return await api.get(API_ENDPOINTS.CMS.PAGES, { params });
  },
  getByKey: async (key) => {
    return await api.get(API_ENDPOINTS.CMS.PAGE_BY_KEY(key));
  },
  updatePage: async (id, data) => {
    return await api.put(API_ENDPOINTS.CMS.UPDATE_PAGE(id), data);
  },
};

// =====================================================
// HELP CENTRE + CONTACT SERVICES
// =====================================================

export const faqService = {
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.FAQS.LIST, { params });
  },
  getCategories: async () => {
    return await api.get(API_ENDPOINTS.FAQS.CATEGORIES);
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.FAQS.DETAIL(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.FAQS.CREATE, data);
  },
  update: async (id, data) => {
    return await api.put(API_ENDPOINTS.FAQS.UPDATE(id), data);
  },
  remove: async (id) => {
    return await api.delete(API_ENDPOINTS.FAQS.DELETE(id));
  },
};

export const contactService = {
  submit: async (data) => {
    return await api.post(API_ENDPOINTS.CONTACTS.SUBMIT, data);
  },
  // Admin-only
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.CONTACTS.LIST, { params });
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.CONTACTS.DETAIL(id));
  },
  reply: async (id, data) => {
    return await api.put(API_ENDPOINTS.CONTACTS.REPLY(id), data);
  },
  toggleRead: async (id) => {
    return await api.put(API_ENDPOINTS.CONTACTS.READ(id));
  },
  remove: async (id) => {
    return await api.delete(API_ENDPOINTS.CONTACTS.DELETE(id));
  },
  getStats: async () => {
    return await api.get(API_ENDPOINTS.CONTACTS.STATS);
  },
};

export const galleryService = {
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.GALLERY.LIST, { params });
  },
  getCategories: async () => {
    return await api.get(API_ENDPOINTS.GALLERY.CATEGORIES);
  },
  getProgrammes: async () => {
    return await api.get(API_ENDPOINTS.GALLERY.PROGRAMMES);
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.GALLERY.DETAIL(id));
  },
  create: async (data) => {
    return await api.post(API_ENDPOINTS.GALLERY.CREATE, data);
  },
  update: async (id, data) => {
    return await api.put(API_ENDPOINTS.GALLERY.UPDATE(id), data);
  },
  remove: async (id) => {
    return await api.delete(API_ENDPOINTS.GALLERY.DELETE(id));
  },

  // ── Multipart upload (Cloudinary via server) ────────────────────────
  // IMPORTANT: We pass FormData as the body. axios will see FormData and:
  //   1) automatically set the Content-Type to multipart/form-data with a
  //      generated boundary
  //   2) need the default JSON Content-Type header DELETED first.
  //
  // If you set Content-Type manually (e.g. 'multipart/form-data' without the
  // boundary), the server will fail to parse the multipart body. Always let
  // the runtime derive it.
  //
  // The formData blob is built by the caller (typically ImageUpload.js
  // -> AdminGalleryPage.js passes {imageFile, ...otherFields}).
  uploadFile: async (formData) => {
    return await api.post(API_ENDPOINTS.GALLERY.UPLOAD, formData, {
      headers: { 'Content-Type': undefined }, // axios auto-sets multipart with boundary
      // Long-ish timeout — admin uploads from slow connections need more time
      // than the default 30s. Server request size limit is 5 MB.
      timeout: 60000,
    });
  },

  // Used when REPLACING an existing gallery image. Marks the file replacement
  // on the server so the old Cloudinary file is deleted.
  uploadFileReplace: async (id, formData) => {
    return await api.put(API_ENDPOINTS.GALLERY.UPLOAD_UPDATE(id), formData, {
      headers: { 'Content-Type': undefined },
      timeout: 60000,
    });
  },
};

// =====================================================
// INVITATIONS SERVICE  (Invite Friends)
// =====================================================
export const invitationsService = {
  send: async (data) => {
    return await api.post(API_ENDPOINTS.INVITATIONS.SEND, data);
  },
  getMine: async () => {
    return await api.get(API_ENDPOINTS.INVITATIONS.MINE);
  },
  // Admin
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.INVITATIONS.LIST, { params });
  },
  getStats: async () => {
    return await api.get(API_ENDPOINTS.INVITATIONS.STATS);
  },
  cancel: async (id) => {
    return await api.post(API_ENDPOINTS.INVITATIONS.CANCEL(id));
  },
};

// =====================================================
// CONVERSATIONS SERVICE  (Raise Query / user-admin chat)
// =====================================================
export const conversationsService = {
  // User
  create: async (data) => {
    return await api.post(API_ENDPOINTS.CONVERSATIONS.CREATE, data);
  },
  getMine: async (params = {}) => {
    return await api.get(API_ENDPOINTS.CONVERSATIONS.MINE, { params });
  },
  addMessage: async (id, data) => {
    return await api.post(API_ENDPOINTS.CONVERSATIONS.MESSAGES(id), data);
  },
  close: async (id) => {
    return await api.post(API_ENDPOINTS.CONVERSATIONS.CLOSE(id));
  },
  // Admin
  getAll: async (params = {}) => {
    return await api.get(API_ENDPOINTS.CONVERSATIONS.LIST, { params });
  },
  getById: async (id) => {
    return await api.get(API_ENDPOINTS.CONVERSATIONS.DETAIL(id));
  },
  getStats: async () => {
    return await api.get(API_ENDPOINTS.CONVERSATIONS.STATS);
  },
  assign: async (id, data) => {
    return await api.post(API_ENDPOINTS.CONVERSATIONS.ASSIGN(id), data);
  },
};

// =====================================================
// DEFAULT EXPORT
// =====================================================
const services = {
  auth: authService,
  causes: causesService,
  donations: donationsService,
  campaigns: campaignsService,
  programmes: programmesService,
  team: teamService,
  achievements: achievementsService,
  careers: careersService,
  supporters: supportersService,
  cms: cmsService,
  faq: faqService,
  contact: contactService,
  gallery: galleryService,
  invitations: invitationsService,
  conversations: conversationsService,
};

export default services;
