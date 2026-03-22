/**
 * Simple TTS Utility for the Credify project.
 * Uses the Web Speech API (SpeechSynthesis).
 */

let currentId = null;

/**
 * Toggles speech for a given text and ID.
 * If the same ID is clicked while speaking, it stops.
 * If a different ID is clicked, it stops the previous and starts the new one.
 * 
 * @param {string} id Unique identifier for the text block
 * @param {string} text The text to read aloud
 * @returns {boolean} True if starting to speak, false if stopping
 */
export const toggleSpeech = (id, text) => {
  if (window.speechSynthesis.speaking && currentId === id) {
    window.speechSynthesis.cancel();
    currentId = null;
    return false;
  }
  
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.onend = () => {
    if (currentId === id) {
      currentId = null;
    }
    // Update state via events if needed, but for simplicity we'll just handle it here
    window.dispatchEvent(new CustomEvent('tts-state-change', { detail: { id, speaking: false } }));
  };
  
  utterance.onstart = () => {
    currentId = id;
    window.dispatchEvent(new CustomEvent('tts-state-change', { detail: { id, speaking: true } }));
  };

  utterance.onerror = (event) => {
    console.error('TTS Error:', event);
    currentId = null;
    window.dispatchEvent(new CustomEvent('tts-state-change', { detail: { id, speaking: false } }));
  };

  window.speechSynthesis.speak(utterance);
  return true;
};

/**
 * Stops any current speech.
 */
export const stopSpeech = () => {
  window.speechSynthesis.cancel();
  currentId = null;
  window.dispatchEvent(new CustomEvent('tts-state-change', { detail: { speaking: false } }));
};
