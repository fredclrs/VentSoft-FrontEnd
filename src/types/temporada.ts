export interface Temporada {
  id: number
  nombre: string
  mesInicio: number
  mesFin: number
  estado: string
}

export type TemporadaFormValues = Omit<Temporada, 'id' | 'estado'>
