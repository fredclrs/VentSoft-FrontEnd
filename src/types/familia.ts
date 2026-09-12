export interface Familia {
  id: number
  nombreFamilia: string
  descripcion?: string | null
  estado: string
}

export type FamiliaFormValues = Omit<Familia, 'id' | 'estado'>
