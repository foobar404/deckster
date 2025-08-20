// Text-to-Speech and Language Detection Utilities

// Language detection mapping for common languages
const LANGUAGE_PATTERNS = {
  'en': /^[a-zA-Z\s.,!?;:'"()-]+$/,
  'es': /[ñáéíóúü]/i,
  'fr': /[àâäçéèêëïîôùûüÿ]/i,
  'de': /[äöüß]/i,
  'it': /[àèéìíîòóù]/i,
  'pt': /[ãáâàçéêíóôõú]/i,
  'ru': /[а-яё]/i,
  'zh': /[\u4e00-\u9fff]/,
  'ja': /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/,
  'ko': /[\uac00-\ud7af]/,
  'ar': /[\u0600-\u06ff]/,
  'hi': /[\u0900-\u097f]/,
}

// Common language codes for speech synthesis
const SPEECH_LANGUAGES = {
  'en': 'en-US',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'it': 'it-IT',
  'pt': 'pt-PT',
  'ru': 'ru-RU',
  'zh': 'zh-CN',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'ar': 'ar-SA',
  'hi': 'hi-IN',
}

/**
 * Detect the language of a given text
 * @param {string} text - The text to analyze
 * @returns {string} - Detected language code (defaults to 'en')
 */
export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'en'
  
  const cleanText = text.trim()
  if (!cleanText) return 'en'
  
  // Check for specific language patterns
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(cleanText)) {
      // Special handling for Chinese, Japanese, Korean
      if (lang === 'zh' || lang === 'ja' || lang === 'ko') {
        return lang
      }
      // For other languages, continue checking for more specific patterns
    }
  }
  
  // Check for Romance languages with accents
  if (LANGUAGE_PATTERNS.es.test(cleanText)) return 'es'
  if (LANGUAGE_PATTERNS.fr.test(cleanText)) return 'fr'
  if (LANGUAGE_PATTERNS.de.test(cleanText)) return 'de'
  if (LANGUAGE_PATTERNS.it.test(cleanText)) return 'it'
  if (LANGUAGE_PATTERNS.pt.test(cleanText)) return 'pt'
  
  // Check for non-Latin scripts
  if (LANGUAGE_PATTERNS.ru.test(cleanText)) return 'ru'
  if (LANGUAGE_PATTERNS.ar.test(cleanText)) return 'ar'
  if (LANGUAGE_PATTERNS.hi.test(cleanText)) return 'hi'
  
  // Default to English
  return 'en'
}

/**
 * Check if speech synthesis is supported
 * @returns {boolean}
 */
export const isSpeechSupported = () => {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

/**
 * Test speech synthesis with a simple phrase
 */
export const testSpeech = async () => {
  try {
    await speakText('Hello, this is a test of the speech system.', { volume: 0.5 })
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get available voices for a specific language
 * @param {string} languageCode - Language code (e.g., 'en', 'es')
 * @returns {SpeechSynthesisVoice[]} - Array of available voices
 */
export const getVoicesForLanguage = (languageCode) => {
  if (!isSpeechSupported()) return []
  
  const speechLang = SPEECH_LANGUAGES[languageCode] || 'en-US'
  const voices = window.speechSynthesis.getVoices()
  
  return voices.filter(voice => 
    voice.lang.startsWith(speechLang.split('-')[0]) ||
    voice.lang === speechLang
  )
}

/**
 * Speak the given text using text-to-speech
 * @param {string} text - Text to speak
 * @param {Object} options - Speech options
 * @param {string} options.language - Language code
 * @param {number} options.rate - Speech rate (0.1 to 10)
 * @param {number} options.pitch - Speech pitch (0 to 2)
 * @param {number} options.volume - Speech volume (0 to 1)
 * @returns {Promise<void>}
 */
export const speakText = (text, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isSpeechSupported()) {
      reject(new Error('Speech synthesis not supported'))
      return
    }
    
    if (!text || typeof text !== 'string' || !text.trim()) {
      reject(new Error('Invalid text provided'))
      return
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel()
    
    // Wait a bit for cancel to complete
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text.trim())
      
      // Detect language if not provided
      const language = options.language || detectLanguage(text)
      const speechLang = SPEECH_LANGUAGES[language] || 'en-US'
      
      // Set speech parameters
      utterance.lang = speechLang
      utterance.rate = options.rate || 0.9
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 0.8
      
      // Get voices - wait for voices to be loaded
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        
        if (voices.length > 0) {
          const languageVoices = voices.filter(voice => 
            voice.lang.startsWith(speechLang.split('-')[0]) ||
            voice.lang === speechLang
          )
          
          if (languageVoices.length > 0) {
            // Prefer native voices
            const nativeVoice = languageVoices.find(voice => voice.localService) || languageVoices[0]
            utterance.voice = nativeVoice
          }
        }
        
        // Set up event handlers
        utterance.onstart = () => {}
        
        utterance.onend = () => {
          resolve()
        }
        
        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis error: ${event.error}`))
        }
        
        // Start speaking
        try {
          window.speechSynthesis.speak(utterance)
        } catch (error) {
          reject(error)
        }
      }
      
      // If voices are not loaded yet, wait for them
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak
      } else {
        setVoiceAndSpeak()
      }
    }, 50)
  })
}

/**
 * Stop any ongoing speech synthesis
 */
export const stopSpeech = () => {
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel()
      
      // Force stop if still speaking
      if (window.speechSynthesis.speaking) {
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel()
          }
        }, 100)
      }
    } catch (error) {
      // Silently handle errors
    }
  }
}

/**
 * Check if text contains a valid image URL
 * @param {string} text - Text to check
 * @returns {string|null} - Image URL if found, null otherwise
 */
export const extractImageUrl = (text) => {
  if (!text || typeof text !== 'string') return null
  
  // Regex to match image URLs (expanded to include more formats)
  const imageUrlRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?[^\s]*)?/i
  const match = text.match(imageUrlRegex)
  
  return match ? match[0] : null
}

/**
 * Extract any URL from text
 * @param {string} text - Text to check
 * @returns {string|null} - URL if found, null otherwise
 */
export const extractUrl = (text) => {
  if (!text || typeof text !== 'string') return null
  
  // Regex to match any URL (http/https)
  const urlRegex = /https?:\/\/[^\s]+/i
  const match = text.match(urlRegex)
  
  return match ? match[0] : null
}

/**
 * Clean text by removing all URLs (for clean text display during study)
 * @param {string} text - Original text
 * @returns {string} - Text without URLs
 */
export const cleanTextFromImages = (text) => {
  if (!text || typeof text !== 'string') return ''
  
  // Remove all URLs from text (http/https) for clean study experience
  const urlRegex = /https?:\/\/[^\s]+/gi
  return text.replace(urlRegex, '').trim()
}

/**
 * Clean text for speech synthesis by removing URLs and extracting readable content
 * @param {string} text - Original text
 * @returns {string} - Text cleaned for speech, without URLs
 */
export const cleanTextForSpeech = (text) => {
  if (!text || typeof text !== 'string') return ''
  
  // Remove all URLs from text (http/https) for speech
  const urlRegex = /https?:\/\/[^\s]+/gi
  return text.replace(urlRegex, '').trim()
}
