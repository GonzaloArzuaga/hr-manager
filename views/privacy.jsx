import React from "react";
import LegalPage from "../components/LegalPage";

const sections = [
  {
    title: "Quiénes intervienen en el tratamiento",
    paragraphs: [
      "Cada empresa que contrata HRManager es responsable de los datos de su personal: decide qué información carga y para qué la usa. HRManager trata esos datos por cuenta de la empresa, solo para prestar el servicio y según sus instrucciones.",
      "Si sos empleado de una empresa que usa HRManager, las consultas sobre el uso de tus datos podés dirigirlas primero a tu empleador.",
    ],
  },
  {
    title: "Qué datos tratamos",
    items: [
      "Datos de identificación y contacto: nombre, apellido, CUIL, email y foto de perfil opcional.",
      "Datos laborales: legajo, puesto, área, sucursal, horarios, francos, vacaciones y licencias.",
      "Registros de asistencia: fichajes de entrada y salida.",
      "Datos de sueldos: período, tipo de pago, monto y recibos en PDF.",
      "Datos de la cuenta: credenciales de acceso (la contraseña se guarda cifrada) y notificaciones del sistema.",
      "Datos enviados en las solicitudes de demostración: nombre, empresa y datos de contacto.",
    ],
  },
  {
    title: "Para qué los usamos",
    paragraphs: [
      "Usamos los datos únicamente para prestar el servicio; no los vendemos ni los usamos con fines publicitarios. En concreto, para:",
    ],
    items: [
      "Gestionar turnos, francos, vacaciones, asistencia y recibos de sueldo.",
      "Autenticar a los usuarios y proteger el acceso a cada cuenta.",
      "Enviar notificaciones y correos propios del servicio, como la recuperación de contraseña.",
      "Responder las solicitudes de demostración.",
    ],
  },
  {
    title: "Con quién se comparten",
    paragraphs: [
      "Dentro de cada empresa, cada usuario accede solo a lo que le corresponde: el empleado ve sus propios datos, el Encargado los de su sucursal y la Empresa los de toda la organización.",
      "Los datos se alojan en Supabase, proveedor de base de datos, autenticación y almacenamiento de archivos. Además, el sitio carga tipografías, iconos y estilos desde servicios externos (Google Fonts, Font Awesome y Tailwind CSS), que reciben la dirección IP del visitante al servir esos recursos.",
      "Fuera de estos casos, solo se comparten datos cuando lo exige una autoridad competente conforme a la ley.",
    ],
  },
  {
    title: "Seguridad",
    paragraphs: [
      "El acceso a los datos está restringido por políticas de seguridad en la base de datos, de modo que cada usuario solo puede leer y modificar lo que su rol permite. Los recibos de sueldo se guardan en un almacenamiento privado y se abren con enlaces temporales.",
    ],
  },
  {
    title: "Cuánto tiempo los conservamos",
    paragraphs: [
      "Los datos se conservan mientras la empresa mantenga el servicio activo y durante los plazos que exijan las obligaciones legales aplicables. Cuando la empresa da de baja el servicio, sus datos se eliminan o se devuelven según lo acordado con ella.",
    ],
  },
  {
    title: "Tus derechos",
    paragraphs: [
      "Conforme a la Ley 25.326 de Protección de Datos Personales, podés solicitar el acceso, la rectificación, la actualización o la supresión de tus datos. Podés hacerlo a través de tu empleador o escribiendo a soporte@hrmanager.com.ar.",
      "La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.",
    ],
  },
  {
    title: "Cookies y almacenamiento local",
    paragraphs: [
      "HRManager no usa cookies. Solo guarda en tu navegador la sesión de usuario necesaria para iniciar sesión; el detalle está en la Política de cookies.",
    ],
  },
  {
    title: "Cambios en esta política",
    paragraphs: [
      "Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa. La fecha de la última actualización figura al comienzo de esta página.",
    ],
  },
];

export default function Privacy() {
  return (
    <LegalPage
      intro="Esta política explica qué datos personales trata HRManager, con qué finalidad, con quién se comparten y cómo podés ejercer tus derechos."
      sections={sections}
      title="Política de privacidad"
      updatedAt="23 de noviembre de 2026"
    />
  );
}
