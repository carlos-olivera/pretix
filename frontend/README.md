# Pretix Headless Storefront

A complete headless storefront frontend for pretix, built with React, TypeScript, and Vite. This application provides a modern, mobile-first customer-facing shopping experience while using pretix as the backend ticketing and commerce engine via its REST API.

## Features

- Browse and view event details
- Select tickets/products with variations
- Shopping cart management
- Complete checkout flow with customer information
- Multiple payment method support
- Order confirmation and status tracking
- Multilingual support (Spanish default, English)
- Mobile-first responsive design
- TypeScript for type safety
- Modular, maintainable architecture

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **i18next** - Internationalization
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Project Structure

```
src/
├── app/                    # App initialization
├── routes/                 # Route definitions
├── layouts/                # Layout components
├── features/              # Feature modules
│   ├── events/            # Event listing and details
│   ├── cart/              # Shopping cart
│   ├── checkout/          # Checkout flow
│   ├── orders/            # Order management
│   └── payments/          # Payment handling
├── components/            # Reusable components
│   ├── ui/                # UI components (Button, Card, etc.)
│   └── common/            # Common components
├── lib/                   # Core utilities
│   ├── api/               # API client layer
│   ├── config/            # Configuration
│   ├── utils/             # Utility functions
│   └── hooks/             # Custom React hooks
├── types/                 # TypeScript type definitions
└── i18n/                  # Internationalization
    └── locales/           # Translation files
        ├── es/            # Spanish translations
        └── en/            # English translations
```

## Setup

### 1. Environment Configuration

Update the `.env` file with your pretix instance details:

```env
VITE_PRETIX_API_URL=https://pretix.eu
VITE_PRETIX_ORGANIZER=your-organizer-slug
VITE_PRETIX_EVENT=your-event-slug
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

## Pretix API Integration

The application uses pretix's REST API for all data operations. The API client is located in `src/lib/api/pretix-client.ts` and provides methods for:

- Event information retrieval
- Product/ticket listing
- Cart management
- Order creation
- Payment initiation
- Order status tracking

### Security Considerations

The current implementation makes API calls directly from the browser. For production use, consider:

1. **Backend-for-Frontend (BFF) Pattern**: Implement a lightweight backend proxy for sensitive operations
2. **API Key Management**: Never expose admin API tokens in the frontend
3. **CORS Configuration**: Ensure your pretix instance allows requests from your domain
4. **Rate Limiting**: Implement appropriate rate limiting
5. **Input Validation**: Validate all user inputs before sending to the API

### API Endpoints Used

- `GET /api/v1/organizers/{organizer}/events/{event}/` - Event details
- `GET /api/v1/organizers/{organizer}/events/{event}/items/` - Available products
- `GET /api/v1/organizers/{organizer}/events/{event}/categories/` - Product categories
- `GET /api/v1/organizers/{organizer}/events/{event}/questions/` - Attendee questions
- `POST /api/v1/organizers/{organizer}/events/{event}/orders/` - Create order
- `GET /api/v1/organizers/{organizer}/events/{event}/orders/{code}/` - Order details

## Internationalization

The application supports multiple languages using i18next:

- **Default language**: Spanish (es)
- **Available languages**: Spanish (es), English (en)
- **Language switching**: Users can switch languages via the globe icon in the header

To add a new language:

1. Create a new folder in `src/i18n/locales/` (e.g., `fr/`)
2. Add translation files (e.g., `common.json`)
3. Import and register in `src/i18n/config.ts`

## Customization

### Theming

The application uses Tailwind CSS for styling. You can customize colors, fonts, and other design tokens in `tailwind.config.js`.

### Currency

Currency formatting is handled in `src/lib/utils/format.ts`. The default currency is EUR, but this can be configured based on event settings.

### Payment Providers

The application automatically loads available payment providers from pretix. Payment provider selection is handled in the checkout flow.

## Development

### Type Safety

All pretix API entities are typed in `src/types/pretix.ts`. These types provide:

- Autocomplete in IDEs
- Compile-time error checking
- Better documentation
- Safer refactoring

### Cart Management

The cart uses localStorage for persistence and a custom React hook (`useCart`) for state management. Cart data is stored locally until checkout.

### Error Handling

All API calls include error handling with user-friendly error messages. Errors are translated based on the selected language.

## Production Deployment

Before deploying to production:

1. Update environment variables with production pretix instance
2. Configure CORS on your pretix instance
3. Implement rate limiting
4. Consider implementing a BFF for sensitive operations
5. Enable SSL/TLS
6. Configure proper caching headers
7. Monitor API usage and errors

## Browser Support

The application supports all modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is provided as-is for use with pretix instances.

## Support

For pretix-related questions, visit [pretix documentation](https://docs.pretix.eu/).

For project-specific issues, please refer to the code comments and documentation within the codebase.
