import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { filtrarModulosPorPermiso, navModules } from '../layout/navItems'
import { useAuth } from '../auth/AuthContext'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import { getStockBajo } from '../api/articulos'
import { PERMISO_CUENTAS_POR_COBRAR, PERMISO_CUENTAS_POR_PAGAR } from '../types/permisos'

export function DashboardPage() {
  const { usuario, tienePermiso } = useAuth()
  const { permiteVentaACredito, permiteCompraACredito } = useConfiguracionEmpresa()
  const navigate = useNavigate()

  const stockBajoQuery = useQuery({ queryKey: ['reportes', 'stockBajo'], queryFn: getStockBajo })
  const modulosVisibles = filtrarModulosPorPermiso(navModules, tienePermiso, {
    permiteVentaACredito,
    permiteCompraACredito,
  })

  const resumen = [
    {
      label: 'Artículos con stock bajo',
      value: stockBajoQuery.isLoading ? '…' : (stockBajoQuery.data?.length ?? 0),
      path: '/reportes/stock-bajo',
    },
    ...(tienePermiso(PERMISO_CUENTAS_POR_COBRAR) && permiteVentaACredito
      ? [{ label: 'Cuentas por cobrar', value: 'Ver reporte', path: '/reportes/cuentas-por-cobrar' }]
      : []),
    ...(tienePermiso(PERMISO_CUENTAS_POR_PAGAR) && permiteCompraACredito
      ? [{ label: 'Cuentas por pagar', value: 'Ver reporte', path: '/reportes/cuentas-por-pagar' }]
      : []),
    { label: 'Lotes por vencer', value: 'Ver reporte', path: '/reportes/lotes-por-vencer' },
  ]

  return (
    <Stack spacing={4}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Hola, {usuario?.nombre?.split(' ')[0] ?? 'usuario'} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Elegí un módulo para empezar a trabajar.
        </Typography>
      </div>

      <Grid container spacing={2}>
        {resumen.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              variant="outlined"
              onClick={() => navigate(item.path)}
              sx={{ p: 2.5, cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
            >
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {item.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <div>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Módulos
        </Typography>
        <Grid container spacing={2}>
          {modulosVisibles.map((module) => (
            <Grid key={module.id} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Paper
                variant="outlined"
                onClick={() => navigate(module.items[0].path)}
                sx={{
                  p: 2.5,
                  height: '100%',
                  cursor: 'pointer',
                  borderTop: 3,
                  borderColor: module.color,
                  transition: 'box-shadow .15s, transform .15s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}
              >
                <Stack spacing={1.5}>
                  <Avatar
                    variant="rounded"
                    sx={{ bgcolor: `${module.color}1a`, color: module.color, width: 40, height: 40 }}
                  >
                    <module.icon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {module.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {module.description}
                    </Typography>
                  </Box>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    {module.items.map((item) => (
                      <Chip
                        key={item.path}
                        label={item.label}
                        size="small"
                        clickable
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(item.path)
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </div>
    </Stack>
  )
}
