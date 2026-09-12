import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { TOKEN_STORAGE_KEY } from '../api/client'
import { login as loginRequest } from '../api/auth'
import { tienePermiso as checkPermiso } from '../types/permisos'
import type { LoginRequest, UsuarioAutenticado } from '../types/auth'

const USER_STORAGE_KEY = 'ventsoft.usuario'

interface AuthContextValue {
  usuario: UsuarioAutenticado | null
  isAuthenticated: boolean
  /** Acceso total sin necesidad de permisos individuales. */
  esAdministrador: boolean
  /** ¿El usuario logueado tiene este permiso puntual? (siempre true si es Administrador). */
  tienePermiso: (permiso: string) => boolean
  login: (credenciales: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): UsuarioAutenticado | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    const usuario = JSON.parse(raw) as Partial<UsuarioAutenticado>
    // Sesión guardada por una versión anterior del sistema (sin permisos individuales,
    // con el viejo "rol" de texto, etc.): mejor pedir que vuelva a loguearse a que quede
    // "logueado" pero sin poder ver nada, o que la app reviente al leer un campo que no está.
    if (typeof usuario.esAdministrador !== 'boolean' || typeof usuario.permisos !== 'string') {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
      return null
    }
    return usuario as UsuarioAutenticado
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(readStoredUser)

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      isAuthenticated: usuario !== null,
      esAdministrador: usuario?.esAdministrador ?? false,
      tienePermiso: (permiso) => checkPermiso(usuario, permiso),
      async login(credenciales) {
        const response = await loginRequest(credenciales)
        localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.usuario))
        setUsuario(response.usuario)
      },
      logout() {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
        setUsuario(null)
      },
    }),
    [usuario],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider.')
  return context
}
