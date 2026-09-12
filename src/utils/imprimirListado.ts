function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface ColumnaListado {
  label: string
  align?: 'left' | 'right'
}

export interface FilaTotalListado {
  label: string
  valor: string
}

export interface ImprimirListadoOptions {
  /** Nombre del negocio configurado (Administración → Datos del negocio). */
  nombreNegocio: string
  titulo: string
  subtitulo?: string
  columnas: ColumnaListado[]
  filas: Array<Array<string | number>>
  totales?: FilaTotalListado[]
}

/** Abre una ventana con una tabla (listado filtrado de ventas/compras/etc.) lista para imprimir. */
export function imprimirListado({ nombreNegocio, titulo, subtitulo, columnas, filas, totales }: ImprimirListadoOptions) {
  const ventana = window.open('', '_blank', 'width=900,height=700')
  if (!ventana) {
    window.alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio.')
    return
  }

  const encabezados = columnas
    .map((c) => `<th class="${c.align === 'right' ? 'num' : ''}">${escapeHtml(c.label)}</th>`)
    .join('')

  const filasHtml = filas
    .map(
      (fila) =>
        `<tr>${fila
          .map((valor, i) => `<td class="${columnas[i]?.align === 'right' ? 'num' : ''}">${escapeHtml(String(valor))}</td>`)
          .join('')}</tr>`,
    )
    .join('')

  const totalesHtml = (totales ?? [])
    .map((t) => `<div class="total-row"><span>${escapeHtml(t.label)}</span><span>${escapeHtml(t.valor)}</span></div>`)
    .join('')

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(titulo)}</title>
        <style>
          @page { margin: 12mm; }
          body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
          .negocio { font-size: 15px; font-weight: 700; margin: 0 0 2px; }
          h1 { font-size: 15px; font-weight: 400; color: #333; margin: 0 0 4px; }
          .subtitulo { color: #555; margin-bottom: 16px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 6px 8px; font-size: 12px; border-bottom: 1px solid #ddd; }
          th { border-bottom: 2px solid #333; }
          .num { text-align: right; }
          .totales { margin-top: 14px; max-width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
          .total-row:last-child { font-weight: 700; font-size: 15px; border-top: 1px solid #333; padding-top: 6px; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="negocio">${escapeHtml(nombreNegocio)}</div>
        <h1>${escapeHtml(titulo)}</h1>
        ${subtitulo ? `<div class="subtitulo">${escapeHtml(subtitulo)}</div>` : ''}
        <table>
          <thead><tr>${encabezados}</tr></thead>
          <tbody>${filasHtml}</tbody>
        </table>
        <div class="totales">${totalesHtml}</div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `)
  ventana.document.close()
}

export interface GrupoExtracto {
  /** Ej: "Venta #12 · 02/09/2026 · Ref: ABC" */
  encabezado: string
  subencabezado?: string
  filas: Array<Array<string | number>>
  /** Totales propios de este grupo (ej: Total/Pagado/Por pagar de esa venta). */
  totales?: FilaTotalListado[]
}

export interface ImprimirExtractoOptions {
  /** Nombre del negocio configurado (Administración → Datos del negocio). */
  nombreNegocio: string
  titulo: string
  subtitulo?: string
  /** Columnas del detalle (artículo, cantidad, precio, subtotal), iguales para todos los grupos. */
  columnas: ColumnaListado[]
  grupos: GrupoExtracto[]
  /** Totales generales de todo el listado, al final del documento. */
  totalesGenerales?: FilaTotalListado[]
}

/**
 * Igual que imprimirListado, pero para cuando además de la cabecera de cada venta/compra
 * se necesita ver el detalle de artículos de cada una (un "extracto" completo para entregar
 * al cliente/proveedor), en vez de una sola fila resumen por documento.
 */
export function imprimirExtracto({ nombreNegocio, titulo, subtitulo, columnas, grupos, totalesGenerales }: ImprimirExtractoOptions) {
  const ventana = window.open('', '_blank', 'width=900,height=700')
  if (!ventana) {
    window.alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio.')
    return
  }

  const encabezadosCols = columnas
    .map((c) => `<th class="${c.align === 'right' ? 'num' : ''}">${escapeHtml(c.label)}</th>`)
    .join('')

  const gruposHtml = grupos
    .map((g) => {
      const filasHtml = g.filas
        .map(
          (fila) =>
            `<tr>${fila
              .map(
                (valor, i) => `<td class="${columnas[i]?.align === 'right' ? 'num' : ''}">${escapeHtml(String(valor))}</td>`,
              )
              .join('')}</tr>`,
        )
        .join('')

      const totalesHtml = (g.totales ?? [])
        .map((t) => `<div class="total-row-grupo"><span>${escapeHtml(t.label)}</span><span>${escapeHtml(t.valor)}</span></div>`)
        .join('')

      return `
        <div class="grupo">
          <div class="grupo-header">${escapeHtml(g.encabezado)}</div>
          ${g.subencabezado ? `<div class="grupo-sub">${escapeHtml(g.subencabezado)}</div>` : ''}
          <table>
            <thead><tr>${encabezadosCols}</tr></thead>
            <tbody>${filasHtml}</tbody>
          </table>
          <div class="totales-grupo">${totalesHtml}</div>
        </div>
      `
    })
    .join('')

  const totalesGeneralesHtml = (totalesGenerales ?? [])
    .map((t) => `<div class="total-row"><span>${escapeHtml(t.label)}</span><span>${escapeHtml(t.valor)}</span></div>`)
    .join('')

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(titulo)}</title>
        <style>
          @page { margin: 12mm; }
          body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
          .negocio { font-size: 15px; font-weight: 700; margin: 0 0 2px; }
          h1 { font-size: 15px; font-weight: 400; color: #333; margin: 0 0 4px; }
          .subtitulo { color: #555; margin-bottom: 18px; font-size: 13px; }
          .grupo { margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px dashed #999; page-break-inside: avoid; }
          .grupo-header { font-weight: 700; font-size: 13px; margin-bottom: 1px; }
          .grupo-sub { color: #555; font-size: 11px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 5px 8px; font-size: 11px; border-bottom: 1px solid #ddd; }
          th { border-bottom: 2px solid #333; }
          .num { text-align: right; }
          .totales-grupo { max-width: 240px; margin-left: auto; margin-top: 4px; }
          .total-row-grupo { display: flex; justify-content: space-between; padding: 1px 0; font-size: 11px; }
          .totales { margin-top: 16px; max-width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
          .total-row:last-child { font-weight: 700; font-size: 15px; border-top: 1px solid #333; padding-top: 6px; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="negocio">${escapeHtml(nombreNegocio)}</div>
        <h1>${escapeHtml(titulo)}</h1>
        ${subtitulo ? `<div class="subtitulo">${escapeHtml(subtitulo)}</div>` : ''}
        ${gruposHtml}
        <div class="totales">${totalesGeneralesHtml}</div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `)
  ventana.document.close()
}
