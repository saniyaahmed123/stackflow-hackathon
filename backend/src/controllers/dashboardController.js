import { SupplyRequest } from '../models/SupplyRequest.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { User } from '../models/User.js';
import { Warehouse } from '../models/Warehouse.js';
import { assignedWarehouseIds } from '../middleware/auth.js';
import { asyncHandler, ok } from '../utils/http.js';

const ORDER_STATUSES = ['Pending', 'Processing', 'Completed', 'Cancelled'];
const REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected'];

const emptyCounts = (statuses) =>
  statuses.reduce((counts, status) => ({ ...counts, [status]: 0 }), {});

const countRowsByStatus = (rows, statuses) => {
  const counts = emptyCounts(statuses);
  for (const row of rows) {
    if (statuses.includes(row._id)) counts[row._id] = Number(row.count) || 0;
  }
  return counts;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfTrend = () => {
  const date = startOfToday();
  date.setDate(date.getDate() - 6);
  return date;
};

const dayKey = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const buildMovementTrend = (rows) => {
  const start = startOfTrend();
  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return {
      date: dayKey(day),
      label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      stockIn: 0,
      stockOut: 0,
    };
  });
  const byDay = new Map(trend.map((point) => [point.date, point]));
  for (const row of rows) {
    const point = byDay.get(dayKey(row.date));
    if (!point) continue;
    const quantity = Number(row.quantity) || 0;
    if (row.transactionType === 'stock-in') point.stockIn += quantity;
    if (row.transactionType === 'stock-out') point.stockOut += quantity;
  }
  return trend;
};

const stockView = (stock) => ({
  id: String(stock._id),
  productId: String(stock.product?._id || stock.product),
  productName: stock.product?.name || '',
  sku: stock.product?.sku || '',
  warehouseId: String(stock.warehouse?._id || stock.warehouse),
  warehouseName: stock.warehouse?.name || '',
  quantity: Number(stock.quantity) || 0,
  lowStockLimit: Number(stock.product?.lowStockLimit) || 0,
});

export const adminSummary = asyncHandler(async (_req, res) => {
  const [users, products, warehouses, suppliers, orders, orderRows, stocks, todayTransactions, recentOrders, recentTransactions, recentRequests, trendRows] =
    await Promise.all([
      User.countDocuments({}),
      Product.countDocuments({}),
      Warehouse.countDocuments({}),
      User.countDocuments({ role: 'supplier' }),
      Order.countDocuments({}),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Stock.find({})
        .populate('product', 'name sku lowStockLimit')
        .populate('warehouse', 'name')
        .lean(),
      StockTransaction.countDocuments({ date: { $gte: startOfToday() } }),
      Order.find({})
        .select('orderNumber customerName status totalAmount createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      StockTransaction.find({})
        .populate('product', 'name sku imageUrl')
        .populate('warehouse', 'name')
        .populate('performedBy', 'name')
        .sort({ date: -1 })
        .limit(5)
        .lean(),
      SupplyRequest.find({})
        .populate('product', 'name sku')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      StockTransaction.find({ date: { $gte: startOfTrend() } })
        .select('date transactionType quantity')
        .lean(),
    ]);

  const recentActivity = [
    ...recentOrders.map((order) => ({
      type: 'order',
      id: String(order._id),
      title: `Order ${order.orderNumber}`,
      detail: order.customerName,
      at: order.createdAt,
    })),
    ...recentTransactions.map((transaction) => ({
      type: 'stock-transaction',
      id: String(transaction._id),
      title: `${transaction.transactionType === 'stock-in' ? 'Stock in' : 'Stock out'}: ${transaction.product?.name || 'Product'}`,
      detail: transaction.warehouse?.name || '',
      at: transaction.date,
    })),
    ...recentRequests.map((request) => ({
      type: 'supply-request',
      id: String(request._id),
      title: `Supply request: ${request.product?.name || 'Product'}`,
      detail: request.status,
      at: request.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 8);

  return ok(res, {
    role: 'admin',
    totals: { users, products, warehouses, suppliers, orders },
    ordersByStatus: countRowsByStatus(orderRows, ORDER_STATUSES),
    lowStockCount: stocks.filter(
      (stock) => stock.product && Number(stock.quantity) < Number(stock.product.lowStockLimit || 0)
    ).length,
    outOfStockCount: stocks.filter((stock) => Number(stock.quantity) === 0).length,
    todayStockTransactions: todayTransactions,
    stockMovementTrend: buildMovementTrend(trendRows),
    recentActivity,
    recentTransactions: recentTransactions.map((transaction) => ({
      id: String(transaction._id),
      reference: `TX-${String(transaction._id).slice(-6).toUpperCase()}`,
      productName: transaction.product?.name || 'Deleted product',
      sku: transaction.product?.sku || '-',
      productImage: transaction.product?.imageUrl || '',
      warehouseName: transaction.warehouse?.name || '-',
      transactionType: transaction.transactionType,
      quantity: Number(transaction.quantity) || 0,
      note: transaction.note || '',
      performedBy: transaction.performedBy?.name || '-',
      at: transaction.date,
    })),
  });
});

export const managerSummary = asyncHandler(async (req, res) => {
  const warehouseIds = assignedWarehouseIds(req.user);
  const [warehouses, stocks, usageRows, movements, todayTransactions, trendRows] =
    await Promise.all([
      Warehouse.find({ _id: { $in: warehouseIds } }).lean(),
      Stock.find({ warehouse: { $in: warehouseIds } })
        .populate('product', 'name sku lowStockLimit')
        .populate('warehouse', 'name')
        .lean(),
      Stock.aggregate([
        { $match: { warehouse: { $in: warehouseIds } } },
        { $group: { _id: '$warehouse', usedCapacity: { $sum: '$quantity' } } },
      ]),
      StockTransaction.find({ warehouse: { $in: warehouseIds } })
        .populate('product', 'name sku')
        .populate('warehouse', 'name')
        .populate('performedBy', 'name')
        .sort({ date: -1 })
        .limit(8)
        .lean(),
      StockTransaction.countDocuments({
        warehouse: { $in: warehouseIds },
        date: { $gte: startOfToday() },
      }),
      StockTransaction.find({
        warehouse: { $in: warehouseIds },
        date: { $gte: startOfTrend() },
      })
        .select('date transactionType quantity')
        .lean(),
    ]);

  const productCount = new Set(
    stocks
      .map((stock) => String(stock.product?._id || stock.product || ''))
      .filter(Boolean),
  ).size;

  const usage = new Map(usageRows.map((row) => [String(row._id), Number(row.usedCapacity) || 0]));
  const assigned = warehouses.map((warehouse) => {
    const usedCapacity = usage.get(String(warehouse._id)) || 0;
    const capacity = Number(warehouse.capacity) || 0;
    return {
      id: String(warehouse._id),
      name: warehouse.name,
      location: warehouse.location,
      capacity,
      usedCapacity,
      remainingCapacity: Math.max(capacity - usedCapacity, 0),
    };
  });

  const lowStockItems = stocks
    .filter((stock) => stock.product && Number(stock.quantity) < Number(stock.product.lowStockLimit || 0))
    .map(stockView);
  const outOfStockItems = stocks.filter((stock) => Number(stock.quantity) === 0).map(stockView);

  return ok(res, {
    role: 'warehouseManager',
    totals: { products: productCount, warehouses: assigned.length },
    warehouses: assigned,
    lowStockItems,
    outOfStockItems,
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    todayStockTransactions: todayTransactions,
    stockMovementTrend: buildMovementTrend(trendRows),
    recentStockMovements: movements.map((transaction) => ({
      id: String(transaction._id),
      type: transaction.transactionType,
      productName: transaction.product?.name || '',
      sku: transaction.product?.sku || '',
      warehouseName: transaction.warehouse?.name || '',
      quantity: Number(transaction.quantity) || 0,
      at: transaction.date,
    })),
    recentTransactions: movements.map((transaction) => ({
      id: String(transaction._id),
      reference: `TX-${String(transaction._id).slice(-6).toUpperCase()}`,
      productName: transaction.product?.name || 'Deleted product',
      sku: transaction.product?.sku || '-',
      productImage: transaction.product?.imageUrl || '',
      warehouseName: transaction.warehouse?.name || '-',
      transactionType: transaction.transactionType,
      quantity: Number(transaction.quantity) || 0,
      note: transaction.note || '',
      performedBy: transaction.performedBy?.name || '-',
      at: transaction.date,
    })),
  });
});

export const supplierSummary = asyncHandler(async (req, res) => {
  const products = await Product.find({ supplier: req.user._id }).lean();
  const [requests, stockRows] = await Promise.all([
    SupplyRequest.find({ supplier: req.user._id })
      .populate('product', 'name sku')
      .populate('warehouse', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    Stock.aggregate([
      { $match: { product: { $in: products.map((product) => product._id) } } },
      { $group: { _id: '$product', totalStock: { $sum: '$quantity' } } },
    ]),
  ]);

  const totals = new Map(stockRows.map((row) => [String(row._id), Number(row.totalStock) || 0]));
  const productViews = products.map((product) => ({
    id: String(product._id),
    name: product.name,
    sku: product.sku,
    price: Number(product.price) || 0,
    archived: Boolean(product.archived),
    totalStock: totals.get(String(product._id)) || 0,
  }));

  const counts = emptyCounts(REQUEST_STATUSES);
  for (const request of requests) {
    if (REQUEST_STATUSES.includes(request.status)) counts[request.status] += 1;
  }

  return ok(res, {
    role: 'supplier',
    products: productViews,
    productCount: productViews.length,
    supplyRequestsByStatus: counts,
    recentRequests: requests.slice(0, 8).map((request) => ({
      id: String(request._id),
      productName: request.product?.name || '',
      sku: request.product?.sku || '',
      warehouseName: request.warehouse?.name || '',
      quantity: Number(request.quantity) || 0,
      status: request.status,
      at: request.createdAt,
    })),
  });
});

export const salesSummary = asyncHandler(async (req, res) => {
  const [orderRows, orders] = await Promise.all([
    Order.aggregate([
      { $match: { createdBy: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSalesValue: {
            $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalAmount', 0] },
          },
        },
      },
    ]),
    Order.find({ createdBy: req.user._id })
      .populate('warehouse', 'name')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  const statusRows = await Order.aggregate([
    { $match: { createdBy: req.user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const row = orderRows[0] || {};

  return ok(res, {
    role: 'salesRepresentative',
    totalOrders: Number(row.totalOrders) || 0,
    totalSalesValue: Number(row.totalSalesValue) || 0,
    ordersByStatus: countRowsByStatus(statusRows, ORDER_STATUSES),
    recentOrders: orders.map((order) => ({
      id: String(order._id),
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      warehouseName: order.warehouse?.name || '',
      totalAmount: Number(order.totalAmount) || 0,
      status: order.status,
      at: order.createdAt,
    })),
  });
});
