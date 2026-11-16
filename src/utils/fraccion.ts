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

function mismoCodigo(a: string | null | undefined, b: string): boolean {
  return !!a && a.toLowerCase() === b.toLowerCase()
}

/** Artículos que corresponden a un código escaneado: por su código de unidad o por el de la
 * caja (codigoPaquete). Puede haber varios solo con código compartido entre variantes. */
export function articulosPorCodigo(articulos: Articulo[], codigo: string): Articulo[] {
  return articulos.filter((a) => mismoCodigo(a.codigo, codigo) || mismoCodigo(a.codigoPaquete, codigo))
}

/** Cómo se carga un artículo al escanear este código:
 * - el código de la caja → la caja entera;
 * - el código de la unidad de un artículo que TIENE código de caja aparte → 1 suelta (almacén:
 *   cada paquete de fideos trae su código, y la caja otro);
 * - artículo sin fracción → la unidad ('caja' = paquete de 1, es lo mismo);
 * - null: se vende de las dos formas y el mismo código sirve para las dos (ej. papel: solo el
 *   rollo trae código, el paquete no) — no hay forma de saberlo, la pantalla tiene que
 *   preguntar (ver SelectorModo). */
export function modoAlEscanear(articulo: Articulo, codigo: string): ModoVentaCompra | null {
  if (mismoCodigo(articulo.codigoPaquete, codigo)) return 'caja'
  if (fraccionDe(articulo) <= 1) return 'caja'
  return articulo.codigoPaquete ? 'unidad' : null
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
