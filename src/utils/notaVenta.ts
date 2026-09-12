function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

import { formatearMonto } from './moneda'

export interface ItemNotaVenta {
  codigo: string
  descripcion?: string | null
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface NotaVentaData {
  /** Nombre del negocio configurado (Administración → Datos del negocio). */
  nombreNegocio: string
  /** Símbolo de moneda configurado (Bs., $, U$S, etc.). */
  simboloMoneda: string
  id: number
  fecha: string
  cliente: string
  documentoCliente: string
  vendedor: string
  referencia?: string | null
  nota?: string | null
  items: ItemNotaVenta[]
  total: number
  pagado: number
  porPagar: number
}

/** Ticket angosto (impresora térmica tipo súper, 80mm) u hoja completa (A4/Carta, impresora
 * normal de oficina) — se elige cada vez que se imprime, según qué impresora se vaya a usar. */
export type FormatoImpresion = 'ticket' | 'hoja'

const ESTILOS_TICKET = `
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
  .total-final { font-size: 14px; font-weight: 700; }
  .nota { margin-top: 10px; font-style: italic; color: #444; }
  .footer { margin-top: 16px; text-align: center; color: #555; }
`

const ESTILOS_HOJA = `
  @page { size: A4; margin: 15mm; }
  body { font-family: system-ui, sans-serif; font-size: 14px; margin: 0 auto; padding: 0; max-width: 190mm; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .sub { color: #555; margin-bottom: 16px; font-size: 14px; }
  .datos div { margin-bottom: 4px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th, td { text-align: left; padding: 8px 6px; font-size: 13px; }
  th { border-bottom: 2px solid #333; }
  .num { text-align: right; }
  .totales { margin-top: 16px; border-top: 2px solid #333; padding-top: 10px; max-width: 320px; margin-left: auto; }
  .totales div { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px; }
  .total-final { font-size: 18px; font-weight: 700; }
  .nota { margin-top: 18px; font-style: italic; color: #444; }
  .footer { margin-top: 28px; text-align: center; color: #555; }
`

/** Abre una ventana con la nota de venta lista para imprimir. `formato` decide el diseño:
 * "ticket" (angosto, para la impresora térmica chica que usan los súper) u "hoja" (A4/Carta
 * completa, para una impresora de oficina normal). Por defecto "ticket" (comportamiento de
 * siempre), para no cambiarle nada a quien no elija explícitamente lo contrario. */
export function imprimirNotaVenta(data: NotaVentaData, formato: FormatoImpresion = 'ticket') {
  const esHoja = formato === 'hoja'
  const ventana = window.open('', '_blank', esHoja ? 'width=900,height=700' : 'width=420,height=600')
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
          <td>${escapeHtml(item.descripcion ?? '')}</td>
          <td class="num">${item.cantidad}</td>
          <td class="num">${money(item.precioUnitario)}</td>
          <td class="num">${money(item.subtotal)}</td>
        </tr>`,
    )
    .join('')

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Nota de venta #${data.id}</title>
        <style>${esHoja ? ESTILOS_HOJA : ESTILOS_TICKET}</style>
      </head>
      <body>
        <h1>${escapeHtml(data.nombreNegocio)}</h1>
        <div class="sub">Nota de venta #${data.id}</div>
        <div class="datos">
          <div><strong>Cliente:</strong> ${escapeHtml(data.cliente)} (${escapeHtml(data.documentoCliente)})</div>
          <div><strong>Fecha:</strong> ${new Date(data.fecha).toLocaleString('es-BO')}</div>
          <div><strong>Vendedor:</strong> ${escapeHtml(data.vendedor)}</div>
          ${data.referencia ? `<div><strong>Referencia:</strong> ${escapeHtml(data.referencia)}</div>` : ''}
        </div>
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
        </table>
        <div class="totales">
          <div><span>Total</span><span class="total-final">${money(data.total)}</span></div>
          <div><span>Pagado</span><span>${money(data.pagado)}</span></div>
          <div><span>Por pagar</span><span>${money(data.porPagar)}</span></div>
        </div>
        ${data.nota ? `<div class="nota">${escapeHtml(data.nota)}</div>` : ''}
        <div class="footer">¡Gracias por su compra!</div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `)
  ventana.document.close()
}
