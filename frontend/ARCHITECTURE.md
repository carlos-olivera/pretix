# Architecture Documentation

## Overview

This headless storefront is built with a clean, modular architecture that separates concerns and allows for easy maintenance and extension. The application follows modern React patterns and best practices while maintaining security and performance.

## Architecture Principles

### 1. Pretix as Backend System of Record

Pretix is responsible for:
- Event data and configuration
- Product/ticket inventory
- Quota management
- Order state and lifecycle
- Payment processing
- Business logic validation

The frontend never duplicates pretix's business logic. All validation and state management that belongs to the commerce flow remains on the pretix side.

### 2. Feature-Based Organization

The codebase is organized by features rather than technical layers:

```
features/
├── events/     # Event browsing and selection
├── cart/       # Shopping cart management
├── checkout/   # Checkout flow
├── orders/     # Order viewing and management
└── payments/   # Payment handling
```

Each feature module is self-contained and includes:
- Components specific to that feature
- Feature-specific logic
- Feature-specific types (if any)

### 3. Layered Architecture

```
┌─────────────────────────────────────┐
│         UI Layer (React)            │
│  (Components, Layouts, Routes)      │
├─────────────────────────────────────┤
│       Business Logic Layer          │
│    (Hooks, State Management)        │
├─────────────────────────────────────┤
│         API Client Layer            │
│   (Pretix Client, HTTP Layer)       │
├─────────────────────────────────────┤
│         Pretix REST API             │
│    (Backend System of Record)       │
└─────────────────────────────────────┘
```

## Security Architecture

### Current Implementation: Browser-Direct API Calls

The current implementation makes API calls directly from the browser to pretix. This approach:

**Advantages:**
- Simpler architecture
- No additional backend required
- Lower operational complexity
- Suitable for read-only operations

**Limitations:**
- Cannot safely use admin API tokens
- CORS must be configured on pretix
- Rate limiting must be handled by pretix
- All API responses are visible to the client

### Recommended Production Architecture: Backend-for-Frontend (BFF)

For production deployments, implement a BFF layer:

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Browser │ <──> │   BFF    │ <──> │  Pretix  │
│ Frontend │      │ (Node.js)│      │   API    │
└──────────┘      └──────────┘      └──────────┘
```

**BFF Responsibilities:**

1. **Authentication & Authorization**
   - Manage API tokens securely
   - Implement session management
   - Handle admin operations

2. **Request Validation**
   - Validate user inputs before forwarding
   - Sanitize data
   - Enforce business rules

3. **Response Transformation**
   - Filter sensitive data
   - Transform data formats
   - Aggregate multiple API calls

4. **Security Controls**
   - Rate limiting
   - Request throttling
   - IP whitelisting
   - CSRF protection

5. **Caching**
   - Cache frequently accessed data
   - Reduce load on pretix
   - Improve performance

### BFF Implementation Approach

The current API client (`src/lib/api/pretix-client.ts`) is designed to make BFF migration straightforward:

1. **Create BFF Endpoints**: Mirror the existing client methods as BFF endpoints
2. **Update Base URL**: Change `VITE_PRETIX_API_URL` to point to your BFF
3. **Add Authentication**: Implement proper auth in the BFF
4. **Proxy Requests**: Forward requests from BFF to pretix with proper credentials

Example BFF endpoint structure:

```javascript
// BFF Route: POST /api/orders
app.post('/api/orders', async (req, res) => {
  // Validate session
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate input
  const orderData = validateOrderData(req.body);

  // Call pretix with admin token
  const order = await pretixClient.createOrder(orderData, {
    headers: {
      'Authorization': `Token ${process.env.PRETIX_API_TOKEN}`
    }
  });

  // Filter sensitive data
  const sanitizedOrder = filterSensitiveData(order);

  res.json(sanitizedOrder);
});
```

## Data Flow

### Event Browsing Flow

1. User navigates to homepage
2. Frontend calls `pretixClient.getEvent()`
3. Event data is fetched from pretix
4. UI renders event information
5. User clicks "Buy Tickets"
6. Navigate to event detail page

### Shopping Flow

1. User views event details and available products
2. Frontend calls `pretixClient.getItems()` and `pretixClient.getCategories()`
3. User selects products/variations
4. Items are added to cart (stored in localStorage)
5. User navigates to cart
6. User proceeds to checkout

### Checkout Flow

1. User enters contact and billing information
2. Frontend validates form data
3. Frontend calls `pretixClient.createOrder()` with cart data
4. Pretix validates availability and creates order
5. Order is returned with status 'pending'
6. User is redirected to order page
7. User initiates payment
8. Payment provider redirect or inline payment
9. Payment completion/callback
10. Order status updated to 'paid'

### Cart Management

Cart state is managed using:
- **localStorage**: Persistent storage across sessions
- **Custom Hook**: `useCart()` provides cart operations
- **React Context**: Could be added for deeper integration

Cart operations:
- `addItem(item)`: Add product to cart
- `removeItem(itemId)`: Remove product
- `updateItem(itemId, updates)`: Update quantity or details
- `clearCart()`: Empty cart after successful order

## State Management

### Local State

Component-level state using React hooks:
- `useState` for simple UI state
- `useEffect` for side effects and data loading

### Shared State

- **Cart**: Custom `useCart()` hook with localStorage
- **i18n**: i18next context for language switching
- **Router**: React Router for navigation state

### Server State

API data is fetched on-demand and not cached client-side:
- Events data
- Products/categories
- Payment providers
- Orders

For production, consider adding:
- React Query for server state caching
- Optimistic updates
- Background refetching

## API Client Design

The API client (`pretix-client.ts`) follows these principles:

1. **Single Responsibility**: Each method handles one API operation
2. **Type Safety**: Full TypeScript typing for requests and responses
3. **Error Handling**: Consistent error handling with custom error class
4. **Configuration**: Centralized configuration via environment variables
5. **Extensibility**: Easy to add new endpoints

Example method structure:

```typescript
async getEvent(): Promise<PretixEvent> {
  return this.request<PretixEvent>(
    `/organizers/${this.organizer}/events/${this.event}/`
  );
}
```

## Component Design Patterns

### Smart vs Presentational Components

**Smart Components** (Features):
- Handle data fetching
- Manage local state
- Handle business logic
- Located in `features/`

**Presentational Components** (UI):
- Receive data via props
- Focus on rendering
- Reusable across features
- Located in `components/ui/`

### Composition Pattern

Complex UIs are built by composing smaller components:

```tsx
<Card variant="bordered">
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Custom Hooks

Reusable logic is extracted into custom hooks:
- `useCart()`: Cart management
- `useTranslation()`: i18n (from library)

## Type System

### Pretix Types

All pretix entities are fully typed in `src/types/pretix.ts`:

```typescript
export interface PretixEvent {
  name: PretixMultiLingualString;
  slug: string;
  currency: string;
  // ... more fields
}
```

### Application Types

Additional types for application-specific needs:

```typescript
export interface CartItem extends PretixCartPosition {
  itemDetails?: PretixItem;
  variationDetails?: PretixItemVariation;
}
```

## Internationalization (i18n)

### Structure

```
i18n/
├── config.ts              # i18next configuration
└── locales/
    ├── es/                # Spanish (default)
    │   └── common.json
    └── en/                # English
        └── common.json
```

### Usage

```tsx
const { t, i18n } = useTranslation();

// Simple translation
<h1>{t('events.title')}</h1>

// Pluralization
<p>{t('cart.items', { count: itemCount })}</p>

// Change language
i18n.changeLanguage('en');
```

### Content Localization

Pretix provides multi-lingual strings for content:

```typescript
interface PretixMultiLingualString {
  [locale: string]: string;
}
```

Use the `getLocalizedString()` utility to extract the correct language:

```typescript
const eventName = getLocalizedString(event.name, i18n.language);
```

## Error Handling

### API Errors

All API calls use try-catch with user-friendly error messages:

```typescript
try {
  const data = await pretixClient.getEvent();
  setData(data);
} catch (err) {
  setError(t('errors.generic'));
  console.error('Failed to load event:', err);
}
```

### Form Validation

Client-side validation before submission:

```typescript
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  if (!formData.email) {
    errors.email = t('checkout.required');
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

## Performance Considerations

### Code Splitting

React Router automatically code-splits by route:
- Each page loads only necessary code
- Reduces initial bundle size
- Faster page loads

### Image Optimization

- Use responsive images
- Lazy load images below the fold
- Use WebP format where supported

### Bundle Size

Current production bundle: ~331KB (105KB gzipped)
- React + React DOM: ~140KB
- React Router: ~30KB
- i18next: ~20KB
- Application code: ~140KB

### Optimization Opportunities

1. **Lazy loading**: Dynamically import heavy components
2. **Memoization**: Use `React.memo()` for expensive components
3. **Virtual scrolling**: For large product lists
4. **Service Workers**: For offline support and caching

## Testing Strategy

### Recommended Testing Approach

1. **Unit Tests**
   - Utility functions
   - Custom hooks
   - Form validation

2. **Integration Tests**
   - API client methods
   - Complete user flows
   - Cart operations

3. **E2E Tests**
   - Full checkout flow
   - Payment process
   - Multi-language support

### Testing Tools Suggestions

- **Vitest**: Unit and integration tests
- **React Testing Library**: Component tests
- **Playwright/Cypress**: E2E tests
- **MSW**: API mocking

## Deployment

### Environment Variables

Production requires:
```env
VITE_PRETIX_API_URL=https://your-pretix-instance.com
VITE_PRETIX_ORGANIZER=your-organizer
VITE_PRETIX_EVENT=your-event
```

### Build Process

```bash
npm run build
```

Generates:
- `dist/index.html`: Entry point
- `dist/assets/`: JS and CSS bundles
- Static files ready for CDN deployment

### Hosting Options

1. **Vercel/Netlify**: Best for static hosting with CDN
2. **AWS S3 + CloudFront**: Scalable and cost-effective
3. **Traditional hosting**: Apache/Nginx serving static files

### CORS Configuration

Pretix must allow requests from your domain:
```
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Future Enhancements

### Recommended Additions

1. **Authentication**
   - User accounts
   - Order history
   - Saved payment methods

2. **Advanced Features**
   - Wishlist
   - Group bookings
   - Gift cards/vouchers UI
   - Seat selection (if using seating plans)

3. **Analytics**
   - Google Analytics integration
   - Conversion tracking
   - User behavior analysis

4. **Accessibility**
   - WCAG 2.1 AA compliance
   - Keyboard navigation
   - Screen reader optimization

5. **PWA Features**
   - Offline support
   - Add to home screen
   - Push notifications

6. **Performance**
   - Implement React Query for caching
   - Add service worker
   - Optimize images with CDN

## Conclusion

This architecture provides a solid foundation for a production-ready pretix storefront. The modular design, clear separation of concerns, and type safety make it maintainable and extensible.

For production use, prioritize implementing the BFF layer for security and consider the recommended enhancements based on your specific needs.
