import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Warehouse } from '../models/Warehouse.js';
import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { Order } from '../models/Order.js';
import { SupplyRequest } from '../models/SupplyRequest.js';

const swatch = (label, color) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" rx="24" fill="${color}"/><text x="120" y="132" text-anchor="middle" font-family="Arial" font-size="28" fill="#fff">${label}</text></svg>`
  )}`;

const run = async () => {
  await connectDB(config.mongoUri);
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Stock.deleteMany({}),
    StockTransaction.deleteMany({}),
    Order.deleteMany({}),
    SupplyRequest.deleteMany({}),
  ]);

  const hash = (value) => bcrypt.hash(value, 10);
  const [adminHash, managerHash, manager2Hash, supplierHash, supplier2Hash, salesHash] = await Promise.all([
    hash('admin123'),
    hash('manager123'),
    hash('manager2123'),
    hash('supplier123'),
    hash('supplier2123'),
    hash('sales123'),
  ]);

  const admin = await User.create({ name: 'Ayesha Admin', email: 'admin@stockflow.pk', password: adminHash, phone: '0300-1111111', role: 'admin' });
  const manager = await User.create({ name: 'Bilal Manager', email: 'manager@stockflow.pk', password: managerHash, phone: '0300-2222222', role: 'warehouseManager' });
  const manager2 = await User.create({ name: 'Sana Manager', email: 'manager2@stockflow.pk', password: manager2Hash, phone: '0300-2222223', role: 'warehouseManager' });
  const supplier = await User.create({ name: 'Tech Supplies Co.', email: 'supplier@stockflow.pk', password: supplierHash, phone: '0300-3333333', role: 'supplier', image: swatch('TS', '#2563eb') });
  const supplier2 = await User.create({ name: 'Office Mart', email: 'supplier2@stockflow.pk', password: supplier2Hash, phone: '0300-3333334', role: 'supplier', image: swatch('OM', '#7c3aed') });
  const sales = await User.create({ name: 'Omar Sales', email: 'sales@stockflow.pk', password: salesHash, phone: '0300-4444444', role: 'salesRepresentative' });

  const main = await Warehouse.create({ name: 'Main Warehouse', location: 'Karachi', manager: manager._id, capacity: 10000 });
  const branch = await Warehouse.create({ name: 'Lahore Branch', location: 'Lahore', manager: manager2._id, capacity: 5000 });
  await User.updateMany({ _id: { $in: [manager._id] } }, { $set: { assignedWarehouses: [main._id] } });
  await User.updateMany({ _id: { $in: [manager2._id] } }, { $set: { assignedWarehouses: [branch._id] } });

  const laptop = await Product.create({ name: 'Laptop', sku: 'LAP-001', description: '15-inch business laptop', category: 'Electronics', price: 80000, lowStockLimit: 5, imageUrl: swatch('LAPTOP', '#0f172a'), supplier: supplier._id, createdBy: admin._id });
  const mouse = await Product.create({ name: 'Wireless Mouse', sku: 'MOU-002', description: 'Bluetooth mouse', category: 'Accessories', price: 2500, lowStockLimit: 10, imageUrl: swatch('MOUSE', '#334155'), supplier: supplier._id, createdBy: admin._id });
  const monitor = await Product.create({ name: 'LED Monitor', sku: 'MON-003', description: '24-inch Full HD monitor', category: 'Electronics', price: 15000, lowStockLimit: 5, imageUrl: swatch('MONITOR', '#1d4ed8'), supplier: supplier2._id, createdBy: admin._id });
  const keyboard = await Product.create({ name: 'Mechanical Keyboard', sku: 'KEY-004', description: 'RGB mechanical keyboard', category: 'Accessories', price: 8000, lowStockLimit: 20, imageUrl: swatch('KEYBOARD', '#be123c'), supplier: supplier._id, createdBy: admin._id });

  await Stock.insertMany([
    { product: laptop._id, warehouse: main._id, quantity: 17 },
    { product: mouse._id, warehouse: main._id, quantity: 4 },
    { product: monitor._id, warehouse: main._id, quantity: 12 },
    { product: keyboard._id, warehouse: branch._id, quantity: 25 },
  ]);

  await StockTransaction.insertMany([
    { product: laptop._id, warehouse: main._id, transactionType: 'stock-in', quantity: 20, note: 'Initial purchase', performedBy: manager._id, date: new Date(Date.now() - 864e5 * 4) },
    { product: laptop._id, warehouse: main._id, transactionType: 'stock-out', quantity: 3, note: 'Damaged units', performedBy: manager._id, date: new Date(Date.now() - 864e5 * 3) },
    { product: mouse._id, warehouse: main._id, transactionType: 'stock-in', quantity: 10, note: 'Initial purchase', performedBy: manager._id, date: new Date(Date.now() - 864e5 * 2) },
    { product: mouse._id, warehouse: main._id, transactionType: 'stock-out', quantity: 6, note: 'Counter sales', performedBy: manager._id, date: new Date(Date.now() - 864e5) },
  ]);

  await Order.create({
    orderNumber: 'ORD-SEED-0001',
    customerName: 'Greenfield Studio',
    customerPhone: '0301-9876543',
    products: [{ product: laptop._id, quantity: 2, price: 80000 }],
    totalAmount: 160000,
    warehouse: main._id,
    createdBy: sales._id,
    status: 'Pending',
  });

  await SupplyRequest.insertMany([
    { supplier: supplier._id, product: mouse._id, warehouse: main._id, quantity: 50, note: 'Restock request', status: 'Pending' },
    { supplier: supplier2._id, product: monitor._id, warehouse: branch._id, quantity: 10, note: 'New shipment', status: 'Approved', reviewedBy: admin._id, reviewedAt: new Date() },
  ]);

  console.log('\nSeed complete. Test credentials (password shown):');
  console.log('  admin@stockflow.pk / admin123');
  console.log('  manager@stockflow.pk / manager123   (Main Warehouse)');
  console.log('  manager2@stockflow.pk / manager2123 (Lahore Branch)');
  console.log('  supplier@stockflow.pk / supplier123');
  console.log('  sales@stockflow.pk / sales123');
  console.log('  supplier2@stockflow.pk / supplier2123\n');

  await disconnectDB();
  process.exit(0);
};

run().catch(async (error) => {
  console.error('Seed failed:', error);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
