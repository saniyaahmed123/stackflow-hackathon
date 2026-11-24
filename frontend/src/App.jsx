import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ROLE_HOME } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import { AccessDenied, Login, Register } from './pages/Auth';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import {
  AdminLowStock, AdminOrders, AdminOverview, AdminProducts, AdminTransactions,
  AdminUsers, AdminWarehouses,
} from './pages/admin/AdminPages';
import AdminSupplyRequests from './pages/admin/AdminSupplyRequests';
import AdminSuppliers from './pages/admin/AdminSuppliers';
import {
  ManagerInventory, ManagerLowStock, ManagerOverview, ManagerProducts, ManagerStockMovement, ManagerTransactions,
} from './pages/manager/ManagerPages';
import { SupplierProducts, SupplierProfile, SupplierRequests } from './pages/supplier/SupplierPages';
import { SalesOrders, SalesOverview, SalesProducts } from './pages/sales/SalesPages';

const guard = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

function AuthOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Checking session..." />;
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthOnlyRoute><Login /></AuthOnlyRoute>} />
      <Route path="/register" element={<AuthOnlyRoute><Register /></AuthOnlyRoute>} />
      <Route path="/unauthorized" element={<AccessDenied />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={guard(['admin'], <AdminOverview />)} />
          <Route path="/admin/users" element={guard(['admin'], <AdminUsers />)} />
          <Route path="/admin/products" element={guard(['admin'], <AdminProducts />)} />
          <Route path="/admin/warehouses" element={guard(['admin'], <AdminWarehouses />)} />
          <Route path="/admin/suppliers" element={guard(['admin'], <AdminSuppliers />)} />
          <Route path="/admin/supply-requests" element={guard(['admin'], <AdminSupplyRequests />)} />
          <Route path="/admin/orders" element={guard(['admin'], <AdminOrders />)} />
          <Route path="/admin/transactions" element={guard(['admin'], <AdminTransactions />)} />
          <Route path="/admin/low-stock" element={guard(['admin'], <AdminLowStock />)} />

          <Route path="/manager" element={guard(['warehouseManager'], <ManagerOverview />)} />
          <Route path="/manager/inventory" element={guard(['warehouseManager'], <ManagerInventory />)} />
          <Route path="/manager/products" element={guard(['warehouseManager'], <ManagerProducts />)} />
          <Route path="/manager/stock" element={guard(['warehouseManager'], <ManagerStockMovement />)} />
          <Route path="/manager/transactions" element={guard(['warehouseManager'], <ManagerTransactions />)} />
          <Route path="/manager/low-stock" element={guard(['warehouseManager'], <ManagerLowStock />)} />

          <Route path="/supplier" element={guard(['supplier'], <SupplierProfile />)} />
          <Route path="/supplier/products" element={guard(['supplier'], <SupplierProducts />)} />
          <Route path="/supplier/requests" element={guard(['supplier'], <SupplierRequests />)} />

          <Route path="/sales" element={guard(['salesRepresentative'], <SalesOverview />)} />
          <Route path="/sales/products" element={guard(['salesRepresentative'], <SalesProducts />)} />
          <Route path="/sales/orders" element={guard(['salesRepresentative'], <SalesOrders />)} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
