export interface TipoBien {
  id: number
  nombre: string
  unidadMedida: string
  estado: string
}

export type TipoBienFormValues = Omit<TipoBien, 'id' | 'estado'>
