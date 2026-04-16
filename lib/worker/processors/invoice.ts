import PDFDocument from 'pdfkit';
import { getPgTenantById } from '../../db/postgres_tenants';
import { query } from '../../db/postgres';
import { uploadFile } from '../../storage';
import { logger } from '../../logger';
import { InvoiceJobData } from '../queues';

/**
 * BullMQ Processor: Generates a high-fidelity PDF invoice for a paid order.
 * Fetches data from the PostgreSQL relational store and uploads the asset to MinIO.
 */
export async function processInvoice(data: InvoiceJobData) {
  const { orderId, tenantId } = data;

  try {
    // 1. Fetch Tenant Context
    const tenant = await getPgTenantById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    // 2. Fetch Order and Line Items (Isolated via RLS-like logic in worker)
    // In workers, we simulate the tenant setting manually
    const orderSql = `SELECT * FROM orders WHERE id = $1 AND tenant_id = $2`;
    const orderRows = await query<any>(tenantId, orderSql, [orderId, tenantId]);
    const order = orderRows[0];
    if (!order) throw new Error('Order not found');

    const itemsSql = `SELECT * FROM order_items WHERE order_id = $1 AND tenant_id = $2`;
    const items = await query<any>(tenantId, itemsSql, [orderId, tenantId]);

    // 3. Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // -- Header --
    doc.fillColor('#444444').fontSize(20).text(tenant.name, 50, 50);
    doc.fontSize(10).text(tenant.config?.address || '', 50, 80);
    doc.text(`Phone: ${tenant.config?.phone || ''}`, 50, 95);
    doc.moveDown();

    // -- Invoice Info --
    doc.fillColor('#000000').fontSize(12).text(`INVOICE: #${order.token_number}`, 50, 130);
    doc.fontSize(10).text(`Date: ${new Date(order.created_at).toLocaleString()}`, 50, 145);
    doc.text(`Table: ${order.table_number || 'Takeaway'}`, 50, 160);
    doc.moveDown();

    // -- Table Header --
    const tableTop = 200;
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 280, tableTop);
    doc.text('Price', 350, tableTop);
    doc.text('Total', 450, tableTop);
    doc.moveDown();
    doc.font('Helvetica');

    // -- Items --
    let y = tableTop + 25;
    for (const item of items) {
      doc.text(item.name, 50, y);
      doc.text(item.quantity.toString(), 280, y);
      doc.text(parseFloat(item.price).toFixed(2), 350, y);
      doc.text((parseFloat(item.price) * item.quantity).toFixed(2), 450, y);
      y += 20;
    }

    // -- Totals --
    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
    y += 25;
    doc.font('Helvetica-Bold').fontSize(14).text('TOTAL', 50, y);
    doc.text(`${tenant.config?.currencySymbol || '₹'} ${parseFloat(order.total).toFixed(2)}`, 450, y);

    // -- Footer --
    doc.fontSize(10).font('Helvetica-Oblique').text(tenant.config?.tagline || 'Thank you for your visit!', 50, y + 50, { align: 'center', width: 500 });

    doc.end();

    // 4. Wait for generation to finish
    await new Promise((resolve) => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(chunks);

    // 5. Upload to MinIO
    const fileName = `invoices/${tenantId}/${orderId}_${Date.now()}.pdf`;
    const url = await uploadFile(fileName, pdfBuffer, 'application/pdf');

    // 6. Update order with PDF URL in Postgres
    const updateSql = `UPDATE orders SET pdf_url = $1 WHERE id = $2`;
    await query(tenantId, updateSql, [url, orderId]);

    logger.info(`✅ Invoice generated and uploaded: ${url}`);
    return { url };

  } catch (err: any) {
    logger.error(`❌ Failed to process invoice: ${err.message}`, err);
    throw err;
  }
}
