import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/products/ProductsPage'
import ProductDetailPage from './pages/products/ProductDetailPage'
import CategoriesPage from './pages/CategoriesPage'
import ReceiptsPage from './pages/receipts/ReceiptsPage'
import ReceiptDetailPage from './pages/receipts/ReceiptDetailPage'
import DeliveriesPage from './pages/deliveries/DeliveriesPage'
import DeliveryDetailPage from './pages/deliveries/DeliveryDetailPage'
import TransfersPage from './pages/TransfersPage'
import AdjustmentsPage from './pages/AdjustmentsPage'
import MoveHistoryPage from './pages/MoveHistoryPage'
import WarehousesPage from './pages/WarehousesPage'
import WarehouseDetailPage from './pages/WarehouseDetailPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import UsersPage from './pages/UsersPage'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '13px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#12B76A', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

        {/* App routes */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="receipts" element={<ReceiptsPage />} />
          <Route path="receipts/:id" element={<ReceiptDetailPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="adjustments" element={<AdjustmentsPage />} />
          <Route path="move-history" element={<MoveHistoryPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="warehouses/:id" element={<WarehouseDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
