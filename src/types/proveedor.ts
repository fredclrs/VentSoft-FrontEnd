export interface Proveedor {
  id: number
  nombre: string
  nit?: string | null
  personaContacto?: string | null
  direccion?: string | null
  zona?: string | null
  telefono?: number | null
  correo?: string | null
  nota?: string | null
  estado: string
}

export type ProveedorFormValues = Omit<Proveedor, 'id' | 'estado'>
