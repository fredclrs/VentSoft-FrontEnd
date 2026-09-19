import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuIcon from '@mui/icons-material/Menu'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useAuth } from '../auth/AuthContext'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import { filtrarModulosPorPermiso, homeItem, navModules } from './navItems'

const DRAWER_WIDTH = 300
const TRANSITION_MS = 225

export function AppLayout() {
  const { usuario, logout, tienePermiso } = useAuth()
  const { nombreNegocio, permiteVentaACredito, permiteCompraACredito } = useConfiguracionEmpresa()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  // Un usuario no ve los ítems para los que no tiene el permiso puntual — el candado real
  // está en el backend ([Authorize(Roles=...)]), esto es solo para no mostrarle algo a lo
  // que igual no puede entrar (y RequirePermiso corta el paso si escribe la URL a mano). De
  // paso, si el negocio no vende/compra a crédito, tampoco tiene sentido mostrar las pantallas
  // que solo sirven para manejar deuda pendiente (Cobros, Pagos, Liquidación, etc.).
  const modulosVisibles = useMemo(
    () => filtrarModulosPorPermiso(navModules, tienePermiso, { permiteVentaACredito, permiteCompraACredito }),
    [tienePermiso, permiteVentaACredito, permiteCompraACredito],
  )

  // El menú arranca abierto en escritorio y cerrado (overlay) en mobile; el botón de
  // tres rayas lo oculta/muestra por completo, como en cualquier sistema de gestión.
  const [open, setOpen] = useState(isDesktop)
  useEffect(() => setOpen(isDesktop), [isDesktop])

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const activeModuleId = useMemo(
    () => navModules.find((m) => m.items.some((i) => i.path === location.pathname))?.id ?? null,
    [location.pathname],
  )
  const [expanded, setExpanded] = useState<string | null>(activeModuleId)

  // Si la navegación cae en un módulo distinto (se hizo clic en un link), lo abrimos solo;
  // si el usuario despliega otro módulo a mano sin navegar, eso no dispara este efecto.
  useEffect(() => {
    if (activeModuleId) setExpanded(activeModuleId)
  }, [activeModuleId])

  function handleLogout() {
    setAnchorEl(null)
    logout()
    navigate('/login', { replace: true })
  }

  function closeOnMobile() {
    if (!isDesktop) setOpen(false)
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" color="primary" sx={{ fontWeight: 700 }}>
          VentSoft
        </Typography>
      </Toolbar>
      <Divider />

      <List sx={{ px: 1, pt: 1 }}>
        <ListItemButton
          component={NavLink}
          to={homeItem.path}
          end
          onClick={closeOnMobile}
          sx={{
            borderRadius: 1.5,
            '&.active': { bgcolor: 'action.selected', fontWeight: 700 },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <homeItem.icon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={homeItem.label} />
        </ListItemButton>
      </List>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1, pb: 2 }}>
        {modulosVisibles.map((module) => {
          const moduleActive = module.id === activeModuleId
          return (
            <Accordion
              key={module.id}
              disableGutters
              square
              elevation={0}
              expanded={expanded === module.id}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? module.id : null)}
              sx={{
                bgcolor: 'transparent',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { margin: 0 },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  borderRadius: 1.5,
                  minHeight: 48,
                  '&.Mui-expanded': { minHeight: 48 },
                  '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center', gap: 1.25 },
                }}
              >
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: `${module.color}1a`,
                    color: module.color,
                  }}
                >
                  <module.icon fontSize="small" />
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: moduleActive ? 700 : 600 }}>
                  {module.title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, pl: 1 }}>
                <List dense disablePadding>
                  {module.items.map((item) => (
                    <ListItemButton
                      key={item.path}
                      component={NavLink}
                      to={item.path}
                      onClick={closeOnMobile}
                      sx={{
                        borderRadius: 1.5,
                        ml: 1.5,
                        pl: 1.5,
                        borderLeft: 2,
                        borderColor: 'divider',
                        '&.active': {
                          bgcolor: 'action.selected',
                          borderColor: module.color,
                          '& .MuiListItemText-primary': { fontWeight: 700 },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34 }}>
                        <item.icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: isDesktop && open ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          ml: isDesktop && open ? `${DRAWER_WIDTH}px` : 0,
          transition: (t) => t.transitions.create(['width', 'margin'], { duration: TRANSITION_MS }),
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen((prev) => !prev)}>
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h5"
            noWrap
            sx={{
              fontFamily: '"Pacifico", cursive',
              letterSpacing: 0.5,
              display: { xs: 'none', sm: 'block' },
              maxWidth: { sm: 260, md: 400 },
            }}
          >
            {nombreNegocio}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {usuario?.nombre}
          </Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {usuario?.nombre?.charAt(0).toUpperCase() ?? '?'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={handleLogout}>Cerrar sesión</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {isDesktop ? (
        <Drawer
          variant="persistent"
          anchor="left"
          open={open}
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          anchor="left"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          p: 3,
          transition: (t) => t.transitions.create('margin', { duration: TRANSITION_MS }),
          marginLeft: isDesktop && !open ? `-${DRAWER_WIDTH}px` : 0,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
