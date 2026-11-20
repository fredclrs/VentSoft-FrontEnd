import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'

interface AnularDialogProps {
  open: boolean
  /** Ej. "Anular venta #12". */
  titulo: string
  /** Qué pasa al anular (stock, plata, deuda) — distinto para venta y compra. */
  mensaje: string
  anulando?: boolean
  error?: string | null
  onConfirmar: (motivo: string) => void
  onCancelar: () => void
}

/** Pide el motivo (obligatorio) antes de anular una venta o compra. El motivo queda guardado
 * junto con quién y cuándo, para que el dueño pueda revisar las anulaciones después. */
export function AnularDialog({ open, titulo, mensaje, anulando, error, onConfirmar, onCancelar }: AnularDialogProps) {
  const [motivo, setMotivo] = useState('')

  // Cada vez que se abre arranca vacío: el motivo de la anterior no aplica a esta.
  useEffect(() => {
    if (open) setMotivo('')
  }, [open])

  const puedeConfirmar = motivo.trim().length > 0 && !anulando

  return (
    <Dialog open={open} onClose={anulando ? undefined : onCancelar} maxWidth="sm" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{mensaje}</DialogContentText>
        <TextField
          label="Motivo"
          placeholder="Ej: cobré dos veces, cliente equivocado, se cargó por error…"
          fullWidth
          required
          autoFocus
          multiline
          minRows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value.slice(0, 200))}
          helperText="Queda guardado con tu usuario y la hora."
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancelar} disabled={anulando}>
          No anular
        </Button>
        <Button color="error" variant="contained" disabled={!puedeConfirmar} onClick={() => onConfirmar(motivo.trim())}>
          {anulando ? 'Anulando…' : 'Anular'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
