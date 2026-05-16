# Relink — Deploy & WhatsApp Setup

WhatsApp-first failed delivery recovery. Next.js 16 · Supabase · Meta Cloud API.

---

## Routes

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/demo` | Interactive WhatsApp demo (show this to people) |
| `/dashboard` | Operator dashboard (live delivery feed) |
| `POST /api/webhook/delivery` | Courier fires this when a delivery fails |
| `GET/POST /api/webhook/whatsapp` | Meta fires this when a customer replies |
| `POST /api/signup` | Landing page signup form |

---

## 1. Run locally

```bash
unzip relink.zip
cd relink
npm install
cp .env.example .env.local   # fill in your values (see sections below)
npm run dev
```

Open http://localhost:3000

---

## 2. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or push to GitHub and import at vercel.com/new — auto-deploys on every push.

Add all your env vars in: Vercel project → Settings → Environment Variables

---

## 3. WhatsApp Setup (Meta Cloud API — free)

This takes about 30 minutes. Do it once.

### Step 1 — Create a Meta Developer account
Go to https://developers.facebook.com and log in with your Facebook account.

### Step 2 — Create a Meta App
- Click "My Apps" → "Create App"
- Select "Business" as the app type
- Give it a name e.g. "Relink"
- Click "Create App"

### Step 3 — Add WhatsApp to your app
- In your app dashboard, scroll to find "WhatsApp" → click "Set Up"
- You'll land on the WhatsApp Getting Started page

### Step 4 — Get your test credentials
On the WhatsApp → API Setup page you'll see:

- **Phone Number ID** → copy this → paste as `WHATSAPP_PHONE_ID` in your env
- **Temporary access token** → copy this → paste as `WHATSAPP_TOKEN`

> ⚠️ The temporary token expires in 24 hours. For production, create a
> permanent System User token (see Step 8 below).

### Step 5 — Add a test recipient
- Still on API Setup, find "To" field under "Send and receive messages"
- Click "Manage phone number list"
- Add your own mobile number
- You'll get a WhatsApp message to verify it

### Step 6 — Test it works
In your terminal (replace the values):

```bash
curl -X POST \
  https://graph.facebook.com/v19.0/YOUR_PHONE_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "447911XXXXXX",
    "type": "text",
    "text": { "body": "Relink is working ✓" }
  }'
```

You should get a WhatsApp message on your phone within seconds.

### Step 7 — Register your webhook (so replies come back to you)
- WhatsApp → Configuration → Webhook → Edit
- **Callback URL**: `https://yoursite.vercel.app/api/webhook/whatsapp`
- **Verify token**: the value you set as `WEBHOOK_VERIFY_TOKEN` in your env
- Click "Verify and Save"
- Under "Webhook fields" → subscribe to **messages**

### Step 8 — Get a permanent token (for production)
The 24hr token is fine for testing. For production:

- Go to Business Settings → Users → System Users
- Create a System User
- Assign your WhatsApp app with "Full Control"
- Generate a token → select your app → select `whatsapp_business_messaging` permission
- Copy the token → this is your permanent `WHATSAPP_TOKEN`

### Step 9 — Add a real phone number (when ready)
- WhatsApp → Phone Numbers → Add Phone Number
- Meta will ask you to verify it
- This is the number customers will receive messages from
- Display name e.g. "TechLondon Courier" or "Relink Delivery"

---

## 4. Supabase Setup

### Step 1
Create a free project at https://supabase.com

### Step 2
Go to SQL Editor → New Query → paste the contents of `supabase-schema.sql` → Run

### Step 3
Go to Settings → API → copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 5. Test the full bot flow (sandbox mode)

With `WABA_SANDBOX=true` set, no real WhatsApp messages are sent — everything logs to console.

Fire a test delivery event:

```bash
curl -X POST https://yoursite.vercel.app/api/webhook/delivery \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "operator_id": "test-operator-1",
    "event": "failed",
    "merchant_name": "Bloom & Wild",
    "customer_name": "Sarah Chen",
    "customer_phone": "+447911123456",
    "address": "14 Canary Wharf Rd, E14"
  }'
```

Expected response:
```json
{ "ok": true, "delivery_id": "uuid...", "wa_sent": true, "wa_message_id": "sandbox_..." }
```

Check Vercel logs for `[WA SANDBOX] Would send to +447911123456`

To test with real WhatsApp: set `WABA_SANDBOX=false` and use your verified test number.

---

## 6. How a courier operator connects

Once you're live, give them:

1. Their `operator_id` (create a row in your `operators` table in Supabase)
2. Your `WEBHOOK_SECRET`
3. This payload spec:

```
POST https://yoursite.vercel.app/api/webhook/delivery
Authorization: Bearer WEBHOOK_SECRET
Content-Type: application/json

{
  "operator_id": "their-id",
  "event": "failed",              // or "access_issue" or "out_for_delivery"
  "merchant_name": "Merchant Co",
  "customer_name": "John Smith",
  "customer_phone": "+447911123456",
  "address": "Flat 3, 22 Example St, E1",
  "delivery_window": "2–4pm"      // optional
}
```

If they use Onfleet or Circuit, you set up the webhook in their dashboard
pointing at your URL. Takes 10 minutes per operator.

---

## Project structure

```
relink/
├── app/
│   ├── page.tsx                    ← landing page
│   ├── demo/
│   │   ├── page.tsx
│   │   └── DemoClient.tsx          ← interactive WhatsApp demo
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── DashboardClient.tsx     ← operator delivery dashboard
│   └── api/
│       ├── signup/route.ts         ← landing page signups
│       ├── webhook/
│       │   ├── delivery/route.ts   ← courier fires this on failed delivery
│       │   └── whatsapp/route.ts   ← Meta fires this on customer reply
├── lib/
│   ├── whatsapp.ts                 ← Meta Cloud API client
│   ├── supabase.ts                 ← Supabase client + DB helpers
│   └── resolutions.ts              ← button → resolution mapping + messages
├── supabase-schema.sql             ← run this in Supabase SQL editor
├── .env.example                    ← copy to .env.local
└── README.md
```

---

Built by The 36th Company.
