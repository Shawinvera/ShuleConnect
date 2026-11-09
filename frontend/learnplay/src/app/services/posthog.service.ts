import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import posthog from 'posthog-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PosthogService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private initialized = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initPostHog();
    }
  }

  private initPostHog(): void {
    this.ngZone.runOutsideAngular(() => {
      posthog.init(environment.posthogKey, {
        api_host: environment.posthogHost,
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false, // Disable automatic click tracking to avoid "user clicked div"
        debug: false,
      });
      this.initialized = true;
    });
  }

  get posthog(): typeof posthog {
    if (isPlatformBrowser(this.platformId) && this.initialized) {
      return posthog;
    }
    // Return a no-op proxy for SSR safety
    return new Proxy({} as typeof posthog, {
      get: () => () => undefined,
    });
  }
}
