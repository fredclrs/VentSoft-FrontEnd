function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

import { formatearMonto } from './moneda'

export interface ItemNotaLiquidacion {
  numeroBoleta: string
  tipoBien: string
  cantidad: number
  unidadMedida: string
  precioUnitario: number
  subtotal: number
}

export interface NotaLiquidacionData {
  nombreNegocio: string
  simboloMoneda: string
  id: number
  fecha: string
  cliente: string
  documentoCliente: string
  atendidoPor: string
  nota?: string | null
  items: ItemNotaLiquidacion[]
  deudaAntes: number
  totalEntregado: number
  deudaActual: number
  montoDevueltoEfectivo: number
  saldoAFavorGenerado: number
}

/** Abre una ventana con el comprobante de liquidación listo para imprimir. */
export function imprimirNotaLiquidacion(data: NotaLiquidacionData) {
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
          <td>${escapeHtml(item.numeroBoleta)}</td>
          <td>${escapeHtml(item.tipoBien)}</td>
          <td class="num">${item.cantidad} ${escapeHtml(item.unidadMedida)}</td>
          <td class="num">${money(item.precioUnitario)}</td>
          <td class="num">${money(item.subtotal)}</td>
        </tr>`,
    )
    .join('')

  const totales = [
    `<div><span>Deuda antes</span><span>${money(data.deudaAntes)}</span></div>`,
    `<div><span>Total entregado</span><span>${money(data.totalEntregado)}</span></div>`,
    `<div><span>Deuda actual</span><span>${money(data.deudaActual)}</span></div>`,
    data.montoDevueltoEfectivo > 0
      ? `<div><span>Devuelto en efectivo</span><span>${money(data.montoDevueltoEfectivo)}</span></div>`
      : '',
    data.saldoAFavorGenerado > 0
      ? `<div><span>Saldo a favor generado</span><span>${money(data.saldoAFavorGenerado)}</span></div>`
      : '',
  ]
    .filter(Boolean)
    .join('')

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Liquidación #${data.id}</title>
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
          .totales { margin-top: 10px; border-top: 1px solid #333; padding-top: 6px; }
          .totales div { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .nota { margin-top: 10px; font-style: italic; color: #444; }
          .footer { margin-top: 16px; text-align: center; color: #555; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(data.nombreNegocio)}</h1>
        <div class="sub">Liquidación #${data.id}</div>
        <div class="datos">
          <div><strong>Cliente:</strong> ${escapeHtml(data.cliente)} (${escapeHtml(data.documentoCliente)})</div>
          <div><strong>Fecha:</strong> ${new Date(data.fecha).toLocaleString('es-BO')}</div>
          <div><strong>Atendido por:</strong> ${escapeHtml(data.atendidoPor)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Bien</th>
              <th class="num">Cant.</th>
              <th class="num">P. unit.</th>
              <th class="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="totales">${totales}</div>
        ${data.nota ? `<div class="nota">${escapeHtml(data.nota)}</div>` : ''}
        <div class="footer">¡Gracias por su preferencia!</div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `)
  ventana.document.close()
}
