import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

// Tamaño de letra de los gráficos en píxeles, acorde a la escala del sitio
// (0.625rem, igual que las tablas).
function chartFontSize() {
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return Math.round(root * 0.625);
}

// Gráfico de Chart.js que se vuelve a dibujar cuando cambia la configuración.
export default function ChartCanvas({ config, label, className = "h-64" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const size = chartFontSize();
    Chart.defaults.font.family = "Inter, sans-serif";
    Chart.defaults.font.size = size;
    Chart.defaults.color = "#64748b";
    const chart = new Chart(canvasRef.current, config);
    return () => chart.destroy();
  }, [config]);

  return (
    <div className={`relative w-full ${className}`}>
      <canvas aria-label={label} ref={canvasRef} role="img" />
    </div>
  );
}
