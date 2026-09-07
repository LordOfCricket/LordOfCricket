import { Trash2, Upload, Pencil, X } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout.jsx'
import { useAdminMerchandise, MERCHANDISE_STATUSES, STATUS_LABELS } from '../../hooks/useAdminMerchandise.js'
import { formatPrice } from '../../lib/money.js'

const INPUT = 'rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500'
const FILE_INPUT = `${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-emerald-950`

const money = (value) => formatPrice(value) ?? '—'

// Shared field set — the "reusable product form" for both Add and Edit.
function ProductFields({ form, setForm, requireImage }) {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">Product name *</label>
          <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })} className={INPUT} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">Category</label>
          <input type="text" value={form.category} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Jersey" className={INPUT} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-300">Description</label>
        <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={INPUT} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">Selling price (₹) *</label>
          <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => set({ sellingPrice: e.target.value })} className={INPUT} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">Original price (₹)</label>
          <input type="number" min="0" step="0.01" value={form.originalPrice} onChange={(e) => set({ originalPrice: e.target.value })} className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">Display order</label>
          <input type="number" min="0" step="1" value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} className={INPUT} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">Status</label>
          <select value={form.status} onChange={(e) => set({ status: e.target.value })} className={INPUT}>
            {MERCHANDISE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">{requireImage ? 'Product image *' : 'Replace image (optional)'}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => set({ file: e.target.files[0] || null })}
            className={FILE_INPUT}
            required={requireImage}
          />
        </div>
      </div>
    </>
  )
}

export default function AdminMerchandisePage() {
  const {
    products,
    loading,
    listError,
    addForm,
    setAddForm,
    submitting,
    error,
    handleAdd,
    editingId,
    editForm,
    setEditForm,
    editSubmitting,
    editError,
    startEdit,
    cancelEdit,
    saveEdit,
    changeStatus,
    handleDelete,
  } = useAdminMerchandise()

  return (
    <AdminLayout title="Merchandise" subtitle="Shown in the LOC store — only Active and Out of Stock products appear on the public homepage.">
      <div className="flex flex-col gap-8">
        <form onSubmit={handleAdd} className="flex flex-col gap-4 rounded-[28px] border border-white/15 bg-slate-900/45 p-6 shadow-2xl backdrop-blur-2xl">
          <h2 className="text-lg font-semibold text-white">Add Product</h2>
          <ProductFields form={addForm} setForm={setAddForm} requireImage />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !addForm.file || !addForm.name || !addForm.sellingPrice}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-md shadow-emerald-500/30 transition-all hover:shadow-emerald-400/50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {submitting ? 'Uploading…' : 'Add Product'}
          </button>
        </form>

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-white">Current Products {loading ? '' : `(${products.length})`}</h2>
          {listError && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{listError}</p>}

          {loading ? (
            <p className="text-slate-300">Loading…</p>
          ) : products.length === 0 ? (
            <p className="rounded-2xl bg-white/10 p-5 text-slate-300">No products yet — add one above.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <img src={product.imageUrl} alt={product.name} className="h-16 w-16 shrink-0 rounded-lg bg-white/5 object-cover" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{product.name}</p>
                        <p className="truncate text-sm text-slate-400">
                          {product.category || 'Uncategorised'} · {money(product.sellingPrice)}
                          {product.onSale && <span className="ml-1 text-slate-500 line-through">{money(product.originalPrice)}</span>}
                          {' · '}#{product.sortOrder}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <select
                        value={product.status}
                        onChange={(e) => changeStatus(product, e.target.value)}
                        className="rounded-xl border border-white/15 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {MERCHANDISE_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => (editingId === product.id ? cancelEdit() : startEdit(product))}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingId === product.id && (
                    <form onSubmit={saveEdit} className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3">
                      <ProductFields form={editForm} setForm={setEditForm} />
                      {editError && <p className="text-sm text-rose-300">{editError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={editSubmitting}
                          className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
                        >
                          {editSubmitting ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
