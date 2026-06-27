import React from 'react';
import './Privacidad.css';

function Privacidad() {
  return (
    <div className="privacidad-container">
      <h1 className="privacidad-title">
        Política de Privacidad y Tratamiento de Datos Personales
      </h1>
      <p className="privacidad-date">Última actualización: Junio de 2026</p>

      <p>
        En cumplimiento con la <strong>Ley de Protección de Datos Personales N° 25.326</strong> de la República Argentina, 
        esta Política de Privacidad describe cómo recopilamos, utilizamos, protegemos y gestionamos su información 
        personal al utilizar nuestro sistema de reservas para el Salón de Eventos Full Time, ubicado en Bolívar 1425, San Rafael, Mendoza.
      </p>

      <h2 className="privacidad-subtitle">1. Información que Recopilamos</h2>
      <p>Para brindarle nuestro servicio, recopilamos los siguientes datos personales al momento de registrarse y solicitar una reserva:</p>
      <ul className="privacidad-list">
        <li>Nombre y apellido.</li>
        <li>Documento Nacional de Identidad (DNI).</li>
        <li>Dirección de correo electrónico.</li>
        <li>Número de teléfono.</li>
        <li>Dirección IP (recopilada automáticamente al aceptar contratos digitales por motivos de seguridad legal).</li>
        <li>Imágenes de comprobantes de transferencia bancaria.</li>
      </ul>

      <h2 className="privacidad-subtitle">2. Finalidad del Tratamiento de Datos</h2>
      <p>Los datos proporcionados son almacenados en nuestra base de datos con el único propósito de:</p>
      <ul className="privacidad-list">
        <li>Gestionar y confirmar sus reservas de fechas.</li>
        <li>Elaborar el contrato legal de locación de servicios.</li>
        <li>Verificar pagos y emitir la facturación correspondiente.</li>
        <li>Contactarlo en caso de inconvenientes, modificaciones o notificaciones importantes sobre su evento.</li>
      </ul>

      <h2 className="privacidad-subtitle">3. Protección y Retención de la Información</h2>
      <p>
        Implementamos medidas de seguridad técnicas y organizativas para proteger su información contra acceso no autorizado, 
        alteración o destrucción. Sus contraseñas se almacenan mediante algoritmos de encriptación unidireccional (hash). 
        Las imágenes de comprobantes bancarios se mantienen de forma temporal y son eliminadas de nuestros servidores 
        una vez finalizado el evento y conciliada la facturación, para evitar la retención innecesaria de datos financieros.
      </p>

      <h2 className="privacidad-subtitle">4. Confidencialidad y Terceros</h2>
      <p>
        No vendemos, alquilamos ni cedemos su información personal a terceros. Sus datos solo podrán ser compartidos con 
        autoridades gubernamentales o judiciales (ej. AFIP, ATM) en caso de que exista una obligación legal de hacerlo.
      </p>

      <h2 className="privacidad-subtitle">5. Sus Derechos (Derechos ARCO)</h2>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el derecho de <strong>Acceso, Rectificación, Actualización y Supresión</strong> 
        de sus datos en forma gratuita. Si desea eliminar su cuenta o corregir algún dato, puede hacerlo enviándonos 
        una solicitud formal al correo electrónico: <strong>buscandoanemo172@gmail.com</strong>.
      </p>
      
      <div className="privacidad-nota-legal">
        <strong>Nota Legal:</strong> La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control 
        de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes 
        resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
      </div>
    </div>
  );
}

export default Privacidad;