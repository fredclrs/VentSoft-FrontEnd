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
import { buscarClientes } from '../../api/clientes'
import { getDeudaCliente } from '../../api/cobros'
import { getErrorMessage } from '../../api/errors'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'

export function CuentasPorCobrarPage() {
  const { money } = useConfiguracionEmpresa()
  const clientesQuery = useQuery({ queryKey: ['clientes-todos'], queryFn: () => buscarClientes() })
  const clientes = clientesQuery.data ?? []

  const deudasQueries = useQueries({
    queries: clientes.map((cliente) => ({
      queryKey: ['reportes', 'deudaCliente', cliente.id],
      queryFn: () => getDeudaCliente(cliente.id),
      enabled: clientes.length > 0,
    })),
  })

  const cargando = clientesQuery.isLoading || deudasQueries.some((q) => q.isLoading)

  const deudores = useMemo(
    () =>
      deudasQueries
        .map((q) => q.data)
        .filter((d): d is NonNullable<typeof d> => !!d && (d.deudaActual > 0 || d.saldoAFavor > 0))
        .sort((a, b) => b.deudaActual - a.deudaActual),
    [deudasQueries],
  )

  const totalPorCobrar = useMemo(() => deudores.reduce((acc, d) => acc + d.deudaActual, 0), [deudores])

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cuentas por cobrar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Clientes con saldo pendiente o a favor, de mayor a menor deuda.
        </Typography>
      </div>

      {clientesQuery.isError && <Alert severity="error">{getErrorMessage(clientesQuery.error)}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          Total por cobrar
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }} color={totalPorCobrar > 0 ? 'warning.main' : 'success.main'}>
          {cargando ? '…' : money(totalPorCobrar)}
        </Typography>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell align="right">Deuda actual</TableCell>
              <TableCell align="right">Saldo a favor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!cargando && deudores.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Ningún cliente tiene saldo pendiente ni a favor. 🎉</Typography>
                </TableCell>
              </TableRow>
            )}
            {!cargando &&
              deudores.map((d) => (
                <TableRow key={d.idCliente} hover>
                  <TableCell>{d.nombreCliente}</TableCell>
                  <TableCell align="right">{money(d.deudaActual)}</TableCell>
                  <TableCell align="right">{d.saldoAFavor > 0 ? money(d.saldoAFavor) : '—'}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
