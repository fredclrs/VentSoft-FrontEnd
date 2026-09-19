import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

interface ErrorDialogProps {
  mensaje: string | null
  titulo?: string
  onCerrar: () => void
}

/** Popup para errores al guardar — en formularios largos (con scroll) un <Alert> arriba del
 * todo pasa desapercibido si quien lo llena ya bajó la vista para seguir cargando datos. Un
 * modal siempre se ve, no importa dónde esté scrolleado el diálogo de atrás. */
export function ErrorDialog({ mensaje, titulo = 'No se pudo guardar', onCerrar }: ErrorDialogProps) {
  return (
    <Dialog open={!!mensaje} onClose={onCerrar} maxWidth="xs" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        <DialogContentText>{mensaje}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} variant="contained" autoFocus>
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  )
}
