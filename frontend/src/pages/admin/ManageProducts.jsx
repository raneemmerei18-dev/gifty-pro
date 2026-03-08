import { useEffect, useState } from "react";
import API from "../../api/axios";
import { AdminShell } from "./Dashboard";

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", modelPath: "", scale: "0.05", category: "general", stock: "",
  });
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [uploading, setUploading] = useState(false);

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const load = () => API.get("/products/all").then((res) => setProducts(res.data)).catch(() => flash("Failed to load products", "error"));
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Handle 3D model file upload
  const handleModelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".glb")) {
      flash("Only .glb files are supported", "error");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("model", file);

    try {
      const res = await API.post("/products/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm({ ...form, modelPath: res.data.modelPath });
      flash("Model uploaded successfully");
    } catch (err) {
      flash(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { flash("Product name is required", "error"); return; }
    if (!form.price || Number(form.price) <= 0) { flash("Price must be greater than 0", "error"); return; }
    const data = { ...form, price: Number(form.price), stock: Number(form.stock) || 0, scale: Number(form.scale) || 0.05 };
    try {
      if (editId) {
        await API.put(`/products/${editId}`, data);
        flash("Product updated successfully");
      } else {
        await API.post("/products", data);
        flash("Product created successfully");
      }
      setForm({ name: "", description: "", price: "", modelPath: "", category: "general", stock: "" });
      setEditId(null);
      load();
    } catch (err) {
      flash(err.response?.data?.error || "Failed to save product", "error");
    }
  };

  const startEdit = (p) => {
    setEditId(p._id);
    setForm({
      name: p.name, description: p.description, price: p.price,
      modelPath: p.modelPath || "", scale: String(p.scale || "0.05"), category: p.category, stock: p.stock,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this product?")) {
      try {
        await API.delete(`/products/${id}`);
        flash("Product deleted");
        load();
      } catch (err) {
        flash(err.response?.data?.error || "Delete failed", "error");
      }
    }
  };

  const toggleActive = async (id) => {
    try {
      await API.patch(`/products/${id}/toggle`);
      load();
    } catch (err) {
      flash("Toggle failed", "error");
    }
  };

  const resetForm = () => {
    setEditId(null);
    setForm({ name: "", description: "", price: "", modelPath: "", scale: "0.05", category: "general", stock: "" });
  };

  return (
    <AdminShell title="Products" subtitle={`${products.length} products total`}>
      {msg.text && <div className={`adm-flash adm-flash--${msg.type}`}>{msg.text}</div>}
      {/* Table */}
      <section className="adm-card">
        <h3 className="adm-card-title">All Products</h3>
        {products.length === 0 ? (
          <p className="muted">No products yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className={!p.isActive ? "adm-row-muted" : ""}>
                    <td className="adm-cell-bold">{p.name}</td>
                    <td>{p.category}</td>
                    <td className="adm-money">${Number(p.price).toFixed(2)}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span className={`adm-badge ${p.isActive ? "adm-badge--success" : "adm-badge--danger"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="adm-actions-cell">
                      <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => startEdit(p)}>Edit</button>
                      <button
                        className={`adm-btn adm-btn--sm ${p.isActive ? "adm-btn--warning" : "adm-btn--success"}`}
                        onClick={() => toggleActive(p._id)}
                      >
                        {p.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => handleDelete(p._id)}>Delete</button>
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
        <h3 className="adm-card-title">{editId ? "Edit Product" : "Add New Product"}</h3>
        <form onSubmit={handleSubmit} className="adm-form">
          <div className="adm-form-row">
            <div className="adm-field">
              <label>Name</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Product name" />
            </div>
            <div className="adm-field">
              <label>Category</label>
              <select name="category" value={form.category} onChange={handleChange}>
                {["general", "graduation", "wedding", "birthday"].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="adm-field">
            <label>Description</label>
            <input name="description" value={form.description} onChange={handleChange} placeholder="Short description" />
          </div>
          <div className="adm-form-row">
            <div className="adm-field">
              <label>Price ($)</label>
              <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required placeholder="0.00" />
            </div>
            <div className="adm-field">
              <label>Stock</label>
              <input name="stock" type="number" value={form.stock} onChange={handleChange} placeholder="0" />
            </div>
          </div>
          <div className="adm-field">
            <label>3D Model (.glb file) {uploading && <span style={{ color: "#f39c12" }}>Uploading...</span>}</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input 
                type="file" 
                accept=".glb" 
                onChange={handleModelUpload}
                disabled={uploading}
                style={{ flex: 1 }}
              />
              {form.modelPath && (
                <span style={{ fontSize: "0.85rem", color: "#27ae60" }}>✓ {form.modelPath}</span>
              )}
            </div>
          </div>
          <div className="adm-field">
            <label>3D Model Scale (0.01=tiny, 0.05=small, 0.1=normal, 0.5=large, 1=very large)</label>
            <input name="scale" type="number" step="0.01" min="0.001" value={form.scale} onChange={handleChange} placeholder="0.05" />
          </div>
          <div className="adm-form-actions">
            <button type="submit" className="adm-btn adm-btn--primary">
              {editId ? "Update Product" : "Add Product"}
            </button>
            {editId && (
              <button type="button" className="adm-btn adm-btn--ghost" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
