export interface Promocion {
  id: number
  nombrePromocion: string
  descuentoMonetario?: number | null
  descuentoPorcentaje?: number | null
  descripcion?: string | null
  /** Promoción por cantidad. Con esPrecioPorMayor = false es "N por $X" (ej. Chicle 2x500:
   * cada 2 se cobran 500 en total); con true es precio por mayor (desde N unidades, todas a
   * precioPromo cada una). Cantidad y precio en null = no es por cantidad. */
  cantidadPromo?: number | null
  precioPromo?: number | null
  esPrecioPorMayor?: boolean
  estado: string
}

export type PromocionFormValues = Omit<Promocion, 'id' | 'estado'>
