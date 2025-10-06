import { useState } from 'react';
import { FaCommentDots, FaPaperPlane, FaTimes } from 'react-icons/fa';
import './ChatbotWidget.css';

function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: '¡Hola! ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { from: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputValue }),
      });
      const data = await response.json();
      
      const botMessage = { from: 'bot', text: data.data.reply };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      const errorMessage = { from: 'bot', text: 'Lo siento, hubo un error. Intenta de nuevo.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
              <div key={index} className={`chat-message ${msg.from}`}>
                {msg.text}
              </div>
            ))}
            {isLoading && <div className="chat-message bot typing">...</div>}
          </div>
          <form className="chat-footer" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}><FaPaperPlane /></button>
          </form>
        </div>
      )}
    </>
  );
}

export default ChatbotWidget;