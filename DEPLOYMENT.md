# Deployment Notes

This repo now includes the pieces needed for a cleaner production rollout.

## What changed

- Receipts are generated and emailed after successful payments.
- Orders reserve inventory while payment is pending, then release or finalize it safely.
- Frontend/admin env files are ignored, with example files checked in for setup.
- Basic security headers, rate limits, and health checks are in place.

## Backend environment

Use `Backend/.env.example` as the template for `Backend/.env`.

Required values:

- `MONGO_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Recommended values:

- `CLIENT_ORIGINS`
- `STORE_CURRENCY`
- `DELIVERY_CHARGE`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_SECRET_KEY`
- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`

## Webhooks

Point the payment providers to:

- `POST /order/webhook/stripe`
- `POST /order/webhook/razorpay`

These routes must receive the raw request body so signature checks can work.

## Health check

The backend exposes:

- `GET /health`

It returns `200` when MongoDB is connected and `503` when it is not.

## Local verification

From `Backend/`:

- `npm test`
- `npm run check`

From `Frontend/`:

- `npm run lint`
- `npm run build`

From `Admin/`:

- `npm run lint`
- `npm run build`
