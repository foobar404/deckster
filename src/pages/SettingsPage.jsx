import { useContext, useEffect, useState } from 'react'
import { FaCloudUploadAlt, FaGoogle, FaSignOutAlt, FaSyncAlt } from 'react-icons/fa'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { AppContext } from '../context/AppContext'
import { firebaseAuth, firebaseConfigured, firebaseDb } from '../utils/firebase'
import { THEME_OPTIONS, THEME_VALUES } from '../utils/themes'

const THEME_GROUPS = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'system', label: 'System' }
]

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
    localSettingsChangedAt
  } = useContext(AppContext)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(firebaseConfigured)
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState(() => localStorage.getItem('flashcards_last_firebase_sync'))

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
        syncedTheme = cloudIsNewer && THEME_VALUES.includes(profile.theme) ? profile.theme : theme
      }

      const { decks: syncedDecks, deletedDecks: syncedDeletedDecks } = mergeDeckSnapshots(
        decks,
        remoteDecks,
        deletedDecks,
        remoteDeletedDecks
      )

      await setDoc(profileRef, {
        decks: syncedDecks,
        deletedDecks: syncedDeletedDecks,
        studyOptions: syncedStudyOptions,
        theme: syncedTheme,
        settingsUpdatedAt: shouldUpdateSettings ? serverTimestamp() : remoteSettingsVersion,
        email: account.email || '',
        displayName: account.displayName || '',
        updatedAt: serverTimestamp()
      }, { merge: true })

      applySyncedDecks(syncedDecks)
      setDeletedDecks(syncedDeletedDecks)
      if (cloudIsNewer) {
        applySyncedPreferences({ studyOptions: syncedStudyOptions, theme: syncedTheme })
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-5 md:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Appearance and account sync</p>
      </header>

      <section className="border-y border-gray-200 py-5">
        <div className="mb-4 flex items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sync</h2>
            <p className="text-sm text-gray-600">Sync settings accross devices.</p>
          </div>
        </div>

        {!firebaseConfigured ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Sync is not configured</p>
          </div>
        ) : authLoading ? (
          <p className="text-sm text-gray-600">Checking account…</p>
        ) : user ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">{user.displayName || 'Google account connected'}</p>
              <p className="truncate text-sm text-gray-600">{user.email}</p>
              <p className="mt-1 text-xs text-gray-500">{formatSyncTime()}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => syncProfile(user)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <FaSyncAlt className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing' : 'Sync now'}
              </button>
              <button
                type="button"
                onClick={disconnectGoogle}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            <FaGoogle className="text-red-500" />
            Connect Google account
          </button>
        )}

        {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p role="alert" className="mt-3 break-words text-sm text-red-700">{error}</p>}
      </section>

      <section className="border-b border-gray-200 py-4">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
          <p className="text-sm text-gray-600">Choose how Deckster looks on this device.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {THEME_GROUPS.map(({ mode, label }) => (
            <fieldset key={mode} className={mode === 'system' ? 'sm:col-span-2' : ''}>
              <legend className="mb-1 text-sm font-semibold text-gray-700">{label}</legend>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {THEME_OPTIONS.filter(option => option.mode === mode).map(({ value, label: optionLabel, color }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                    className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors ${theme === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ background: color }} aria-hidden="true" />
                    {optionLabel}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
    </div>
  )
}