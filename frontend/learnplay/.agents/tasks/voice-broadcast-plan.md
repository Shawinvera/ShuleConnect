# Implementation Plan — Voice Broadcasts Feature

## Context summary (from codebase exploration)

- **Framework**: Angular 20, all components standalone, Tailwind CSS, `font-[Fredoka]` typography throughout.
- **API base**: `http://localhost:8112/api` (`environment.apiUrl`).
- **Routing**: `teacher-routing-module.ts` registers an eager children array under a `TeacherLayout` shell guarded by `authGuard`. Every new page is a plain `{ path, component }` entry — no lazy loading used.
- **Sidebar**: `detectPage()` in `sidebar.ts` sets `currentPage = 'dashboard'` when any recognised sub-path is matched via `url.includes(...)`. The HTML places the SMS Alerts button in its own `<div class="flex flex-col gap-1 px-2 mb-2">` block immediately before the Settings `<div class="flex flex-col gap-1 px-2">`. Navigation is done through `this.router.navigate([route])`.
- **SmsNotificationsComponent** does NOT inject `Router` — only `HttpClient`. The 5th quick-action card therefore must use Angular's `[routerLink]` directive (needs `RouterLink` import) rather than a method call. The grid is `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`; adding a 5th card will naturally wrap to a second row on large screens — acceptable.
- **CSS convention**: each component has a minimal `.css` file containing only `:host { display: block; }`.
- **Build/test commands**: `ng build` (via `npm run build`) and `ng test` (Karma/Jasmine). There are no existing unit tests for teacher components, so verification is by successful `ng build --configuration development`.

---

## Files to create

| Path | Purpose |
|------|---------|
| `src/app/teacher/components/voice-broadcast/voice-broadcast.ts` | Standalone component class |
| `src/app/teacher/components/voice-broadcast/voice-broadcast.html` | Component template |
| `src/app/teacher/components/voice-broadcast/voice-broadcast.css` | Minimal host style |

## Files to modify

| Path | Change |
|------|--------|
| `src/app/teacher/teacher-routing-module.ts` | Import + add route child |
| `src/app/teacher/components/sidebar/sidebar.ts` | Add `voice-broadcast` to `detectPage()` dashboard branch |
| `src/app/teacher/components/sidebar/sidebar.html` | Add Voice Broadcast nav button after SMS Alerts block |
| `src/app/teacher/components/sms-notifications/sms-notifications.ts` | Import `RouterLink` |
| `src/app/teacher/components/sms-notifications/sms-notifications.html` | Add 5th quick-action card |

---

## Ordered implementation steps

- [ ] 1. **Create `voice-broadcast.css`**  
  Single-rule file identical to the SMS Notifications CSS.  
  File: `src/app/teacher/components/voice-broadcast/voice-broadcast.css`  
  Content:
  ```css
  :host {
    display: block;
  }
  ```
  Verify: file exists and `ng build --configuration development` still passes (baseline check).

- [ ] 2. **Create `VoiceBroadcastComponent` class (`voice-broadcast.ts`)**  
  Standalone component with selector `app-voice-broadcast`. Inject `HttpClient` and `Router`. Define all properties and HTTP methods described below, then wire them in the template (step 3).

  **Selector / decorator:**
  ```typescript
  @Component({
    selector: 'app-voice-broadcast',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './voice-broadcast.html',
    styleUrl: './voice-broadcast.css'
  })
  ```

  **Interfaces (top of file, before the class):**
  ```typescript
  interface ContactOption {
    phone: string;
    name: string;
  }

  interface BroadcastLog {
    time: string;
    recipients: string;
    language: string;
    message: string;
    status: 'Sent ✅' | 'Failed ❌';
  }
  ```

  **Properties:**
  ```typescript
  apiUrl = environment.apiUrl;

  // recipient selection
  recipientType: 'guardians' | 'teachers' | 'custom' = 'guardians';
  phoneList: ContactOption[] = [];          // fetched from API
  selectedPhones: string[] = [];            // built from phoneList or manual entry
  customPhones = '';                        // raw textarea for custom mode

  // compose
  language = 'en';
  message = '';
  charCount = 0;
  maxChars = 300;

  // state
  isLoadingContacts = false;
  isSending = false;
  successMessage = '';
  errorMessage = '';

  // log
  logs: BroadcastLog[] = [];
  ```

  **Methods:**

  `constructor(private http: HttpClient, private router: Router) {}`

  `ngOnInit()` — calls `loadContacts()`.

  `loadContacts()`:
  - Sets `isLoadingContacts = true`.
  - If `recipientType === 'teachers'` → GET `${this.apiUrl}/staff/teachers`.
  - If `recipientType === 'guardians'` → GET `${this.apiUrl}/staff/guardians`.
  - Expects response as `any[]`. Maps each item: use `item.phone ?? item.phoneNumber ?? ''` for the phone field, and `item.name ?? item.fullName ?? item.username ?? 'Contact'` for the name field. Assign to `this.phoneList`.
  - On error: set `errorMessage = 'Failed to load contacts.'`.
  - In both cases set `isLoadingContacts = false` in finalize (use RxJS `finalize` or manual flag in next/error).

  `onRecipientTypeChange()` — called when the recipient dropdown changes. Clears `phoneList`, `selectedPhones`, `customPhones`, then calls `loadContacts()` (skip API call when `recipientType === 'custom'`).

  `togglePhone(phone: string)`:
  - If `phone` is in `selectedPhones`, remove it; otherwise push it.

  `isPhoneSelected(phone: string): boolean` — returns `selectedPhones.includes(phone)`.

  `selectAll()` — sets `selectedPhones` to all phones from `phoneList`.

  `clearSelection()` — sets `selectedPhones = []`.

  `onMessageChange()` — sets `charCount = this.message.length`.

  `getPhoneNumbers(): string[]`:
  - If `recipientType === 'custom'`: split `customPhones` on commas and newlines, trim each, filter non-empty.
  - Otherwise: return `selectedPhones`.

  `getRecipientLabel(): string`:
  - `'guardians'` → `'Guardians'`; `'teachers'` → `'Teachers'`; `'custom'` → `'Custom List'`.

  `send()`:
  - Validate: `message.trim()` must be non-empty; `getPhoneNumbers()` must have at least one entry. Set `errorMessage` and return early if not.
  - Set `isSending = true`, clear `successMessage` and `errorMessage`.
  - Build body: `{ phoneNumbers: this.getPhoneNumbers(), message: this.message, language: this.language }`.
  - POST to `${this.apiUrl}/voice/broadcast` with `{ withCredentials: true }`.
  - On success: set `successMessage`, call `addLog(...)`, reset `message`, `selectedPhones`, `charCount`. Set `isSending = false`.
  - On error: set `errorMessage = err.error?.message || 'Failed to send voice broadcast.'`. Set `isSending = false`.

  `addLog(recipients: string, lang: string, msg: string)`:
  - Unshift a `BroadcastLog` with current time (`new Date().toLocaleTimeString()`), `recipients`, `language: lang`, truncated message (50 chars + `...`), `status: 'Sent ✅'`.
  - Cap `logs` at 10.

  `goBack()` — calls `this.router.navigate(['/courses/notifications'])`.

  File: `src/app/teacher/components/voice-broadcast/voice-broadcast.ts`  
  Verify: `ng build --configuration development` — no TypeScript errors.

- [ ] 3. **Create `voice-broadcast.html` template**  
  Mirror the layout conventions from `sms-notifications.html` (same `p-4 md:p-8 min-h-screen bg-gray-50` wrapper, `font-[Fredoka]` on all text, `rounded-2xl` cards, `bg-green-700` primary actions).

  The template has five sections:

  **Section A — Header**  
  - Back button (left-arrow SVG, `(click)="goBack()"`, `font-[Fredoka] text-sm text-gray-500 hover:text-gray-700`).
  - Row with icon + title + subtitle.
  - Icon: `w-10 h-10 rounded-xl bg-green-700` containing a combined phone+speaker SVG (use the heroicons `speakerphone` / `megaphone` path: `M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.952 9.168-4.967...` — use a simple phone icon instead if the megaphone path is complex; acceptable alternative is heroicons `phone` + `volume-up` side by side).  
    **Concrete SVG to use** (phone icon, same style as SMS Notifications header):
    ```html
    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z"/>
    </svg>
    ```
  - Title: `Voice Broadcasts` (h1, `font-bold text-2xl md:text-3xl text-gray-800`).
  - Subtitle: `Send voice messages to parents & teachers via Africa's Talking` (`text-gray-500 text-sm md:text-base`).

  **Section B — Success/Error banners**  
  Identical pattern to `sms-notifications.html`:
  ```html
  <div *ngIf="successMessage" class="mb-4 p-3 bg-green-50 border border-green-300 rounded-xl font-[Fredoka] text-green-700">
    ✅ {{ successMessage }}
  </div>
  <div *ngIf="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-300 rounded-xl font-[Fredoka] text-red-700">
    ❌ {{ errorMessage }}
  </div>
  ```

  **Section C — "How it works" info row**  
  4-step horizontal grid (`grid grid-cols-2 md:grid-cols-4 gap-3 mb-8`). Each cell: `bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center`.  
  Steps:
  1. 📋 **Select Recipients** — Choose guardians, teachers, or enter custom numbers.
  2. 🌐 **Choose Language** — Pick the language for the voice message.
  3. 🎙️ **Compose Message** — Type your announcement (max 300 characters).
  4. 📞 **Africa's Talking Calls** — Recipients receive an automated voice call.

  Each step cell: emoji in a `w-10 h-10 rounded-xl bg-green-50 mx-auto mb-2 flex items-center justify-center`, then step title (`font-bold text-gray-800 text-sm`), then description (`text-gray-500 text-xs mt-1`).

  **Section D — Compose Broadcast card**  
  `bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8`.  
  Title: `Compose Voice Broadcast` (h2, `font-bold text-xl text-gray-800 mb-4`).

  Row 1 — 2-column grid:

  *Recipients dropdown:*
  ```html
  <select [(ngModel)]="recipientType" (ngModelChange)="onRecipientTypeChange()" ...>
    <option value="guardians">All Guardians / Parents</option>
    <option value="teachers">All Teachers</option>
    <option value="custom">Custom Phone Numbers</option>
  </select>
  ```

  *Language dropdown:*
  ```html
  <select [(ngModel)]="language" ...>
    <option value="en">English</option>
    <option value="sw">Swahili</option>
    <option value="fr">French</option>
    <option value="ha">Hausa</option>
    <option value="yo">Yoruba</option>
    <option value="ig">Igbo</option>
  </select>
  ```

  *Contact list (shown when `recipientType !== 'custom'`)*: `*ngIf="recipientType !== 'custom'"`. Show loading spinner if `isLoadingContacts`. Then show a scrollable checkbox list (`max-h-40 overflow-y-auto`) of `phoneList` entries. Each row: `<input type="checkbox" [checked]="isPhoneSelected(c.phone)" (change)="togglePhone(c.phone)"> {{ c.name }} ({{ c.phone }})`. Below the list: "Select All" and "Clear" buttons.

  *Custom textarea (shown when `recipientType === 'custom'`)*: `*ngIf="recipientType === 'custom'"`. Textarea `[(ngModel)]="customPhones"`, placeholder `+254711000000, +254722000000` (one per line or comma-separated), `rows="4"`.

  *Message textarea (full width, `md:col-span-2`)*:
  ```html
  <textarea [(ngModel)]="message" (ngModelChange)="onMessageChange()" rows="4"
    [maxlength]="maxChars" placeholder="Type your voice message script...">
  </textarea>
  <div class="flex justify-end mt-1">
    <span [class.text-red-500]="charCount > 270" [class.text-gray-400]="charCount <= 270">
      {{ charCount }}/{{ maxChars }}
    </span>
  </div>
  ```

  *Preview box (shown when `message.trim()` is non-empty)*: `*ngIf="message.trim()"`.  
  `bg-gray-50 rounded-xl p-3 border border-gray-200 font-[Fredoka] text-gray-700 text-sm italic`.  
  Content: `🎙️ Preview: {{ message }}`.

  *Send button:*
  ```html
  <button (click)="send()" [disabled]="isSending || !message.trim() || getPhoneNumbers().length === 0"
    class="w-full md:w-auto px-8 py-3 bg-green-700 text-white rounded-xl font-[Fredoka] font-bold text-base
           hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
    <!-- phone SVG icon when not sending -->
    {{ isSending ? 'Sending...' : 'Send Voice Broadcast' }}
  </button>
  ```
  Show selected count below button: `{{ getPhoneNumbers().length }} recipient(s) selected` (`font-[Fredoka] text-xs text-gray-400 mt-2`).

  **Section E — Recent Broadcasts log table**  
  `*ngIf="logs.length > 0"`. Same structure as the SMS Sent Log table, but with columns: `Time | Recipients | Language | Message | Status`. Use `*ngFor="let log of logs"`. Style identical to `sms-notifications.html` log table.

  File: `src/app/teacher/components/voice-broadcast/voice-broadcast.html`  
  Verify: `ng build --configuration development` — no template binding errors.

- [ ] 4. **Add the route in `teacher-routing-module.ts`**  
  Add import at the top:
  ```typescript
  import { VoiceBroadcastComponent } from './components/voice-broadcast/voice-broadcast';
  ```
  Add child route entry in the `children` array, immediately after the `notifications` entry:
  ```typescript
  { path: 'voice-broadcast', component: VoiceBroadcastComponent },
  ```

  File: `src/app/teacher/teacher-routing-module.ts`  
  Verify: `ng build --configuration development` — router compiles cleanly.

- [ ] 5. **Update `sidebar.ts` — extend `detectPage()`**  
  In the `else if` block that sets `currentPage = 'dashboard'`, append one more condition to the existing chain:
  ```typescript
  url.includes('/courses/voice-broadcast')
  ```
  The full updated condition list (for precision — add only the new line, do not retype the existing ones):
  ```typescript
  || url.includes('/courses/voice-broadcast')
  ```
  Place it after `url.includes('/courses/notifications')`.

  File: `src/app/teacher/components/sidebar/sidebar.ts`  
  Verify: `ng build --configuration development` — no errors.

- [ ] 6. **Update `sidebar.html` — add Voice Broadcast nav button**  
  Insert the following block between the closing `</div>` of the SMS Alerts `div.mb-2` block and the opening `<div class="flex flex-col gap-1 px-2">` of the Settings block:

  ```html
  <!-- Voice Broadcasts -->
  <div class="flex flex-col gap-1 px-2 mb-2">
    <button (click)="navigate('/courses/voice-broadcast')"
      class="flex items-center gap-3 px-2 py-[10px] rounded-xl transition-all duration-200 text-left w-full"
      [style.background]="isActive('/courses/voice-broadcast') ? 'rgba(255,255,255,0.12)' : 'transparent'">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        [style.background]="isActive('/courses/voice-broadcast') ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z"/>
        </svg>
      </div>
      <span *ngIf="isExpanded" class="font-[Fredoka] font-semibold text-[16px] text-white whitespace-nowrap">Voice Broadcasts</span>
    </button>
  </div>
  ```

  File: `src/app/teacher/components/sidebar/sidebar.html`  
  Verify: `ng build --configuration development` — no template errors; navigating to `/courses/voice-broadcast` in browser highlights the button.

- [ ] 7. **Update `sms-notifications.ts` — import `RouterLink`**  
  `SmsNotificationsComponent` does not inject `Router`, so the 5th card uses `[routerLink]`. Add `RouterLink` to the `imports` array:
  ```typescript
  import { RouterLink } from '@angular/router';
  // ...
  imports: [CommonModule, FormsModule, RouterLink],
  ```

  File: `src/app/teacher/components/sms-notifications/sms-notifications.ts`  
  Verify: `ng build --configuration development` — `RouterLink` resolves without error.

- [ ] 8. **Update `sms-notifications.html` — add 5th quick-action card**  
  The Quick Action Cards grid uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. Append the following card as the last child inside that `<div class="grid ...">`, after the "Broadcast to All" card:

  ```html
  <!-- Voice Broadcasts -->
  <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
       [routerLink]="['/courses/voice-broadcast']">
    <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-3">
      <span class="text-xl">📞</span>
    </div>
    <h3 class="font-[Fredoka] font-bold text-gray-800 text-lg">Voice Broadcasts</h3>
    <p class="font-[Fredoka] text-gray-500 text-sm mt-1">Send voice announcements to parents & teachers</p>
    <button class="mt-3 w-full py-2 bg-green-500 text-white rounded-xl font-[Fredoka] font-semibold text-sm hover:bg-green-600 transition-colors">
      Go to Voice
    </button>
  </div>
  ```

  Note: the outer `div` carries `[routerLink]` so both the card body and the button navigate. The `button` itself does not need a separate click handler.

  File: `src/app/teacher/components/sms-notifications/sms-notifications.html`  
  Verify: `ng build --configuration development` — no template errors; clicking the card in the browser navigates to `/courses/voice-broadcast`.

---

## Final verification

After all steps:
```
cd c:\Users\PC\ShuleConnect\frontend\learnplay
npm run build
```
Expected: build completes with 0 errors. Warnings about bundle size are acceptable.

For a live check: `npm start`, navigate to `/courses/notifications` and confirm the 📞 Voice Broadcasts card appears; click it and confirm the voice broadcast page loads with all five sections rendered.
