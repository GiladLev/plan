// Page manifest: id -> path (locale-relative). Directory ids are the category ids on the live site.
const DIR = {
  'dir-1-venues': '1-%D7%9E%D7%AA%D7%97%D7%9D-%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D',
  'dir-2-dresses': '2-%D7%A9%D7%9E%D7%9C%D7%95%D7%AA-%D7%9B%D7%9C%D7%94-%D7%95%D7%A2%D7%A8%D7%91',
  'dir-5-makeup-hair': '5-%D7%90%D7%99%D7%A4%D7%95%D7%A8-%D7%95%D7%A2%D7%99%D7%A6%D7%95%D7%91-%D7%A9%D7%99%D7%A2%D7%A8',
  'dir-6-design': '6-%D7%A2%D7%99%D7%A6%D7%95%D7%91',
  'dir-8-catering': '8-%D7%A7%D7%99%D7%99%D7%98%D7%A8%D7%99%D7%A0%D7%92',
  'dir-9-photo': '9-%D7%A6%D7%99%D7%9C%D7%95%D7%9D',
  'dir-10-magnets': '10-%D7%A6%D7%99%D7%9C%D7%95%D7%9D-%D7%9E%D7%92%D7%A0%D7%98%D7%99%D7%9D',
  'dir-11-music': '11-%D7%9E%D7%95%D7%96%D7%99%D7%A7%D7%94',
  'dir-18-attractions': '18-%D7%90%D7%98%D7%A8%D7%A7%D7%A6%D7%99%D7%95%D7%AA',
  'dir-19-transport': '19-%D7%94%D7%A1%D7%A2%D7%95%D7%AA-%D7%9C%D7%90%D7%95%D7%A8%D7%97%D7%99%D7%9D',
  'dir-23-invitations': '23-%D7%94%D7%96%D7%9E%D7%A0%D7%95%D7%AA-%D7%95%D7%9E%D7%99%D7%AA%D7%95%D7%92-%D7%9C%D7%90%D7%99%D7%A8%D7%95%D7%A2',
  'dir-25-bar': '25-%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99-%D7%91%D7%A8',
  'dir-32-jewelry': '32-%D7%AA%D7%9B%D7%A9%D7%99%D7%98%D7%99%D7%9D-%D7%95%D7%90%D7%A7%D7%A1%D7%A1%D7%95%D7%A8%D7%99%D7%96',
  'dir-37-production': '37-%D7%94%D7%A4%D7%A7%D7%AA-%D7%90%D7%99%D7%A8%D7%95%D7%A2',
};
export const PAGES = {
  'home': '',
  'client-sign-in': '/client/sign_in',
  'corp-sign-in': '/corp/sign_in',
  'about': '/front/about',
  'accessibility': '/front/accessibility_statement',
  'contact': '/front/contact',
  'jobs': '/front/jobs',
  'client-credit-gifts': '/front/client/credit_gifts',
  'client-digital-invitation': '/front/client/digital_invitation',
  'client-guest-list': '/front/client/guest_list',
  'client-help': '/front/client/help',
  'client-minisite': '/front/client/minisite',
  'client-notify': '/front/client/notify',
  'client-reception': '/front/client/reception',
  'client-rsvp': '/front/client/rsvp',
  'client-sketches': '/front/client/sketches',
  'client-tasks': '/front/client/tasks',
  'client-testimonials': '/front/client/testimonials',
  'vendor-home': '/front/vendor/home',
  'vendor-marketing': '/front/vendor/marketing',
  'not-found': '/this-page-does-not-exist',
  ...Object.fromEntries(Object.entries(DIR).map(([k, v]) => [k, '/directory/search/categories/' + v])),
};
export const VIEWPORTS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
export const UA_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
export const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
export const ORIGIN = 'https://iplan.co.il';
