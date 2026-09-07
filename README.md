# HR Manager

Sistema web de gestión de Recursos Humanos: horarios, francos, vacaciones, sueldos y
estadísticas de demanda de personal, con un motor de reglas de negocio configurable
por organización (multi-tenant).

**Stack**: React (Vite) + Tailwind + Recharts en el frontend · Supabase (PostgreSQL +
Auth + Storage) como backend · Vercel para publicar el frontend. Todo con planes
gratuitos, sin tarjeta de crédito.

---

## 0. Qué vas a necesitar instalar en tu computadora

| Herramienta | Para qué | Link |
|---|---|---|
| Node.js (versión 18 o superior) | Correr y compilar el frontend | https://nodejs.org (descargá la versión LTS) |
| Git (opcional pero recomendado) | Versionar el código | https://git-scm.com |
| Una cuenta de Supabase (gratis) | Base de datos, login y archivos | https://supabase.com |
| Una cuenta de Vercel (gratis) | Publicar la web en un link | https://vercel.com |
| Visual Studio Code (o el editor que prefieras) | Editar el código | https://code.visualstudio.com |

Para saber si Node ya está instalado, abrí una terminal y corré:
```
node -v
npm -v
```
Si te tira un número de versión (ej `v20.11.0`), ya lo tenés.

---

## 1. Crear el proyecto en Supabase

1. Entrá a https://supabase.com, creá una cuenta gratis y hacé clic en **New project**.
2. Ponele un nombre (ej: `hr-manager`), elegí una contraseña para la base de datos
   (guardala en un lugar seguro) y una región (la más cercana, ej `South America`).
3. Esperá 1-2 minutos a que Supabase termine de crear el proyecto.

### 1.1 Cargar el esquema de base de datos

1. En el menú de la izquierda, andá a **SQL Editor**.
2. Hacé clic en **New query**.
3. Abrí el archivo `database/schema.sql` de esta carpeta, copiá **todo** su contenido,
   y pegalo en el editor.
4. Hacé clic en **Run** (o `Ctrl+Enter`). Debería decir "Success. No rows returned".

Esto crea todas las tablas, las funciones del motor de reglas, las vistas de
estadísticas, el bucket de almacenamiento para los recibos de sueldo, y las políticas
de seguridad (RLS) que aíslan los datos de cada organización.

### 1.2 Desactivar la confirmación por email (recomendado para la demo/tesis)

Por defecto, Supabase pide confirmar el email al registrarse, lo que complica las
pruebas. Para simplificar:

1. Andá a **Authentication -> Providers -> Email**.
2. Desactivá la opción **Confirm email**.
3. Guardá los cambios.

(Si preferís dejarlo activado para que el proyecto se vea más "productivo" en la
defensa, andá a **Authentication -> Email Templates** y probá el flujo con tu propio
email para asegurarte de que funciona antes de la presentación.)

### 1.3 Obtener las claves del proyecto

1. Andá a **Project Settings -> API**.
2. Vas a necesitar dos valores:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public key** (una clave larga que empieza con `eyJ...`)

Estos dos valores son los que van a ir en el archivo `.env` del frontend (paso 2.2).

---

## 2. Configurar y correr el frontend en tu computadora

### 2.1 Instalar las dependencias

Abrí una terminal dentro de la carpeta `frontend/` de este proyecto y corré:

```
npm install
```

Esto va a descargar todas las librerías necesarias (React, Supabase, Tailwind,
Recharts, etc.) a una carpeta `node_modules`.

### 2.2 Configurar las variables de entorno

1. Dentro de `frontend/`, copiá el archivo `.env.example` y renombralo a `.env`.
2. Completá los dos valores con los que copiaste en el paso 1.3:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
```

### 2.3 Correr el proyecto localmente

```
npm run dev
```

Esto va a levantar la aplicación en `http://localhost:5173`. Abrila en el navegador.

### 2.4 Probar el flujo completo

1. Andá a **Crear cuenta** -> elegí **Soy empleador** -> completá los datos. Esto crea
   tu organización y te da un código de invitación (lo vas a ver en el Dashboard).
2. Cerrá sesión, andá a **Crear cuenta** de nuevo -> elegí **Soy empleado** -> usá el
   código de invitación que te generó el paso anterior.
3. Iniciá sesión como empleador: probá asignar un horario, configurar las reglas
   (pestaña Configuración), y registrar un pago de sueldo.
4. Iniciá sesión como empleado (en otra ventana o en modo incógnito): probá solicitar
   un franco o vacaciones, y ver tu recibo de sueldo.

---

## 3. Publicar la aplicación (para mostrarla en la defensa)

### 3.1 Subir el código a GitHub (opcional pero recomendado)

```
cd hr-manager
git init
git add .
git commit -m "Primera version de HR Manager"
```

Creá un repositorio nuevo en https://github.com/new y seguí las instrucciones que te
da GitHub para subir el código (`git remote add origin ...` y `git push`).

### 3.2 Desplegar en Vercel

1. Entrá a https://vercel.com y creá una cuenta (podés usar tu cuenta de GitHub).
2. Hacé clic en **Add New -> Project** e importá el repositorio que subiste.
3. Cuando te pida la configuración del proyecto:
   - **Root Directory**: seleccioná `frontend` (importante, porque el código de
     React está dentro de esa subcarpeta).
   - **Framework Preset**: Vercel debería detectar "Vite" automáticamente.
4. En **Environment Variables**, agregá las mismas dos variables del archivo `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Hacé clic en **Deploy**. En 1-2 minutos vas a tener un link público
   (`https://tu-proyecto.vercel.app`) para mostrar en la defensa.

Si no querés usar GitHub, también podés desplegar directo desde tu computadora con
la CLI de Vercel: `npm install -g vercel`, y después `vercel` dentro de la carpeta
`frontend/`.

---

## 4. Cómo está organizado el proyecto

```
hr-manager/
├── database/
│   └── schema.sql          <- Todo el esquema de base de datos (correr una sola vez)
├── frontend/
│   ├── src/
│   │   ├── pages/          <- Una pantalla por módulo (Horarios, Francos, etc.)
│   │   ├── components/     <- Piezas reutilizables (menú lateral, badges, etc.)
│   │   ├── contexts/       <- Manejo de sesión y rol del usuario
│   │   └── supabaseClient.js
│   ├── .env.example        <- Copiar como .env y completar
│   └── package.json
└── README.md                <- Este archivo
```

## 5. Cómo funciona el motor de reglas configurable

Las reglas de negocio (cuántos días de franco por semana, si las solicitudes
requieren aprobación, cuántos días de aviso previo, cuántos días de vacaciones según
la antigüedad) **no están escritas en el código de la aplicación**: viven en las
tablas `reglas_organizacion` y `regimen_vacaciones` de la base de datos, una fila por
organización.

Las funciones de PostgreSQL `solicitar_franco()` y `solicitar_vacaciones()` (en
`database/schema.sql`) leen esa configuración antes de crear cada solicitud, y
rechazan la operación si no la cumple. Esto es lo que permite que dos organizaciones
usen el mismo sistema con políticas completamente distintas, sin tocar una línea de
código — cambian solamente los datos de configuración, editables desde la pantalla
**Configuración** (solo visible para el rol empleador).

## 6. Alcance y limitaciones (a propósito)

Como se definió en el anteproyecto, quedan **fuera de alcance**:
- Cálculo de liquidación de sueldos (impuestos, aportes, descuentos): el módulo de
  Sueldos solo registra el monto pagado y guarda el recibo.
- Conexión bancaria real: el estado "acreditado" lo marca manualmente el empleador.
- Validación con una organización real: los datos de prueba se cargan a mano desde
  la propia aplicación para simular distintos escenarios.
