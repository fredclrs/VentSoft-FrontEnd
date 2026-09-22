import JsBarcode from 'jsbarcode'

/** Genera el markup SVG de un código de barras Code128 a partir de un texto (el Código del artículo). */
export function barcodeSvgMarkup(value: string): string | null {
  if (!value.trim()) return null
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: 1.6,
      height: 45,
      fontSize: 12,
      margin: 4,
    })
    return svg.outerHTML
  } catch {
    // Código con caracteres no soportados por Code128: no rompemos la pantalla por esto.
    return null
  }
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface EtiquetaArticulo {
  codigo: string
  descripcion?: string | null
}

/** Un ítem de la hoja de etiquetas: su código/descripción y cuántas copias de esa etiqueta
 * puntual hay que imprimir (no todas las etiquetas de la hoja tienen por qué repetirse la misma
 * cantidad de veces — para eso sirve la cola de etiquetas, que mezcla productos distintos). */
interface ItemHojaEtiquetas extends EtiquetaArticulo {
  cantidad: number
}

/**
 * Arma y abre la hoja de impresión con una etiqueta (código de barras + descripción) por cada
 * copia pedida de cada ítem — en grilla, lista para imprimir y recortar (o pegar directo, si es
 * una hoja de stickers pre-cortada). Si no entran todas en una hoja, el navegador sigue solo en
 * la próxima (page-break-inside: avoid evita que una etiqueta quede partida entre dos hojas).
 *
 * A propósito SIN precio: el precio se maneja con un sticker aparte, para poder sacarlo solo a
 * él cuando el producto es para regalo, sin tener que arrancar toda la etiqueta con el código.
 */
function abrirHojaDeEtiquetas(items: ItemHojaEtiquetas[], tituloVentana: string) {
  const etiquetas = items
    .map((item) => {
      const barcodeMarkup = barcodeSvgMarkup(item.codigo)
      if (!barcodeMarkup) return ''
      const unaEtiqueta = `
        <div class="etiqueta">
          <div class="descripcion">${escapeHtml(item.descripcion ?? '')}</div>
          ${barcodeMarkup}
        </div>
      `
      return unaEtiqueta.repeat(Math.max(1, Math.round(item.cantidad)))
    })
    .join('')

  if (!etiquetas) {
    window.alert('No se pudo generar ningún código de barras para imprimir.')
    return
  }

  const ventana = window.open('', '_blank', 'width=700,height=600')
  if (!ventana) {
    window.alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio.')
    return
  }

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(tituloVentana)}</title>
        <style>
          @page { margin: 8mm; }
          body { font-family: system-ui, sans-serif; margin: 0; }
          .hoja { display: flex; flex-wrap: wrap; gap: 3mm; }
          .etiqueta {
            width: 42mm;
            border: 1px dashed #999;
            border-radius: 2mm;
            padding: 2mm;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .descripcion { font-size: 9px; margin-bottom: 2px; word-break: break-word; line-height: 1.2; }
          svg { width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="hoja">${etiquetas}</div>
        <script>window.onload = () => { window.print(); }; window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `)
  ventana.document.close()
}

/**
 * Imprime N copias de la etiqueta de UN solo artículo — para cuando entra un producto nuevo y
 * hacen falta varias unidades iguales (ej. 30 poleras iguales) sin desperdiciar una hoja por
 * unidad. Si en cambio hay pocas unidades de varios productos distintos, conviene juntarlos en
 * la Cola de etiquetas e imprimirlos todos juntos (ver imprimirHojaDeCola).
 */
export function imprimirEtiquetaArticulo(articulo: EtiquetaArticulo, cantidad: number) {
  abrirHojaDeEtiquetas([{ ...articulo, cantidad }], `Etiquetas ${articulo.codigo}`)
}

/** Imprime de una sola vez las etiquetas de varios artículos distintos (la Cola de etiquetas),
 * mezclados en la misma hoja para aprovechar mejor el papel. */
export function imprimirHojaDeCola(items: ItemHojaEtiquetas[]) {
  abrirHojaDeEtiquetas(items, 'Etiquetas')
}
