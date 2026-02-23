# Coupon Template Builder

A private React/TypeScript component library for Brandlock's coupon popup template system. Provides drag-and-drop template building, client review flows, admin approval workflows, and real-time preview—integrated as a package in the admin analytics app.

## Overview

The library powers the **Popup Builder** feature: admins create and customize coupon templates, clients review and approve designs, and admins publish approved templates to production (S3). It uses a zone-based canvas (Unlayer), step-based approval flows, and feedback threads for collaboration.

---

## End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN FLOW (Brandlock Team)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Base Templates          Templates             Build              Admin Review   │
│  ───────────────         ──────────           ─────              ─────────────  │
│  Create/Edit base   →   Copy to account  →   Customize with  →   Review client   │
│  templates               per device            Unlayer editor      submissions   │
│  (base-templates/)      (popup-builder/)      (popup-builder/     (admin-review/)│
│                                               build/)                            │
│                                                                        │         │
│                                                                        ▼         │
│                                                              Approve / Request   │
│                                                              Changes / Reject    │
│                                                                        │         │
│                                                                        ▼         │
│                                                              Publish to S3       │
│                                                              (cb_published_      │
│                                                               templates)         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT FLOW (Account Users)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Landing          Desktop Design    Mobile Design    Copy Review    Final Review │
│  ───────          ─────────────     ────────────     ───────────    ───────────  │
│  Select account   Approve/reject    Approve/reject   Manage copy    Send for     │
│  & templates      desktop popup     mobile popup     per shopper    admin review │
│  (user-landing/)  (user-review/)    (user-review/)   segments       or publish   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Template Status Lifecycle

| Status | Description |
|--------|-------------|
| `draft` | Template created, not yet in client review |
| `client-review` | Sent to client for design/copy approval |
| `admin-review` | Client sent for admin approval |
| `admin-changes-request` | Admin requested changes |
| `admin-rejected` | Admin rejected |
| `published` | Approved and published to S3 (active) |
| `deprecated` | Older version superseded by newer published version |

---

## Features

### Admin Features

| Feature | Component | Description |
|---------|-----------|--------------|
| **Templates Listing** | `TemplatesListing` | List templates by account, device, status; create, edit, copy, delete |
| **Base Templates** | `BaseTemplatesPage`, `BaseTemplateBuilderPage` | Create/edit base templates; copy to account |
| **Popup Builder** | `BuilderMain`, `UnlayerMain` | Unlayer-based email editor for template customization |
| **Admin Review Queue** | `AdminReviewQueue` | Queue of accounts with templates pending admin approval |
| **Admin Review Screen** | `AdminReviewScreen` | Design review, shopper content, coupons, feedback, approve/reject |
| **Published Templates** | `PublishedTemplatesQueue` | View published templates (read-only) |

### Client Features

| Feature | Component | Description |
|---------|-----------|--------------|
| **Client Landing** | `ClientLandingPage` | Select account; list templates for review |
| **Client Flow** | `ClientFlow` | 4-step stepper: Desktop Design → Mobile Design → Copy Review → Final Review |
| **Design Review** | `DesktopReview`, `MobileReview` | Approve/reject design per device; feedback thread |
| **Copy Review** | `CopyReview` | Manage template copy per shopper segment; content presets |
| **Final Review** | `ReviewScreen` | Send for admin review or publish (if allowed) |

### Shared

| Feature | Description |
|---------|-------------|
| **Feedback Thread** | Comments per step; admin decision notes |
| **Browser Preview** | Desktop/mobile preview with website background |
| **Content Management** | Canned content, presets, field mappings |

---

## Project Structure

```
src/
├── api/                      # API client layer
│   ├── services/             # TemplatesAPI, FeedbackAPI, ContentAPI, CouponAPI, etc.
│   └── index.ts              # APIFactory (createAPI)
├── components/
│   └── common/               # DeviceToggle, SharedTemplateTable, BrowserPreview, etc.
├── features/
│   ├── template-builder/      # TemplatesListing, StatusTag, DeviceTags
│   ├── base-template/        # Base templates CRUD, builder
│   ├── builder/              # UnlayerMain, BuilderMain, ConfigStep
│   ├── canned-content/       # Content list, presets
│   ├── client-flow/          # ClientFlow, DesktopReview, MobileReview, CopyReview, etc.
│   └── admin-flow/           # AdminReview, AdminReviewQueue, DesignReviewPanel, etc.
├── stores/                   # Zustand stores
│   ├── clientFlowStore.ts
│   ├── generic.store.ts
│   └── list/                 # templateListing, adminReviewQueue, publishedTemplatesQueue
├── lib/                      # Utils, validation, constants
└── types/                    # API types, props (BaseProps)
```

---

## Host App Integration

### Routes (admin analytics app)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/popup-builder` | `TemplatesListing` | Template listing |
| `/popup-builder/user-landing` | `ClientLandingPage` | Client landing |
| `/popup-builder/user-review` | `ClientReviewPage` (wraps `ClientFlow`) | Client review flow |
| `/popup-builder/admin-review` | `AdminReview` | Admin queue + detail |
| `/popup-builder/admin-review/account/:accountId` | `AdminReview` | Admin review for account |
| `/popup-builder/build`, `/popup-builder/build/:templateId/edit` | `PopupBuilderPage` | Unlayer builder |
| `/popup-builder/base-templates` | `BaseTemplatesListing` | Base templates |
| `/popup-builder/content-management` | `ContentManagementPage` | Content management |

### Required Props (BaseProps)

All main components expect `BaseProps` from the host:

```typescript
interface BaseProps {
  apiClient: AxiosInstance;      // Axios instance for API calls
  navigate: (path: string) => void;
  shoppers: ShopperType[];
  accountDetails: AccountDetails | null;
  accounts: AccountDetails[];
  authProvider: { userId: string; accountId: string; role: string };
}
```

### Usage Example

```tsx
import { createAPI } from '@kishor.purbhe/coupon-template-builder';
import { ClientFlow, AdminReview, TemplatesListing } from '@kishor.purbhe/coupon-template-builder';
import '@kishor.purbhe/coupon-template-builder/styles';

const api = createAPI(axiosInstance);

<ClientFlow
  apiClient={api as any}
  navigate={navigate}
  shoppers={shoppers}
  accountDetails={activeSite}
  authProvider={user}
  accounts={records}
  tabFromUrl={searchParams.get('tab') ?? 'desktop-design'}
  onStepChange={(_, tabKey) => setSearchParams({ tab: tabKey })}
/>
```

---

## Installation

### Private npm package

```bash
npm install @kishor.purbhe/coupon-template-builder
```

### Local development (Yalc)

```bash
# In coupon-template-builder
npm run yalc:publish

# In host app
yalc add @kishor.purbhe/coupon-template-builder
npm install
```

**Development with auto-push:**

```bash
npm run dev:yalc
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3001) |
| `npm run build` | Production build |

---

## Code Quality

```bash
npm run lint        # ESLint
npm run lint:fix    # Fix lint issues
npm run typecheck   # TypeScript check
```

---

## Tech Stack

- **React 18**, **TypeScript**
- **Zustand** – state management
- **Unlayer** (react-email-editor) – template editor
- **Ant Design** – UI
- **Tailwind CSS** – styling (preflight disabled)
- **Axios** – API client

---

## API Services

| Service | Purpose |
|---------|---------|
| `TemplatesAPI` | Templates CRUD, status, config, step approval, publish |
| `FeedbackAPI` | Feedback threads, admin decision notes |
| `ContentAPI` | Canned content, presets |
| `CouponAPI` | Coupon assignment |
| `TemplateFieldsAPI` | Field mappings |
| `BaseTemplateCategoriesAPI` | Base template categories |
| `DevicesAPI` | Device types |
| `AssetsAPI` | Asset uploads |

---

## Troubleshooting

1. **Module not found errors:** Run `npm run build` and ensure host app has the package linked
2. **Style conflicts:** Import styles after host app styles: `import '@kishor.purbhe/coupon-template-builder/styles'`
3. **Peer dependencies:** Host app must provide React 18+, antd, axios, zustand, react-email-editor

---

## License

MIT – see LICENSE file.
