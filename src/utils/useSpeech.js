import { useState, useCallback, useRef, useEffect } from 'react'

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

export const useSpeech = () => {
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [voices, setVoices] = useState([])
    const [isSupported, setIsSupported] = useState(false)
    const currentUtteranceRef = useRef(null)

    // Initialize speech synthesis support and voices
    useEffect(() => {
        const checkSupport = () => {
            const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
            setIsSupported(supported)

            if (supported) {
                // Load voices
                const loadVoices = () => {
                    const availableVoices = window.speechSynthesis.getVoices()
                    setVoices(availableVoices)
                }

                // Voices might not be loaded immediately
                if (window.speechSynthesis.getVoices().length === 0) {
                    window.speechSynthesis.onvoiceschanged = loadVoices
                } else {
                    loadVoices()
                }
            }
        }

        checkSupport()
    }, [])

    /**
     * Detect the language of a given text
     */
    const detectLanguage = useCallback((text) => {
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
    }, [])

    /**
     * Get available voices for a specific language
     */
    const getVoicesForLanguage = useCallback((languageCode) => {
        if (!isSupported) return []

        const speechLang = SPEECH_LANGUAGES[languageCode] || 'en-US'

        return voices.filter(voice =>
            voice.lang.startsWith(speechLang.split('-')[0]) ||
            voice.lang === speechLang
        )
    }, [isSupported, voices])

    /**
     * Test speech synthesis with a simple phrase
     */
    const testSpeech = useCallback(async () => {
        try {
            await speakText('Hello, this is a test of the speech system.', { volume: 0.5 })
            return true
        } catch (error) {
            return false
        }
    }, [])

    /**
     * Speak the given text using text-to-speech
     */
    const speakText = useCallback((text, options = {}) => {
        return new Promise((resolve, reject) => {
            if (!isSupported) {
                reject(new Error('Speech synthesis not supported'))
                return
            }

            if (!text || typeof text !== 'string' || !text.trim()) {
                reject(new Error('Invalid text provided'))
                return
            }

            setIsLoading(true)

            // Stop any ongoing speech
            if (currentUtteranceRef.current) {
                window.speechSynthesis.cancel()
            }

            // Wait a bit for cancel to complete
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text.trim())
                currentUtteranceRef.current = utterance

                // Detect language if not provided
                const language = options.language || detectLanguage(text)
                const speechLang = SPEECH_LANGUAGES[language] || 'en-US'

                // Set speech parameters
                utterance.lang = speechLang
                utterance.rate = options.rate || 0.9
                utterance.pitch = options.pitch || 1
                utterance.volume = options.volume || 0.8

                // Get voices
                const languageVoices = voices.filter(voice =>
                    voice.lang.startsWith(speechLang.split('-')[0]) ||
                    voice.lang === speechLang
                )

                if (languageVoices.length > 0) {
                    // Prefer native voices
                    const nativeVoice = languageVoices.find(voice => voice.localService) || languageVoices[0]
                    utterance.voice = nativeVoice
                }

                // Set up event handlers
                utterance.onstart = () => {
                    setIsSpeaking(true)
                    setIsLoading(false)
                }

                utterance.onend = () => {
                    setIsSpeaking(false)
                    setIsLoading(false)
                    currentUtteranceRef.current = null
                    resolve()
                }

                utterance.onerror = (event) => {
                    setIsSpeaking(false)
                    setIsLoading(false)
                    currentUtteranceRef.current = null
                    reject(new Error(`Speech synthesis error: ${event.error}`))
                }

                // Start speaking
                try {
                    window.speechSynthesis.speak(utterance)
                } catch (error) {
                    setIsSpeaking(false)
                    setIsLoading(false)
                    currentUtteranceRef.current = null
                    reject(error)
                }
            }, 50)
        })
    }, [isSupported, voices, detectLanguage])

    /**
     * Stop any ongoing speech synthesis
     */
    const stopSpeech = useCallback(() => {
        if (isSupported && currentUtteranceRef.current) {
            try {
                window.speechSynthesis.cancel()
                setIsSpeaking(false)
                setIsLoading(false)
                currentUtteranceRef.current = null

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
    }, [isSupported])

    /**
     * Check if text contains a valid image URL
     */
    const extractImageUrl = useCallback((text) => {
        if (!text || typeof text !== 'string') return null

        // Regex to match image URLs (expanded to include more formats)
        const imageUrlRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?[^\s]*)?/i
        const match = text.match(imageUrlRegex)

        return match ? match[0] : null
    }, [])

    /**
     * Extract any URL from text
     */
    const extractUrl = useCallback((text) => {
        if (!text || typeof text !== 'string') return null

        // Regex to match any URL (http/https)
        const urlRegex = /https?:\/\/[^\s]+/i
        const match = text.match(urlRegex)

        return match ? match[0] : null
    }, [])

    /**
     * Clean text by removing all URLs (for clean text display during study)
     */
    const cleanTextFromImages = useCallback((text) => {
        if (!text || typeof text !== 'string') return ''

        // Remove all URLs from text (http/https) for clean study experience
        const urlRegex = /https?:\/\/[^\s]+/gi
        return text.replace(urlRegex, '').trim()
    }, [])

    /**
     * Clean text for speech synthesis by removing URLs and extracting readable content
     */
    const cleanTextForSpeech = useCallback((text) => {
        if (!text || typeof text !== 'string') return ''

        // Remove all URLs from text (http/https) for speech
        const urlRegex = /https?:\/\/[^\s]+/gi
        return text.replace(urlRegex, '').trim()
    }, [])

    return {
        // State
        isSpeaking,
        isLoading,
        isSupported,
        voices,

        // Speech functions
        speakText,
        stopSpeech,
        testSpeech,
        detectLanguage,
        getVoicesForLanguage,

        // Text utility functions
        extractImageUrl,
        extractUrl,
        cleanTextFromImages,
        cleanTextForSpeech,
    }
}
