function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

import { formatearMonto } from './moneda'

export interface ItemNotaDevolucion {
  codigo: string
  descripcion?: string | null
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface NotaDevolucionData {
  /** Nombre del negocio configurado (Administración → Datos del negocio). */
  nombreNegocio: string
  /** Símbolo de moneda configurado (Bs., $, U$S, etc.). */
  simboloMoneda: string
  id: number
  idVenta: number
  fecha: string
  cliente: string
  documentoCliente: string
  vendedor: string
  motivo?: string | null
  devueltos: ItemNotaDevolucion[]
  /** Vacío si fue una devolución pura, sin cambio. */
  nuevos: ItemNotaDevolucion[]
  montoCobradoAhora: number
  porPagar: number
  montoDevueltoEfectivo: number
  saldoAFavorGenerado: number
}

function tabla(items: ItemNotaDevolucion[], money: (n: number) => string): string {
  const filas = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo)}</td>
          <td>${escapeHtml(item.descripcion ?? '')}</td>
          <td class="num">${item.cantidad}</td>
          <td class="num">${money(item.precioUnitario)}</td>
          <td class="num">${money(item.subtotal)}</td>
        </tr>`,
    )
    .join('')

  return `
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Descripción</th>
          <th class="num">Cant.</th>
          <th class="num">P. unit.</th>
          <th class="num">Subtotal</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`
}

/** Abre una ventana con el comprobante de devolución/cambio listo para imprimir. */
export function imprimirNotaDevolucion(data: NotaDevolucionData) {
  const ventana = window.open('', '_blank', 'width=420,height=600')
  if (!ventana) {
    window.alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio.')
    return
  }

  const money = (n: number) => formatearMonto(n, data.simboloMoneda)
  const esCambio = data.nuevos.length > 0

  const totales = [
    data.montoCobradoAhora > 0 ? `<div><span>Cobrado ahora</span><span>${money(data.montoCobradoAhora)}</span></div>` : '',
    data.porPagar > 0 ? `<div><span>Queda pendiente</span><span>${money(data.porPagar)}</span></div>` : '',
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
        <title>${esCambio ? 'Cambio' : 'Devolución'} #${data.id}</title>
        <style>
          @page { margin: 8mm; }
          body { font-family: system-ui, sans-serif; font-size: 12px; margin: 0; padding: 12px; width: 280px; }
          h1 { font-size: 16px; margin: 0 0 2px; }
          .sub { color: #555; margin-bottom: 10px; }
          .datos div { margin-bottom: 2px; }
          h2 { font-size: 12px; margin: 12px 0 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
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
        <div class="sub">${esCambio ? 'Cambio' : 'Devolución'} #${data.id} — Venta original #${data.idVenta}</div>
        <div class="datos">
          <div><strong>Cliente:</strong> ${escapeHtml(data.cliente)} (${escapeHtml(data.documentoCliente)})</div>
          <div><strong>Fecha:</strong> ${new Date(data.fecha).toLocaleString('es-BO')}</div>
          <div><strong>Atendido por:</strong> ${escapeHtml(data.vendedor)}</div>
        </div>

        <h2>Devuelve</h2>
        ${tabla(data.devueltos, money)}

        ${esCambio ? `<h2>Se lleva a cambio</h2>${tabla(data.nuevos, money)}` : ''}

        ${totales ? `<div class="totales">${totales}</div>` : ''}

        ${data.motivo ? `<div class="nota">${escapeHtml(data.motivo)}</div>` : ''}
        <div class="footer">¡Gracias por su preferencia!</div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `)
  ventana.document.close()
}
