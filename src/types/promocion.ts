export interface Promocion {
  id: number
  nombrePromocion: string
  descuentoMonetario?: number | null
  descuentoPorcentaje?: number | null
  descripcion?: string | null
  estado: string
}

export type PromocionFormValues = Omit<Promocion, 'id' | 'estado'>
