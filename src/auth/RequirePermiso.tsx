import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Bloquea el acceso a las rutas hijas si el usuario logueado no tiene el permiso indicado
 * (un Administrador siempre pasa). Es un complemento del [Authorize(Roles=...)] real del
 * backend (esa es la barrera de verdad): esto evita que alguien llegue a una pantalla
 * escribiendo la URL a mano, aunque el menú ya no se la muestre.
 */
export function RequirePermiso({ permiso }: { permiso: string }) {
  const { tienePermiso } = useAuth()

  if (!tienePermiso(permiso)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
