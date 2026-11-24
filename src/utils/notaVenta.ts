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

/** Ticket de 58mm (impresoras térmicas chicas tipo POS-58), ticket de 80mm (las de súper) u
 * hoja completa (A4/Carta, impresora normal de oficina) — se elige según la impresora. */
export type FormatoImpresion = 'ticket58' | 'ticket80' | 'hoja'

/** Estilos del ticket térmico. Todo en negro puro (las térmicas imprimen el gris casi
 * invisible), sin márgenes de página, pegado a la orilla izquierda y con el ancho
 * imprimible real del papel (58mm → ~48mm útiles, 80mm → ~72mm útiles). */
function estilosTicket(anchoPapelMm: number, anchoUtilMm: number, fuentePx: number) {
  return `
  @page { size: ${anchoPapelMm}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: ${fuentePx}px; color: #000;
         width: ${anchoUtilMm}mm; margin: 0; padding: 1mm 0 4mm; line-height: 1.25; }
  h1 { font-size: ${fuentePx + 3}px; margin: 0 0 2px; text-align: center; }
  .sub { text-align: center; margin-bottom: 6px; }
  .datos div { margin-bottom: 1px; overflow-wrap: anywhere; }
  .sep { border-top: 1px dashed #000; margin: 5px 0; }
  .item { margin-bottom: 4px; }
  .item .desc { font-weight: 700; overflow-wrap: anywhere; }
  .fila { display: flex; justify-content: space-between; gap: 4px; }
  .fila span:last-child { text-align: right; white-space: nowrap; }
  .total-final { font-size: ${fuentePx + 2}px; font-weight: 700; }
  .nota { margin-top: 6px; font-style: italic; overflow-wrap: anywhere; }
  .footer { margin-top: 10px; text-align: center; }
`
}

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
 * ticket de 58mm o de 80mm (impresoras térmicas) u "hoja" (A4/Carta, impresora de oficina). */
export function imprimirNotaVenta(data: NotaVentaData, formato: FormatoImpresion = 'ticket80') {
  const esHoja = formato === 'hoja'
  const ventana = window.open('', '_blank', esHoja ? 'width=900,height=700' : 'width=420,height=600')
  if (!ventana) {
    window.alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio.')
    return
  }

  const money = (n: number) => formatearMonto(n, data.simboloMoneda)

  const datos = `
        <h1>${escapeHtml(data.nombreNegocio)}</h1>
        <div class="sub">Nota de venta #${data.id}</div>
        <div class="datos">
          <div><strong>Cliente:</strong> ${escapeHtml(data.cliente)} (${escapeHtml(data.documentoCliente)})</div>
          <div><strong>Fecha:</strong> ${new Date(data.fecha).toLocaleString('es-BO')}</div>
          <div><strong>Vendedor:</strong> ${escapeHtml(data.vendedor)}</div>
          ${data.referencia ? `<div><strong>Referencia:</strong> ${escapeHtml(data.referencia)}</div>` : ''}
        </div>`

  const pie = `
        ${data.nota ? `<div class="nota">${escapeHtml(data.nota)}</div>` : ''}
        <div class="footer">¡Gracias por su compra!</div>`

  let estilos: string
  let cuerpo: string

  if (esHoja) {
    estilos = ESTILOS_HOJA
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
    cuerpo = `
        ${datos}
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
        ${pie}`
  } else {
    // En papel angosto no entran 5 columnas: cada artículo va en dos renglones
    // (descripción arriba; "cantidad x precio" y el subtotal abajo, a la derecha).
    estilos = formato === 'ticket58' ? estilosTicket(58, 44, 9) : estilosTicket(80, 70, 11)
    const items = data.items
      .map(
        (item) => `
        <div class="item">
          <div class="desc">${escapeHtml(item.descripcion || item.codigo)}</div>
          <div class="fila"><span>${item.cantidad} x ${money(item.precioUnitario)}</span><span>${money(item.subtotal)}</span></div>
        </div>`,
      )
      .join('')
    cuerpo = `
        ${datos}
        <div class="sep"></div>
        ${items}
        <div class="sep"></div>
        <div class="fila total-final"><span>TOTAL</span><span>${money(data.total)}</span></div>
        <div class="fila"><span>Pagado</span><span>${money(data.pagado)}</span></div>
        <div class="fila"><span>Por pagar</span><span>${money(data.porPagar)}</span></div>
        ${pie}`
  }

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Nota de venta #${data.id}</title>
        <style>${estilos}</style>
      </head>
      <body>
        ${cuerpo}
        <script>window.onload = () => { window.print(); }; window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `)
  ventana.document.close()
}
