import { useEffect, useRef, useState } from 'react';
import { FaCommentDots, FaPaperPlane, FaTimes } from 'react-icons/fa';
import Turnstile from './Turnstile';
import './ChatbotWidget.css';

const BIENVENIDA = {
  from: 'bot',
  text: '¡Hola! Soy el asistente del salón. Preguntame por fechas disponibles, precios, qué incluye el alquiler o cómo reservar.',
};
const MAX_HISTORIAL = 20;        // mensajes que se mandan al backend (los más recientes)
const MAX_MENSAJE = 500;
const MAX_RESPUESTA = 2000;

// Convierte la conversación visible al formato del backend: sin el saludo ni los mensajes
// fallidos, alternando usuario/asistente y empezando por el usuario.
function armarHistorial(lista) {
  let historial = lista
    .filter((m) => m !== BIENVENIDA && !m.excluir)
    .map((m) => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.from === 'user' ? m.text : m.text.slice(0, MAX_RESPUESTA),
    }))
    .slice(-MAX_HISTORIAL);
  while (historial.length && historial[0].role !== 'user') historial = historial.slice(1);
  return historial;
}

function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([BIENVENIDA]);
  const [inputValue, setInputValue] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [sesion, setSesion] = useState(null);      // token de sesión de chat (Turnstile verificado)
  const [verificando, setVerificando] = useState(false);
  const [aviso, setAviso] = useState('');
  const messagesEndRef = useRef(null);
  const turnstileRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending, sesion]);

  const toggleChat = () => setIsOpen(!isOpen);

  const crearSesion = async (turnstileToken) => {
    if (!turnstileToken) return;
    setVerificando(true);
    setAviso('');
    try {
      const response = await fetch('/api/v1/chatbot/sesion', {
        method: 'POST',
        headers: { 'X-Turnstile-Token': turnstileToken },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No pudimos verificar. Recargá la página e intentá de nuevo.');
      setSesion(data.data.token);
    } catch (err) {
      setAviso(err.message);
      turnstileRef.current?.reset();   // cada token sirve una sola vez
    } finally {
      setVerificando(false);
    }
  };

  // El mensaje que falló y el aviso de error quedan visibles, pero no se reenvían como historial
  const marcarFallido = (mensaje, textoError) => {
    setMessages((prev) => [
      ...prev.map((m) => (m === mensaje ? { ...m, excluir: true } : m)),
      { from: 'bot', text: textoError, excluir: true },
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const texto = inputValue.trim().slice(0, MAX_MENSAJE);
    if (!texto || isPending || !sesion) return;

    const nuevo = { from: 'user', text: texto };
    const lista = [...messages, nuevo];
    setMessages(lista);
    setInputValue('');
    setIsPending(true);

    try {
      const response = await fetch('/api/v1/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Chat-Session': sesion },
        body: JSON.stringify({ messages: armarHistorial(lista) }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 403 && data.data?.codigo === 'sesion_chat_invalida') {
        setSesion(null);
        marcarFallido(nuevo, 'La sesión del chat venció. Verificá de nuevo y volvé a enviar tu pregunta.');
        return;
      }
      if (response.status === 429) {
        marcarFallido(nuevo, 'Enviaste muchos mensajes seguidos. Esperá un momento y volvé a intentar.');
        return;
      }
      if (!response.ok) throw new Error(data.message || 'Error al conectar con el asistente.');

      setMessages((prev) => [...prev, { from: 'bot', text: data.data?.reply || 'No recibí respuesta.' }]);
    } catch (err) {
      marcarFallido(nuevo, err.message || 'Error al conectar con el asistente.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button className="chat-toggle-button" onClick={toggleChat}>
        <FaCommentDots />
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Asistente Virtual</h3>
            <button onClick={toggleChat}><FaTimes /></button>
          </div>
          <div className="chat-body">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.from}`} style={{ whiteSpace: 'pre-line' }}>
                {msg.text}
              </div>
            ))}
            {isPending && <div className="chat-message bot typing">...</div>}
            {!sesion && (
              <div className="chat-message bot">
                {verificando ? 'Verificando…' : 'Antes de empezar, confirmá que no sos un robot:'}
                <Turnstile ref={turnstileRef} onToken={crearSesion} />
                {aviso && <div>{aviso}</div>}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-footer" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={sesion ? 'Escribe tu pregunta...' : 'Completá la verificación para escribir'}
              maxLength={MAX_MENSAJE}
              disabled={isPending || !sesion}
            />
            <button type="submit" disabled={isPending || !sesion}><FaPaperPlane /></button>
          </form>
        </div>
      )}
    </>
  );
}

export default ChatbotWidget;
