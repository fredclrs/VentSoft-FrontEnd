import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { proveedoresApi } from '../../api/proveedores'
import { getDeudaProveedor } from '../../api/pagos'
import { getErrorMessage } from '../../api/errors'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'

export function CuentasPorPagarPage() {
  const { money } = useConfiguracionEmpresa()
  const proveedoresQuery = useQuery({ queryKey: ['proveedores-todos'], queryFn: () => proveedoresApi.search() })
  const proveedores = proveedoresQuery.data ?? []

  const deudasQueries = useQueries({
    queries: proveedores.map((proveedor) => ({
      queryKey: ['reportes', 'deudaProveedor', proveedor.id],
      queryFn: () => getDeudaProveedor(proveedor.id),
      enabled: proveedores.length > 0,
    })),
  })

  const cargando = proveedoresQuery.isLoading || deudasQueries.some((q) => q.isLoading)

  const acreedores = useMemo(
    () =>
      deudasQueries
        .map((q) => q.data)
        .filter((d): d is NonNullable<typeof d> => !!d && d.deudaActual > 0)
        .sort((a, b) => b.deudaActual - a.deudaActual),
    [deudasQueries],
  )

  const totalPorPagar = useMemo(() => acreedores.reduce((acc, d) => acc + d.deudaActual, 0), [acreedores])

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cuentas por pagar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Proveedores con saldo pendiente, de mayor a menor deuda.
        </Typography>
      </div>

      {proveedoresQuery.isError && <Alert severity="error">{getErrorMessage(proveedoresQuery.error)}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          Total por pagar
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }} color={totalPorPagar > 0 ? 'warning.main' : 'success.main'}>
          {cargando ? '…' : money(totalPorPagar)}
        </Typography>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Proveedor</TableCell>
              <TableCell align="right">Deuda actual</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!cargando && acreedores.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No hay deudas pendientes con proveedores. 🎉</Typography>
                </TableCell>
              </TableRow>
            )}
            {!cargando &&
              acreedores.map((d) => (
                <TableRow key={d.idProveedor} hover>
                  <TableCell>{d.nombreProveedor}</TableCell>
                  <TableCell align="right">{money(d.deudaActual)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
