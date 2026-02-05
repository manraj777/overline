# Payment Integration Guide

## Stripe Setup

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create account
2. Get API keys from Dashboard → Developers → API keys
3. For testing, use test mode keys (start with `sk_test_`)

### 2. Add Environment Variables

Add to `apps/backend/.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### 3. Install Stripe SDK

```bash
cd apps/backend
pnpm add stripe
```

### 4. Update Payment Service

Replace the payment service with full Stripe integration:

```typescript
// apps/backend/src/modules/payments/payments.service.ts
import Stripe from 'stripe';

private stripe: Stripe;

constructor() {
  this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  });
}

async createPaymentIntent(booking: Booking) {
  const paymentIntent = await this.stripe.paymentIntents.create({
    amount: Math.round(booking.totalAmount.toNumber() * 100), // Convert to cents
    currency: booking.currency.toLowerCase(),
    metadata: {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
    },
  });
  
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}
```

### 5. Frontend Integration

Add Stripe to user-web:

```bash
cd apps/user-web
pnpm add @stripe/stripe-js @stripe/react-stripe-js
```

### 6. Create Checkout Component

```tsx
// apps/user-web/src/components/booking/PaymentForm.tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

function PaymentForm({ clientSecret, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (!error && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit">Pay Now</button>
    </form>
  );
}
```

---

## Razorpay Setup (India)

### 1. Create Razorpay Account

1. Go to [razorpay.com](https://razorpay.com)
2. Complete KYC verification
3. Get API keys from Settings → API Keys

### 2. Add Environment Variables

```env
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```

### 3. Install SDK

```bash
cd apps/backend
pnpm add razorpay
```

### 4. Create Order

```typescript
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async createOrder(booking: Booking) {
  const order = await razorpay.orders.create({
    amount: Math.round(booking.totalAmount.toNumber() * 100), // Paise
    currency: 'INR',
    receipt: booking.bookingNumber,
  });
  
  return order;
}
```

### 5. Frontend Integration

```bash
cd apps/user-web
pnpm add razorpay
```

```tsx
// Load Razorpay script and open checkout
const loadRazorpay = () => {
  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
    amount: order.amount,
    currency: 'INR',
    order_id: order.id,
    handler: function (response) {
      // Verify payment on backend
      verifyPayment(response);
    },
  };
  
  const rzp = new window.Razorpay(options);
  rzp.open();
};
```

---

## Testing Payments

### Stripe Test Cards

| Card | Number |
|------|--------|
| Success | 4242 4242 4242 4242 |
| Decline | 4000 0000 0000 0002 |
| 3D Secure | 4000 0025 0000 3155 |

### Razorpay Test Cards

| Card | Number |
|------|--------|
| Success | 4111 1111 1111 1111 |
| Decline | 5267 3181 8797 5449 |

---

## Webhook Setup

### Stripe Webhooks

1. Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/v1/payments/webhook/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### Razorpay Webhooks

1. Dashboard → Settings → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/v1/payments/webhook/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
