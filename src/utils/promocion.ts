import type { Promocion } from '../types/promocion'

/** Texto corto para mostrar la promoción en Ventas y en el comprobante ("2 x $ 500", "-10%"…). */
export function etiquetaPromocion(promo: Promocion, money: (n: number) => string): string {
  if (promo.cantidadPromo && promo.precioPromo) return `${promo.cantidadPromo} x ${money(promo.precioPromo)}`
  if (promo.descuentoPorcentaje) return `-${promo.descuentoPorcentaje}%`
  if (promo.descuentoMonetario) return `-${money(promo.descuentoMonetario)} c/u`
  return promo.nombrePromocion
}

/**
 * Cuánto se descuenta de un renglón por la promoción de su artículo. `unidades` y
 * `precioUnidad` son siempre por unidad real (la misma unidad en la que se manda al backend).
 *
 * - "N por $X": cada grupo completo de N se cobra X; lo que sobra va a precio normal
 *   (2x500 llevando 3 = 500 + 1 a precio normal).
 * - Descuento %: sobre todo el renglón.
 * - Descuento monto fijo: por cada unidad.
 *
 * Nunca da negativo: si la "promo" sale más cara que el precio normal (ej. el precio subió
 * y nadie actualizó la promoción) no se aplica, en vez de cobrar de más.
 */
export function descuentoPromocion(promo: Promocion | undefined, unidades: number, precioUnidad: number): number {
  if (!promo || promo.estado !== 'AC' || unidades <= 0) return 0
  const bruto = unidades * precioUnidad
  let descuento = 0
  if (promo.cantidadPromo && promo.cantidadPromo > 1 && promo.precioPromo && promo.precioPromo > 0) {
    const grupos = Math.floor(unidades / promo.cantidadPromo)
    const conPromo = grupos * promo.precioPromo + (unidades - grupos * promo.cantidadPromo) * precioUnidad
    descuento = bruto - conPromo
  } else if (promo.descuentoPorcentaje) {
    descuento = (bruto * promo.descuentoPorcentaje) / 100
  } else if (promo.descuentoMonetario) {
    descuento = unidades * promo.descuentoMonetario
  }
  // Redondeo a centavos para que lo que se ve en pantalla sea exactamente lo que se cobra.
  return Math.round(Math.min(Math.max(0, descuento), bruto) * 100) / 100
}
