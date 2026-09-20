import { useQuery } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
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
import { getStockBajo } from '../../api/articulos'
import { getErrorMessage } from '../../api/errors'

export function StockBajoPage() {
  const query = useQuery({ queryKey: ['reportes', 'stockBajo'], queryFn: getStockBajo })

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Stock bajo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Artículos activos cuyo stock actual llegó o bajó de su stock mínimo definido — o que se
          quedaron directamente en 0 si no tienen un stock mínimo configurado.
        </Typography>
      </div>

      {query.isError && <Alert severity="error">{getErrorMessage(query.error)}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Stock actual</TableCell>
              <TableCell align="right">Stock mínimo</TableCell>
              <TableCell align="right">Stock ideal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && (query.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No hay artículos con stock bajo. 🎉</Typography>
                </TableCell>
              </TableRow>
            )}
            {(query.data ?? []).map((item) => (
              <TableRow key={item.idArticulo} hover>
                <TableCell>{item.codigo}</TableCell>
                <TableCell>{item.descripcion || '—'}</TableCell>
                <TableCell align="right">
                  <Chip size="small" color="error" variant="outlined" label={item.stockActual} />
                </TableCell>
                <TableCell align="right">{item.stockMinimo ?? '—'}</TableCell>
                <TableCell align="right">{item.stockIdeal ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
