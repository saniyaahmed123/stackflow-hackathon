import { Router } from 'express';
import { adminOnly, authorize, protect } from '../middleware/auth.js';

import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as products from '../controllers/productController.js';
import * as warehouses from '../controllers/warehouseController.js';
import * as uploads from '../controllers/uploadController.js';
import * as stock from '../controllers/stockController.js';
import * as transactions from '../controllers/transactionController.js';
import * as orders from '../controllers/orderController.js';
import * as supplyRequests from '../controllers/supplyRequestController.js';

const router = Router();

router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);

router.use(protect);

router.get('/auth/me', auth.me);

router.get('/users', adminOnly, users.listUsers);
router.put('/users/me', users.updateMe);
router.get('/users/suppliers', authorize('admin', 'warehouseManager', 'supplier', 'salesRepresentative'), users.listSuppliers);
router.get('/users/suppliers/summary', adminOnly, users.listSupplierSummaries);
router.get('/users/:id', users.getUser);
router.put('/users/:id', adminOnly, users.updateUser);
router.delete('/users/:id', adminOnly, users.deleteUser);

router.get('/products', products.listProducts);
router.post('/products', authorize('admin', 'warehouseManager'), products.createProduct);
router.get('/products/:id', products.getProduct);
router.put('/products/:id', authorize('admin', 'warehouseManager'), products.updateProduct);
router.delete('/products/:id', adminOnly, products.deleteProduct);

router.get('/warehouses', warehouses.listWarehouses);
router.post('/warehouses', adminOnly, warehouses.createWarehouse);
router.get('/warehouses/:id', warehouses.getWarehouse);
router.put('/warehouses/:id', adminOnly, warehouses.updateWarehouse);
router.delete('/warehouses/:id', adminOnly, warehouses.deleteWarehouse);

router.get('/upload/status', uploads.uploadStatus);
router.get('/upload/auth', uploads.uploadAuth);
router.post('/upload/validate', uploads.validateUpload);
router.post('/upload/verify', uploads.verifyUpload);
router.delete('/upload/:fileId', uploads.deleteUpload);

router.get('/stock', stock.listStock);
router.get('/stock/low', authorize('admin', 'warehouseManager'), stock.lowStock);
router.post('/stock/in', authorize('admin', 'warehouseManager'), stock.stockIn);
router.post('/stock/out', authorize('admin', 'warehouseManager'), stock.stockOut);

router.get('/transactions', authorize('admin', 'warehouseManager'), transactions.listTransactions);

router.get('/orders/summary', adminOnly, orders.orderSummary);
router.post('/orders', authorize('admin', 'salesRepresentative'), orders.createOrder);
router.get('/orders', orders.listOrders);
router.get('/orders/:id', orders.getOrder);
router.put('/orders/:id/status', authorize('admin', 'warehouseManager'), orders.updateStatus);
router.put('/orders/:id/cancel', authorize('admin', 'salesRepresentative'), orders.cancelOrder);

router.post('/supply-requests', authorize('supplier'), supplyRequests.createRequest);
router.get('/supply-requests', supplyRequests.listRequests);
router.get('/supply-requests/:id', supplyRequests.getRequest);
router.put('/supply-requests/:id/status', adminOnly, supplyRequests.reviewRequest);

export default router;
