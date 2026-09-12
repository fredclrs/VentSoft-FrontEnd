export interface Caracteristica {
  id: number
  nombreCaracteristica: string
  descripcion?: string | null
  estado: string
}

export type CaracteristicaFormValues = Omit<Caracteristica, 'id' | 'estado'>
