import { useEffect, useState } from "react";
import API from "../../api/axios";
import { AdminShell } from "./Dashboard";

export default function ManageReadyBoxes() {
  const [readyBoxes, setReadyBoxes] = useState([]);
  const [giftBoxes, setGiftBoxes] = useState([]);
  const [products, setProducts] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", giftBox: "", image: "" });
  const [selectedItems, setSelectedItems] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const load = () => {
    API.get("/readyboxes/all").then((res) => setReadyBoxes(res.data)).catch(() => flash("Failed to load ready boxes", "error"));
    API.get("/giftboxes").then((res) => setGiftBoxes(res.data)).catch(() => {});
    API.get("/products/all").then((res) => setProducts(res.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addItemToSelection = (productId) => {
    const existing = selectedItems.find((i) => i.product === productId);
    if (existing) {
      setSelectedItems(selectedItems.map((i) =>
        i.product === productId ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { product: productId, quantity: 1 }]);
    }
  };

  const removeItemFromSelection = (productId) => {
    setSelectedItems(selectedItems.filter((i) => i.product !== productId));
  };

  const updateItemQty = (productId, qty) => {
    if (qty <= 0) { removeItemFromSelection(productId); return; }
    setSelectedItems(selectedItems.map((i) =>
      i.product === productId ? { ...i, quantity: qty } : i
    ));
  };

  const selectedBoxObj = giftBoxes.find((b) => b._id === form.giftBox);
  const itemsTotal = selectedItems.reduce((sum, si) => {
    const prod = products.find((p) => p._id === si.product);
    return sum + (prod?.price || 0) * si.quantity;
  }, 0);
  const autoPrice = (selectedBoxObj?.basePrice || 0) + itemsTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { flash("Ready box name is required", "error"); return; }
    if (!form.giftBox) { flash("Please select a box type", "error"); return; }
    if (selectedItems.length === 0) { flash("Please add at least one item", "error"); return; }
    const data = { ...form, items: selectedItems };
    try {
      if (editId) {
        await API.put(`/readyboxes/${editId}`, data);
        flash("Ready box updated successfully");
      } else {
        await API.post("/readyboxes", data);
        flash("Ready box created successfully");
      }
      resetForm();
      load();
    } catch (err) {
      flash(err.response?.data?.error || "Failed to save ready box", "error");
    }
  };

  const resetForm = () => {
    setEditId(null);
    setForm({ name: "", description: "", giftBox: "", image: "" });
    setSelectedItems([]);
  };

  const startEdit = (rb) => {
    setEditId(rb._id);
    setForm({
      name: rb.name,
      description: rb.description || "",
      giftBox: rb.giftBox?._id || "",
      image: rb.image || "",
    });
    setSelectedItems(rb.items.map((i) => ({ product: i.product?._id || i.product, quantity: i.quantity })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this ready box?")) {
      try {
        await API.delete(`/readyboxes/${id}`);
        flash("Ready box deleted");
        load();
      } catch (err) {
        flash(err.response?.data?.error || "Delete failed", "error");
      }
    }
  };

  const toggleActive = async (rb) => {
    try {
      await API.put(`/readyboxes/${rb._id}`, { isActive: !rb.isActive });
      load();
    } catch (err) {
      flash("Toggle failed", "error");
    }
  };

  return (
    <AdminShell title="Ready Boxes" subtitle="Create pre-made gift sets for customers">
      {msg.text && <div className={`adm-flash adm-flash--${msg.type}`}>{msg.text}</div>}
      {/* Table */}
      <section className="adm-card">
        <h3 className="adm-card-title">All Ready Boxes ({readyBoxes.length})</h3>
        {readyBoxes.length === 0 ? (
          <p className="muted">No ready boxes created yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr><th>Name</th><th>Box Type</th><th>Items</th><th>Price</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {readyBoxes.map((rb) => (
                  <tr key={rb._id} className={!rb.isActive ? "adm-row-muted" : ""}>
                    <td className="adm-cell-bold">{rb.name}</td>
                    <td>{rb.giftBox?.name || "--"}</td>
                    <td>{rb.items.length}</td>
                    <td className="adm-money">${rb.totalPrice.toFixed(2)}</td>
                    <td>
                      <span className={`adm-badge ${rb.isActive ? "adm-badge--success" : "adm-badge--danger"}`}>
                        {rb.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="adm-actions-cell">
                      <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => startEdit(rb)}>Edit</button>
                      <button
                        className={`adm-btn adm-btn--sm ${rb.isActive ? "adm-btn--warning" : "adm-btn--success"}`}
                        onClick={() => toggleActive(rb)}
                      >
                        {rb.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => handleDelete(rb._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Form */}
      <section className="adm-card">
        <h3 className="adm-card-title">{editId ? "Edit Ready Box" : "Create Ready Box"}</h3>
        <form onSubmit={handleSubmit} className="adm-form">
          <div className="adm-form-row">
            <div className="adm-field">
              <label>Name</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Ready box name" />
            </div>
            <div className="adm-field">
              <label>Box Type</label>
              <select name="giftBox" value={form.giftBox} onChange={handleChange} required>
                <option value="">Select box type...</option>
                {giftBoxes.map((b) => (
                  <option key={b._id} value={b._id}>{b.name} (${b.basePrice})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="adm-field">
            <label>Description</label>
            <input name="description" value={form.description} onChange={handleChange} placeholder="Short description" />
          </div>
          <div className="adm-field">
            <label>Image URL (optional)</label>
            <input name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
          </div>

          {/* Item selector */}
          <div className="adm-item-selector">
            <h4 className="adm-card-title" style={{ fontSize: "0.9rem", marginBottom: "0.6rem" }}>Select Items</h4>
            <div className="adm-avail-list">
              {products.filter((p) => p.isActive).map((p) => (
                <div key={p._id} className="adm-avail-row">
                  <span>{p.name} -- ${p.price.toFixed(2)}</span>
                  <button type="button" className="adm-btn adm-btn--sm adm-btn--primary" onClick={() => addItemToSelection(p._id)}>Add</button>
                </div>
              ))}
            </div>
            {selectedItems.length > 0 && (
              <div className="adm-selected-list">
                <h4 style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0.6rem 0 0.4rem" }}>Selected</h4>
                {selectedItems.map((si) => {
                  const prod = products.find((p) => p._id === si.product);
                  return (
                    <div key={si.product} className="adm-sel-row">
                      <span>{prod?.name || "Unknown"}</span>
                      <div className="adm-sel-controls">
                        <input
                          type="number" min="1" value={si.quantity}
                          onChange={(e) => updateItemQty(si.product, Number(e.target.value))}
                          className="adm-qty-input"
                        />
                        <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => removeItemFromSelection(si.product)}>
                          Remove
                        </button>
                      </div>
                      <span className="adm-money">${((prod?.price || 0) * si.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="adm-auto-price">
              Auto Price: ${autoPrice.toFixed(2)}
            </div>
          </div>

          <div className="adm-form-actions">
            <button type="submit" className="adm-btn adm-btn--primary">{editId ? "Update Ready Box" : "Create Ready Box"}</button>
            {editId && <button type="button" className="adm-btn adm-btn--ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
