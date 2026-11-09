import { HttpInterceptorFn } from '@angular/common/http';

const SKIP_CREDENTIALS_HOSTS = ['api.cloudinary.com', 'res.cloudinary.com', 'us.i.posthog.com'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip for local assets or explicit skip header
  if (req.url.includes('/assets/') || req.headers.has('X-Skip-Interceptor')) {
    return next(req);
  }

  // Skip withCredentials for known external APIs to avoid CORS issues
  if (SKIP_CREDENTIALS_HOSTS.some((host) => req.url.includes(host))) {
    return next(req);
  }

  // All backend requests get withCredentials for cookie-based auth
  return next(req.clone({ withCredentials: true }));
};
