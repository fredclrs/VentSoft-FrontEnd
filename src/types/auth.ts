export interface LoginRequest {
  nombreUsuario: string
  contrasena: string
}

export interface UsuarioAutenticado {
  id: number
  nombre: string
  documentoIdentidad: string
  nombreUsuario: string
  correo?: string | null
  estado: string
  /** Si es true, tiene acceso a todo sin necesidad de permisos individuales. */
  esAdministrador: boolean
  /** Claves de permiso (ver types/permisos.ts) separadas por coma; solo importa si esAdministrador es false. */
  permisos: string
}

export interface LoginResponse {
  token: string
  expiracion: string
  usuario: UsuarioAutenticado
}
