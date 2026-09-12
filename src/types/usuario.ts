export interface Usuario {
  id: number
  nombre: string
  documentoIdentidad: string
  nit?: string | null
  direccion?: string | null
  zona?: string | null
  telefono?: number | null
  correo?: string | null
  nota?: string | null
  nombreUsuario: string
  esAdministrador: boolean
  /** Claves de permiso (ver types/permisos.ts) separadas por coma. */
  permisos: string
  estado: string
}

export interface UsuarioFormValues {
  nombre: string
  documentoIdentidad: string
  nit: string
  direccion: string
  zona: string
  telefono: string
  correo: string
  nota: string
  nombreUsuario: string
  esAdministrador: boolean
  permisos: string
  /** Vacío en edición = no cambiar la contraseña actual. */
  contrasena: string
}
