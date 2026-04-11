// Silently capture and ignore Vite WebSocket errors in preview environments
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = function(...args) {
    if (args[0] && typeof args[0] === 'string' && (args[0].includes('WebSocket closed') || args[0].includes('failed to connect to websocket'))) {
      return;
    }
    originalError.apply(console, args);
  };
  
  window.addEventListener('error', (e) => {
    if (e.message && (e.message.includes('WebSocket closed') || e.message.includes('failed to connect to websocket'))) {
      e.preventDefault();
      return false;
    }
  });
}
