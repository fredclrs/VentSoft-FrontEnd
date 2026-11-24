import { useState } from 'react'
import type { MouseEvent } from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined'
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { FormatoImpresion } from '../utils/notaVenta'

interface BotonImprimirNotaProps {
  onImprimir: (formato: FormatoImpresion) => void
  label?: string
  variant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}

/** Botón "Imprimir" que, al tocarlo, pregunta con qué formato: ticket angosto (impresora
 * térmica tipo súper) u hoja completa (A4/Carta, impresora de oficina normal) — para elegir
 * cada vez según qué impresora se vaya a usar en el momento. */
export function BotonImprimirNota({
  onImprimir,
  label = 'Imprimir',
  variant = 'contained',
  size,
  disabled,
}: BotonImprimirNotaProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  // Se marca el formato configurado en Datos del negocio (igual se puede elegir otro).
  const { formatoTicket: ultimo } = useConfiguracionEmpresa()

  function elegir(formato: FormatoImpresion) {
    setAnchorEl(null)
    onImprimir(formato)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        startIcon={<PrintIcon />}
        onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
      >
        {label}
      </Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        <MenuItem selected={ultimo === 'ticket58'} onClick={() => elegir('ticket58')}>
          <ListItemIcon>
            <ReceiptLongIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Ticket 58 mm" secondary="Térmica chica (POS-58)" />
        </MenuItem>
        <MenuItem selected={ultimo === 'ticket80'} onClick={() => elegir('ticket80')}>
          <ListItemIcon>
            <ReceiptLongIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Ticket 80 mm" secondary="Térmica grande (tipo súper)" />
        </MenuItem>
        <MenuItem selected={ultimo === 'hoja'} onClick={() => elegir('hoja')}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Hoja completa" secondary="Impresora normal (A4/Carta)" />
        </MenuItem>
      </Menu>
    </>
  )
}
