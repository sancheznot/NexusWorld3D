import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useWorldRoomConnected } from '@/hooks/useWorldRoomConnected';
import { colyseusClient } from '@/lib/colyseus/client';
import { frameworkAppName } from '@/lib/frameworkBranding';

export default function ChatWindow() {
  const { isChatOpen, toggleChat, chatMessages, setChatInput, chatInput } = useUIStore();
  const isConnected = useWorldRoomConnected();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = () => {
    if (!inputValue.trim() || !isConnected) return;

    const messageData = {
      message: inputValue.trim(),
      channel: 'global',
    };

    const sent = colyseusClient.sendMessage(messageData);
    if (sent) {
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Escape') {
      toggleChat();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setChatInput(e.target.value);
  };

  if (!isChatOpen) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-black bg-opacity-90 rounded-lg p-4 w-96 max-h-80">
      <div className="text-white">
        <div className="flex justify-between items-center mb-2">
          <span className="text-green-400 font-semibold">Chat Global</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <button
              onClick={toggleChat}
              className="text-gray-400 hover:text-white text-lg"
            >
              ×
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded p-3 mb-3 h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {chatMessages.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">
              <div>¡Bienvenido a {frameworkAppName}!</div>
              <div className="mt-1">Usa WASD para moverte</div>
              <div className="mt-1">Presiona Enter para enviar mensaje</div>
            </div>
          ) : (
            chatMessages
              .filter((msg, index, self) =>
                index === self.findIndex((m) => m.id === msg.id)
              )
              .map((msg) => (
              <div key={`${msg.id}-${msg.timestamp}`} className="mb-2 text-sm">
                <span className="text-gray-400 text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                <span className={`ml-2 font-semibold ${
                  msg.type === 'system' ? 'text-yellow-400' :
                  msg.type === 'admin' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  {msg.username}:
                </span>
                <span className="ml-2 text-white">{msg.message}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            autoFocus
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || !isConnected}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-semibold"
          >
            Enviar
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-2 text-center">
          Enter: Enviar | Esc: Cerrar | {isConnected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>
    </div>
  );
}
