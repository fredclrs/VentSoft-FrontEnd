export interface FormaDePago {
  id: number
  nombre: string
  estado: string
}

export type FormaDePagoFormValues = Omit<FormaDePago, 'id' | 'estado'>
