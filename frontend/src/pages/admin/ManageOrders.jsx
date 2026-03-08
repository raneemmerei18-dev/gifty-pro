import { useEffect, useState } from "react";
import API from "../../api/axios";
import { AdminShell } from "./Dashboard";

const STATUSES = ["pending", "preparing", "shipped", "delivered", "cancelled"];
const PER_PAGE = 10;

/* Generate a readable order number from MongoDB _id + createdAt */
const orderNum = (order) => {
  const d = new Date(order.createdAt);
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `GFT-${y}${m}-${order._id.slice(-5).toUpperCase()}`;
};

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const load = () => API.get("/orders/all").then((res) => {
    // Sort newest first
    const sorted = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setOrders(sorted);
  }).catch(() => flash("Failed to load orders", "error"));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/orders/${id}/status`, { status });
      setOrders(orders.map((o) => (o._id === id ? { ...o, status } : o)));
      if (selectedOrder?._id === id) setSelectedOrder({ ...selectedOrder, status });
      flash("Status updated");
    } catch (err) {
      flash(err.response?.data?.error || "Status update failed", "error");
    }
  };

  const viewDetails = async (id) => {
    try {
      const res = await API.get(`/orders/${id}`);
      setSelectedOrder(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const printInvoice = () => {
    if (!selectedOrder) return;
    const o = selectedOrder;
    const invoiceWindow = window.open("", "_blank");
    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Invoice ${orderNum(o)}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; }
        h1 { color: #1a1a2e; margin-bottom: 5px; }
        .subtitle { color: #888; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e0e0e0; padding: 10px 14px; text-align: left; }
        th { background: #f8f9fa; font-weight: 600; }
        .total-row { font-weight: bold; background: #f0f0ff; }
        .section { margin: 20px 0; }
        .section h3 { color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { padding: 5px 0; }
        .info-label { font-weight: 600; color: #555; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 0.85rem; }
        @media print { body { padding: 20px; } }
      </style></head><body>
        <h1>Gifty Invoice</h1>
        <p class="subtitle">${orderNum(o)} -- ${new Date(o.createdAt).toLocaleDateString()}</p>
        <div class="section">
          <h3>Customer Details</h3>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span> ${o.user?.name || o.delivery?.name || "--"}</div>
            <div class="info-item"><span class="info-label">Email:</span> ${o.user?.email || "--"}</div>
            <div class="info-item"><span class="info-label">Phone:</span> ${o.delivery?.phone || "--"}</div>
            <div class="info-item"><span class="info-label">City:</span> ${o.delivery?.city || "--"}</div>
            <div class="info-item" style="grid-column: 1/-1;"><span class="info-label">Address:</span> ${o.delivery?.address || "--"}</div>
            ${o.delivery?.date ? `<div class="info-item"><span class="info-label">Delivery Date:</span> ${new Date(o.delivery.date).toLocaleDateString()}</div>` : ""}
          </div>
        </div>
        <div class="section">
          <h3>Order Items</h3>
          <table>
            <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${o.items.map((item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join("")}
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Total</td>
                <td>$${o.totalPrice.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="section">
          <h3>Order Status</h3>
          <p><strong>${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</strong></p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with Gifty!</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body></html>
    `);
    invoiceWindow.document.close();
    invoiceWindow.print();
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filter changes
  const changeFilter = (f) => { setFilter(f); setPage(1); };

  return (
    <AdminShell title="Orders" subtitle={`${orders.length} total orders`}>
      {msg.text && <div className={`adm-flash adm-flash--${msg.type}`}>{msg.text}</div>}

      {/* Filter Tabs */}
      <div className="adm-filter-bar">
        <button className={`adm-filter-btn${filter === "all" ? " active" : ""}`} onClick={() => changeFilter("all")}>
          All ({orders.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`adm-filter-btn${filter === s ? " active" : ""}`}
            onClick={() => changeFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({orders.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>

      <div className="adm-orders-layout">
        {/* Orders list */}
        <div className="adm-orders-list">
          {filtered.length === 0 && <p className="muted">No orders found.</p>}
          {paginated.map((order) => (
            <div
              key={order._id}
              className={`adm-order-card${selectedOrder?._id === order._id ? " selected" : ""}`}
              onClick={() => viewDetails(order._id)}
            >
              <div className="adm-order-top">
                <span className="adm-order-id">{orderNum(order)}</span>
                <span className={`adm-badge adm-badge--${order.status}`}>{order.status}</span>
              </div>
              <div className="adm-order-meta">
                <span>{order.user?.name || "Customer"}</span>
                <span>{order.items.length} item(s)</span>
                <span className="adm-money">${order.totalPrice.toFixed(2)}</span>
              </div>
              <div className="adm-order-date">{new Date(order.createdAt).toLocaleDateString()}</div>
              <select
                className="adm-status-select"
                value={order.status}
                onChange={(e) => { e.stopPropagation(); updateStatus(order._id, e.target.value); }}
                onClick={(e) => e.stopPropagation()}
              >
                {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="adm-pagination">
              <button className="adm-btn adm-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span className="adm-page-info">Page {page} of {totalPages}</span>
              <button className="adm-btn adm-btn--sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedOrder && (
          <div className="adm-detail-panel">
            <div className="adm-detail-header">
              <h3>{orderNum(selectedOrder)}</h3>
              <button className="adm-btn adm-btn--sm adm-btn--primary" onClick={printInvoice}>Print Invoice</button>
            </div>

            <div className="adm-detail-section">
              <h4>Customer</h4>
              <p><strong>{selectedOrder.user?.name || "--"}</strong></p>
              <p>{selectedOrder.user?.email || "--"}</p>
            </div>

            <div className="adm-detail-section">
              <h4>Delivery Info</h4>
              <p><strong>Name:</strong> {selectedOrder.delivery?.name}</p>
              <p><strong>Phone:</strong> {selectedOrder.delivery?.phone}</p>
              <p><strong>City:</strong> {selectedOrder.delivery?.city}</p>
              <p><strong>Address:</strong> {selectedOrder.delivery?.address}</p>
              {selectedOrder.delivery?.date && (
                <p><strong>Date:</strong> {new Date(selectedOrder.delivery.date).toLocaleDateString()}</p>
              )}
            </div>

            <div className="adm-detail-section">
              <h4>Items</h4>
              <table className="adm-table adm-table--compact">
                <thead>
                  <tr><th>Item</th><th>Qty</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td className="adm-money">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="adm-detail-total">
                Total: ${selectedOrder.totalPrice.toFixed(2)}
              </div>
            </div>

            <div className="adm-detail-section">
              <h4>Update Status</h4>
              <select
                className="adm-status-select"
                value={selectedOrder.status}
                onChange={(e) => updateStatus(selectedOrder._id, e.target.value)}
              >
                {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
