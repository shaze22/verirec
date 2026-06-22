import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { supabase } from '../../lib/supabase.js';
import { format, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const EMPTY_FORM = {
  subject_id: '',
  invoice_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  line_items: [{ description: 'Counseling Session', qty: 1, unit_price: '' }],
  tax_rate: 0,
  notes: '',
  status: 'draft',
};

function calcTotals(lineItems, taxRate) {
  const subtotal = lineItems.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);
  const taxAmount = subtotal * ((Number(taxRate) || 0) / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

export default function KaunslorBillingPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('counselor_invoices').select('*, subjects(name)').eq('user_id', user.id).order('invoice_date', { ascending: false }),
      supabase.from('subjects').select('id, name').eq('user_id', user.id).order('name'),
    ]).then(([{ data: inv }, { data: sub }]) => {
      setInvoices(inv || []);
      setClients(sub || []);
      // Auto-open create form if ?client= param is set
      const clientId = searchParams.get('client');
      if (clientId) {
        setForm(f => ({ ...f, subject_id: clientId }));
        setShowCreate(true);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const nextInvoiceNo = () => {
    const nums = invoices.map(i => {
      const m = i.invoice_number?.match(/(\d+)$/);
      return m ? parseInt(m[1]) : 0;
    });
    const next = (Math.max(0, ...nums) + 1).toString().padStart(4, '0');
    return `INV-${new Date().getFullYear()}-${next}`;
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, invoice_number: nextInvoiceNo() });
    setShowCreate(true);
  };

  const updateLine = (i, field, val) => {
    setForm(f => {
      const lines = [...f.line_items];
      lines[i] = { ...lines[i], [field]: val };
      return { ...f, line_items: lines };
    });
  };

  const addLine = () => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', qty: 1, unit_price: '' }] }));
  const removeLine = i => setForm(f => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.invoice_date) { toast.error('Invoice date required.'); return; }
    if (form.line_items.some(l => !l.description || !l.unit_price)) {
      toast.error('All line items need a description and price.');
      return;
    }
    setSaving(true);
    try {
      const { subtotal, taxAmount, total } = calcTotals(form.line_items, form.tax_rate);
      const payload = {
        user_id: user.id,
        subject_id: form.subject_id || null,
        invoice_number: form.invoice_number || nextInvoiceNo(),
        invoice_date: form.invoice_date,
        due_date: form.due_date || null,
        line_items: form.line_items,
        subtotal,
        tax_rate: Number(form.tax_rate) || 0,
        tax_amount: taxAmount,
        total,
        status: form.status,
        notes: form.notes || null,
      };
      const { data, error } = await supabase.from('counselor_invoices').insert(payload)
        .select('*, subjects(name)').single();
      if (error) throw error;
      setInvoices(prev => [data, ...prev]);
      setShowCreate(false);
      toast.success('Invoice created!');
    } catch { toast.error('Failed to create invoice.'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (inv, status) => {
    const { error } = await supabase.from('counselor_invoices').update({ status }).eq('id', inv.id);
    if (error) { toast.error('Failed to update status.'); return; }
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status } : i));
  };

  const printInvoice = (inv) => {
    const clientName = inv.subjects?.name || 'Client';
    const lines = inv.line_items || [];
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:600px;margin:0 auto}
  h1{font-size:22px;margin-bottom:4px}
  .meta{color:#555;font-size:12px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th{text-align:left;padding:8px;background:#f3f4f6;font-size:11px;text-transform:uppercase}
  td{padding:8px;border-bottom:1px solid #e5e7eb}
  .totals{text-align:right;margin-top:12px}
  .totals p{margin:4px 0}
  .total{font-size:16px;font-weight:bold}
  @media print{body{padding:20px}}
</style></head><body>
<h1>Invoice</h1>
<div class="meta">
  <strong>${inv.invoice_number}</strong> &nbsp;·&nbsp;
  Date: ${format(parseISO(inv.invoice_date), 'dd MMM yyyy')}
  ${inv.due_date ? ` &nbsp;·&nbsp; Due: ${format(parseISO(inv.due_date), 'dd MMM yyyy')}` : ''}
</div>
<p><strong>Bill To:</strong> ${clientName}</p>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
  <tbody>
    ${lines.map(l => `<tr><td>${l.description}</td><td>${l.qty}</td><td>RM ${Number(l.unit_price).toFixed(2)}</td><td>RM ${(Number(l.qty)*Number(l.unit_price)).toFixed(2)}</td></tr>`).join('')}
  </tbody>
</table>
<div class="totals">
  <p>Subtotal: RM ${inv.subtotal.toFixed(2)}</p>
  ${inv.tax_rate ? `<p>Tax (${inv.tax_rate}%): RM ${inv.tax_amount.toFixed(2)}</p>` : ''}
  <p class="total">Total: RM ${inv.total.toFixed(2)}</p>
</div>
${inv.notes ? `<p style="margin-top:20px;font-size:12px;color:#555"><em>${inv.notes}</em></p>` : ''}
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    win.document.close();
  };

  const filtered = filterStatus === 'all' ? invoices : invoices.filter(i => i.status === filterStatus);
  const totals = { draft: 0, sent: 0, paid: 0 };
  invoices.forEach(i => { if (totals[i.status] !== undefined) totals[i.status] += i.total; });

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Billing</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and track invoices for your practice</p>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl transition-all">+ New Invoice</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[['Paid', totals.paid, 'green'], ['Sent', totals.sent, 'blue'], ['Draft', totals.draft, 'gray']].map(([label, val, color]) => (
            <div key={label} className="rounded-2xl ring-1 ring-gray-100 bg-white shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold text-${color}-600`}>RM {val.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['all', 'draft', 'sent', 'paid', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                filterStatus === s ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-200' : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:ring-violet-400'
              }`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 text-3xl mb-4">🧾</div>
            <p className="text-sm text-gray-500 mb-4">No invoices yet.</p>
            <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl transition-all">+ New Invoice</Button>
          </div>
        ) : filtered.map(inv => {
          const clientName = inv.subjects?.name || '—';
          return (
            <div key={inv.id} className="rounded-2xl ring-1 ring-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{inv.invoice_number}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[inv.status]}`}>{inv.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">{clientName} · {format(parseISO(inv.invoice_date), 'dd MMM yyyy')}{inv.due_date ? ` · Due ${format(parseISO(inv.due_date), 'dd MMM yyyy')}` : ''}</p>
                  <p className="text-base font-bold text-gray-900 mt-1">RM {inv.total.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => printInvoice(inv)} className="text-xs text-violet-600 ring-1 ring-violet-200 rounded-lg px-2.5 py-1.5 hover:bg-violet-50 transition-colors">Print</button>
                  {inv.status === 'draft' && (
                    <button onClick={() => updateStatus(inv, 'sent')} className="text-xs text-blue-600 ring-1 ring-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors">Mark Sent</button>
                  )}
                  {inv.status === 'sent' && (
                    <button onClick={() => updateStatus(inv, 'paid')} className="text-xs text-green-600 ring-1 ring-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-50 transition-colors">Mark Paid</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">New Invoice</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice No.</label>
                  <input value={form.invoice_number} onChange={e => setForm(f => ({...f, invoice_number: e.target.value}))}
                    className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.subject_id} onChange={e => setForm(f => ({...f, subject_id: e.target.value}))}
                    className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">— No client —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input type="date" value={form.invoice_date} onChange={e => setForm(f => ({...f, invoice_date: e.target.value}))}
                    className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))}
                    className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Line Items</label>
                  <button onClick={addLine} className="text-xs text-violet-600 hover:text-violet-800">+ Add line</button>
                </div>
                <div className="space-y-2">
                  {form.line_items.map((line, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description"
                        className="col-span-6 rounded-xl px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      <input type="number" value={line.qty} min="1" onChange={e => updateLine(i, 'qty', e.target.value)} placeholder="Qty"
                        className="col-span-2 rounded-xl px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      <input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} placeholder="Price"
                        className="col-span-3 rounded-xl px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      {form.line_items.length > 1 && (
                        <button onClick={() => removeLine(i)} className="col-span-1 text-red-400 hover:text-red-600 text-center">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input type="number" value={form.tax_rate} min="0" max="100" onChange={e => setForm(f => ({...f, tax_rate: e.target.value}))}
                    className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                    className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Payment instructions, thank you note..."
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>

              {/* Totals preview */}
              {(() => {
                const { subtotal, taxAmount, total } = calcTotals(form.line_items, form.tax_rate);
                return (
                  <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100 rounded-xl p-3 text-right space-y-1">
                    <p className="text-xs text-gray-500">Subtotal: RM {subtotal.toFixed(2)}</p>
                    {Number(form.tax_rate) > 0 && <p className="text-xs text-gray-500">Tax ({form.tax_rate}%): RM {taxAmount.toFixed(2)}</p>}
                    <p className="text-sm font-bold text-gray-900">Total: RM {total.toFixed(2)}</p>
                  </div>
                );
              })()}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <Button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">Cancel</Button>
              <Button onClick={handleSave} loading={saving} className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl transition-all">Create Invoice</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
