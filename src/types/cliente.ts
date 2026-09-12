/** Espejo de Domain.Dtos.ClienteDto del backend. */
export interface Cliente {
  id: number
  nombre: string
  documentoIdentidad: string
  personaContacto?: string | null
  direccion?: string | null
  zona?: string | null
  telefono?: string | null
  correo?: string | null
  nota?: string | null
  saldoAFavor: number
  estado: string
}

/** Datos editables del formulario (sin id/estado/saldoAFavor, que maneja el backend). */
export type ClienteFormValues = Omit<Cliente, 'id' | 'estado' | 'saldoAFavor'>
