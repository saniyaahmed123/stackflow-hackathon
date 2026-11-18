import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { AccessDenied, Login, Register } from './pages/Auth';
import {
  AdminLowStock, AdminOrders, AdminOverview, AdminProducts, AdminTransactions,
  AdminUsers, AdminWarehouses,
} from './pages/admin/AdminPages';
import {
  ManagerInventory, ManagerLowStock, ManagerOverview, ManagerStockMovement, ManagerTransactions,
} from './pages/manager/ManagerPages';
import { SupplierProducts, SupplierProfile, SupplierRequests } from './pages/supplier/SupplierPages';
import { SalesOrders, SalesOverview, SalesProducts } from './pages/sales/SalesPages';

const HOME = {
  admin: '/admin',
  warehouseManager: '/manager',
  supplier: '/supplier',
  salesRepresentative: '/sales',
};

const guard = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

function Start() {
  const { user } = useAuth();
  return <Navigate to={HOME[user?.role] || '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<AccessDenied />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Start />} />
          <Route path="/admin" element={guard(['admin'], <AdminOverview />)} />
          <Route path="/admin/users" element={guard(['admin'], <AdminUsers />)} />
          <Route path="/admin/products" element={guard(['admin'], <AdminProducts />)} />
          <Route path="/admin/warehouses" element={guard(['admin'], <AdminWarehouses />)} />
          <Route path="/admin/orders" element={guard(['admin'], <AdminOrders />)} />
          <Route path="/admin/transactions" element={guard(['admin'], <AdminTransactions />)} />
          <Route path="/admin/low-stock" element={guard(['admin'], <AdminLowStock />)} />

          <Route path="/manager" element={guard(['warehouseManager'], <ManagerOverview />)} />
          <Route path="/manager/inventory" element={guard(['warehouseManager'], <ManagerInventory />)} />
          <Route path="/manager/stock" element={guard(['warehouseManager'], <ManagerStockMovement />)} />
          <Route path="/manager/transactions" element={guard(['warehouseManager'], <ManagerTransactions />)} />
          <Route path="/manager/low-stock" element={guard(['warehouseManager'], <ManagerLowStock />)} />

          <Route path="/supplier" element={guard(['supplier'], <SupplierProfile />)} />
          <Route path="/supplier/products" element={guard(['supplier'], <SupplierProducts />)} />
          <Route path="/supplier/requests" element={guard(['supplier'], <SupplierRequests />)} />

          <Route path="/sales" element={guard(['salesRepresentative'], <SalesOverview />)} />
          <Route path="/sales/products" element={guard(['salesRepresentative'], <SalesProducts />)} />
          <Route path="/sales/orders" element={guard(['salesRepresentative'], <SalesOrders />)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
