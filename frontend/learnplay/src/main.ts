import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { environment } from './environments/environment';

if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize({
    clientId: environment.googleClientId,
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
