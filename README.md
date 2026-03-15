<<<<<<< HEAD
# coreinventory
oodo hackatchoon
=======
# CoreInventory — Enterprise IMS

A production-grade, SAP-inspired Inventory Management System built with:
- **Frontend**: React 18 + Vite + Zustand
- **Backend**: Python FastAPI + SQLAlchemy
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Auth**: JWT + OTP via Email (SMTP) or SMS (Twilio)

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env .env.local    # edit with your SMTP credentials
uvicorn main:app --reload
```
API runs at → http://localhost:8000  
API docs → http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
App runs at → http://localhost:5173

---

## 🔑 Default Accounts (auto-seeded)

| Email | Password | Role |
|---|---|---|
| admin@coreinventory.com | Admin@123 | Admin |
| manager@coreinventory.com | Manager@123 | Manager |
| sales@coreinventory.com | Sales@123 | Sales Team |
| warehouse@coreinventory.com | Warehouse@123 | Warehouse Staff |
| viewer@coreinventory.com | Viewer@123 | Viewer |

---

## 📧 OTP Email Setup (Real Emails)

Edit `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-app-password   # Google App Password
SMTP_FROM=CoreInventory <your-gmail@gmail.com>
```

> For Gmail: Enable 2FA → https://myaccount.google.com/apppasswords → create app password

If SMTP is not configured, OTP codes are printed to the backend console (mock mode).

---

## 📱 OTP SMS Setup (Twilio)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

---

## 🗄️ Production Database (PostgreSQL)

Change in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/coreinventory
```

---

## 📁 Project Structure

```
coreinventory/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── requirements.txt
│   ├── .env                     # Configuration
│   └── app/
│       ├── database.py          # SQLAlchemy setup
│       ├── models.py            # All DB models
│       ├── config.py            # Settings
│       ├── dependencies.py      # Auth middleware
│       ├── seed.py              # Demo data
│       ├── routers/             # All API routes
│       │   ├── auth.py          # Login, OTP, register
│       │   ├── products.py
│       │   ├── receipts.py
│       │   ├── deliveries.py
│       │   ├── transfers.py
│       │   ├── adjustments.py
│       │   ├── moves.py
│       │   ├── dashboard.py
│       │   ├── warehouses.py
│       │   ├── locations.py
│       │   ├── categories.py
│       │   ├── users.py
│       │   └── settings.py
│       └── utils/
│           ├── security.py      # JWT, bcrypt, OTP
│           └── notifications.py # Email + SMS sender
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx              # All routes
        ├── main.jsx
        ├── store/authStore.js   # Zustand auth
        ├── utils/
        │   ├── api.js           # Axios instance
        │   └── helpers.js       # Formatters
        ├── styles/globals.css   # SAP-inspired theme
        ├── components/
        │   ├── layout/
        │   │   ├── AppLayout.jsx  # Sidebar + topbar
        │   │   └── AppLayout.css
        │   └── ui/
        │       ├── Modal.jsx
        │       ├── ConfirmDialog.jsx
        │       ├── SkeletonTable.jsx
        │       └── NotificationPanel.jsx
        └── pages/
            ├── auth/
            │   ├── LoginPage.jsx     # Email/Phone + OTP/Password
            │   ├── RegisterPage.jsx
            │   └── ForgotPasswordPage.jsx
            ├── DashboardPage.jsx     # KPIs + alerts
            ├── products/
            │   ├── ProductsPage.jsx  # CRUD + filters
            │   └── ProductDetailPage.jsx
            ├── receipts/
            │   ├── ReceiptsPage.jsx
            │   └── ReceiptDetailPage.jsx
            ├── deliveries/
            │   ├── DeliveriesPage.jsx
            │   └── DeliveryDetailPage.jsx
            ├── TransfersPage.jsx
            ├── AdjustmentsPage.jsx
            ├── MoveHistoryPage.jsx   # + CSV export
            ├── CategoriesPage.jsx
            ├── WarehousesPage.jsx    # + Locations tab
            ├── WarehouseDetailPage.jsx
            ├── SettingsPage.jsx
            ├── ProfilePage.jsx
            └── UsersPage.jsx
```

---

## 🔐 Role Permissions

| Feature | Admin | Manager | Sales | Warehouse | Viewer |
|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Products | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/Edit Products | ✅ | ✅ | ✅ | ✅ | ❌ |
| Receipts | ✅ | ✅ | ✅ | ✅ | ❌ |
| Deliveries | ✅ | ✅ | ✅ | ✅ | ❌ |
| Transfers | ✅ | ✅ | ✅ | ✅ | ❌ |
| Adjustments | ✅ | ✅ | ✅ | ✅ | ❌ |
| Users Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Warehouses | ✅ | ✅ | ❌ | ❌ | ❌ |
>>>>>>> 3e3b0d1 (first commit)
