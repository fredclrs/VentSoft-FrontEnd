import type { Promocion } from '../types/promocion'

function esPorCantidad(promo: Promocion): boolean {
  return !!promo.cantidadPromo && promo.cantidadPromo > 1 && !!promo.precioPromo && promo.precioPromo > 0
}

/** Texto corto para mostrar la promoción en Ventas y en el comprobante
 * ("2 x $ 500", "Desde 3: $ 450 c/u", "-10%"…). */
export function etiquetaPromocion(promo: Promocion, money: (n: number) => string): string {
  if (esPorCantidad(promo)) {
    return promo.esPrecioPorMayor
      ? `Desde ${promo.cantidadPromo}: ${money(promo.precioPromo!)} c/u`
      : `${promo.cantidadPromo} x ${money(promo.precioPromo!)}`
  }
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
 * - Precio por mayor: llevando N o más, TODAS las unidades van a X cada una
 *   (desde 3 a 450 llevando 5 = 5 × 450); con menos de N, precio normal.
 * - Descuento %: sobre todo el renglón.
 * - Descuento monto fijo: por cada unidad.
 *
 * Nunca da negativo: si la "promo" sale más cara que el precio normal (ej. el precio bajó
 * y nadie actualizó la promoción) no se aplica, en vez de cobrar de más.
 */
export function descuentoPromocion(promo: Promocion | undefined, unidades: number, precioUnidad: number): number {
  if (!promo || promo.estado !== 'AC' || unidades <= 0) return 0
  const bruto = unidades * precioUnidad
  let descuento = 0
  if (esPorCantidad(promo)) {
    const n = promo.cantidadPromo!
    const precio = promo.precioPromo!
    if (promo.esPrecioPorMayor) {
      descuento = unidades >= n ? bruto - unidades * precio : 0
    } else {
      const grupos = Math.floor(unidades / n)
      descuento = bruto - (grupos * precio + (unidades - grupos * n) * precioUnidad)
    }
  } else if (promo.descuentoPorcentaje) {
    descuento = (bruto * promo.descuentoPorcentaje) / 100
  } else if (promo.descuentoMonetario) {
    descuento = unidades * promo.descuentoMonetario
  }
  // Redondeo a centavos para que lo que se ve en pantalla sea exactamente lo que se cobra.
  return Math.round(Math.min(Math.max(0, descuento), bruto) * 100) / 100
}
