# Guía del proyecto para asistentes de código

## Propósito y alcance

HRManager es un sistema web multiempresa de gestión de Recursos Humanos. Incluye páginas públicas, autenticación real y paneles para administradores del sistema, empleadores y empleados conectados a Supabase (PostgreSQL, Auth, Storage y Edge Functions).

La lógica de negocio importante vive en la base de datos: políticas de seguridad por fila (RLS) y funciones del motor de reglas. La interfaz nunca debe reemplazar esas validaciones ni mostrar una operación como exitosa si la base la rechazó.

## Tecnología y comandos

- React 18 con JSX, módulos ES (`"type": "module"`) y Vite 6.
- Dependencias principales: `@supabase/supabase-js`, Chart.js y `read-excel-file`/`write-excel-file` para importar y exportar planillas.
- La URL y la clave pública de Supabase se leen de `.env` (ver `.env.example`); nunca incluir la clave de servicio en el frontend.
- No hay React Router ni una suite de pruebas configurada.
- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: compila para producción.
- `npm run preview`: previsualiza la compilación.
- Tailwind CSS se carga desde CDN en `index.html`, junto con Inter y Font Awesome. No migrar ni agregar dependencias de estilos salvo que el pedido lo requiera.
- `styles.css` contiene estilos globales y de tablas compartidas. Preferir clases Tailwind locales para el diseño de vistas.

## Arquitectura y organización del código

- `main.jsx` es la fuente de verdad de las rutas. Resuelve sesión, rol, estado de la cuenta y cambio obligatorio de contraseña antes de cargar una vista privada. Las rutas públicas, de empleador, empleado y administrador se mantienen separadas; las rutas privadas de otro rol redirigen al inicio propio.
- `lib/supabaseClient.js`: cliente de Supabase y traducción de errores.
- `lib/store.js`: lee los datos que el usuario puede ver (RLS mediante) y los deja con la forma que esperan las vistas dentro de los objetos de `data/`.
- `lib/api.js`: operaciones de escritura y autenticación. Mantener las escrituras de las vistas detrás de esta capa; después de las operaciones de datos se vuelve a cargar el store.
- `lib/format.js`: fechas, períodos y formatos compartidos.
- `lib/router.js`: navegación sin recarga (History API). Usar `navigate()` en vez de `window.location` para moverse dentro del sistema.
- `components/AppShell.jsx`: marco de las páginas privadas; menú lateral fijo en escritorio y cajón desplegable debajo de 1024 px. Las vistas no deben renderizar `Sidebar`.
- Medidas en `rem`, nunca en `px`: el tamaño base escalonado está en `styles.css`.
- `lib/notifications.js` y `components/NotificationBell.jsx`: notificaciones (las crea la base con disparadores; tiempo real más consulta cada minuto). No se muestran al administrador del sistema.
- Roles: `store.role` es `admin`, `employer` o `employee`. El administrador del sistema se identifica mediante `system_admins` y usa las vistas de `views/admin/`.
- `lib/workforce.js`: qué le toca a cada empleado cada día (turno, franco, vacaciones) y fichajes; lo usan Estadísticas y Fichajes.
- Gráficos: `components/ChartCanvas.jsx` (Chart.js). Fichajes del empleador: RPC `register_attendance`; las bajas de fichajes van directo a la tabla (RLS del empleador).
- `views/` contiene una vista por página, agrupada por área:
  - `views/`: páginas públicas y de acceso (`capchat.jsx`, `landing.jsx`, `about.jsx`, `price.jsx`, `login.jsx`, `recoverPassword.jsx`, `newPassword.jsx`, `changeTemporaryPassword.jsx` y `error404.jsx`).
  - `views/admin/`: inicio, gestión de empresas y configuración del administrador del sistema.
  - `views/empleador/`: panel, empleados, horarios, francos, vacaciones, sueldos, estadísticas y fichajes.
  - `views/empleado/`: panel personal, horarios, francos, vacaciones y sueldos.
  - `views/participante/configuration.jsx`: configuración compartida con contenido condicionado por rol.
- `components/` contiene elementos reutilizables como `AppShell`, `Sidebar`, `Navbar`, `Footer`, `EmployeeIdentity`, `NotificationBell`, `PaginationControls`, `Select`, `SuggestInput`, `FeedbackHost`, `CompanyCatalogs` y `AttendanceImport`.
- `components/cards/` contiene tarjetas de indicadores diferenciadas por rol. Reutilizarlas antes de duplicar estructura o estilos.
- `hooks/usePagination.js` comparte la paginación de listados.
- `data/` contiene estructuras que completa `lib/store.js`, reglas, tipos de turno y datos ilustrativos; no usar datos de muestra como fuente de datos reales.
- `supabase/functions/` contiene `create-employee`, `update-employee-email` y `admin-companies`, además de utilidades compartidas. Las operaciones que requieren privilegios de servicio deben permanecer allí.
- `database/` contiene `schema.sql`, semillas/datos de demostración y migraciones incrementales; ver `README.md` para su orden de aplicación.
- Preferir componentes funcionales de React y hooks locales (`useState`, `useMemo`, `useEffect`, refs) siguiendo los patrones existentes. Evitar abstracciones y dependencias nuevas si el cambio cabe en el stack actual.
- Usar nombres descriptivos, JSX legible y cambios acotados a la vista y componentes realmente afectados. Los textos visibles de la interfaz se mantienen en español; conservar las rutas tal como están registradas en `main.jsx`.
- La navegación de los paneles usa páginas propias para cada sección, no anclas en el dashboard.

## Rutas existentes

| Ruta | Vista |
| --- | --- |
| `/` | Vista pública `views/capchat.jsx` |
| `/home` | Página de inicio |
| `/about` | Información institucional |
| `/price` | Planes y precios |
| `/login` | Inicio de sesión |
| `/login/recover` | Recuperación de contraseña |
| `/login/change-password` | Definir una contraseña nueva desde el enlace de recuperación |
| `/login/change-temporary-password` | Cambio obligatorio de contraseña provisoria |
| `/employer` | Panel del empleador |
| `/employer/horarios` | Horarios del empleador |
| `/employer/francos` | Francos del empleador |
| `/employer/vacaciones` | Vacaciones del empleador |
| `/employer/sueldos` | Sueldos del empleador |
| `/employer/empleados` | Gestión de empleados |
| `/employer/estadisticas` | Estadísticas del empleador |
| `/employer/fichajes` | Fichajes y asistencia del empleador |
| `/employer/configuration` | Configuración del empleador |
| `/employee` | Panel personal del empleado |
| `/employee/horarios` | Horarios del empleado |
| `/employee/francos` | Francos del empleado |
| `/employee/vacaciones` | Vacaciones del empleado |
| `/employee/sueldos` | Sueldos del empleado |
| `/employee/configuration` | Configuración del empleado |
| `/admin` | Panel del administrador del sistema |
| `/admin/empresas` | Empresas, planes y estado de las cuentas |
| `/admin/configuracion` | Configuración del administrador y planes |
| `/configuracion` | Alias de configuración del empleador |

Las rutas de panel usan `/employer` y `/employee` aunque el texto de interfaz esté en español. `/configuracion` es alias del empleador. El empleado no ve la gestión de empleados, fichajes ni estadísticas. La configuración se comparte visualmente, pero usa contenido y ruta distinta por rol. Ninguna ruta constituye por sí sola una barrera de autorización real.

## Diseño visual y estilos

### Identidad visual

- Usar Inter como fuente sans-serif (`index.html`) y mantener la estética de dashboard: fondos claros, tarjetas blancas, bordes sutiles, esquinas redondeadas, sombras discretas y acentos azules.
- Paleta habitual: azul oscuro para navegación lateral (`#223247`), azul para acciones y estados activos, texto principal slate oscuro, texto secundario slate medio y fondos gris/azulados muy claros.
- Usar `page-title` para los títulos principales de las vistas de panel; la clase está definida en `styles.css`.
- Mantener espacios, alturas, bordes, tipografía y densidad visual coherentes entre secciones relacionadas. No rediseñar vistas no solicitadas.
- Mantener el diseño responsive con breakpoints y utilidades Tailwind existentes; las tablas anchas pueden conservar su contenedor con scroll horizontal.
- Los paneles priorizan una navegación lateral azul oscuro y contenido en tarjetas claras y compactas. Reutilizar las tarjetas de indicadores y `PaginationControls` donde ya se usan; las vistas de listados conservan sus filtros y controles existentes.
- Para las tablas de las vistas de empleador, reutilizar `hr-data-table hr-data-table--standard` de `styles.css` para encabezados, celdas y divisores consistentes; conservar scroll horizontal cuando sea necesario y usar las clases `text-left`, `text-center` o `text-right` para alineaciones específicas. Mantener solo los ajustes de layout propios de matrices u otras tablas especializadas.
- Mantener los textos de interfaz en español y el lenguaje actual («empleados», «francos», «sueldos»). No introducir cambios de diseño globales al trabajar en una sola vista.

### Formularios

- Mantener las etiquetas asociadas a su control. En los formularios de alta y asignación del empleador, el estándar visual actualizado para etiquetas es `text-[11px] font-semibold text-slate-700`; el indicador obligatorio es `*` en rojo (`text-red-600`).
- Aplicar `required` y validación nativa a los controles obligatorios cuando corresponda. Los controles personalizados (por ejemplo, selección de fechas o archivo) también deben validarse en el manejador de submit, ya que no siempre participan de la validación HTML.
- Conservar controles, alturas, foco y espaciados ya establecidos en cada vista; unificar estilo no debe alterar el comportamiento del formulario.
- Usar botones con `type="button"` o `type="submit"` explícito.
- Anunciar errores y confirmaciones con `role="alert"`, `role="status"` o `aria-live` de acuerdo con el patrón existente.
- Títulos de secciones de formularios:
  - «Asignación de Horarios»
  - «Asignación de Francos»
  - «Asignación de Vacaciones»
  - «Carga de Recibo de Sueldo»
  - «Dar de alta un Nuevo Empleado»
- No describir asignaciones como «manuales».

### Iconos e imágenes

- Reutilizar `EmployeeIdentity` para representar a las personas en tablas y registros. El componente muestra foto cuando existe y, en su ausencia, las iniciales con el color indicado por `avatarStyle`.
- Las fotos de demostración locales son `data/roberto-morales.png` y `data/valeria-rossi.png`. `data/employeeAvatars.js` asocia esas fotos a nombres completos normalizados; no inferir ni asignar fotos a otras personas.
- Las fotos y nombres son ilustrativos. No introducir imágenes personales reales ni datos de producción.
- Los controles con iconos necesitan nombre accesible; ocultar con `aria-hidden` los iconos decorativos. Se usan SVG inline y Font Awesome según el patrón del componente o vista existente.

## Componentes compartidos y roles

- Usar `Navbar.jsx` y `Footer.jsx` en páginas públicas y de acceso que ya los incorporan. Evitar layouts alternativos innecesarios.
- `Navbar` permite configurar enlaces y acción con props; el espacio de acción mantiene ancho fijo para que textos como «Volver» no desplacen el menú.
- `Sidebar.jsx` obtiene el rol de `store.role`. El empleado ve Inicio, Horarios, Francos, Vacaciones, Sueldos y Configuración; no ve Empleados, Fichajes ni Estadísticas. Sus enlaces llevan a rutas bajo `/employee`.
- Mantener ambos roles funcionando al cambiar Sidebar o configuración.
- `EmployeeIdentity.jsx` recibe nombre, legajo, área/detalle, iniciales, estilo, tamaño y opcionalmente URL de avatar. Reutilizarlo en vez de recrear avatares en una vista.
- Los enlaces del Sidebar del empleado llevan a las rutas propias bajo `/employee`; no convertirlos en anclas ni exponerle la gestión del empleador.

## Conexión con Supabase

### Acceso

- `views/login.jsx` inicia sesión con Supabase Auth. Las cuentas no se registran solas: el administrador crea la empresa y su empleador, y el empleador crea a sus empleados.
- Si `user_accounts.must_change_password` es verdadero, `main.jsx` solo permite `/login/change-temporary-password` (RF-03).
- `/login/recover` envía el enlace de recuperación y `/login/change-password` lo recibe (RF-08, RNF-11). Política de contraseñas: 8 caracteres y un carácter especial (RNF-03), validada en `lib/api.js`.
- Una cuenta dada de baja (`is_active = false`) no puede usar el sistema.
- Una empresa suspendida bloquea el acceso a sus cuentas; el administrador puede reactivarla desde `/admin/empresas`.

### Datos y operaciones

- Las lecturas de datos de negocio pasan por `lib/store.js` y las escrituras por `lib/api.js`; las vistas no acceden directamente a tablas. `views/newPassword.jsx` coordina los eventos de sesión de Supabase Auth para el flujo de recuperación.
- Solicitudes de francos y vacaciones, respuestas del empleador, asignaciones directas, cancelaciones y fichajes usan funciones de la base (`submit_days_off_request`, `submit_vacation_request`, `resolve_*`, `assign_*`, `cancel_my_request`, `clock_in`, `clock_out`). Los mensajes de error que devuelven ya están en español y se muestran tal cual.
- El alta de empleados pasa por la función de servidor `supabase/functions/create-employee`, porque crear usuarios requiere la clave de servicio (RF-07, RNF-08). Esa clave nunca va en el frontend.
- El cambio de email del empleado usa `supabase/functions/update-employee-email`; la gestión administrativa de empresas usa `supabase/functions/admin-companies`.
- Los recibos se suben al bucket privado `payroll-receipts` con la ruta `{empresa}/{empleado}/{archivo}.pdf` y se abren con URLs firmadas de 5 minutos (RNF-06).
- Las reglas de negocio y los tipos de turno se guardan en la base. Los tipos de turno quitados se desactivan para conservar los horarios históricos.
- La foto de perfil se guarda con `uploadProfilePhoto` en el bucket público `avatars` (`{auth.uid()}/{fecha}.jpg`) y se muestra con `avatarUrlFor`.
- Fichajes por planilla: `components/AttendanceImport.jsx` procesa archivos `.xlsx` o `.csv`; `importAttendance(rows)` llama a `import_attendance`, que devuelve el resultado de cada fila. La vista previa muestra errores por fila y la importación admite hasta 3000 filas.
- Estadísticas del empleador: usan `lib/workforce.js` y `components/ChartCanvas.jsx` para resumir cobertura y demanda por filtros de período y departamento.
- Administración del sistema: `adminDashboard`, `adminListCompanies`, `adminCreateCompany`, `adminSetCompanyStatus`, `listPlans`, `adminSetCompanyPlan` y `adminUpdatePlan` respaldan el panel, empresas y planes. La base controla el límite de empleados al crear o reactivar cuentas.
- Puestos, áreas y sucursales se editan con `saveCatalogItem` y `deleteCatalogItem`; los nombres no se repiten, sin importar mayúsculas.
- No usar `<select>` ni `<datalist>` en los paneles: usar `components/Select.jsx` (misma forma que `<select>`) y `components/SuggestInput.jsx` (input con `options`).
- Nunca usar `alert`, `confirm` ni `prompt` del navegador: usar `confirmDialog`, `promptDialog` y `toast` de `lib/feedback.js`. Toda operación del empleador o del administrador informa su resultado con un `toast`.
- No ocultar errores con valores alternativos que aparenten éxito.

### Reglas de asignación

- **Horarios:** un tipo de turno por empleado y por semana. Reasignar la misma semana reemplaza el turno.
- **Francos:** aviso previo en días corridos y máximo de francos por semana, validados en la base. El empleador asigna sin aviso previo, pero no en días pasados.
- **Vacaciones:** días corridos; la antigüedad se calcula al 31 de diciembre del período. No se permiten superposiciones ni superar el saldo.
- **Sueldos:** empleado, período, tipo de pago, monto y recibo PDF de hasta 5 MB.

### Base de datos

El esquema completo, con políticas y funciones, está en `database/schema.sql`. Los datos de prueba están en `database/seed_prueba.sql` y un año completo de datos de demostración en `database/datos_demo_anual.sql`. Para proyectos existentes, aplicar en orden `database/actualizacion_fichajes.sql`, `database/actualizacion_admin_notificaciones.sql` y `database/actualizacion_planes_perfil_fichadas.sql`; los cambios también se integran en `schema.sql`.

## Accesibilidad y calidad

- Asociar cada `<label>` al control mediante anidación o `htmlFor`/`id`.
- Proporcionar nombres accesibles a botones de icono y controles sin texto visible.
- Conservar foco visible, estados disabled comprensibles y contraste legible.
- No usar elementos interactivos solo por su apariencia; escoger `<button>`, `<a>`, `<label>`, `<fieldset>` y `<legend>` semánticamente.
- No añadir comentarios para código obvio; comentar solo decisiones no evidentes.

## Guía para cambios futuros

1. Lee la vista, los componentes compartidos y los módulos de datos implicados antes de editar.
2. Comprueba si ya existe un componente/helper que cubra el comportamiento; extiéndelo antes de duplicar lógica.
3. Mantén el alcance quirúrgico y respeta datos, rutas y comportamiento preexistentes no relacionados con la solicitud.
4. Si agregas una ruta, regístrala en `main.jsx` y conecta los enlaces pertinentes; no cambies el fallback de rutas desconocidas sin necesidad explícita.
5. Si agregás una operación nueva, sumala a `lib/api.js` y, si tiene reglas de negocio, validala en una función de la base, no solo en la interfaz.
6. Si tocas Sidebar, navegación, identidad o autenticación demo, verifica ambos roles y las rutas asociadas.
7. Para cambios funcionales, valida la interfaz si es posible y ejecuta `npm run build`. Para cambios solo documentales no hace falta compilar, salvo que existan pruebas documentales.
8. No agregues dependencias salvo que la solución realmente las requiera.
