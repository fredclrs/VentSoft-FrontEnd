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

/**
 * Abre una hoja con varias copias de la misma etiqueta (código de barras + descripción), en
 * grilla, lista para imprimir y recortar — para cuando hacen falta muchas unidades del mismo
 * artículo (ej. 30 poleras iguales) sin desperdiciar una hoja por unidad.
 *
 * A propósito SIN precio: el precio se maneja con un sticker aparte, para poder sacarlo solo a
 * él cuando el producto es para regalo, sin tener que arrancar toda la etiqueta con el código.
 */
export function imprimirEtiquetaArticulo(articulo: EtiquetaArticulo, cantidad: number) {
  const barcodeMarkup = barcodeSvgMarkup(articulo.codigo)
  if (!barcodeMarkup) {
    window.alert('No se pudo generar el código de barras para este artículo.')
    return
  }

  const ventana = window.open('', '_blank', 'width=700,height=600')
  if (!ventana) {
    window.alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio.')
    return
  }

  const etiqueta = `
    <div class="etiqueta">
      <div class="descripcion">${escapeHtml(articulo.descripcion ?? '')}</div>
      ${barcodeMarkup}
    </div>
  `
  const hoja = etiqueta.repeat(Math.max(1, Math.round(cantidad)))

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Etiquetas ${articulo.codigo}</title>
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
        <div class="hoja">${hoja}</div>
        <script>window.onload = () => { window.print(); }; window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `)
  ventana.document.close()
}
