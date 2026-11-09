import { useEffect, useState } from 'react';
import { FaCloudArrowUp } from 'react-icons/fa6';

// Recuadro grande para elegir la foto o captura del comprobante, con vista previa.
export default function SubirComprobante({ archivo, onElegir }) {
  const [vistaPrevia, setVistaPrevia] = useState(null);

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return undefined;
    }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const alCambiar = (e) => {
    const elegido = e.target.files?.[0];
    onElegir(elegido);
    // Permite volver a elegir el mismo archivo después de un error
    e.target.value = '';
  };

  return (
    <label className={`sv-subir${archivo ? ' sv-subir--con-archivo' : ''}`}>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={alCambiar} className="sv-oculto" />
      {vistaPrevia ? (
        <>
          <img src={vistaPrevia} alt="Vista previa del comprobante" className="sv-subir__previa" />
          <span className="sv-subir__nombre">{archivo.name}</span>
          <span className="sv-subir__cambiar">Tocá para cambiarlo</span>
        </>
      ) : (
        <>
          <FaCloudArrowUp className="sv-subir__icono" aria-hidden="true" />
          <strong>Subí el comprobante</strong>
          <span>Tocá para elegir una foto o captura (JPG, PNG o WEBP)</span>
        </>
      )}
    </label>
  );
}
