# Google OAuth Setup Guide for Angular + Capacitor + Spring Boot

## Overview

This guide explains how to:

1. Configure Google OAuth credentials in Google Cloud Console
2. Understand Android keystores and SHA-1 fingerprints
3. Configure Angular web authentication
4. Configure Capacitor Android Google Sign-In
5. Configure Spring Boot OAuth callback URLs
6. Understand production considerations

---

# Architecture Overview

```text
Angular Web App  ---> Google OAuth
Capacitor Android ---> Google OAuth
                        ↓
                  Spring Boot Backend
                        ↓
                    Application JWT
```

Recommended authentication flow:

1. User signs in with Google
2. Google returns ID token
3. Frontend sends token to Spring Boot
4. Backend verifies token
5. Backend creates local JWT/session

---

# Step 1: Create a Google Cloud Project

## Open Google Cloud Console

[https://console.cloud.google.com/](https://console.cloud.google.com/)

---

## Create Project

1. Click the project dropdown at the top
2. Click:

```text
New Project
```

3. Enter project name
4. Click:

```text
Create
```

---

# Step 2: Configure OAuth Consent Screen

## Navigate To

```text
APIs & Services
→ OAuth consent screen
```

---

## Choose User Type

Usually:

```text
External
```

unless using Google Workspace internally.

---

## Fill Application Details

Example:

| Field              | Example                                           |
| ------------------ | ------------------------------------------------- |
| App name           | Wazi App                                          |
| User support email | [support@softkit.net](mailto:support@softkit.net) |
| Developer email    | [softkitke@gmail.com](mailto:softkitke@gmail.com) |

---

## Add Scopes

Typical scopes:

```text
email
profile
openid
```

---

## Add Test Users (Important During Development)

If the app is not published yet:

```text
OAuth consent screen
→ Test Users
```

Add your Gmail account.

Otherwise Google blocks login attempts.

---

# Step 3: Create Web OAuth Client

## Navigate To

```text
APIs & Services
→ Credentials
→ Create Credentials
→ OAuth Client ID
```

---

## Choose Application Type

```text
Web application
```

---

## Name

Example:

```text
Wazi Web Client
```

---

## Authorized JavaScript Origins

Add frontend URLs.

### Local Development

```text
http://localhost:4200
```

### Production

```text
https://wazi.softkit.net
```

---

## Authorized Redirect URIs

These are the URLs Google redirects to after authentication.

### Spring Boot OAuth Callback

```text
https://wazi.softkit.net/api/login/oauth2/code/google
```

### Local Development Example

```text
http://localhost:8080/login/oauth2/code/google
```

IMPORTANT:

* Redirect URIs must match EXACTLY
* `http` and `https` are different
* Trailing slashes matter

---

## Save Credentials

After saving, Google generates:

```text
Client ID
Client Secret
```

Example:

```text
123456.apps.googleusercontent.com
```

Store these securely.

---

# Step 4: Create Android OAuth Client

## Navigate To

```text
APIs & Services
→ Credentials
→ Create Credentials
→ OAuth Client ID
```

---

## Choose Application Type

```text
Android
```

---

## Required Information

You need:

1. Package name
2. SHA-1 certificate fingerprint

---

# Understanding Package Name

The package name uniquely identifies your Android app.

Example:

```text
net.softkit.wazi
```

---

## Where To Find Package Name

In Capacitor Android project:

```text
android/app/build.gradle
```

or:

```text
android/app/build.gradle.kts
```

Look for:

```gradle
applicationId "net.softkit.wazi"
```

---

# Understanding the Android Keystore

## What Is a Keystore?

A keystore is a secure file containing cryptographic keys used to sign Android applications.

Android apps must be digitally signed before:

* Installing on devices
* Publishing to Google Play Store
* Using Google APIs like OAuth

---

## Why Signing Matters

App signing proves:

1. The app came from the expected developer
2. The app has not been modified
3. Updates come from the same publisher

Google uses the app signature to trust your Android application.

---

# Types of Android Keystores

## 1. Debug Keystore

Automatically generated during development.

Usually located at:

### Windows

```text
C:\Users\<USERNAME>\.android\debug.keystore
```

### Linux/macOS

```text
~/.android/debug.keystore
```

---

## 2. Release Keystore

Used for production applications.

Created manually by the developer.

Used when:

* Publishing to Play Store
* Building signed APKs/AABs
* Production OAuth authentication

This keystore must be stored securely.

Losing it may prevent app updates.

---

# Understanding SHA-1 Fingerprints

## What Is SHA-1?

SHA-1 fingerprint is a cryptographic hash generated from your app signing certificate.

Example:

```text
AB:CD:EF:12:34:56:78:90
```

Google uses this fingerprint to verify:

```text
This Android app really belongs to this developer
```

---

# Why Google Requires SHA-1

Without SHA-1 verification:

* Another app could pretend to be yours
* OAuth tokens could be abused
* Native Google login would be insecure

The SHA-1 acts as application identity verification.

---

# Generating Debug SHA-1

## First Build Android Project

Inside Angular project:

```bash
npx cap add android
npx cap sync android
npx cap open android
```

Then build/run once in Android Studio.

This generates the debug keystore automatically.

---

## Retrieve SHA-1

### Windows CMD

```bash
keytool -list -v -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore
```

Password:

```text
android
```

---

## Linux/macOS

```bash
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore
```

Password:

```text
android
```

---

## Expected Output

```text
SHA1: 11:22:33:44:55:66
```

Copy this SHA1 into Google Cloud Console.

---

# Add Android OAuth Details

Inside Google Console Android OAuth Client:

## Package Name

Example:

```text
net.softkit.wazi
```

## SHA-1

Example:

```text
11:22:33:44:55:66
```

Save.

---

# Important OAuth Client Usage

## Web OAuth Client

Used by:

* Angular web app
* Spring Boot token verification
* Capacitor GoogleAuth.initialize()

---

## Android OAuth Client

Used by:

* Native Android Google authentication trust

Contains:

* Package name
* SHA-1

---

# Capacitor Google Authentication Setup

## Install Plugin

```bash
npm install @codetrix-studio/capacitor-google-auth
npx cap sync
```

---

## Configure Android strings.xml

File:

```text
android/app/src/main/res/values/strings.xml
```

Add:

```xml
<string name="server_client_id">
YOUR_WEB_CLIENT_ID
</string>
```

IMPORTANT:

Use the WEB CLIENT ID.

NOT the Android client ID.

---

## Initialize Plugin

```typescript
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

GoogleAuth.initialize({
  clientId: 'YOUR_WEB_CLIENT_ID',
  scopes: ['profile', 'email'],
  grantOfflineAccess: true,
});
```

---

# Spring Boot OAuth Configuration

## application.yml

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: YOUR_CLIENT_ID
            client-secret: YOUR_CLIENT_SECRET
```

---

# Reverse Proxy HTTPS Fix

When using Nginx with HTTPS:

```yaml
server:
  forward-headers-strategy: framework
```

This prevents OAuth redirect URI mismatch errors.

---

# Example Nginx Configuration

```nginx
location /api {

    proxy_pass http://localhost:8080;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-Port 443;
}
```

---

# Common OAuth Errors

## redirect_uri_mismatch

Cause:

* Redirect URI in app differs from Google Console

Example:

```text
http://example.com
```

vs

```text
https://example.com
```

---

## DEVELOPER_ERROR

Usually caused by:

* Wrong SHA-1
* Wrong package name
* Missing Android OAuth client
* Using Android client ID incorrectly

---

# Production Recommendations

## Create Separate Credentials

Recommended:

| Credential           | Purpose              |
| -------------------- | -------------------- |
| Web OAuth Client     | Web + backend        |
| Android OAuth Client | Android native login |
| iOS OAuth Client     | Future iOS support   |

---

# Security Best Practices

## Never Trust Frontend Tokens Directly

Always:

```text
Frontend Google Token
→ Backend Verification
→ Application JWT
```

---

## Use Your Own JWT

Advantages:

* Role-based access
* Session management
* Logout control
* Multi-provider support
* Refresh token management

---

## Protect Release Keystore

The release keystore is extremely important.

If compromised:

* Attackers may impersonate your app
* Malicious updates may appear legitimate

If lost:

* You may lose ability to publish updates

Recommended:

* Store encrypted backups
* Restrict access
* Use password managers/secrets vaults

---

# Final Recommended Architecture

```text
Angular Web
        ↓
Google Login
        ↓
Spring Boot Verification
        ↓
Application JWT

Capacitor Android
        ↓
Native Google Login
        ↓
Spring Boot Verification
        ↓
Application JWT
```

This provides:

* Unified authentication
* Shared backend authorization
* Better security
* Easier scaling
* Support for future SSO providers
