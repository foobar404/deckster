import '../css/settings.css'
import { useContext, useEffect, useState } from 'react'
import { FaCloudUploadAlt, FaDesktop, FaEye, FaEyeSlash, FaGoogle, FaSignOutAlt, FaSyncAlt } from 'react-icons/fa'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { AppContext } from '../context/AppContext'
import { OPENROUTER_API_KEY_STORAGE_KEY } from '../utils/aiSettings'
import { firebaseAuth, firebaseConfigured, firebaseDb } from '../utils/firebase'
import { THEME_MODE_VALUES, THEME_OPTIONS, THEME_VALUES } from '../utils/themes'

const CARD_STAT_FIELDS = [
  'difficulty', 'memoryStrength', 'state', 'lastReviewed', 'lastReviewedAt',
  'reviewCount', 'correctStreak', 'lapseCount', 'lastResult'
]

const getTimestamp = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : Date.parse(value) || 0
  }
  if (typeof value?.toMillis === 'function') return value.toMillis()
  return 0
}

const getDeckTimestamp = deck => getTimestamp(deck?.updatedAt) || getTimestamp(deck?.createdAt) || getTimestamp(deck?.id)
const getCardTimestamp = card => getTimestamp(card?.lastReviewedAt) || getTimestamp(card?.lastReviewed) || getTimestamp(card?.updatedAt)

const mergeCardStats = (winningDeck, localDeck, remoteDeck) => {
  if (!Array.isArray(winningDeck.cards)) return winningDeck

  const localCards = new Map((localDeck?.cards || []).map(card => [String(card.id), card]))
  const remoteCards = new Map((remoteDeck?.cards || []).map(card => [String(card.id), card]))
  const cards = winningDeck.cards.map(card => {
    const localCard = localCards.get(String(card.id))
    const remoteCard = remoteCards.get(String(card.id))
    if (!localCard || !remoteCard) return card

    const latestStats = getCardTimestamp(remoteCard) > getCardTimestamp(localCard) ? remoteCard : localCard
    const mergedCard = { ...card }
    CARD_STAT_FIELDS.forEach(field => {
      if (latestStats[field] !== undefined) mergedCard[field] = latestStats[field]
    })

    const reviewEntries = new Map()
    const histories = [
      ...(Array.isArray(localCard.reviewHistory) ? localCard.reviewHistory : []),
      ...(Array.isArray(remoteCard.reviewHistory) ? remoteCard.reviewHistory : [])
    ]
    histories.forEach(entry => {
      if (!entry || typeof entry !== 'object') return
      const key = entry.reviewedAt
        ? `${entry.reviewedAt}:${entry.review}:${entry.rating}:${entry.mode}`
        : JSON.stringify(entry)
      reviewEntries.set(key, entry)
    })
    const reviewHistory = [...reviewEntries.values()].sort((a, b) => getTimestamp(a.reviewedAt) - getTimestamp(b.reviewedAt))
    if (reviewHistory.length) {
      mergedCard.reviewHistory = reviewHistory
      mergedCard.reviewCount = Math.max(mergedCard.reviewCount || 0, reviewHistory.length)
    }

    const latestUpdate = Math.max(getTimestamp(localCard.updatedAt), getTimestamp(remoteCard.updatedAt))
    if (latestUpdate) mergedCard.updatedAt = latestUpdate
    return mergedCard
  })

  return { ...winningDeck, cards }
}

const mergeDeckSnapshots = (localDecks, remoteDecks, localDeleted, remoteDeleted) => {
  const deletedById = new Map()
  ;[...localDeleted, ...remoteDeleted].forEach(marker => {
    if (marker?.id === undefined || marker?.id === null) return
    const id = String(marker.id)
    const deletedAt = getTimestamp(marker.deletedAt)
    const current = deletedById.get(id)
    if (!current || deletedAt > getTimestamp(current.deletedAt)) deletedById.set(id, { id, deletedAt })
  })

  const localById = new Map(localDecks.map(deck => [String(deck.id), deck]))
  const remoteById = new Map(remoteDecks.map(deck => [String(deck.id), deck]))
  const deckIds = new Set([...localById.keys(), ...remoteById.keys()])
  const decks = []

  deckIds.forEach(id => {
    const localDeck = localById.get(id)
    const remoteDeck = remoteById.get(id)
    const localVersion = getDeckTimestamp(localDeck)
    const remoteVersion = getDeckTimestamp(remoteDeck)
    const winningDeck = remoteDeck && remoteVersion > localVersion ? remoteDeck : localDeck || remoteDeck
    if (!winningDeck) return

    const deletion = deletedById.get(id)
    const deckVersion = getDeckTimestamp(winningDeck) || Date.now()
    if (deletion && getTimestamp(deletion.deletedAt) >= deckVersion) return
    if (deletion) deletedById.delete(id)

    decks.push(mergeCardStats({ ...winningDeck, updatedAt: deckVersion }, localDeck, remoteDeck))
  })

  return { decks, deletedDecks: [...deletedById.values()] }
}

export function SettingsPage() {
  const {
    decks,
    deletedDecks,
    setDeletedDecks,
    applySyncedDecks,
    applySyncedPreferences,
    studyOptions,
    theme,
    setTheme,
    themeMode,
    setThemeMode,
    localSettingsChangedAt
  } = useContext(AppContext)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(firebaseConfigured)
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false)
  const [apiKeyError, setApiKeyError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState(() => localStorage.getItem('flashcards_last_firebase_sync'))
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemPreference = event => setSystemPrefersDark(event.matches)
    mediaQuery.addEventListener('change', updateSystemPreference)
    return () => mediaQuery.removeEventListener('change', updateSystemPreference)
  }, [])

  useEffect(() => {
    if (!firebaseAuth) return
    return onAuthStateChanged(firebaseAuth, currentUser => {
      setUser(currentUser)
      setAuthLoading(false)
    })
  }, [])

  const syncProfile = async (account) => {
    if (!account || !firebaseDb) return

    setIsSyncing(true)
    setMessage('')
    setError('')

    try {
      const profileRef = doc(firebaseDb, 'users', account.uid)
      const profileSnapshot = await getDoc(profileRef)
      let remoteDecks = []
      let remoteDeletedDecks = []
      let syncedStudyOptions = studyOptions
      let syncedTheme = theme
      let syncedThemeMode = themeMode
      let cloudIsNewer = false
      let remoteSettingsVersion = null
      let shouldUpdateSettings = true

      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.data()
        remoteDecks = Array.isArray(profile.decks) ? profile.decks.filter(deck => deck && deck.id !== undefined) : []
        remoteDeletedDecks = Array.isArray(profile.deletedDecks) ? profile.deletedDecks : []
        remoteSettingsVersion = profile.settingsUpdatedAt || profile.updatedAt || null
        const cloudChangedAt = getTimestamp(remoteSettingsVersion)
        cloudIsNewer = cloudChangedAt > localSettingsChangedAt
        shouldUpdateSettings = !cloudIsNewer
        syncedStudyOptions = cloudIsNewer && profile.studyOptions && typeof profile.studyOptions === 'object'
          ? profile.studyOptions
          : studyOptions
        if (cloudIsNewer) {
          syncedTheme = THEME_VALUES.includes(profile.theme)
            ? profile.theme
            : profile.theme === 'system'
              ? 'light'
              : theme
          syncedThemeMode = THEME_MODE_VALUES.includes(profile.themeMode)
            ? profile.themeMode
            : profile.theme === 'system'
              ? 'system'
              : THEME_OPTIONS.find(option => option.value === profile.theme)?.defaultMode || themeMode
        }
      }

      const { decks: syncedDecks, deletedDecks: syncedDeletedDecks } = mergeDeckSnapshots(
        decks,
        remoteDecks,
        deletedDecks,
        remoteDeletedDecks
      )
      const localDecksById = new Map(decks.map(deck => [String(deck.id), deck]))
      const decksWithStudyOptions = syncedDecks.map(deck => {
        if (deck.studyOptions && typeof deck.studyOptions === 'object') return deck
        const localDeck = localDecksById.get(String(deck.id))
        return {
          ...deck,
          studyOptions: localDeck?.studyOptions || syncedStudyOptions
        }
      })

      await setDoc(profileRef, {
        decks: decksWithStudyOptions,
        deletedDecks: syncedDeletedDecks,
        studyOptions: syncedStudyOptions,
        theme: syncedTheme,
        themeMode: syncedThemeMode,
        settingsUpdatedAt: shouldUpdateSettings ? serverTimestamp() : remoteSettingsVersion,
        email: account.email || '',
        displayName: account.displayName || '',
        updatedAt: serverTimestamp()
      }, { merge: true })

      applySyncedDecks(decksWithStudyOptions)
      setDeletedDecks(syncedDeletedDecks)
      if (cloudIsNewer) {
        applySyncedPreferences({ studyOptions: syncedStudyOptions, theme: syncedTheme, themeMode: syncedThemeMode })
      }

      const syncedAt = new Date().toISOString()
      localStorage.setItem('flashcards_last_firebase_sync', syncedAt)
      setLastSyncedAt(syncedAt)
      setMessage(profileSnapshot.exists()
        ? 'Sync complete. Newer deck versions and deletions were applied.'
        : 'Local decks and settings backed up to your account.')
    } catch (syncError) {
      setError(syncError.message || 'Sync failed. Check your account and sync settings.')
    } finally {
      setIsSyncing(false)
    }
  }

  const connectGoogle = async () => {
    if (!firebaseAuth) return
    setError('')
    try {
      const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
      setUser(credential.user)
      await syncProfile(credential.user)
    } catch (authError) {
      setError(authError.message || 'Google sign-in failed.')
    }
  }

  const disconnectGoogle = async () => {
    if (!firebaseAuth) return
    try {
      await signOut(firebaseAuth)
      setUser(null)
      setMessage('Google account disconnected from this device.')
    } catch (signOutError) {
      setError(signOutError.message || 'Could not disconnect the Google account.')
    }
  }

  const formatSyncTime = () => {
    if (!lastSyncedAt) return 'Not synced yet'
    const date = new Date(lastSyncedAt)
    return Number.isNaN(date.getTime()) ? 'Not synced yet' : `Last synced ${date.toLocaleString()}`
  }

  const handleApiKeyChange = value => {
    setApiKey(value)
    setApiKeyError('')
    try {
      if (value) {
        localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, value)
      } else {
        localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY)
      }
    } catch {
      setApiKeyError('Could not save the API key in this browser.')
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Settings</h1>
        <p className="settings-page__description">Appearance and account sync</p>
      </header>

      <section className="settings-section settings-section--sync">
        <div className="settings-section__intro">
          <div>
            <h2 className="settings-section__title">Sync</h2>
            <p className="settings-section__description">Sync settings accross devices.</p>
          </div>
        </div>

        {!firebaseConfigured ? (
          <div className="settings-alert settings-alert--warning">
            <p className="settings-alert__title">Sync is not configured</p>
          </div>
        ) : authLoading ? (
          <p className="settings-section__description">Checking account…</p>
        ) : user ? (
          <div className="sync-account">
            <div className="sync-account__identity">
              <p className="sync-account__name">{user.displayName || 'Google account connected'}</p>
              <p className="sync-account__email">{user.email}</p>
              <p className="sync-account__time">{formatSyncTime()}</p>
            </div>
            <div className="sync-account__actions">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => syncProfile(user)}
                className="button button--success"
              >
                <FaSyncAlt className={isSyncing ? 'is-spinning' : ''} />
                {isSyncing ? 'Syncing' : 'Sync now'}
              </button>
              <button
                type="button"
                onClick={disconnectGoogle}
                className="button button--outline"
              >
                <FaSignOutAlt />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={connectGoogle}
            className="button button--outline"
          >
            <FaGoogle className="sync-account__google-icon" />
            Connect Google account
          </button>
        )}

        {message && <p role="status" className="form-message form-message--success">{message}</p>}
        {error && <p role="alert" className="form-message form-message--error">{error}</p>}
      </section>

      <section className="settings-section settings-section--ai">
        <div className="settings-section__intro">
          <div>
            <h2 className="settings-section__title">AI generation</h2>
            <p className="settings-section__description">Your OpenRouter API key is saved in this browser and shared with AI import and card generation.</p>
          </div>
        </div>
        <label htmlFor="settingsOpenRouterApiKey" className="settings-api-key__label">OpenRouter API key</label>
        <div className="settings-api-key__control">
          <textarea
            id="settingsOpenRouterApiKey"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            rows={2}
            value={apiKey}
            onChange={event => handleApiKeyChange(event.target.value)}
            placeholder="sk-or-v1-..."
            className="field settings-api-key__input"
            style={{ WebkitTextSecurity: isApiKeyVisible ? 'none' : 'disc' }}
          />
          <button
            type="button"
            onClick={() => setIsApiKeyVisible(visible => !visible)}
            aria-label={isApiKeyVisible ? 'Hide API key' : 'Show API key'}
            title={isApiKeyVisible ? 'Hide API key' : 'Show API key'}
            className="button button--icon button--quiet settings-api-key__toggle"
          >
            {isApiKeyVisible ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
          </button>
        </div>
        <p className="settings-section__description">Anyone with access to this browser profile can retrieve it. Your prompts are sent directly to the selected model provider.</p>
        {apiKeyError && <p role="alert" className="form-message form-message--error">{apiKeyError}</p>}
      </section>

      <section className="settings-section settings-section--appearance">
        <div className="appearance-section__heading">
          <h2 className="settings-section__title">Appearance</h2>
          <p className="appearance-section__hint">Choose a color theme</p>
        </div>
        <div className="theme-mode-row">
          <div className="theme-mode-control">
            <span>Light</span>
            <button
              type="button"
              role="switch"
              aria-label="Dark mode"
              aria-checked={isDarkMode}
              onClick={() => setThemeMode(isDarkMode ? 'light' : 'dark')}
              className="theme-mode-toggle"
              style={{ backgroundColor: isDarkMode ? 'var(--theme-primary)' : 'var(--theme-border)' }}
            >
              <span
                className="theme-mode-toggle-thumb"
                style={{ backgroundColor: '#fff', transform: isDarkMode ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
            <span>Dark</span>
          </div>
          <button
            type="button"
            aria-pressed={themeMode === 'system'}
            onClick={() => setThemeMode('system')}
            className={`button button--small button--outline theme-system-button${themeMode === 'system' ? ' is-selected' : ''}`}
          >
            <FaDesktop aria-hidden="true" />
            System
          </button>
        </div>
        <div className="theme-picker">
          {THEME_OPTIONS.map(({ value, label: optionLabel, color }) => (
            <button
              key={value}
              type="button"
              aria-label={`Use ${optionLabel} theme`}
              aria-pressed={theme === value}
              title={optionLabel}
              onClick={() => setTheme(value)}
              className={`theme-picker__choice${theme === value ? ' is-selected' : ''}`}
            >
              <span className="theme-picker__swatch" style={{ background: color }} aria-hidden="true" />
              <span className="theme-picker__label">{optionLabel}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}