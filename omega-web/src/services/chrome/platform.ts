const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';

/** True when running on Firefox (including forks). */
export const isFirefox = ua.includes('firefox');
