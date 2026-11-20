export interface Promocion {
  id: number
  nombrePromocion: string
  descuentoMonetario?: number | null
  descuentoPorcentaje?: number | null
  descripcion?: string | null
  /** Promoción "N por $X" (ej. Chicle 2x500): llevando cantidadPromo unidades se cobra
   * precioPromo en total. Las dos en null = no es de este tipo. */
  cantidadPromo?: number | null
  precioPromo?: number | null
  estado: string
}

export type PromocionFormValues = Omit<Promocion, 'id' | 'estado'>
