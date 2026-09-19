function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

import { formatearMonto } from './moneda'

export interface ItemNotaCompra {
  codigo: string
  descripcion?: string | null
  lote?: string | null
  cantidad: number
  costoUnitario: number
  subtotal: number
}

export interface NotaCompraData {
  /** Nombre del negocio configurado (Administración → Datos del negocio). */
  nombreNegocio: string
  /** Símbolo de moneda configurado (Bs., $, U$S, etc.). */
  simboloMoneda: string
  id: number
  fecha: string
  proveedor: string
  documentoProveedor?: string | null
  registradoPor: string
  /** N° de factura/nota que dio el proveedor (campo "Referencia" de la compra). */
  referencia?: string | null
  nota?: string | null
  items: ItemNotaCompra[]
  total: number
  pagado: number
  porPagar: number
}

/** Abre una ventana con el comprobante interno de una compra, listo para imprimir (formato de recibo angosto). */
export function imprimirNotaCompra(data: NotaCompraData) {
  const ventana = window.open('', '_blank', 'width=420,height=600')
  if (!ventana) {
    window.alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio.')
    return
  }

  const money = (n: number) => formatearMonto(n, data.simboloMoneda)

  const filas = data.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo)}</td>
          <td>${escapeHtml(item.descripcion ?? '')}${item.lote ? ` <span class="lote">(Lote: ${escapeHtml(item.lote)})</span>` : ''}</td>
          <td class="num">${item.cantidad}</td>
          <td class="num">${money(item.costoUnitario)}</td>
          <td class="num">${money(item.subtotal)}</td>
        </tr>`,
    )
    .join('')

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Compra #${data.id}</title>
        <style>
          @page { margin: 8mm; }
          body { font-family: system-ui, sans-serif; font-size: 12px; margin: 0; padding: 12px; width: 280px; }
          h1 { font-size: 16px; margin: 0 0 2px; }
          .sub { color: #555; margin-bottom: 10px; }
          .datos div { margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { text-align: left; padding: 3px 2px; font-size: 11px; }
          th { border-bottom: 1px solid #333; }
          .num { text-align: right; }
          .lote { color: #666; font-size: 10px; }
          .totales { margin-top: 10px; border-top: 1px solid #333; padding-top: 6px; }
          .totales div { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .total-final { font-size: 14px; font-weight: 700; }
          .nota { margin-top: 10px; font-style: italic; color: #444; }
          .footer { margin-top: 16px; text-align: center; color: #555; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(data.nombreNegocio)}</h1>
        <div class="sub">Comprobante interno de compra #${data.id}</div>
        <div class="datos">
          <div><strong>Proveedor:</strong> ${escapeHtml(data.proveedor)}${data.documentoProveedor ? ` (${escapeHtml(data.documentoProveedor)})` : ''}</div>
          <div><strong>Fecha:</strong> ${new Date(data.fecha).toLocaleString('es-BO')}</div>
          <div><strong>Registrado por:</strong> ${escapeHtml(data.registradoPor)}</div>
          ${data.referencia ? `<div><strong>N° comprobante proveedor:</strong> ${escapeHtml(data.referencia)}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th class="num">Cant.</th>
              <th class="num">C. unit.</th>
              <th class="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="totales">
          <div><span>Total</span><span class="total-final">${money(data.total)}</span></div>
          <div><span>Pagado</span><span>${money(data.pagado)}</span></div>
          <div><span>Por pagar</span><span>${money(data.porPagar)}</span></div>
        </div>
        ${data.nota ? `<div class="nota">${escapeHtml(data.nota)}</div>` : ''}
        <div class="footer">Documento interno — no válido como factura</div>
        <script>window.onload = () => { window.print(); }; window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `)
  ventana.document.close()
}
