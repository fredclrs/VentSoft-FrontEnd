import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { RequirePermiso } from './auth/RequirePermiso'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ClientesPage } from './pages/ClientesPage'
import { ProveedoresPage } from './pages/ProveedoresPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { ArticulosPage } from './pages/ArticulosPage'
import { AjusteStockPage } from './pages/AjusteStockPage'
import { FamiliasPage } from './pages/FamiliasPage'
import { CaracteristicasPage } from './pages/CaracteristicasPage'
import { PromocionesPage } from './pages/PromocionesPage'
import { FormasDePagoPage } from './pages/FormasDePagoPage'
import { TemporadasPage } from './pages/TemporadasPage'
import { ConfiguracionEmpresaPage } from './pages/ConfiguracionEmpresaPage'
import { VentasPage } from './pages/VentasPage'
import { ComprasPage } from './pages/ComprasPage'
import { CobrosPage } from './pages/CobrosPage'
import { PagosPage } from './pages/PagosPage'
import { TiposBienPage } from './pages/TiposBienPage'
import { EntregasBienPage } from './pages/EntregasBienPage'
import { LiquidacionPage } from './pages/LiquidacionPage'
import { VentasPorClientePage } from './pages/reportes/VentasPorClientePage'
import { VentasPorTemporadaPage } from './pages/reportes/VentasPorTemporadaPage'
import { ComprasPorProveedorPage } from './pages/reportes/ComprasPorProveedorPage'
import { ProductosMasVendidosPage } from './pages/reportes/ProductosMasVendidosPage'
import { VentasDelDiaPage } from './pages/reportes/VentasDelDiaPage'
import { VentasPorVendedorPage } from './pages/reportes/VentasPorVendedorPage'
import { VentasPorArticuloPage } from './pages/reportes/VentasPorArticuloPage'
import { StockActualPage } from './pages/reportes/StockActualPage'
import { StockBajoPage } from './pages/reportes/StockBajoPage'
import { LotesPorVencerPage } from './pages/reportes/LotesPorVencerPage'
import { CuentasPorCobrarPage } from './pages/reportes/CuentasPorCobrarPage'
import { CuentasPorPagarPage } from './pages/reportes/CuentasPorPagarPage'
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
} from './types/permisos'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          {/* Cada grupo exige el permiso puntual que otorgó el Administrador — el candado
              real está en el backend; esto solo evita llegar escribiendo la URL a mano. */}
          <Route element={<RequirePermiso permiso={PERMISO_VENTAS} />}>
            <Route path="ventas" element={<VentasPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="reportes/ventas-por-cliente" element={<VentasPorClientePage />} />
            <Route path="reportes/ventas-por-temporada" element={<VentasPorTemporadaPage />} />
            <Route path="reportes/productos-mas-vendidos" element={<ProductosMasVendidosPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_COBROS} />}>
            <Route path="cobros" element={<CobrosPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_ENTREGAS} />}>
            <Route path="entregas" element={<EntregasBienPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_LIQUIDACIONES} />}>
            <Route path="liquidacion" element={<LiquidacionPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_COMPRAS} />}>
            <Route path="compras" element={<ComprasPage />} />
            <Route path="proveedores" element={<ProveedoresPage />} />
            <Route path="reportes/compras-por-proveedor" element={<ComprasPorProveedorPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_PAGOS} />}>
            <Route path="pagos" element={<PagosPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_INVENTARIO} />}>
            <Route path="articulos" element={<ArticulosPage />} />
            <Route path="ajuste-stock" element={<AjusteStockPage />} />
            <Route path="familias" element={<FamiliasPage />} />
            <Route path="caracteristicas" element={<CaracteristicasPage />} />
            <Route path="promociones" element={<PromocionesPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_USUARIOS} />}>
            <Route path="usuarios" element={<UsuariosPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_CONFIGURACION} />}>
            <Route path="formas-de-pago" element={<FormasDePagoPage />} />
            <Route path="temporadas" element={<TemporadasPage />} />
            <Route path="tipos-de-bien" element={<TiposBienPage />} />
            <Route path="datos-del-negocio" element={<ConfiguracionEmpresaPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_VENTAS_DEL_DIA} />}>
            <Route path="reportes/ventas-del-dia" element={<VentasDelDiaPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_VENTAS_POR_VENDEDOR} />}>
            <Route path="reportes/ventas-por-vendedor" element={<VentasPorVendedorPage />} />
            <Route path="reportes/ventas-por-articulo" element={<VentasPorArticuloPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_CUENTAS_POR_COBRAR} />}>
            <Route path="reportes/cuentas-por-cobrar" element={<CuentasPorCobrarPage />} />
          </Route>

          <Route element={<RequirePermiso permiso={PERMISO_CUENTAS_POR_PAGAR} />}>
            <Route path="reportes/cuentas-por-pagar" element={<CuentasPorPagarPage />} />
          </Route>

          {/* Informativos y de bajo riesgo: abiertos a cualquier usuario logueado. */}
          <Route path="reportes/stock-actual" element={<StockActualPage />} />
          <Route path="reportes/stock-bajo" element={<StockBajoPage />} />
          <Route path="reportes/lotes-por-vencer" element={<LotesPorVencerPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
