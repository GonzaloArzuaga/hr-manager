import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [empleado, setEmpleado] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarPerfil = useCallback(async (userId) => {
    const { data: perfilData } = await supabase
      .from('perfiles')
      .select('*, organizaciones(nombre, codigo_invitacion)')
      .eq('id', userId)
      .single()

    setPerfil(perfilData ?? null)

    if (perfilData?.rol === 'empleado') {
      const { data: empleadoData } = await supabase
        .from('empleados')
        .select('*')
        .eq('perfil_id', userId)
        .single()
      setEmpleado(empleadoData ?? null)
    } else {
      setEmpleado(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        cargarPerfil(session.user.id).finally(() => setCargando(false))
      } else {
        setCargando(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setEmpleado(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [cargarPerfil])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
  }

  const recargarPerfil = () => {
    if (session?.user) return cargarPerfil(session.user.id)
  }

  const value = {
    session,
    usuario: session?.user ?? null,
    perfil,
    empleado,
    rol: perfil?.rol ?? null,
    cargando,
    cerrarSesion,
    recargarPerfil
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return ctx
}
