import { useEffect, useRef, useState } from 'react';

// Hook para lectores USB tipo "keyboard wedge".
// - Acumula teclas en un buffer
// - Finaliza el escaneo con Enter/Tab
// - Resetea si pasa cierto tiempo sin recibir teclas
//
// Uso:
// useUSBBarcodeReader({
//   enabled: true,
//   onScan: (code) => console.log(code),
//   minLength: 3,
//   timeoutMs: 60,
// })
const useUSBBarcodeReader = ({
  onScan,
  enabled = true,
  minLength = 1,
  timeoutMs = 80,
} = {}) => {
  const [lastScan, setLastScan] = useState('');
  const bufferRef = useRef('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const resetBufferSoon = () => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, timeoutMs);
    };

    const finalize = () => {
      const code = bufferRef.current;
      bufferRef.current = '';
      clearTimer();

      // filtra "Enter" solo / o códigos muy cortos
      if (!code || code.length < minLength) return;

      setLastScan(code);
      if (typeof onScan === 'function') onScan(code);
    };

    const isModifier = e => e.ctrlKey || e.altKey || e.metaKey;

    const onKeyDown = e => {
      if (isModifier(e)) return;

      // Algunas pistolas envían Enter al final
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        finalize();
        return;
      }

      // Ignorar teclas no imprimibles
      if (typeof e.key !== 'string' || e.key.length !== 1) return;

      bufferRef.current += e.key;
      resetBufferSoon();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimer();
      bufferRef.current = '';
    };
  }, [enabled, onScan, minLength, timeoutMs]);

  return lastScan;
};

export default useUSBBarcodeReader;