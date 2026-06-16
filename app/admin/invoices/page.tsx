"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  Search,
  Download,
  Eye,
  Send,
  CreditCard,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Power,
  CalendarClock,
  Printer,
  Percent,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createAuditLog } from "@/lib/audit-log-client";
import { formatSle, formatUsd } from "@/lib/currency";
import {
  getAppliedPaymentAmount,
  getInvoicePaymentSummary,
  moneyNumber,
} from "@/lib/payment-summary";
import { toast } from "sonner";

type InvoiceRecord = {
  id: string;
  booking_id: string | null;
  client_id: string | null;
  invoice_number: string;
  amount: number;
  tax_amount: number | null;
  total_amount: number;
  subtotal_amount?: number | null;
  currency?: string | null;
  payment_currency?: string | null;
  exchange_rate?: number | null;
  subtotal_amount_sle?: number | null;
  tax_amount_sle?: number | null;
  discount_amount_sle?: number | null;
  total_amount_sle?: number | null;
  discount_type?: "none" | "fixed" | "percentage" | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  discount_reason?: string | null;
  payment_status: "pending" | "partial" | "paid" | "overdue" | "cancelled";
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    profile?: {
      full_name: string | null;
      email: string | null;
    };
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  booking?: {
    id: string;
    booking_date: string;
    exchange_rate?: number | null;
    service?: {
      name: string;
    } | null;
  } | null;
  payments?: Array<{
    id?: string;
    amount: number;
    applied_amount?: number | null;
    tip_amount?: number | null;
    payment_method?: string | null;
    payment_channel?: string | null;
    payment_processor?: string | null;
    transaction_id?: string | null;
    customer_reference?: string | null;
    payment_status?: string | null;
    payment_date?: string | null;
    notes?: string | null;
    created_at?: string | null;
  }>;
  paidSle?: number;
  tipsSle?: number;
  balanceSle?: number;
  derivedStatus?: string;
};


type CustomerPaymentLink = {
  id: string;
  booking_id: string | null;
  invoice_id: string | null;
  client_id: string | null;
  token: string;
  status: 'active' | 'disabled' | 'expired';
  expires_at: string | null;
  payment_url: string;
  created_at: string | null;
  updated_at: string | null;
};

const statusStyles: Record<string, string> = {
  paid: "bg-green-500/20 text-green-500 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  partial: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  overdue: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
};

function calculateDiscount(subtotal: number, type: string, value: number) {
  if (type === "fixed") return Math.min(value, subtotal);
  if (type === "percentage") return Math.min((subtotal * value) / 100, subtotal);
  return 0;
}

export default function AdminInvoicesPage() {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(
    null,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "Cash",
    payment_channel: "Cash",
    payment_processor: "Manual",
    transaction_id: "",
    customer_reference: "",
    notes: "",
  });
  const [discountForm, setDiscountForm] = useState({
    type: "fixed",
    value: "",
    reason: "",
  });
  const [paymentLink, setPaymentLink] = useState<CustomerPaymentLink | null>(null);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [paymentLinkSaving, setPaymentLinkSaving] = useState(false);
  const [paymentLinkExpiry, setPaymentLinkExpiry] = useState('');


  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchInvoices() {
    setLoading(true)

    try {
      const response = await fetch("/api/admin/invoices")

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setInvoices(result.data || [])
    } catch (error) {
      console.error(error)
      toast.error("Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  const invoicesWithDerivedStatus = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return invoices.map((invoice) => {
      const summary = getInvoicePaymentSummary(invoice);
      const derivedStatus =
        summary.status !== "paid" &&
        invoice.due_date &&
        invoice.due_date < today
          ? "overdue"
          : summary.status;

      return { ...invoice, ...summary, derivedStatus };
    });
  }, [invoices]);

  const filteredInvoices = invoicesWithDerivedStatus.filter((invoice) => {
    const clientName = getClientName(invoice);
    const matchesSearch =
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || invoice.derivedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoicesWithDerivedStatus.reduce(
    (sum, invoice) => sum + invoice.paidSle,
    0,
  );
  const pendingAmount = invoicesWithDerivedStatus.reduce(
    (sum, invoice) => sum + invoice.balanceSle,
    0,
  );
  const totalDiscounts = invoicesWithDerivedStatus.reduce(
    (sum, invoice) =>
      sum +
      moneyNumber(
        invoice.discount_amount_sle ||
          Number(invoice.discount_amount || 0) * invoice.exchangeRate,
      ),
    0,
  );
  const totalTips = invoicesWithDerivedStatus.reduce(
    (sum, invoice) => sum + invoice.tipsSle,
    0,
  );
  const selectedSummary = selectedInvoice
    ? getInvoicePaymentSummary(selectedInvoice)
    : null;

  function getClientName(invoice: InvoiceRecord) {
    return (
      invoice.client?.full_name ||
      invoice.client?.profile?.full_name ||
      invoice.client?.email ||
      invoice.client?.profile?.email ||
      "Unknown"
    );
  }

  function getClientEmail(invoice: InvoiceRecord) {
    return invoice.client?.email || invoice.client?.profile?.email || "";
  }

  function getPaymentDisplayName(payment: NonNullable<InvoiceRecord["payments"]>[number]) {
    return (
      payment.payment_channel ||
      payment.payment_method ||
      payment.payment_processor ||
      "Payment"
    );
  }

  function getPaymentDate(payment: NonNullable<InvoiceRecord["payments"]>[number]) {
    return payment.payment_date || payment.created_at || "";
  }



  async function loadPaymentLink(invoice: InvoiceRecord) {
    setPaymentLinkLoading(true);
    setPaymentLink(null);
    setPaymentLinkExpiry('');

    try {
      const response = await fetch(`/api/admin/payment-links?invoice_id=${invoice.id}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load payment link');
      setPaymentLink(result.data || null);
      setPaymentLinkExpiry(result.data?.expires_at ? String(result.data.expires_at).slice(0, 16) : '');
    } catch (error) {
      console.error('Load invoice payment link error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load payment link');
    } finally {
      setPaymentLinkLoading(false);
    }
  }

  async function createOrUpdatePaymentLink(options?: { regenerate?: boolean; status?: 'active' | 'disabled' | 'expired' }) {
    if (!selectedInvoice?.id) return;

    setPaymentLinkSaving(true);
    try {
      const isPatch = Boolean(paymentLink?.id) && !options?.regenerate;
      const response = await fetch(
        isPatch ? `/api/admin/payment-links/${paymentLink?.id}` : '/api/admin/payment-links',
        {
          method: isPatch ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice_id: selectedInvoice.id,
            booking_id: selectedInvoice.booking_id,
            expires_at: paymentLinkExpiry || null,
            status: options?.status,
            regenerate: Boolean(options?.regenerate),
          }),
        },
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update payment link');

      setPaymentLink(result.data || null);
      setPaymentLinkExpiry(result.data?.expires_at ? String(result.data.expires_at).slice(0, 16) : '');
      toast.success(options?.regenerate ? 'Payment link regenerated' : options?.status === 'disabled' ? 'Payment link disabled' : 'Payment link updated');
    } catch (error) {
      console.error('Invoice payment link update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update payment link');
    } finally {
      setPaymentLinkSaving(false);
    }
  }

  async function copyPaymentLink() {
    if (!paymentLink?.payment_url) return;
    await navigator.clipboard.writeText(paymentLink.payment_url);
    toast.success('Payment link copied');
  }

  function openInvoiceDialog(invoice: InvoiceRecord) {
    setSelectedInvoice(invoice);
    setViewOpen(true);
    loadPaymentLink(invoice);
  }

  function openDiscountDialog(invoice: InvoiceRecord) {
    setSelectedInvoice(invoice);
    setDiscountForm({
      type: invoice.discount_type && invoice.discount_type !== "none" ? invoice.discount_type : "fixed",
      value: invoice.discount_value ? String(invoice.discount_value) : "",
      reason: invoice.discount_reason || "",
    });
    setDiscountOpen(true);
  }

  function downloadInvoice(
    invoice: InvoiceRecord,
  ) {
    const summary = getInvoicePaymentSummary(invoice);
    const service = invoice.booking?.service?.name || "Photography Service";
    const bookingDate = invoice.booking?.booking_date
      ? new Date(invoice.booking.booking_date).toLocaleDateString()
      : "-";
    const subtotal = Number(invoice.subtotal_amount ?? invoice.amount ?? 0);
    const discountAmount = Number(invoice.discount_amount || 0);
    const subtotalSle = moneyNumber(
      invoice.subtotal_amount_sle || subtotal * summary.exchangeRate,
    );
    const discountSle = moneyNumber(
      invoice.discount_amount_sle || discountAmount * summary.exchangeRate,
    );
    const taxSle = moneyNumber(
      invoice.tax_amount_sle ||
        Number(invoice.tax_amount || 0) * summary.exchangeRate,
    );

    const lines = [
      "JOE PHOTOGRAPHY STUDIO",
      "INVOICE",
      "",
      `Invoice Number: ${invoice.invoice_number}`,
      `Issue Date: ${new Date(invoice.created_at).toLocaleDateString()}`,
      `Status: ${invoice.payment_status.toUpperCase()}`,
      "",
      "BILL TO",
      `Client: ${getClientName(invoice)}`,
      `Email: ${getClientEmail(invoice) || "N/A"}`,
      `Phone: ${invoice.client?.phone || "N/A"}`,
      "",
      "BOOKING DETAILS",
      `Service: ${service}`,
      `Booking Date: ${bookingDate}`,
      "",
      "PAYMENT SUMMARY",
      `Subtotal: ${formatUsd(subtotal)} / ${formatSle(subtotalSle)}`,
      ...(discountAmount > 0
        ? [
            `Discount: -${formatUsd(discountAmount)} / -${formatSle(discountSle)}`,
            `Discount Reason: ${invoice.discount_reason || "N/A"}`,
          ]
        : []),
      `Tax: ${formatUsd(Number(invoice.tax_amount || 0))} / ${formatSle(taxSle)}`,
      `Total: ${formatUsd(Number(invoice.total_amount || 0))} / ${formatSle(summary.totalSle)}`,
      `Rate Used: 1 USD = SLE ${summary.exchangeRate.toLocaleString()}`,
      `Paid: ${formatSle(summary.paidSle)}`,
      `Balance: ${formatSle(summary.balanceSle)}`,
      ...(summary.tipsSle > 0
        ? [`Tips: ${formatSle(summary.tipsSle)}`]
        : []),
      "",
      "PAYMENT HISTORY",
      ...((invoice.payments || []).length > 0
        ? (invoice.payments || []).map((payment) => {
            const paymentDate = getPaymentDate(payment)
              ? new Date(getPaymentDate(payment)).toLocaleDateString()
              : "N/A";
            const channel = getPaymentDisplayName(payment);
            const reference = payment.transaction_id || payment.customer_reference || "No reference";
            const applied = getAppliedPaymentAmount(payment);
            const tip = moneyNumber(payment.tip_amount);
            return `${paymentDate} - ${channel} - ${reference} - ${formatSle(applied)}${tip > 0 ? ` + ${formatSle(tip)} tip` : ""}`;
          })
        : ["No payments recorded"]),
      "",
      "Thank you for choosing Joe Photography Studio.",
    ];

    const escapePdfText = (value: string) =>
      value
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    const textCommands = lines
      .map((line, index) => {
        const fontSize = index === 0 ? 18 : index === 1 ? 16 : 11;
        const y = 760 - index * 24;
        return `BT /F1 ${fontSize} Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
      })
      .join("\n");

    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
      "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
      `5 0 obj << /Length ${textCommands.length} >> stream\n${textCommands}\nendstream endobj`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((object) => {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoice_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function buildInvoiceHtml(
    invoice: InvoiceRecord,
  ) {
    const summary = getInvoicePaymentSummary(invoice);
    const subtotal = Number(invoice.subtotal_amount ?? invoice.amount ?? 0);
    const discount = Number(invoice.discount_amount || 0);
    const tax = Number(invoice.tax_amount || 0);
    const total = Number(invoice.total_amount || 0);
    const subtotalSle = moneyNumber(
      invoice.subtotal_amount_sle || subtotal * summary.exchangeRate,
    );
    const discountSle = moneyNumber(
      invoice.discount_amount_sle || discount * summary.exchangeRate,
    );
    const taxSle = moneyNumber(
      invoice.tax_amount_sle || tax * summary.exchangeRate,
    );
    const service = invoice.booking?.service?.name || "Photography Service";
    const bookingDate = invoice.booking?.booking_date
      ? new Date(invoice.booking.booking_date).toLocaleDateString()
      : "-";

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const paymentHistoryHtml =
      (invoice.payments || []).length > 0
        ? (invoice.payments || [])
            .map((payment) => {
              const paymentDate = getPaymentDate(payment)
                ? new Date(getPaymentDate(payment)).toLocaleDateString()
                : "N/A";
              const channel = getPaymentDisplayName(payment);
              const reference = payment.transaction_id || payment.customer_reference || "No reference";

              return `
                <div class="payment-row">
                  <div>
                    <strong>${escapeHtml(channel)}</strong>
                    <p class="muted">${escapeHtml(paymentDate)} • ${escapeHtml(reference)}</p>
                  </div>
                  <strong>
                    ${formatSle(getAppliedPaymentAmount(payment))}
                    ${moneyNumber(payment.tip_amount) > 0 ? `<span class="muted"> + ${formatSle(moneyNumber(payment.tip_amount))} tip</span>` : ""}
                  </strong>
                </div>
              `;
            })
            .join("")
        : `<p class="muted">No payments recorded</p>`;

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(invoice.invoice_number)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              margin: 0;
              padding: 40px;
            }
            .invoice {
              width: 100%;
              max-width: 760px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            h1, h2, h3, p { margin: 0; }
            h1 { font-size: 28px; margin-bottom: 6px; }
            h2 { font-size: 18px; text-align: right; }
            .muted { color: #6b7280; }
            .cards {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 20px;
            }
            .card, .summary {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 18px;
            }
            .card h3 { font-size: 15px; margin-bottom: 14px; }
            .card p { margin-top: 6px; }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding: 8px 0;
            }
            .row span:last-child,
            .row strong:last-child {
              text-align: right;
              white-space: nowrap;
            }
            .discount { color: #059669; }
            .reason {
              background: #dcfce7;
              color: #047857;
              border-radius: 8px;
              padding: 10px;
              margin: 6px 0 10px;
              font-size: 13px;
            }
            .total {
              border-top: 1px solid #e5e7eb;
              margin-top: 8px;
              padding-top: 14px;
              font-size: 18px;
              font-weight: 700;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding: 10px 0;
              border-top: 1px solid #f3f4f6;
            }
            .payment-row:first-child {
              border-top: 0;
            }
            .footer {
              margin-top: 28px;
              color: #6b7280;
              font-size: 13px;
              text-align: center;
            }
            @media print {
              body { padding: 24px; }
              .invoice { max-width: none; }
            }
            @media (max-width: 640px) {
              body { padding: 20px; }
              .header, .cards { display: block; }
              .card { margin-bottom: 16px; }
              h2 { text-align: left; margin-top: 14px; }
            }
          </style>
        </head>
        <body>
          <main class="invoice">
            <section class="header">
              <div>
                <h1>Joe Photography Studio</h1>
                <p class="muted">Photography Invoice</p>
              </div>
              <div>
                <h2>${escapeHtml(invoice.invoice_number)}</h2>
                <p class="muted">Issued ${new Date(invoice.created_at).toLocaleDateString()}</p>
                <p class="muted">Status: ${escapeHtml(invoice.payment_status)}</p>
              </div>
            </section>

            <section class="cards">
              <div class="card">
                <h3>Client</h3>
                <p><strong>${escapeHtml(getClientName(invoice))}</strong></p>
                <p class="muted">${escapeHtml(getClientEmail(invoice) || "No email")}</p>
                <p class="muted">${escapeHtml(invoice.client?.phone || "")}</p>
              </div>
              <div class="card">
                <h3>Booking</h3>
                <p><strong>${escapeHtml(service)}</strong></p>
                <p class="muted">${escapeHtml(bookingDate)}</p>
              </div>
            </section>

            <section class="summary">
              <div class="row"><span>Subtotal</span><strong>${formatUsd(subtotal)} / ${formatSle(subtotalSle)}</strong></div>
              ${
                discount > 0
                  ? `<div class="row discount"><span>Discount</span><strong>-${formatUsd(discount)} / -${formatSle(discountSle)}</strong></div>`
                  : ""
              }
              ${
                invoice.discount_reason
                  ? `<div class="reason">Reason: ${escapeHtml(invoice.discount_reason)}</div>`
                  : ""
              }
              <div class="row"><span>Tax</span><strong>${formatUsd(tax)} / ${formatSle(taxSle)}</strong></div>
              <div class="row total"><span>Total</span><strong>${formatUsd(total)} / ${formatSle(summary.totalSle)}</strong></div>
              <div class="row"><span>Exchange rate</span><strong>1 USD = SLE ${summary.exchangeRate.toLocaleString()}</strong></div>
              <div class="row"><span>Paid</span><strong>${formatSle(summary.paidSle)}</strong></div>
              <div class="row"><span>Balance</span><strong>${formatSle(summary.balanceSle)}</strong></div>
              ${summary.tipsSle > 0 ? `<div class="row discount"><span>Tips</span><strong>${formatSle(summary.tipsSle)}</strong></div>` : ""}
            </section>

            <section class="summary" style="margin-top: 18px;">
              <h3 style="margin-bottom: 12px;">Payment History</h3>
              ${paymentHistoryHtml}
            </section>

            <p class="footer">Thank you for choosing Joe Photography Studio.</p>
          </main>
        </body>
      </html>
    `;
  }

  function printInvoice(
    invoice: InvoiceRecord,
  ) {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      toast.error("Please allow pop-ups to print this invoice");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildInvoiceHtml(invoice));
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  function openPaymentDialog(invoice: InvoiceRecord) {
    const summary = getInvoicePaymentSummary(invoice);
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: String(summary.balanceSle),
      payment_method: "Cash",
      payment_channel: "Cash",
      payment_processor: "Manual",
      transaction_id: "",
      customer_reference: invoice.invoice_number,
      notes: "",
    });
    setPaymentOpen(true);
  }

  async function handleRecordPayment() {
    if (!selectedInvoice) return;
    const amount = Number(paymentForm.amount);

    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    setPaymentLoading(true);

    try {
      const response = await fetch("/api/invoices/record-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          amount,
          payment_method: paymentForm.payment_method,
          payment_channel: paymentForm.payment_channel,
          payment_processor: paymentForm.payment_processor,
          transaction_id: paymentForm.transaction_id || null,
          customer_reference: paymentForm.customer_reference || null,
          notes: paymentForm.notes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to record payment");
      }

      toast.success("Payment recorded and invoice updated");
      setPaymentOpen(false);
      await fetchInvoices();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleSendInvoice(invoice: InvoiceRecord) {
    await createAuditLog({
      action: "send_invoice",
      resource_type: "invoice",
      resource_id: invoice.id,
      new_data: { invoice_number: invoice.invoice_number },
    });
    toast.success(
      "Invoice send action logged. Email service can be connected later.",
    );
  }

  async function handleApplyDiscount() {
    if (!selectedInvoice) return;

    const discountValue = Number(discountForm.value);

    if (!discountValue || discountValue <= 0) {
      toast.error("Enter a valid discount value");
      return;
    }

    setDiscountLoading(true);

    try {
      const subtotal =
        Number(selectedInvoice.subtotal_amount) || Number(selectedInvoice.amount || 0);
      const discountAmount = Number(
        calculateDiscount(subtotal, discountForm.type, discountValue).toFixed(2),
      );
      const finalTotal = Number((subtotal - discountAmount).toFixed(2));
      const exchangeRate = moneyNumber(selectedInvoice.exchange_rate || 24) || 24;
      const subtotalSle = moneyNumber(subtotal * exchangeRate);
      const discountAmountSle = moneyNumber(discountAmount * exchangeRate);
      const finalTotalSle = moneyNumber(finalTotal * exchangeRate);
      const paidAmount = getInvoicePaymentSummary(selectedInvoice).paidSle;
      const paymentStatus =
        paidAmount >= finalTotalSle ? "paid" : paidAmount > 0 ? "partial" : "pending";

      const { error } = await supabase
        .from("invoices")
        .update({
          subtotal_amount: subtotal,
          discount_type: discountForm.type,
          discount_value: discountValue,
          discount_amount: discountAmount,
          discount_amount_sle: discountAmountSle,
          discount_reason: discountForm.reason || null,
          amount: subtotal,
          subtotal_amount_sle: subtotalSle,
          total_amount: finalTotal,
          total_amount_sle: finalTotalSle,
          payment_status: paymentStatus,
          paid_date: paymentStatus === "paid" ? new Date().toISOString().slice(0, 10) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedInvoice.id);

      if (error) throw error;

      await createAuditLog({
        action: "apply_discount",
        resource_type: "invoice",
        resource_id: selectedInvoice.id,
        old_data: selectedInvoice,
        new_data: {
          discount_type: discountForm.type,
          discount_value: discountValue,
          discount_amount: discountAmount,
          discount_amount_sle: discountAmountSle,
          discount_reason: discountForm.reason || null,
          total_amount: finalTotal,
          total_amount_sle: finalTotalSle,
        },
      });

      toast.success("Discount applied");
      setDiscountOpen(false);
      await fetchInvoices();
    } catch (error) {
      console.error(error);
      toast.error("Failed to apply discount");
    } finally {
      setDiscountLoading(false);
    }
  }

  async function handleClearDiscount() {
    if (!selectedInvoice) return;

    setDiscountLoading(true);

    try {
      const subtotal =
        Number(selectedInvoice.subtotal_amount) || Number(selectedInvoice.amount || 0);
      const exchangeRate = moneyNumber(selectedInvoice.exchange_rate || 24) || 24;
      const subtotalSle = moneyNumber(subtotal * exchangeRate);
      const paidAmount = getInvoicePaymentSummary(selectedInvoice).paidSle;
      const paymentStatus =
        paidAmount >= subtotalSle ? "paid" : paidAmount > 0 ? "partial" : "pending";

      const { error } = await supabase
        .from("invoices")
        .update({
          discount_type: "none",
          discount_value: 0,
          discount_amount: 0,
          discount_amount_sle: 0,
          discount_reason: null,
          amount: subtotal,
          subtotal_amount_sle: subtotalSle,
          total_amount: subtotal,
          total_amount_sle: subtotalSle,
          payment_status: paymentStatus,
          paid_date: paymentStatus === "paid" ? new Date().toISOString().slice(0, 10) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedInvoice.id);

      if (error) throw error;

      await createAuditLog({
        action: "clear_discount",
        resource_type: "invoice",
        resource_id: selectedInvoice.id,
        old_data: selectedInvoice,
      });

      toast.success("Discount cleared");
      setDiscountOpen(false);
      await fetchInvoices();
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear discount");
    } finally {
      setDiscountLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage real invoice balances, discounts, and payment records
          </p>
        </div>
        <Button variant="outline" onClick={fetchInvoices} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Collected Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSle(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              from recorded payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSle(pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">remaining balances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Discounts</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSle(totalDiscounts)}</div>
            <p className="text-xs text-muted-foreground">applied discounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tips</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSle(totalTips)}</div>
            <p className="text-xs text-muted-foreground">customer overpayments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>
                Invoices are auto-created when bookings are created
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>{getClientName(invoice)}</TableCell>
                  <TableCell>
                    {invoice.booking?.service?.name || "N/A"}
                  </TableCell>
                  <TableCell>
                    {invoice.booking?.booking_date
                      ? new Date(
                          invoice.booking.booking_date,
                        ).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div>{formatSle(invoice.totalSle)}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {formatUsd(invoice.total_amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {Number(invoice.discount_amount || 0) > 0 ? (
                      <span className="text-green-600">
                        -{formatSle(
                          invoice.discount_amount_sle ||
                            Number(invoice.discount_amount || 0) *
                              invoice.exchangeRate,
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatSle(invoice.paidSle)}</TableCell>
                  <TableCell>{formatSle(invoice.balanceSle)}</TableCell>
                  <TableCell>
                    <Badge
                      className={statusStyles[invoice.derivedStatus]}
                      variant="outline"
                    >
                      {invoice.derivedStatus.charAt(0).toUpperCase() +
                        invoice.derivedStatus.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View"
                        onClick={() => openInvoiceDialog(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Apply Discount"
                        onClick={() => openDiscountDialog(invoice)}
                      >
                        <Percent className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download Invoice"
                        onClick={() => downloadInvoice(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.payment_status !== "paid" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Record Payment"
                          onClick={() => openPaymentDialog(invoice)}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                      {invoice.payment_status !== "paid" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Send Reminder"
                          onClick={() => handleSendInvoice(invoice)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {loading ? "Loading invoices..." : "No invoices found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="!w-[calc(100vw-2rem)] !max-w-[960px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
           <div className="space-y-6 w-full" id="invoice-print-area">
              <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Joe Photography Studio</h2>
                  <p className="text-muted-foreground">Photography Invoice</p>
                </div>
                <div className="min-w-0 text-left break-words md:text-right">
                  <p className="font-mono font-semibold">
                    {selectedInvoice.invoice_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Issued{" "}
                    {new Date(selectedInvoice.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle className="text-base">Client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p className="font-medium">
                      {getClientName(selectedInvoice)}
                    </p>
                    <p className="text-muted-foreground">
                      {getClientEmail(selectedInvoice) || "No email"}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedInvoice.client?.phone || ""}
                    </p>
                  </CardContent>
                </Card>
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle className="text-base">Booking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>
                      {selectedInvoice.booking?.service?.name ||
                        "Photography Service"}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedInvoice.booking?.booking_date
                        ? new Date(
                            selectedInvoice.booking.booking_date,
                          ).toLocaleDateString()
                        : "-"}
                    </p>
                    <Badge
                      className={statusStyles[selectedInvoice.payment_status]}
                      variant="outline"
                    >
                      {selectedInvoice.payment_status}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-lg border p-4 space-y-3 w-full">
                <div className="flex items-center justify-between gap-6">
                  <span className="min-w-0">Subtotal</span>
                  <span className="shrink-0 text-right">
                    {formatUsd(
                      selectedInvoice.subtotal_amount ?? selectedInvoice.amount,
                    )}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {formatSle(
                        selectedInvoice.subtotal_amount_sle ||
                          Number(
                            selectedInvoice.subtotal_amount ??
                              selectedInvoice.amount,
                          ) * (selectedSummary?.exchangeRate || 24),
                      )}
                    </span>
                  </span>
                </div>
                {Number(selectedInvoice.discount_amount || 0) > 0 && (
                  <>
                    <div className="flex items-center justify-between gap-6 text-green-600">
                      <span className="min-w-0">
                        Discount
                        {selectedInvoice.discount_type === "percentage" &&
                          selectedInvoice.discount_value
                          ? ` (${selectedInvoice.discount_value}%)`
                          : ""}
                      </span>
                      <span className="shrink-0 text-right">
                        -{formatUsd(selectedInvoice.discount_amount || 0)}
                        <span className="block text-xs font-normal">
                          -{formatSle(
                            selectedInvoice.discount_amount_sle ||
                              Number(selectedInvoice.discount_amount || 0) *
                                (selectedSummary?.exchangeRate || 24),
                          )}
                        </span>
                      </span>
                    </div>
                    {selectedInvoice.discount_reason && (
                      <div className="rounded-md bg-green-500/10 p-2 text-xs text-green-700">
                        Reason: {selectedInvoice.discount_reason}
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between gap-6">
                  <span className="min-w-0">Tax</span>
                  <span className="shrink-0 text-right">
                    {formatUsd(selectedInvoice.tax_amount || 0)} /{" "}
                    {formatSle(
                      selectedInvoice.tax_amount_sle ||
                        Number(selectedInvoice.tax_amount || 0) *
                          (selectedSummary?.exchangeRate || 24),
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6 font-bold text-lg border-t pt-3">
                  <span className="min-w-0">Total</span>
                  <span className="shrink-0 text-right">
                    {formatSle(selectedSummary?.totalSle || 0)}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {formatUsd(selectedInvoice.total_amount)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6 text-sm text-muted-foreground">
                  <span className="min-w-0">Exchange Rate</span>
                  <span className="shrink-0 text-right">
                    1 USD = SLE {selectedSummary?.exchangeRate.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="min-w-0">Paid</span>
                  <span className="shrink-0 text-right">
                    {formatSle(selectedSummary?.paidSle || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="min-w-0">Balance</span>
                  <span className="shrink-0 text-right">
                    {formatSle(selectedSummary?.balanceSle || 0)}
                  </span>
                </div>
                {(selectedSummary?.tipsSle || 0) > 0 && (
                  <div className="flex items-center justify-between gap-6 text-green-600">
                    <span className="min-w-0">Tips</span>
                    <span className="shrink-0 text-right">
                      {formatSle(selectedSummary?.tipsSle || 0)}
                    </span>
                  </div>
                )}
              </div>


              <div className="rounded-lg border p-4 space-y-4 w-full">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Link2 className="h-4 w-4" /> Customer Payment Link
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Use this link when email fails or the customer needs the payment link by WhatsApp.
                    </p>
                  </div>
                  {paymentLink?.status && (
                    <Badge variant="outline" className="capitalize">
                      {paymentLink.status}
                    </Badge>
                  )}
                </div>

                {paymentLinkLoading ? (
                  <p className="text-sm text-muted-foreground">Loading payment link...</p>
                ) : paymentLink ? (
                  <div className="space-y-3">
                    <div className="rounded-md bg-muted p-3 text-sm break-all">
                      {paymentLink.payment_url}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          type="datetime-local"
                          value={paymentLinkExpiry}
                          onChange={(event) => setPaymentLinkExpiry(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Leave blank for no expiry.</p>
                      </div>
                      <Button variant="outline" onClick={() => createOrUpdatePaymentLink()} disabled={paymentLinkSaving}>
                        <CalendarClock className="mr-2 h-4 w-4" /> Save Expiry
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={copyPaymentLink}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Link
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(paymentLink.payment_url, '_blank')}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Open
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => createOrUpdatePaymentLink({ regenerate: true })} disabled={paymentLinkSaving}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                      </Button>
                      {paymentLink.status === 'disabled' ? (
                        <Button size="sm" onClick={() => createOrUpdatePaymentLink({ status: 'active' })} disabled={paymentLinkSaving}>
                          <Power className="mr-2 h-4 w-4" /> Enable
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => createOrUpdatePaymentLink({ status: 'disabled' })} disabled={paymentLinkSaving}>
                          <Power className="mr-2 h-4 w-4" /> Disable
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">No customer payment link exists yet for this invoice.</p>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          type="datetime-local"
                          value={paymentLinkExpiry}
                          onChange={(event) => setPaymentLinkExpiry(event.target.value)}
                        />
                      </div>
                      <Button onClick={() => createOrUpdatePaymentLink()} disabled={paymentLinkSaving}>
                        <Link2 className="mr-2 h-4 w-4" /> Create Link
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3 w-full">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Payment History</h3>
                  <Badge variant="outline">
                    {(selectedInvoice.payments || []).length} payment{(selectedInvoice.payments || []).length === 1 ? "" : "s"}
                  </Badge>
                </div>

                {(selectedInvoice.payments || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No payments recorded for this invoice yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(selectedInvoice.payments || []).map((payment, index) => (
                      <div
                        key={payment.id || index}
                        className="flex flex-col gap-2 rounded-md border p-3 text-sm md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {getPaymentDisplayName(payment)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getPaymentDate(payment)
                              ? new Date(getPaymentDate(payment)).toLocaleString()
                              : "Date not available"}
                          </p>
                          {(payment.transaction_id || payment.customer_reference) && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {payment.transaction_id || payment.customer_reference}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="text-xs text-muted-foreground">
                              Notes: {payment.notes}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold">
                            {formatSle(getAppliedPaymentAmount(payment))}
                          </p>
                          {moneyNumber(payment.tip_amount) > 0 && (
                            <p className="text-xs text-green-600">
                              + {formatSle(moneyNumber(payment.tip_amount))} tip
                            </p>
                          )}
                          <p className="text-xs capitalize text-muted-foreground">
                            {payment.payment_status || "completed"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
            {selectedInvoice && (
              <Button
                variant="outline"
                onClick={() => openDiscountDialog(selectedInvoice)}
              >
                <Percent className="h-4 w-4 mr-2" />
                Discount
              </Button>
            )}
            {selectedInvoice && (
              <Button
                variant="outline"
                onClick={() => downloadInvoice(selectedInvoice as any)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => selectedInvoice && printInvoice(selectedInvoice as any)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {selectedInvoice && selectedSummary?.status !== "paid" && (
              <Button
                onClick={() => {
                  setViewOpen(false);
                  openPaymentDialog(selectedInvoice as any);
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Add a payment against invoice {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (SLE)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
              />
              {selectedInvoice && (
                <p className="text-xs text-muted-foreground">
                  Current balance: {formatSle(selectedSummary?.balanceSle || 0)}.
                  Any amount above the balance will be recorded as a tip.
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value) => {
                    const isVult =
                      value === "Mobile Money" ||
                      value === "Card" ||
                      value === "Vult App";

                    setPaymentForm({
                      ...paymentForm,
                      payment_method: value,
                      payment_processor: isVult ? "Vult" : "Manual",
                      payment_channel:
                        value === "Cash"
                          ? "Cash"
                          : value === "Bank Transfer"
                            ? "Bank Transfer"
                            : paymentForm.payment_channel,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Vult App">Vult App</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Channel</Label>
                <Select
                  value={paymentForm.payment_channel}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, payment_channel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Orange Money">Orange Money</SelectItem>
                    <SelectItem value="Afrimoney">Afrimoney</SelectItem>
                    <SelectItem value="Vult App">Vult App</SelectItem>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                    <SelectItem value="Visa">Visa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Processor</Label>
              <Select
                value={paymentForm.payment_processor}
                onValueChange={(value) =>
                  setPaymentForm({ ...paymentForm, payment_processor: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Vult">Vult</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transaction Reference</Label>
              <Input
                value={paymentForm.transaction_id}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    transaction_id: e.target.value,
                  })
                }
                placeholder="Receipt, transfer, or Vult request reference"
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Reference</Label>
              <Input
                value={paymentForm.customer_reference}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    customer_reference: e.target.value,
                  })
                }
                placeholder="Booking reference or invoice number"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, notes: e.target.value })
                }
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>
              {paymentLoading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription>
              Reduce the invoice total and keep the discount visible on the client invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between">
                  <span>Current Subtotal</span>
                  <strong>
                    {formatUsd(
                      selectedInvoice.subtotal_amount ?? selectedInvoice.amount,
                    )}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Current Discount</span>
                  <strong>
                    -{formatUsd(selectedInvoice.discount_amount || 0)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Current Total</span>
                  <strong>
                    {formatUsd(selectedInvoice.total_amount)} /{" "}
                    {formatSle(selectedSummary?.totalSle || 0)}
                  </strong>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={discountForm.type}
                onValueChange={(value) =>
                  setDiscountForm({ ...discountForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Discount Value {discountForm.type === "percentage" ? "(%)" : "(USD)"}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountForm.value}
                onChange={(e) =>
                  setDiscountForm({ ...discountForm, value: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={discountForm.reason}
                onChange={(e) =>
                  setDiscountForm({ ...discountForm, reason: e.target.value })
                }
                placeholder="Example: Loyal customer discount, two photos discounted, manager approved reduction..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDiscountOpen(false)}
              disabled={discountLoading}
            >
              Cancel
            </Button>
            {selectedInvoice && Number(selectedInvoice.discount_amount || 0) > 0 && (
              <Button
                variant="destructive"
                onClick={handleClearDiscount}
                disabled={discountLoading}
              >
                Clear Discount
              </Button>
            )}
            <Button onClick={handleApplyDiscount} disabled={discountLoading}>
              {discountLoading ? "Applying..." : "Apply Discount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
