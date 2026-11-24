import React from "react";
import LegalPage from "../components/LegalPage";

const sections = [
  {
    title: "Qué guardamos en tu navegador",
    paragraphs: [
      "HRManager no usa cookies. Lo único que guarda en tu navegador es la sesión de usuario, en el almacenamiento de la pestaña (sessionStorage), y solo cuando iniciás sesión.",
    ],
    items: [
      "Sesión de usuario: contiene el token de acceso y el de renovación que emite el servicio de autenticación. Permite mantener la sesión iniciada mientras navegás por los paneles y renovarla automáticamente.",
      "Identificador de pestaña: un código aleatorio que distingue la sesión de cada pestaña. No contiene datos personales.",
    ],
  },
  {
    title: "Por qué es necesario",
    paragraphs: [
      "Sin ese dato no es posible iniciar sesión ni usar los paneles. Por ser estrictamente necesario para prestar el servicio, no requiere un consentimiento aparte. No se usa con fines publicitarios, de analítica ni de seguimiento.",
    ],
  },
  {
    title: "Cuánto dura y cómo borrarlo",
    paragraphs: [
      "La sesión se elimina al cerrar sesión, al salir de las pantallas del panel o al cerrar la pestaña o el navegador. Cada pestaña tiene su propia sesión, por lo que al abrir el sistema en una pestaña nueva hay que volver a iniciar sesión.",
    ],
  },
  {
    title: "Cambios en esta política",
    paragraphs: [
      "Si en el futuro incorporamos cookies u otro almacenamiento, actualizaremos esta página y, cuando corresponda, te pediremos el consentimiento. Para más información sobre el tratamiento de tus datos, consultá la Política de privacidad.",
    ],
  },
];

export default function Cookies() {
  return (
    <LegalPage
      intro="Esta política explica qué información guarda HRManager en tu navegador y para qué."
      sections={sections}
      title="Política de cookies"
      updatedAt="23 de noviembre de 2026"
    />
  );
}
