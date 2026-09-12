import type { Articulo } from '../types/articulo'

/** Modo en que se carga un renglón de venta/compra: por paquete completo, o por unidad suelta
 * (solo tiene sentido elegir cuando el artículo se vende por paquete, ver fraccionDe). El valor
 * interno 'caja' se mantiene por compatibilidad con datos/código existente, aunque en pantalla
 * ahora se muestra como "paquete" (término más genérico, no todos los rubros venden por caja). */
export type ModoVentaCompra = 'caja' | 'unidad'

/** Unidades sueltas que contiene un paquete de este artículo. 1 = no se vende por
 * paquete (caso normal, la inmensa mayoría de los artículos). */
export function fraccionDe(articulo: Articulo): number {
  return articulo.fraccion > 0 ? articulo.fraccion : 1
}

/** Precio de vender una sola unidad suelta (fuera del paquete): lo cargado explícitamente
 * en el artículo, o si no, el precio del paquete repartido entre sus unidades como referencia. */
export function precioUnidadSueltaDe(articulo: Articulo): number {
  return articulo.precioUnidadSuelta ?? articulo.precio / fraccionDe(articulo)
}

/** Costo de una sola unidad suelta: siempre proporcional (el costo de compra no tiene el
 * "recargo por vender suelto" que sí suele tener el precio de venta). */
export function costoUnidadSueltaDe(articulo: Articulo): number {
  return articulo.costo / fraccionDe(articulo)
}
