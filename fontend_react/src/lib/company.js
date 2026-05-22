export const COMPANY_EMAIL = 'communication@tisbroker.com'
export const COMPANY_LINKEDIN_URL = 'https://www.linkedin.com/company/tis-vietnam-insurance-broker'
export const COMPANY_ZALO_URL = 'https://zalo.me/tisbrokervn'

export const COMPANY_CONTACT_CHANNELS = [
  {
    key: 'email',
    label: 'Email',
    href: `mailto:${COMPANY_EMAIL}`,
    icon: 'fas fa-envelope',
    className: 'footer-social-email',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    href: COMPANY_LINKEDIN_URL,
    icon: 'fab fa-linkedin-in',
    className: 'footer-social-linkedin',
  },
  {
    key: 'zalo',
    label: 'Zalo',
    href: COMPANY_ZALO_URL,
    icon: 'fas fa-comment-dots',
    className: 'footer-social-chat',
  },
]
