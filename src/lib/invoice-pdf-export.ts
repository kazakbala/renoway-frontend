interface InvoiceWork {
  name: string;
  description: string | null;
  unit_type: string;
  price_per_unit: number;
  quantity: number;
}

interface InvoiceBlock {
  name: string;
  works: InvoiceWork[];
  subtotal: number;
}

interface InvoiceExportData {
  invoiceNumber: string;
  invoiceDate: string;
  projectName: string;
  client: {
    full_name: string;
    email: string;
    phone: string;
  };
  blocks: InvoiceBlock[];
  grandTotal: number;
  notes: string | null;
}

export const exportInvoiceToPDF = async (data: InvoiceExportData) => {
  const printWindow = window.open("", "_blank");
  
  if (!printWindow) {
    alert("Please allow popups to export PDF");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${data.invoiceNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: white;
            color: #1a1a1a;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          
          .header-left h1 {
            color: #2563eb;
            font-size: 32px;
            margin-bottom: 5px;
          }
          
          .company {
            color: #666;
            font-size: 14px;
          }
          
          .header-right {
            text-align: right;
          }
          
          .invoice-title {
            font-size: 36px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 5px;
          }
          
          .invoice-number {
            font-size: 18px;
            color: #666;
          }
          
          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          
          .info-box h3 {
            color: #2563eb;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
          }
          
          .info-item {
            margin-bottom: 8px;
          }
          
          .info-label {
            font-weight: 600;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-value {
            font-size: 15px;
            color: #1a1a1a;
            margin-top: 2px;
          }
          
          .block {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          
          .block-header {
            background: #2563eb;
            color: white;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            font-size: 18px;
            font-weight: 600;
          }
          
          .work-item {
            border: 1px solid #e5e7eb;
            border-top: none;
            padding: 20px;
            background: white;
          }
          
          .work-item:last-child {
            border-radius: 0 0 8px 8px;
          }
          
          .work-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 10px;
          }
          
          .work-name {
            font-weight: 600;
            font-size: 16px;
            color: #1a1a1a;
          }
          
          .work-total {
            font-weight: 600;
            font-size: 16px;
            color: #2563eb;
          }
          
          .work-description {
            color: #666;
            margin-bottom: 12px;
            font-size: 14px;
            line-height: 1.5;
          }
          
          .work-details {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }
          
          .detail-item {
            font-size: 13px;
          }
          
          .detail-label {
            color: #666;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .detail-value {
            color: #1a1a1a;
            font-weight: 500;
            margin-top: 4px;
          }
          
          .subtotal {
            text-align: right;
            padding: 15px 20px;
            background: #f8f9fa;
            border: 1px solid #e5e7eb;
            border-top: none;
            font-size: 16px;
            font-weight: 600;
            border-radius: 0 0 8px 8px;
          }
          
          .grand-total {
            margin-top: 40px;
            padding: 25px;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            border-radius: 8px;
            text-align: right;
            page-break-inside: avoid;
          }
          
          .grand-total-label {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 8px;
          }
          
          .grand-total-value {
            font-size: 36px;
            font-weight: 700;
          }
          
          .notes {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          
          .notes-title {
            font-weight: 600;
            color: #2563eb;
            margin-bottom: 8px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .notes-content {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
          }
          
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          
          @media print {
            body {
              padding: 20px;
            }
            
            .block {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Renoway.ae</h1>
            <div class="company">Interior Renovation</div>
          </div>
          <div class="header-right">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">${data.invoiceNumber}</div>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-box">
            <h3>Bill To</h3>
            <div class="info-item">
              <div class="info-label">Client Name</div>
              <div class="info-value">${data.client.full_name || "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${data.client.email || "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phone</div>
              <div class="info-value">${data.client.phone || "N/A"}</div>
            </div>
          </div>
          <div class="info-box">
            <h3>Invoice Details</h3>
            <div class="info-item">
              <div class="info-label">Invoice Date</div>
              <div class="info-value">${new Date(data.invoiceDate).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Project</div>
              <div class="info-value">${data.projectName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Total Amount</div>
              <div class="info-value">${data.grandTotal.toFixed(2)} AED</div>
            </div>
          </div>
        </div>
        
        ${data.blocks
          .map(
            (block) => `
          <div class="block">
            <div class="block-header">${block.name}</div>
            ${block.works
              .map(
                (work) => `
              <div class="work-item">
                <div class="work-header">
                  <div class="work-name">${work.name}</div>
                  <div class="work-total">${(
                    work.price_per_unit * work.quantity
                  ).toFixed(2)} AED</div>
                </div>
                ${
                  work.description
                    ? `<div class="work-description">${work.description}</div>`
                    : ""
                }
                <div class="work-details">
                  <div class="detail-item">
                    <div class="detail-label">Unit Type</div>
                    <div class="detail-value">${work.unit_type}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Price per Unit</div>
                    <div class="detail-value">${work.price_per_unit.toFixed(
                      2
                    )} AED</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Quantity</div>
                    <div class="detail-value">${work.quantity}</div>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
            <div class="subtotal">
              Subtotal: ${block.subtotal.toFixed(2)} AED
            </div>
          </div>
        `
          )
          .join("")}
        
        <div class="grand-total">
          <div class="grand-total-label">Total Amount Due</div>
          <div class="grand-total-value">${data.grandTotal.toFixed(2)} AED</div>
        </div>
        
        ${data.notes ? `
          <div class="notes">
            <div class="notes-title">Notes</div>
            <div class="notes-content">${data.notes}</div>
          </div>
        ` : ''}
        
        <div class="footer">
          Generated by Renoway.ae Dashboard | ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};
