import { useStyle } from '../utils'
import { FaChevronDown, FaEye, FaEyeSlash, FaUpload, FaMinus, FaPlus } from 'react-icons/fa'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { useState, useEffect, useContext, useRef } from 'react'

const deckColorOptions = [
  ['#ffffff', 'White'], ['#0B1026', 'Midnight navy'], ['#1A1F47', 'Navy'], ['#2D3EB3', 'Royal indigo'], ['#3F51B5', 'Indigo'],
  ['#5C6BC0', 'Periwinkle'], ['#7986CB', 'Soft indigo'], ['#9FA8DA', 'Lavender blue'], ['#B3E5FC', 'Light blue'],
  ['#4DD0E1', 'Cyan'], ['#26C6DA', 'Turquoise'], ['#00BFA5', 'Teal'], ['#00C853', 'Green'],
  ['#69F0AE', 'Mint'], ['#B2FF59', 'Lime'], ['#EEFF41', 'Lemon'], ['#FFD54F', 'Amber'],
  ['#FFB74D', 'Orange'], ['#FF8A65', 'Coral'], ['#F44336', 'Red'], ['#D32F2F', 'Dark red'],
  ['#8D1B1B', 'Wine'], ['#6D4037', 'Brown'], ['#8D6E63', 'Warm gray'], ['#D45A78', 'Rose'], ['#AB47BC', 'Purple']
]

/**
 * Custom hook for ImportPage logic and state management
 * @returns {Object} All state and handlers needed by the ImportPage component
 */
const useImportPage = () => {
  const { decks, setDecks } = useContext(AppContext)
  const { showError, showInfo } = useToast()
  const [importText, setImportText] = useState('')
  const [deckName, setDeckName] = useState('')
  const [generatedDeckSettings, setGeneratedDeckSettings] = useState(null)
  const [preview, setPreview] = useState(null)
  const [activeTab, setActiveTab] = useState('text')
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('deckster_openrouter_api_key') || ''
    } catch {
      return ''
    }
  })
  const [model, setModel] = useState(() => {
    try {
      return localStorage.getItem('deckster_openrouter_model') || 'google/gemini-2.5-flash-lite'
    } catch {
      return 'google/gemini-2.5-flash-lite'
    }
  })
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const [modelsRefresh, setModelsRefresh] = useState(0)
  const [topic, setTopic] = useState('')
  const [cardCount, setCardCount] = useState(20)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const fileInputRef = useRef(null)
  const modelsLoaded = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem('deckster_openrouter_model', model)
    } catch {
      // Keep the selection for this session if browser storage is unavailable.
    }
  }, [model])

  useEffect(() => {
    if (activeTab !== 'ai' || modelsLoaded.current) return

    let isCurrent = true
    setModelsLoading(true)
    setModelsError('')

    fetch('https://openrouter.ai/api/v1/models?sort=most-popular&limit=25&output_modalities=text&supported_parameters=max_tokens')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error?.message || `Could not load models (${response.status}).`)
        }
        const availableModels = Array.isArray(result.data)
          ? result.data.filter((entry) => entry.id && entry.name)
          : []
        const lunaModel = {
          id: 'openai/gpt-6-luna',
          name: 'OpenAI: GPT-6 Luna',
          pricing: { prompt: '0.0000001', completion: '0.0000005' },
        }
        if (!availableModels.some((entry) => entry.id === lunaModel.id)) {
          availableModels.push(lunaModel)
        }
        if (!availableModels.length) {
          throw new Error('OpenRouter returned no compatible text models.')
        }
        if (isCurrent) {
          setModels(availableModels)
          setModel((currentModel) => availableModels.some((entry) => entry.id === currentModel) ? currentModel : availableModels[0].id)
          modelsLoaded.current = true
        }
      })
      .catch((error) => {
        if (isCurrent) setModelsError(error.message || 'Could not load OpenRouter models.')
      })
      .finally(() => {
        if (isCurrent) setModelsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [activeTab, modelsRefresh])

  const formatModelPrice = (price) => {
    const perMillion = Number(price) * 1000000
    return Number.isFinite(perMillion) ? `$${perMillion.toLocaleString(undefined, { maximumFractionDigits: 2 })}/M` : 'n/a'
  }

  const handleApiKeyChange = (value) => {
    setApiKey(value)
    try {
      if (value) {
        localStorage.setItem('deckster_openrouter_api_key', value)
      } else {
        localStorage.removeItem('deckster_openrouter_api_key')
      }
    } catch {
      showError('Could not save the API key in this browser.')
    }
  }

  const handleGenerate = async () => {
    const cleanTopic = topic.trim()
    const requestedCount = Number(cardCount)

    if (!apiKey.trim()) {
      showError('Add your OpenRouter API key to generate cards.')
      return
    }
    if (!cleanTopic || cleanTopic.length > 4000) {
      showError('Enter a topic or instructions (up to 4,000 characters).')
      return
    }
    if (!model.trim()) {
      showError('Enter an OpenRouter model ID.')
      return
    }
    if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 300) {
      showError('Choose a whole number between 1 and 300 cards.')
      return
    }
    const selectedModel = models.find((entry) => entry.id === model) || { id: model }

    setIsGenerating(true)
    try {
      const requestBody = {
        model: selectedModel.id,
        max_tokens: Math.min(32768, requestedCount * 100 + 500, selectedModel.top_provider?.max_completion_tokens || 32768),
        messages: [
          {
            role: 'system',
            content: `Create accurate, useful flashcards and suitable deck settings. Return only a JSON object with "deckName", "icon", "color", and "cards". "deckName" must be a concise suggested name, "icon" must be one emoji, and "color" must be one of these exact hex values: ${deckColorOptions.map(([color, label]) => `${label} ${color}`).join(', ')}. Each card must have string fields "front" and "back". Do not include markdown or any text outside the JSON.`
          },
          {
            role: 'user',
            content: `Create exactly ${requestedCount} flashcards following the topic, language, and other instructions below. Also suggest a concise deck name, one fitting emoji icon, and the best matching color from the allowed options. If no language is specified, use English.\n\n${cleanTopic}\n\nKeep each side concise and self-contained. Do not number the cards.`
          }
        ]
      }
      if (selectedModel.supported_parameters?.includes('structured_outputs') || selectedModel.supported_parameters?.includes('response_format')) {
        requestBody.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'flashcards',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                deckName: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string', enum: deckColorOptions.map(([color]) => color) },
                cards: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      front: { type: 'string' },
                      back: { type: 'string' }
                    },
                    required: ['front', 'back'],
                    additionalProperties: false
                  },
                  minItems: requestedCount,
                  maxItems: requestedCount
                }
              },
              required: ['deckName', 'icon', 'color', 'cards'],
              additionalProperties: false
            }
          }
        }
        requestBody.provider = { require_parameters: true }
      }
      if (selectedModel.supported_parameters?.includes('temperature')) {
        requestBody.temperature = 0.6
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Cram'
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || `OpenRouter request failed (${response.status}).`)
      }

      const content = result.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        throw new Error('The model returned no text. Try another model.')
      }

      const jsonText = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(jsonText)
      const generatedCards = parsed.cards
      if (!Array.isArray(generatedCards) || generatedCards.length !== requestedCount) {
        throw new Error(`Expected ${requestedCount} cards, but the model returned ${Array.isArray(generatedCards) ? generatedCards.length : 'an invalid response'}. Try again or use a different model.`)
      }
      const suggestedName = typeof parsed.deckName === 'string' ? parsed.deckName.trim() : ''
      const suggestedIcon = typeof parsed.icon === 'string' ? parsed.icon.trim() : ''
      const allowedColors = deckColorOptions.map(([color]) => color)
      if (!suggestedName || !suggestedIcon || !allowedColors.includes(parsed.color)) {
        throw new Error('The model did not return valid deck settings. Try again or choose a model with good JSON support.')
      }

      const cards = generatedCards.map((card, index) => {
        const front = typeof card.front === 'string' ? card.front.trim() : ''
        const back = typeof card.back === 'string' ? card.back.trim() : ''
        if (!front || !back) {
          throw new Error(`Card ${index + 1} is missing a front or back.`)
        }
        return {
          id: Date.now() + index,
          front,
          back,
          difficulty: 0,
          memoryStrength: 0,
          state: 'new',
          lastReviewed: null,
          lastReviewedAt: null,
          reviewCount: 0,
          correctStreak: 0,
          lapseCount: 0,
          lastResult: null,
          createdAt: new Date().toISOString()
        }
      })

      setDeckName(suggestedName)
      setGeneratedDeckSettings({ icon: suggestedIcon, color: parsed.color })
      setPreview(cards)
      showInfo(`Generated ${cards.length} cards. Review them before importing.`)
    } catch (error) {
      showError(error instanceof SyntaxError ? 'The model returned invalid JSON. Try again or choose a model with good JSON support.' : error.message || 'Could not generate cards.')
    } finally {
      setIsGenerating(false)
    }
  }

  const parseCards = (text) => {
    if (!text.trim()) return []

    const lines = text.split('\n').filter(line => line.trim())

    const parsedCards = lines.map((line, index) => {
      // First try to parse quoted sections
      const quotedRegex = /"([^"]*)"/g
      const quotedMatches = [...line.matchAll(quotedRegex)]

      let front, back

      if (quotedMatches.length >= 2) {
        // If we have quoted sections, use them
        front = quotedMatches[0][1]
        back = quotedMatches[1][1]
      } else {
        // Auto-detect delimiter: prefer tabs over commas
        let parts
        if (line.includes('\t')) {
          parts = line.split('\t')
        } else if (line.includes(',')) {
          parts = line.split(',')
        } else {
          // Fallback to space separation
          parts = line.split(/\s+/)
        }

        if (parts.length >= 2) {
          front = parts[0].trim()
          back = parts[1].trim()

          // Remove quotes if present
          if (front.startsWith('"') && front.endsWith('"')) {
            front = front.slice(1, -1)
          }
          if (back.startsWith('"') && back.endsWith('"')) {
            back = back.slice(1, -1)
          }
        } else {
          return null
        }
      }

      if (!front || !back) {
        return null
      }

      const card = {
        id: Date.now() + index,
        front: front.trim(),
        back: back.trim(),
        difficulty: 0,
        memoryStrength: 0,
        state: 'new',
        lastReviewed: null,
        lastReviewedAt: null,
        reviewCount: 0,
        correctStreak: 0,
        lapseCount: 0,
        lastResult: null,
        createdAt: new Date().toISOString()
      }

      return card
    }).filter(Boolean)

    return parsedCards
  }

  // Auto-generate preview when import text changes
  useEffect(() => {
    setGeneratedDeckSettings(null)
    if (importText.trim()) {
      const cards = parseCards(importText)
      setPreview(cards)
    } else {
      setPreview(null)
    }
  }, [importText])

  const handleImport = () => {
    const targetName = deckName.trim()
    if (!targetName) {
      showError('Please enter a deck name.')
      return
    }

    if (!preview || preview.length === 0) {
      showError('Please add some card data to import.')
      return
    }

    // Prepare cards with unique ids
    const baseId = Date.now()
    const cardsToAdd = preview.map((c, i) => ({ ...c, id: baseId + i }))

    // Case-insensitive match for existing deck name
    const existingIndex = decks ? decks.findIndex(d => d.name.toLowerCase() === targetName.toLowerCase()) : -1

    if (existingIndex !== -1) {
      // Append cards to existing deck
      setDecks(prev => prev.map((d, idx) => idx === existingIndex ? { ...d, cards: [...d.cards, ...cardsToAdd] } : d))
      setImportText('')
      setPreview(null)
      showInfo(`Appended ${cardsToAdd.length} cards to "${decks[existingIndex].name}".`)
    } else {
      // Create a new deck
      const newDeck = {
        id: baseId + 9999, // ensure different id than card ids
        name: targetName,
        cards: cardsToAdd,
        ...(generatedDeckSettings && activeTab === 'ai' ? { appearance: generatedDeckSettings } : {})
      }

      setDecks(prev => {
        const updated = [...prev, newDeck]
        return updated
      })

      // Reset form but keep the name so user can import more if desired
      setImportText('')
      setPreview(null)
      showInfo(`Successfully imported ${cardsToAdd.length} cards to "${newDeck.name}"!`)
    }
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      setImportText(text)
      showInfo(`Loaded ${file.name}. Review the preview before importing.`)
    } catch {
      showError(`Could not read ${file.name}.`)
    }
  }

  const sampleData = `"cuchillo"\t"knife"
"sartén"\t"frying pan"
"audio example"\t"pronunciation"
Hello\tHola
Thank you\tGracias
Please\tPor favor`

  return {
    decks,
    importText,
    setImportText,
    deckName,
    setDeckName,
    preview,
    hasGeneratedDeckSettings: Boolean(generatedDeckSettings),
    activeTab,
    setActiveTab,
    apiKey,
    handleApiKeyChange,
    model,
    setModel,
    models,
    modelsLoading,
    modelsError,
    retryModels: () => setModelsRefresh((value) => value + 1),
    formatModelPrice,
    topic,
    setTopic,
    cardCount,
    setCardCount,
    isGenerating,
    handleGenerate,
    showDropdown,
    setShowDropdown,
    handleImport,
    fileInputRef,
    handleFileSelect,
    sampleData
  }
}

export function ImportPage() {
  const {
    decks,
    importText,
    setImportText,
    deckName,
    setDeckName,
    preview,
    hasGeneratedDeckSettings,
    activeTab,
    setActiveTab,
    apiKey,
    handleApiKeyChange,
    model,
    setModel,
    models,
    modelsLoading,
    modelsError,
    retryModels,
    formatModelPrice,
    topic,
    setTopic,
    cardCount,
    setCardCount,
    isGenerating,
    handleGenerate,
    showDropdown,
    setShowDropdown,
    handleImport,
    fileInputRef,
    handleFileSelect,
    sampleData
  } = useImportPage()
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false)
  const [showApiKeyInMain, setShowApiKeyInMain] = useState(() => !apiKey.trim())

  // Custom styles for ImportPage
  const customStyles = {
    container: 'w-full min-w-0 max-w-full p-4 pb-20 md:pb-4 md:max-w-3xl md:mx-auto',
    form: 'w-full min-w-0 p-4 sm:p-6 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg',
    formSection: 'mb-6',
    label: 'block text-sm font-medium text-gray-700 mb-2',
    // add right padding so input text doesn't sit under the absolute toggle button
    input: 'w-full min-w-0 max-w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    textarea: 'w-full min-w-0 max-w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y',
    hint: 'text-sm text-gray-500 mt-1',
    dropdown: 'relative',
    // make the toggle a small square button, center the icon with flexbox; disable transitions so clicks are instant
    dropdownToggle: 'absolute right-0 top-0 flex items-center justify-center w-8 h-8 p-0 text-gray-400 hover:text-gray-600 rounded-md bg-transparent hover:bg-gray-50 transition-none transform scale-[0.8]',
    importButton: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    dropdownList: 'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto'
  }

  const baseStyles = useStyle()
  const styles = { ...baseStyles, import: customStyles }
  const apiKeyField = (
    <div className="mb-5">
      <label htmlFor="openRouterKey" className={styles.import.label}>OpenRouter API key</label>
      <div className="relative">
        <textarea
          id="openRouterKey"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          rows={2}
          value={apiKey}
          onChange={(event) => handleApiKeyChange(event.target.value)}
          onBlur={(event) => setShowApiKeyInMain(!event.currentTarget.value.trim())}
          placeholder="sk-or-v1-..."
          className={`${styles.import.textarea} pr-12`}
          style={{ WebkitTextSecurity: isApiKeyVisible ? 'none' : 'disc' }}
        />
        <button
          type="button"
          onClick={() => setIsApiKeyVisible(visible => !visible)}
          aria-label={isApiKeyVisible ? 'Hide API key' : 'Show API key'}
          title={isApiKeyVisible ? 'Hide API key' : 'Show API key'}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {isApiKeyVisible ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
        </button>
      </div>
      <p className={styles.import.hint}>Saved in this browser's local storage and sent directly to OpenRouter. Anyone with access to this browser profile can retrieve it. Your prompts are processed by the selected model provider.</p>
    </div>
  )

  return (<>
    <section className={styles.import.container}>
      <h1 className="w-full text-left text-2xl font-bold text-gray-900 mb-2">Import Flashcards</h1>
      <p className="w-full text-left text-gray-600 mb-6">Import existing flashcards or generate a draft with your OpenRouter account.</p>

      <div className={styles.import.form}>
        <div className="mb-5 flex border-b border-gray-200" role="tablist" aria-label="Card source">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            onClick={() => setActiveTab('text')}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${activeTab === 'text' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            Paste or upload
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ai'}
            onClick={() => setActiveTab('ai')}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${activeTab === 'ai' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            AI assist
          </button>
        </div>

        {(activeTab === 'text' || hasGeneratedDeckSettings) && <div className={styles.import.formSection}>
          <label htmlFor="deckName" className={styles.import.label}>Deck Name</label>
          <div className={styles.import.dropdown}>
            <input
              id="deckName"
              type="text"
              placeholder="Enter deck name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              onFocus={() => setShowDropdown(false)}
              className={styles.import.input}
            />
            <button
              type="button"
              className={styles.import.dropdownToggle}
              onClick={() => setShowDropdown(!showDropdown)}
              aria-hidden="true"
            >
              <FaChevronDown size={14} className={showDropdown ? 'transform rotate-180' : ''} />
            </button>
            {showDropdown && decks && decks.length > 0 && (
              <div className={styles.import.dropdownList}>
                {decks.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(deck => (
                  <div
                    key={deck.id}
                    className="p-3 hover:bg-white/5 cursor-pointer flex justify-between items-center"
                    onClick={() => {
                      setDeckName(deck.name)
                      setShowDropdown(false)
                    }}
                  >
                    <span className="font-medium">{deck.name}</span>
                    <span className="text-sm text-gray-500">({deck.cards.length} cards)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.import.hint}>
            {decks && decks.length > 0
              ? `Type or select from ${decks.length} existing deck${decks.length === 1 ? '' : 's'}.`
              : 'Enter a name for your new deck.'
            }
          </div>
        </div>}

        {activeTab === 'ai' && <div className={styles.import.formSection}>
          {showApiKeyInMain && apiKeyField}

          <div className="mb-5">
            <label htmlFor="aiTopic" className={styles.import.label}>Topic and instructions</label>
            <textarea
              id="aiTopic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="For example: beginner Spanish food vocabulary, with the Spanish term on the front and a concise English translation on the back."
              className={styles.import.textarea}
            />
          </div>

          <div className="mb-5 max-w-sm">
            <span className={styles.import.label}>Number of cards</span>
            <div className="flex items-center gap-2" role="group" aria-label="Choose number of cards">
              <button
                type="button"
                aria-label="Decrease card count"
                disabled={Number(cardCount) <= 1}
                onClick={() => setCardCount(current => Math.max(1, Number(current) - 1))}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaMinus aria-hidden="true" />
              </button>
              <output className="flex h-11 min-w-16 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-lg font-semibold text-gray-900" aria-live="polite">
                {cardCount}
              </output>
              <button
                type="button"
                aria-label="Increase card count"
                disabled={Number(cardCount) >= 300}
                onClick={() => setCardCount(current => Math.min(300, Number(current) + 1))}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaPlus aria-hidden="true" />
              </button>
            </div>
          </div>

          <details className="mb-5 rounded-lg border border-gray-200 px-4">
            <summary className="cursor-pointer py-3 text-sm font-medium text-gray-700">Advanced generation settings</summary>
            <div className="border-t border-gray-200 py-4">
              {!showApiKeyInMain && apiKeyField}
              <div className="mb-5">
                <label htmlFor="openRouterModel" className={styles.import.label}>Model</label>
                <select
                  id="openRouterModel"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={modelsLoading || models.length === 0}
                  className={styles.import.input}
                >
                  {modelsLoading && <option value="">Loading popular models...</option>}
                  {!modelsLoading && models.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} · in {formatModelPrice(entry.pricing?.prompt)} / out {formatModelPrice(entry.pricing?.completion)}
                    </option>
                  ))}
                  {!modelsLoading && models.length === 0 && <option value="">No models available</option>}
                </select>
                {modelsError ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className={styles.import.hint}>{modelsError}</p>
                    <button type="button" onClick={retryModels} className="text-sm font-medium text-blue-700 hover:underline">Retry</button>
                  </div>
                ) : (
                  <p className={styles.import.hint}>Top popular OpenRouter text models. Prices shown per million tokens; provider rates may vary.</p>
                )}
              </div>

            </div>
          </details>

        </div>}

        {activeTab === 'text' && <div className={styles.import.formSection}>
          <div className="mb-2">
            <label htmlFor="importText" className={`${styles.import.label} mb-0`}>Card Data</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Choose a CSV, TSV, or text file"
            />
          </div>
          <textarea
            id="importText"
            placeholder={'One CSV row per card: "front","back". Quote values containing commas.\n\nExample:\n"cuchillo","knife"\n"sartén","frying pan"\n"Hello","Hola"'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            className={styles.import.textarea}
          />
          <div className={styles.import.hint}>
            Supports quoted text, any URLs in text, and auto-detects separators (tab/comma/space)
          </div>
        </div>}

        {preview?.length > 0 && (
          <section className="mb-6" aria-label="Card preview">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">Preview ({preview.length} cards)</h2>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              {preview.map((card, index) => (
                <div key={`${card.id}-${index}`} className="grid grid-cols-1 gap-2 border-b border-gray-100 p-3 last:border-b-0 sm:grid-cols-2">
                  <p className="break-words text-sm text-gray-800">{card.front}</p>
                  <p className="break-words text-sm text-gray-600">{card.back}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'ai' && hasGeneratedDeckSettings && preview?.length > 0 && (
          <p className="mb-3 text-center text-sm font-medium text-emerald-700" role="status">
            Draft ready · review the cards, then import.
          </p>
        )}

        <div className={`grid w-full items-center gap-2 ${activeTab === 'text' ? 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : 'grid-cols-1'}`}>
          <button
            type="button"
            className={`${activeTab === 'ai' && hasGeneratedDeckSettings && preview?.length > 0
              ? 'w-full max-w-sm rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
              : `${styles.import.importButton} disabled:cursor-not-allowed disabled:opacity-50`} justify-self-center ${activeTab === 'text' ? 'col-start-2' : ''}`}
            onClick={() => activeTab === 'ai' && !(hasGeneratedDeckSettings && preview?.length > 0) ? handleGenerate() : handleImport()}
            disabled={activeTab === 'ai'
              ? isGenerating || (hasGeneratedDeckSettings && preview?.length > 0
                ? !deckName.trim() || !preview?.length
                : !apiKey.trim() || !topic.trim() || !Number.isInteger(Number(cardCount)) || Number(cardCount) < 1 || Number(cardCount) > 300)
              : !deckName.trim() || !preview?.length}
          >
            {activeTab === 'ai'
              ? isGenerating
                ? 'Generating draft...'
                : hasGeneratedDeckSettings && preview?.length > 0
                  ? `Import ${preview.length} cards`
                  : `Generate ${cardCount} cards`
              : 'Import Deck'}
          </button>
          {activeTab === 'text' && (
            <button
              type="button"
              className="group col-start-3 flex h-11 w-11 shrink-0 items-center justify-center justify-self-end rounded-lg border border-gray-300 bg-gray-50 text-gray-700 shadow-sm transition-all hover:bg-gray-100 hover:text-blue-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Import from file"
              title="Import from file"
            >
              <FaUpload aria-hidden="true" className="text-base" />
            </button>
          )}
        </div>
      </div>
    </section>
  </>)
}


