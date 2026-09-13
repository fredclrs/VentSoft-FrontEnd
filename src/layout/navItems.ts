import HomeIcon from '@mui/icons-material/HomeOutlined'
import PeopleIcon from '@mui/icons-material/PeopleOutlined'
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined'
import BadgeIcon from '@mui/icons-material/BadgeOutlined'
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined'
import CategoryIcon from '@mui/icons-material/CategoryOutlined'
import SyncAltIcon from '@mui/icons-material/SyncAltOutlined'
import TuneIcon from '@mui/icons-material/TuneOutlined'
import LocalOfferIcon from '@mui/icons-material/LocalOfferOutlined'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined'
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined'
import PointOfSaleIcon from '@mui/icons-material/PointOfSaleOutlined'
import RequestQuoteIcon from '@mui/icons-material/RequestQuoteOutlined'
import CreditCardIcon from '@mui/icons-material/CreditCardOutlined'
import WbSunnyIcon from '@mui/icons-material/WbSunnyOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined'
import TodayIcon from '@mui/icons-material/TodayOutlined'
import StoreIcon from '@mui/icons-material/StoreOutlined'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/InventoryOutlined'
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import PriceCheckIcon from '@mui/icons-material/PriceCheckOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined'
import AgricultureIcon from '@mui/icons-material/AgricultureOutlined'
import GavelIcon from '@mui/icons-material/GavelOutlined'
import LeaderboardIcon from '@mui/icons-material/LeaderboardOutlined'
import ManageSearchIcon from '@mui/icons-material/ManageSearchOutlined'
import type SvgIcon from '@mui/material/SvgIcon'
import {
  PERMISO_COBROS,
  PERMISO_COMPRAS,
  PERMISO_CONFIGURACION,
  PERMISO_CUENTAS_POR_COBRAR,
  PERMISO_CUENTAS_POR_PAGAR,
  PERMISO_ENTREGAS,
  PERMISO_INVENTARIO,
  PERMISO_LIQUIDACIONES,
  PERMISO_PAGOS,
  PERMISO_USUARIOS,
  PERMISO_VENTAS,
  PERMISO_VENTAS_DEL_DIA,
  PERMISO_VENTAS_POR_VENDEDOR,
} from '../types/permisos'

export interface NavItem {
  label: string
  path: string
  icon: typeof SvgIcon
  /** Permiso puntual necesario para verlo (ver types/permisos.ts). Sin esto, es visible para cualquier usuario logueado. */
  permiso?: string
}

export interface NavModule {
  id: string
  title: string
  description: string
  icon: typeof SvgIcon
  color: string
  items: NavItem[]
}

/** Acceso a la pantalla principal; se muestra suelto, fuera de los módulos en acordeón. */
export const homeItem: NavItem = { label: 'Inicio', path: '/', icon: HomeIcon }

/**
 * Saca los ítems para los que el usuario no tiene el permiso puntual, y de paso el módulo
 * entero si le queda sin ningún ítem visible. Se usa tanto en el menú lateral (AppLayout)
 * como en las tarjetas de módulos del Inicio (DashboardPage) para que ninguno de los dos
 * muestre algo a lo que el usuario de todos modos no puede entrar (el candado real está en
 * el backend, con [Authorize(Roles = "...")] por permiso).
 */
export function filtrarModulosPorPermiso(
  modules: NavModule[],
  tienePermiso: (permiso: string) => boolean,
): NavModule[] {
  return modules
    .map((m) => ({ ...m, items: m.items.filter((i) => !i.permiso || tienePermiso(i.permiso)) }))
    .filter((m) => m.items.length > 0)
}

/**
 * Agrupación por módulo de negocio (Ventas / Compras / Inventario / Administración),
 * siguiendo el criterio habitual de los sistemas de gestión comercial: el cliente vive
 * dentro de Ventas (es a quien se le vende y cobra) y el proveedor dentro de Compras
 * (es a quien se le compra y paga).
 */
export const navModules: NavModule[] = [
  {
    id: 'ventas',
    title: 'Ventas',
    description: 'Ventas, cobros y clientes',
    icon: PointOfSaleIcon,
    color: '#1565c0',
    items: [
      { label: 'Ventas', path: '/ventas', icon: PointOfSaleIcon, permiso: PERMISO_VENTAS },
      { label: 'Cobros', path: '/cobros', icon: RequestQuoteIcon, permiso: PERMISO_COBROS },
      { label: 'Entregas (pago en especie)', path: '/entregas', icon: AgricultureIcon, permiso: PERMISO_ENTREGAS },
      { label: 'Liquidación', path: '/liquidacion', icon: GavelIcon, permiso: PERMISO_LIQUIDACIONES },
      { label: 'Clientes', path: '/clientes', icon: PeopleIcon, permiso: PERMISO_VENTAS },
    ],
  },
  {
    id: 'compras',
    title: 'Compras',
    description: 'Compras, pagos y proveedores',
    icon: ShoppingCartIcon,
    color: '#ef6c00',
    items: [
      { label: 'Compras', path: '/compras', icon: ShoppingCartIcon, permiso: PERMISO_COMPRAS },
      { label: 'Pagos', path: '/pagos', icon: PaymentsIcon, permiso: PERMISO_PAGOS },
      { label: 'Proveedores', path: '/proveedores', icon: LocalShippingIcon, permiso: PERMISO_COMPRAS },
    ],
  },
  {
    id: 'inventario',
    title: 'Inventario',
    description: 'Artículos, familias, características y promociones',
    icon: Inventory2Icon,
    color: '#2e7d32',
    items: [
      { label: 'Artículos', path: '/articulos', icon: Inventory2Icon, permiso: PERMISO_INVENTARIO },
      { label: 'Ajuste de stock', path: '/ajuste-stock', icon: SyncAltIcon, permiso: PERMISO_INVENTARIO },
      { label: 'Familias', path: '/familias', icon: CategoryIcon, permiso: PERMISO_INVENTARIO },
      { label: 'Características', path: '/caracteristicas', icon: TuneIcon, permiso: PERMISO_INVENTARIO },
      { label: 'Promociones', path: '/promociones', icon: LocalOfferIcon, permiso: PERMISO_INVENTARIO },
    ],
  },
  {
    id: 'administracion',
    title: 'Administración',
    description: 'Usuarios y formas de pago',
    icon: SettingsIcon,
    color: '#6a1b9a',
    items: [
      { label: 'Datos del negocio', path: '/datos-del-negocio', icon: StoreIcon, permiso: PERMISO_CONFIGURACION },
      { label: 'Usuarios', path: '/usuarios', icon: BadgeIcon, permiso: PERMISO_USUARIOS },
      { label: 'Formas de pago', path: '/formas-de-pago', icon: CreditCardIcon, permiso: PERMISO_CONFIGURACION },
      { label: 'Temporadas / campañas', path: '/temporadas', icon: WbSunnyIcon, permiso: PERMISO_CONFIGURACION },
      { label: 'Tipos de bien', path: '/tipos-de-bien', icon: CategoryIcon, permiso: PERMISO_CONFIGURACION },
    ],
  },
  {
    id: 'reportes',
    title: 'Reportes',
    description: 'Stock bajo, vencimientos y cuentas pendientes',
    icon: AssessmentIcon,
    color: '#c62828',
    items: [
      { label: 'Ventas por cliente', path: '/reportes/ventas-por-cliente', icon: ReceiptLongIcon, permiso: PERMISO_VENTAS },
      { label: 'Ventas por temporada', path: '/reportes/ventas-por-temporada', icon: ReceiptLongIcon, permiso: PERMISO_VENTAS },
      { label: 'Compras por proveedor', path: '/reportes/compras-por-proveedor', icon: ReceiptLongIcon, permiso: PERMISO_COMPRAS },
      { label: 'Productos más vendidos', path: '/reportes/productos-mas-vendidos', icon: TrendingUpIcon, permiso: PERMISO_VENTAS },
      { label: 'Ventas del día', path: '/reportes/ventas-del-dia', icon: TodayIcon, permiso: PERMISO_VENTAS_DEL_DIA },
      { label: 'Ventas por vendedor', path: '/reportes/ventas-por-vendedor', icon: LeaderboardIcon, permiso: PERMISO_VENTAS_POR_VENDEDOR },
      { label: 'Ventas por artículo', path: '/reportes/ventas-por-articulo', icon: ManageSearchIcon, permiso: PERMISO_VENTAS_POR_VENDEDOR },
      // Stock bajo y Lotes por vencer son informativos y de bajo riesgo: quedan abiertos a
      // cualquier usuario logueado, no hace falta tildarle un permiso puntual.
      { label: 'Stock actual', path: '/reportes/stock-actual', icon: Inventory2OutlinedIcon },
      { label: 'Stock bajo', path: '/reportes/stock-bajo', icon: WarningAmberIcon },
      { label: 'Lotes por vencer', path: '/reportes/lotes-por-vencer', icon: EventBusyIcon },
      { label: 'Cuentas por cobrar', path: '/reportes/cuentas-por-cobrar', icon: AccountBalanceWalletIcon, permiso: PERMISO_CUENTAS_POR_COBRAR },
      { label: 'Cuentas por pagar', path: '/reportes/cuentas-por-pagar', icon: PriceCheckIcon, permiso: PERMISO_CUENTAS_POR_PAGAR },
    ],
  },
]
