import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { config, imageKitConfigured } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Warehouse } from '../models/Warehouse.js';
import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { Order } from '../models/Order.js';
import { SupplyRequest } from '../models/SupplyRequest.js';

if (!imageKitConfigured) {
  throw new Error('IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT must be set before seeding.');
}

const endpoint = String(config.imagekit.urlEndpoint).replace(/\/+$/, '');
const seedImage = (id) => ({
  url: `${endpoint}/seed/${id}.svg`,
  fileId: `seed-${id}`,
});

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

  const supplierImage = seedImage('supplier-tech');
  const supplier2Image = seedImage('supplier-office');

  const admin = await User.create({ name: 'Ayesha Admin', email: 'admin@parcelpoint.pk', password: adminHash, phone: '0300-1111111', role: 'admin' });
  const manager = await User.create({ name: 'Bilal Manager', email: 'manager@parcelpoint.pk', password: managerHash, phone: '0300-2222222', role: 'warehouseManager' });
  const manager2 = await User.create({ name: 'Sana Manager', email: 'manager2@parcelpoint.pk', password: manager2Hash, phone: '0300-2222223', role: 'warehouseManager' });
  const supplier = await User.create({ name: 'Tech Supplies Co.', email: 'supplier@parcelpoint.pk', password: supplierHash, phone: '0300-3333333', role: 'supplier', image: supplierImage.url, imageFileId: supplierImage.fileId });
  const supplier2 = await User.create({ name: 'Office Mart', email: 'supplier2@parcelpoint.pk', password: supplier2Hash, phone: '0300-3333334', role: 'supplier', image: supplier2Image.url, imageFileId: supplier2Image.fileId });
  const sales = await User.create({ name: 'Omar Sales', email: 'sales@parcelpoint.pk', password: salesHash, phone: '0300-4444444', role: 'salesRepresentative' });

  const main = await Warehouse.create({ name: 'Main Warehouse', location: 'Karachi', manager: manager._id, capacity: 10000 });
  const branch = await Warehouse.create({ name: 'Lahore Branch', location: 'Lahore', manager: manager2._id, capacity: 5000 });
  await User.updateMany({ _id: { $in: [manager._id] } }, { $set: { assignedWarehouses: [main._id] } });
  await User.updateMany({ _id: { $in: [manager2._id] } }, { $set: { assignedWarehouses: [branch._id] } });

  const laptopImage = seedImage('laptop');
  const mouseImage = seedImage('mouse');
  const monitorImage = seedImage('monitor');
  const keyboardImage = seedImage('keyboard');
  const cableImage = seedImage('cable');

  const laptop = await Product.create({ name: 'Laptop', sku: 'LAP-001', description: '15-inch business laptop', category: 'Electronics', price: 80000, lowStockLimit: 5, imageUrl: laptopImage.url, imageFileId: laptopImage.fileId, supplier: supplier._id, createdBy: admin._id });
  const mouse = await Product.create({ name: 'Wireless Mouse', sku: 'MOU-002', description: 'Bluetooth mouse', category: 'Accessories', price: 2500, lowStockLimit: 10, imageUrl: mouseImage.url, imageFileId: mouseImage.fileId, supplier: supplier._id, createdBy: admin._id });
  const monitor = await Product.create({ name: 'LED Monitor', sku: 'MON-003', description: '24-inch Full HD monitor', category: 'Electronics', price: 15000, lowStockLimit: 5, imageUrl: monitorImage.url, imageFileId: monitorImage.fileId, supplier: supplier2._id, createdBy: admin._id });
  const keyboard = await Product.create({ name: 'Mechanical Keyboard', sku: 'KEY-004', description: 'RGB mechanical keyboard', category: 'Accessories', price: 8000, lowStockLimit: 20, imageUrl: keyboardImage.url, imageFileId: keyboardImage.fileId, supplier: supplier._id, createdBy: admin._id });
  const cable = await Product.create({ name: 'USB-C Cable', sku: 'CAB-005', description: 'Braided USB-C charging cable', category: 'Accessories', price: 1200, lowStockLimit: 3, imageUrl: cableImage.url, imageFileId: cableImage.fileId, supplier: supplier._id, createdBy: admin._id });

  await Stock.insertMany([
    { product: laptop._id, warehouse: main._id, quantity: 17 },
    { product: mouse._id, warehouse: main._id, quantity: 4 },
    { product: monitor._id, warehouse: main._id, quantity: 12 },
    { product: keyboard._id, warehouse: branch._id, quantity: 25 },
    { product: cable._id, warehouse: main._id, quantity: 0 },
  ]);

  await StockTransaction.insertMany([
    { product: laptop._id, warehouse: main._id, transactionType: 'stock-in', quantity: 20, note: 'Initial purchase', performedBy: manager._id, date: new Date(Date.now() - 864e5 * 4) },
    { product: laptop._id, warehouse: main._id, transactionType: 'stock-out', quantity: 3, note: 'Damaged units', performedBy: manager._id, date: new Date(Date.now() - 864e5 * 3) },
    { product: mouse._id, warehouse: main._id, transactionType: 'stock-in', quantity: 10, note: 'Initial purchase', performedBy: manager._id, date: new Date(Date.now() - 864e5 * 2) },
    { product: mouse._id, warehouse: main._id, transactionType: 'stock-out', quantity: 6, note: 'Counter sales', performedBy: manager._id, date: new Date(Date.now() - 864e5) },
    { product: mouse._id, warehouse: main._id, transactionType: 'stock-in', quantity: 5, note: 'Today restock', performedBy: manager._id, date: new Date() },
    { product: keyboard._id, warehouse: branch._id, transactionType: 'stock-in', quantity: 10, note: 'Supplier replenishment', performedBy: manager2._id, date: new Date() },
  ]);

  await Order.insertMany([
    { orderNumber: 'ORD-SEED-0001', customerName: 'Greenfield Studio', customerPhone: '0301-9876543', products: [{ product: laptop._id, quantity: 2, price: 80000 }], totalAmount: 160000, warehouse: main._id, createdBy: sales._id, status: 'Pending' },
    { orderNumber: 'ORD-SEED-0002', customerName: 'Nomad Books', customerPhone: '0301-9876544', products: [{ product: mouse._id, quantity: 3, price: 2500 }, { product: keyboard._id, quantity: 1, price: 8000 }], totalAmount: 15500, warehouse: main._id, createdBy: sales._id, status: 'Processing' },
    { orderNumber: 'ORD-SEED-0003', customerName: 'Cedar Labs', customerPhone: '0301-9876545', products: [{ product: monitor._id, quantity: 2, price: 15000 }], totalAmount: 30000, warehouse: branch._id, createdBy: sales._id, status: 'Completed' },
    { orderNumber: 'ORD-SEED-0004', customerName: 'Orchard Mart', customerPhone: '0301-9876546', products: [{ product: laptop._id, quantity: 1, price: 80000 }], totalAmount: 80000, warehouse: main._id, createdBy: sales._id, status: 'Cancelled' },
  ]);

  await SupplyRequest.insertMany([
    { supplier: supplier._id, product: mouse._id, warehouse: main._id, quantity: 50, note: 'Restock request', status: 'Pending' },
    { supplier: supplier._id, product: keyboard._id, warehouse: branch._id, quantity: 20, note: 'Approved replenishment', status: 'Approved', reviewedBy: admin._id, reviewedAt: new Date() },
    { supplier: supplier._id, product: cable._id, warehouse: main._id, quantity: 40, note: 'Sample request', status: 'Rejected', reviewNote: 'Out of stock; sample request declined.', reviewedBy: admin._id, reviewedAt: new Date() },
    { supplier: supplier2._id, product: monitor._id, warehouse: branch._id, quantity: 10, note: 'New shipment', status: 'Approved', reviewedBy: admin._id, reviewedAt: new Date() },
  ]);

  console.log('\nSeed complete. Demo accounts are documented in README.md.\n');

  await disconnectDB();
  process.exit(0);
};

run().catch(async (error) => {
  console.error('Seed failed:', error);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
