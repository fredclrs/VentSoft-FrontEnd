/** Catálogo de permisos individuales (debe coincidir tal cual con Domain.Common.Permisos). */
export const PERMISO_VENTAS = 'ventas'
export const PERMISO_COMPRAS = 'compras'
export const PERMISO_COBROS = 'cobros'
export const PERMISO_PAGOS = 'pagos'
export const PERMISO_CUENTAS_POR_COBRAR = 'cuentas_cobrar'
export const PERMISO_CUENTAS_POR_PAGAR = 'cuentas_pagar'
export const PERMISO_INVENTARIO = 'inventario'
export const PERMISO_VENTAS_DEL_DIA = 'ventas_dia'
export const PERMISO_USUARIOS = 'usuarios'
export const PERMISO_CONFIGURACION = 'configuracion'
export const PERMISO_ENTREGAS = 'entregas'
export const PERMISO_LIQUIDACIONES = 'liquidaciones'
export const PERMISO_VENTAS_POR_VENDEDOR = 'ventas_vendedor'

/** Para el formulario de Usuarios: qué le puede tildar el Administrador a cada usuario. */
export const OPCIONES_PERMISOS: { value: string; label: string; descripcion: string }[] = [
  { value: PERMISO_VENTAS, label: 'Ventas', descripcion: 'Registrar ventas, y ver Clientes, Ventas por cliente, Ventas por temporada y Productos más vendidos.' },
  { value: PERMISO_COBROS, label: 'Cobros', descripcion: 'Registrar cobros a clientes.' },
  { value: PERMISO_CUENTAS_POR_COBRAR, label: 'Cuentas por cobrar', descripcion: 'Ver cuánto debe cada cliente.' },
  { value: PERMISO_COMPRAS, label: 'Compras', descripcion: 'Registrar compras, y ver Proveedores, Compras por proveedor y lotes por vencer.' },
  { value: PERMISO_PAGOS, label: 'Pagos', descripcion: 'Registrar pagos a proveedores.' },
  { value: PERMISO_CUENTAS_POR_PAGAR, label: 'Cuentas por pagar', descripcion: 'Ver cuánto se le debe a cada proveedor.' },
  { value: PERMISO_INVENTARIO, label: 'Inventario', descripcion: 'Crear/editar artículos, familias, características y promociones.' },
  { value: PERMISO_VENTAS_DEL_DIA, label: 'Ventas del día', descripcion: 'Ver el cierre del día: total vendido, cobrado y ganancia estimada.' },
  { value: PERMISO_USUARIOS, label: 'Usuarios', descripcion: 'Crear/editar usuarios y sus permisos.' },
  { value: PERMISO_CONFIGURACION, label: 'Configuración', descripcion: 'Formas de pago, Temporadas/campañas, Tipos de bien y Datos del negocio.' },
  { value: PERMISO_ENTREGAS, label: 'Entregas (pago en especie)', descripcion: 'Registrar entregas de bienes (ej: grano, maquinaria) que un cliente trae para pagar su deuda.' },
  { value: PERMISO_LIQUIDACIONES, label: 'Liquidaciones', descripcion: 'Fijar el precio de las entregas pendientes y aplicarlas contra la deuda del cliente.' },
  { value: PERMISO_VENTAS_POR_VENDEDOR, label: 'Ventas por vendedor', descripcion: 'Ver las ventas de todos los vendedores: ranking de desempeño, historial por vendedor y trazabilidad por artículo.' },
]

/**
 * ¿El usuario tiene el permiso indicado? Un Administrador siempre tiene todos.
 * Defensivo ante sesiones guardadas de una versión anterior del sistema (sin estos campos
 * o con el viejo "rol" de texto): si "permisos" no es un string usable, no revienta, solo
 * no otorga nada — el guard de rutas y el propio backend igual lo van a frenar.
 */
export function tienePermiso(
  usuario: { esAdministrador: boolean; permisos: string } | null | undefined,
  permiso: string,
): boolean {
  if (!usuario) return false
  if (usuario.esAdministrador) return true
  return (usuario.permisos ?? '')
    .split(',')
    .map((p) => p.trim())
    .includes(permiso)
}
