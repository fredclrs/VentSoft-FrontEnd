import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

interface ConfirmDialogProps {
  open: boolean
  titulo: string
  mensaje: string
  confirmarLabel?: string
  cancelarLabel?: string
  confirmando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/** Diálogo genérico "¿estás seguro?" para acciones que no se pueden deshacer fácilmente
 * (eliminar, dar de baja, etc.) — para no ejecutarlas directo al primer click. */
export function ConfirmDialog({
  open,
  titulo,
  mensaje,
  confirmarLabel = 'Eliminar',
  cancelarLabel = 'Cancelar',
  confirmando,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancelar} maxWidth="xs" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        <DialogContentText>{mensaje}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancelar} disabled={confirmando}>
          {cancelarLabel}
        </Button>
        <Button onClick={onConfirmar} color="error" variant="contained" disabled={confirmando} autoFocus>
          {confirmando ? 'Eliminando…' : confirmarLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
