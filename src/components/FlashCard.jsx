import { useStyle, useSpeech } from '../utils'
import { useState, useRef, useEffect, useMemo } from 'react'
import { FaTimes, FaFrown, FaCheck, FaRocket } from 'react-icons/fa'

const FLIP_DURATION_MS = 250

const getCharacterComparison = (enteredAnswer, expectedAnswer) => {
    const normalize = value => value.trim().replace(/\s+/g, ' ')
    const entered = Array.from(normalize(enteredAnswer))
    const expected = Array.from(normalize(expectedAnswer))
    const enteredLower = entered.map(character => character.toLocaleLowerCase())
    const expectedLower = expected.map(character => character.toLocaleLowerCase())
    const enteredMismatch = Array(entered.length).fill(false)
    const expectedMismatch = Array(expected.length).fill(false)

    if (Math.max(entered.length, expected.length) > 400 || entered.length * expected.length > 40000) {
        let prefix = 0
        while (prefix < entered.length && prefix < expected.length && enteredLower[prefix] === expectedLower[prefix]) prefix += 1
        let enteredEnd = entered.length
        let expectedEnd = expected.length
        while (enteredEnd > prefix && expectedEnd > prefix && enteredLower[enteredEnd - 1] === expectedLower[expectedEnd - 1]) {
            enteredEnd -= 1
            expectedEnd -= 1
        }
        for (let index = prefix; index < enteredEnd; index += 1) enteredMismatch[index] = true
        for (let index = prefix; index < expectedEnd; index += 1) expectedMismatch[index] = true
    } else {
        const lengths = Array.from({ length: entered.length + 1 }, () => new Uint16Array(expected.length + 1))
        for (let enteredIndex = entered.length - 1; enteredIndex >= 0; enteredIndex -= 1) {
            for (let expectedIndex = expected.length - 1; expectedIndex >= 0; expectedIndex -= 1) {
                lengths[enteredIndex][expectedIndex] = enteredLower[enteredIndex] === expectedLower[expectedIndex]
                    ? lengths[enteredIndex + 1][expectedIndex + 1] + 1
                    : Math.max(lengths[enteredIndex + 1][expectedIndex], lengths[enteredIndex][expectedIndex + 1])
            }
        }

        let enteredIndex = 0
        let expectedIndex = 0
        while (enteredIndex < entered.length || expectedIndex < expected.length) {
            if (enteredIndex < entered.length && expectedIndex < expected.length && enteredLower[enteredIndex] === expectedLower[expectedIndex]) {
                enteredIndex += 1
                expectedIndex += 1
            } else if (enteredIndex < entered.length && (
                expectedIndex === expected.length ||
                lengths[enteredIndex + 1][expectedIndex] >= lengths[enteredIndex][expectedIndex + 1]
            )) {
                enteredMismatch[enteredIndex] = true
                enteredIndex += 1
            } else {
                expectedMismatch[expectedIndex] = true
                expectedIndex += 1
            }
        }
    }

    return {
        entered: entered.map((character, index) => ({ character, mismatch: enteredMismatch[index] })),
        expected: expected.map((character, index) => ({ character, mismatch: expectedMismatch[index] }))
    }
}

/**
 * Custom hook for FlashCard logic and state management
 * @param {Object} card - Card object with front, back, etc.
 * @param {Function} onReview - Callback for when card is reviewed
 * @param {Function} onDragStateChange - Callback for drag state changes
 * @param {Object} studyOptions - Study options like autoRead, etc.
 * @returns {Object} All state and handlers needed by the FlashCard component
 */
const useFlashCard = (card, onReview, onDragStateChange, studyOptions) => {
    const [isFlipped, setIsFlipped] = useState(false)
    const [showBackContent, setShowBackContent] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [selectedAnswer, setSelectedAnswerState] = useState(null)
    const [typedAnswer, setTypedAnswer] = useState('')
    const selectedAnswerRef = useRef(null)
    const [isFlipping, setIsFlipping] = useState(false)
    const cardRef = useRef(null)
    const cardContainerRef = useRef(null)
    const startPos = useRef({ x: 0, y: 0 })
    const hasDragged = useRef(false)
    const prevMove = useRef({ x: 0, y: 0, t: 0 })
    const lastMove = useRef({ x: 0, y: 0, t: 0 })
    const rafRef = useRef(null)
    const dragFrameRef = useRef(null)
    const pendingDragOffsetRef = useRef(null)
    const dragOffsetRef = useRef({ x: 0, y: 0 })

    const setSelectedAnswer = (answer) => {
        if (selectedAnswerRef.current === answer) return
        selectedAnswerRef.current = answer
        setSelectedAnswerState(answer)
    }

    const getAnswerFromOffset = (offset) => {
        if (offset.x < -20 && offset.y < -20) return 0
        if (offset.x < -20 && offset.y > 20) return 1
        if (offset.x > 20 && offset.y > 20) return 2
        if (offset.x > 20 && offset.y < -20) return 3
        return null
    }

    const applyDragOffset = (offset) => {
        const container = cardContainerRef.current
        if (!container) return
        container.style.setProperty('--drag-x', `${offset.x}px`)
        container.style.setProperty('--drag-y', `${offset.y}px`)
        container.style.setProperty('--drag-rotation', `${offset.x * 0.1}deg`)
    }

    const updateDragOffset = (offset) => {
        if (dragFrameRef.current !== null) {
            cancelAnimationFrame(dragFrameRef.current)
            dragFrameRef.current = null
        }
        pendingDragOffsetRef.current = null
        dragOffsetRef.current = { x: offset.x, y: offset.y }
        applyDragOffset(offset)
    }

    const scheduleDragOffset = (offset) => {
        const nextOffset = { x: offset.x, y: offset.y }
        dragOffsetRef.current = nextOffset
        pendingDragOffsetRef.current = nextOffset
        if (dragFrameRef.current !== null) return

        dragFrameRef.current = requestAnimationFrame(() => {
            dragFrameRef.current = null
            if (pendingDragOffsetRef.current) {
                const nextOffset = pendingDragOffsetRef.current
                pendingDragOffsetRef.current = null
                applyDragOffset(nextOffset)
                const nextAnswer = getAnswerFromOffset(nextOffset)
                if (nextAnswer !== null) setSelectedAnswer(nextAnswer)
            }
        })
    }

    const animateTo = (target, duration = 30, cb) => {
        const start = performance.now()
        const from = { x: dragOffsetRef.current.x, y: dragOffsetRef.current.y }
        const dx = target.x - from.x
        const dy = target.y - from.y

        const step = (t) => {
            const now = performance.now()
            const p = Math.min(1, (now - start) / duration)
            // easeOutQuart for snappier feel
            const ease = 1 - Math.pow(1 - p, 4)
            const nx = from.x + dx * ease
            const ny = from.y + dy * ease
            updateDragOffset({ x: nx, y: ny })
            if (p < 1) {
                rafRef.current = requestAnimationFrame(step)
            } else {
                rafRef.current = null
                if (cb) cb()
            }
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(step)
    }

    // Initialize speech hook
    const {
        speakText,
        stopSpeech,
        isSupported: isSpeechSupported,
        detectLanguage,
        extractImageUrl,
        cleanTextFromImages,
        cleanTextForSpeech
    } = useSpeech()

    // Prefer dedicated image fields, with embedded URLs retained for older cards.
    const frontImageUrl = card.frontImageUrl || extractImageUrl(card.front)
    const backImageUrl = card.backImageUrl || card.imageUrl || extractImageUrl(card.back)
    // Clean text removes ALL URLs, not just images, for clean display during study
    const frontText = cleanTextFromImages(card.front)
    const backText = cleanTextFromImages(card.back)

    const difficultyOptions = [
        { id: 0, label: 'Again', color: '#9ca3af', icon: <FaTimes /> },
        { id: 1, label: 'Hard', color: '#fb923c', icon: <FaFrown /> },
        { id: 2, label: 'Good', color: '#3b82f6', icon: <FaCheck /> },
        { id: 3, label: 'Easy', color: '#22c55e', icon: <FaRocket /> }
    ]

    const handleCardClick = (e) => {
        // Prevent click if user has dragged or already flipping
        if (hasDragged.current || isFlipping) {
            hasDragged.current = false
            return
        }

        e.preventDefault()

        // Ensure dragging state is cleared before flip
        if (isDragging) {
            setIsDragging(false)
        }

        if (studyOptions?.typeToAnswer && !isFlipped) {
            const answer = window.prompt('Type your answer:')
            if (answer === null || !answer.trim()) return
            setTypedAnswer(answer.trim())
        }

        const nextIsFlipped = !isFlipped
        setIsFlipping(true)
        setIsFlipped(nextIsFlipped)
        setShowBackContent(nextIsFlipped)

        setTimeout(() => setIsFlipping(false), FLIP_DURATION_MS)
    }

    // Cleanup speech when card changes
    useEffect(() => {
        return () => {
            stopSpeech()
        }
    }, [card.id])

    // Auto-read functionality
    useEffect(() => {
        if (!studyOptions?.autoRead || !isSpeechSupported) return

        // Stop any ongoing speech first
        stopSpeech()

        // Wait a moment for any animations to settle
        const timer = setTimeout(() => {
            const textToSpeak = isFlipped ? cleanTextForSpeech(card.back) : cleanTextForSpeech(card.front)

            if (textToSpeak && textToSpeak.trim()) {
                try {
                    const language = detectLanguage(textToSpeak)
                    speakText(textToSpeak, {
                        language,
                        rate: 0.9,
                        pitch: 1,
                        volume: 0.8
                    }).catch(error => {
                        console.error('Auto-read failed:', error)
                    })
                } catch (error) {
                    console.error('Auto-read setup failed:', error)
                }
            }
        }, 300) // Small delay to let flip animation settle

        return () => {
            clearTimeout(timer)
        }
    }, [isFlipped, card, studyOptions?.autoRead, isSpeechSupported, stopSpeech, cleanTextForSpeech, detectLanguage, speakText])

    const handleTouchCancel = (e) => {
        // Reset dragging state if touch is cancelled
        setIsDragging(false)
        setSelectedAnswer(null)
        updateDragOffset({ x: 0, y: 0 })
        hasDragged.current = false
    }

    const handleTouchEnd = (e) => {
        const answerAtRelease = getAnswerFromOffset(dragOffsetRef.current)
        const lastSelectedAnswer = answerAtRelease ?? selectedAnswerRef.current
        if (dragFrameRef.current !== null) {
            cancelAnimationFrame(dragFrameRef.current)
            dragFrameRef.current = null
        }
        pendingDragOffsetRef.current = null
        applyDragOffset(dragOffsetRef.current)

        // Stop dragging state first
        setIsDragging(false)
        setSelectedAnswer(null)

        // If card is not flipped, flip is handled by click event
        if (!isFlipped) {
            updateDragOffset({ x: 0, y: 0 })
            return
        }

        // If card was dragged, determine which quadrant (if any) and submit
        if (hasDragged.current) {
            // Compute velocity from last two recorded moves
            const dt = Math.max(1, lastMove.current.t - prevMove.current.t)
            const vx = (lastMove.current.x - prevMove.current.x) / dt // px per ms
            const vy = (lastMove.current.y - prevMove.current.y) / dt
            const speed = Math.sqrt(vx * vx + vy * vy)

            // Reduced threshold for faster flick detection
            const flingSpeedThreshold = 0.3 // px per ms (~300 px/s)
            let finalAnswer = answerAtRelease ?? lastSelectedAnswer

            if (speed > flingSpeedThreshold) {
                // Determine quadrant from velocity vector
                if (vx < -0.1 && vy < -0.1) finalAnswer = 0
                else if (vx < -0.1 && vy > 0.1) finalAnswer = 1
                else if (vx > 0.1 && vy > 0.1) finalAnswer = 2
                else if (vx > 0.1 && vy < -0.1) finalAnswer = 3
            }

            if (finalAnswer === null) {
                finalAnswer = lastSelectedAnswer
            }

            if (finalAnswer !== null) {
                // Animate card off-screen faster in the selected direction
                const rect = cardRef.current?.getBoundingClientRect()
                const offX = rect ? (Math.sign(dragOffsetRef.current.x || vx) * (rect.width * 1.6)) : (finalAnswer % 2 === 0 ? -800 : 800)
                const offY = rect ? (Math.sign(dragOffsetRef.current.y || vy) * (rect.height * 1.6)) : (finalAnswer < 2 ? -800 : 800)

                animateTo({ x: offX, y: offY }, 120, () => {
                    try {
                        onReview(finalAnswer)
                    } catch (err) {
                        console.error('Card review failed:', err)
                    }
                    // Reset offset immediately after submitting to prepare next card
                    updateDragOffset({ x: 0, y: 0 })
                })
            } else {
                // No answer selected, animate back to center faster
                animateTo({ x: 0, y: 0 }, 100)
            }
        }
        // If no dragging occurred, flip is handled by click event
    }

    const handleMouseEnd = () => {
        // Reuse the same end logic as touch
        handleTouchEnd()
    }

    const handleMouseStart = (e) => {
        // Only allow mouse interactions when card is flipped
        if (!isFlipped) return
        startPos.current = { x: e.clientX, y: e.clientY }
        hasDragged.current = false
        setIsDragging(true)
    }

    const handleMouseMove = (e) => {
        if (!isDragging || !isFlipped) return
        const deltaX = e.clientX - startPos.current.x
        const deltaY = e.clientY - startPos.current.y
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        if (distance > 5) {
            hasDragged.current = true
        }

        scheduleDragOffset({ x: deltaX, y: deltaY })
    }

    // Pointer event handlers unify mouse/touch and improve reliability with pointer capture
    const handlePointerDown = (e) => {
        try {
            e.currentTarget.setPointerCapture?.(e.pointerId)
        } catch (err) { }

        if (e.pointerType === 'touch') {
            startPos.current = { x: e.clientX, y: e.clientY }
            hasDragged.current = false
            const now = performance.now()
            prevMove.current = { x: e.clientX, y: e.clientY, t: now }
            lastMove.current = { x: e.clientX, y: e.clientY, t: now }
            if (isFlipped) setIsDragging(true)
            if (e.cancelable) e.preventDefault()
        } else {
            const now = performance.now()
            prevMove.current = { x: e.clientX, y: e.clientY, t: now }
            lastMove.current = { x: e.clientX, y: e.clientY, t: now }
            handleMouseStart(e)
        }
    }

    const handlePointerMove = (e) => {
        if (e.pointerType === 'touch') {
            if (!isFlipped) return
            const deltaX = e.clientX - startPos.current.x
            const deltaY = e.clientY - startPos.current.y
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
            const now = performance.now()
            prevMove.current = lastMove.current
            lastMove.current = { x: e.clientX, y: e.clientY, t: now }

            if (distance > 5) {
                hasDragged.current = true
                if (!isDragging) setIsDragging(true)
            }

            if (isDragging) {
                if (e.cancelable) e.preventDefault()
                scheduleDragOffset({ x: deltaX, y: deltaY })
            }
        } else {
            const now = performance.now()
            prevMove.current = lastMove.current
            lastMove.current = { x: e.clientX, y: e.clientY, t: now }
            handleMouseMove(e)
        }
    }

    const handlePointerUp = (e) => {
        try {
            e.currentTarget.releasePointerCapture?.(e.pointerId)
        } catch (err) { }

        if (e.pointerType === 'touch') {
            handleTouchEnd()
        } else {
            handleMouseEnd()
        }
    }

    const handlePointerCancel = (e) => {
        // Mirror touch cancel behavior
        handleTouchCancel(e)
    }

    // Reset card state when card changes
    useEffect(() => {
        setIsFlipped(false)
        setShowBackContent(false)
        setTypedAnswer('')
        if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
        pendingDragOffsetRef.current = null
        dragOffsetRef.current = { x: 0, y: 0 }
        applyDragOffset({ x: 0, y: 0 })
        setIsDragging(false)
        setSelectedAnswer(null)
        setIsFlipping(false)
        hasDragged.current = false
        stopSpeech() // Stop any ongoing speech
    }, [card.id]);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            stopSpeech()
        }
    }, [])

    // Cancel any running RAF on unmount or when card changes
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
            if (dragFrameRef.current !== null) {
                cancelAnimationFrame(dragFrameRef.current)
                dragFrameRef.current = null
            }
        }
    }, [card.id])

    // Notify parent of drag state changes
    useEffect(() => {
        if (onDragStateChange) {
            onDragStateChange({
                isFlipped,
                isDragging,
                dragOffset: dragOffsetRef.current,
                selectedAnswer
            })
        }
    }, [isFlipped, isDragging, selectedAnswer, onDragStateChange]);

    const getMemoryMeta = () => {
        const strength = typeof card?.memoryStrength === 'number'
            ? Math.max(0, Math.min(100, card.memoryStrength))
            : typeof card?.difficulty === 'number'
                ? Math.max(0, Math.min(100, card.difficulty))
                : 0

        const lastResultLabel = card?.lastResult === 0
            ? 'Again'
            : card?.lastResult === 1
                ? 'Hard'
                : card?.lastResult === 2
                    ? 'Good'
                    : card?.lastResult === 3
                        ? 'Easy'
                        : 'Unrated'

        let label = 'Fresh'
        let badgeClass = 'bg-slate-100 text-slate-700'
        let accentClass = 'bg-slate-400'

        if (strength >= 80) {
            label = 'Strong'
            badgeClass = 'bg-emerald-100 text-emerald-700'
            accentClass = 'bg-emerald-500'
        } else if (strength >= 55) {
            label = 'Steady'
            badgeClass = 'bg-blue-100 text-blue-700'
            accentClass = 'bg-blue-500'
        } else if (strength >= 25) {
            label = 'Shaky'
            badgeClass = 'bg-amber-100 text-amber-700'
            accentClass = 'bg-amber-500'
        }

        return {
            strength,
            label,
            badgeClass,
            accentClass,
            lastResultLabel,
            reviews: card?.reviewCount || 0,
            streak: card?.correctStreak || 0
        }
    }

    const memoryMeta = getMemoryMeta()

    return {
        isFlipped,
        showBackContent,
        isDragging,
        selectedAnswer,
        isFlipping,
        cardRef,
        cardContainerRef,
        frontImageUrl,
        backImageUrl,
        frontText,
        backText,
        typedAnswer,
        setTypedAnswer,
        difficultyOptions,
        handleCardClick,
        handleTouchEnd,
        handleTouchCancel,
        handleMouseStart,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
        memoryMeta
    }
}

export function FlashCard({ card, onReview, onDragStateChange, studyOptions = {}, appearance = {} }) {
    const {
        isFlipped,
        showBackContent,
        isDragging,
        selectedAnswer,
        isFlipping,
        cardRef,
        cardContainerRef,
        frontImageUrl,
        backImageUrl,
        frontText,
        backText,
        typedAnswer,
        difficultyOptions,
        memoryMeta,
        handleCardClick,
        handleTouchEnd,
        handleTouchCancel,
        handleMouseStart,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel
    } = useFlashCard(card, onReview, onDragStateChange, studyOptions)

    const textSizes = { extraSmall: '0.875rem', small: '1.125rem', medium: '1.5rem', large: '1.875rem', extraLarge: '2.25rem' }
    const cardColor = appearance.color || '#ffffff'
    const cardTextColor = '#111827'
    const horizontalAlignment = { left: 'flex-start', center: 'center', right: 'flex-end' }
    const verticalAlignment = { top: 'flex-start', center: 'center', bottom: 'flex-end' }
    const isHorizontalImage = appearance.imagePosition === 'left' || appearance.imagePosition === 'right'
    const getContentLayoutStyle = (hasImage) => ({
        display: 'flex',
        flexDirection: hasImage && isHorizontalImage ? 'row' : 'column',
        justifyContent: isHorizontalImage ? horizontalAlignment[appearance.textAlign] || 'center' : verticalAlignment[appearance.textVertical] || 'center',
        alignItems: isHorizontalImage ? verticalAlignment[appearance.textVertical] || 'center' : horizontalAlignment[appearance.textAlign] || 'center',
        textAlign: appearance.textAlign || 'center',
        minWidth: 0,
        minHeight: 0,
        gap: hasImage ? '0.75rem' : 0
    })
    const getImageStyle = (hasText) => ({
        width: isHorizontalImage && hasText ? '65%' : '100%',
        height: '100%',
        order: appearance.imagePosition === 'bottom' || appearance.imagePosition === 'right' ? 1 : 0,
        flex: hasText ? (isHorizontalImage ? '1 1 65%' : '1 1 0%') : '1 1 100%',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    })
    const getTextStyle = (hasImage) => ({
        fontSize: textSizes[appearance.textSize] || textSizes.medium,
        textAlign: appearance.textAlign || 'center',
        order: appearance.imagePosition === 'bottom' || appearance.imagePosition === 'right' ? 0 : 1,
        flex: hasImage && isHorizontalImage ? '0 1 35%' : '0 1 auto',
        maxWidth: hasImage && isHorizontalImage ? '35%' : '100%',
        minWidth: 0,
        minHeight: 0,
        color: cardTextColor
    })
    const cardFaceStyle = {
        backgroundColor: '#ffffff',
        color: cardTextColor,
        borderColor: cardColor
    }
    const typedAnswerMatches = typedAnswer.trim().replace(/\s+/g, ' ').toLocaleLowerCase() ===
        backText.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
    const showAnswerComparison = Boolean(studyOptions?.typeToAnswer && typedAnswer.trim())
    const answerComparison = useMemo(
        () => getCharacterComparison(typedAnswer, backText),
        [typedAnswer, backText]
    )
    const renderComparedCharacters = (characters, mismatchClass) => characters.map(({ character, mismatch }, index) => (
        <span key={index} className={mismatch ? mismatchClass : undefined}>{character}</span>
    ))

    // Custom styles for FlashCard
    const customStyles = {
        // Ensure the card sits above the quadrant backgrounds
        flashcardContainer: 'relative w-full h-full touch-none select-none transition-none z-30',
        flashcard: 'relative w-full h-full cursor-pointer transform-gpu transition-all duration-200 ease-out',
        dragging: 'transition-none',
        cardInner: 'relative w-full h-full transition-transform duration-[250ms] ease-in-out transform-3d will-change-transform',
        // Give front and back clear background color and a visible solid border
        // Use opaque white for card faces so the backface doesn't show through during 3D flips
        cardFront: 'absolute inset-0 w-full h-full backface-hidden bg-white backdrop-blur-md border-[8px] border-solid rounded-2xl overflow-hidden',
        cardBack: 'absolute inset-0 w-full h-full backface-hidden bg-white backdrop-blur-md border-[8px] border-solid rounded-2xl overflow-hidden transform-rotateY-180',
        // Blur the background image beneath the card content.
        cardBackground: 'absolute inset-0 bg-center bg-cover filter blur-sm',
        cardGradientOverlay: 'absolute inset-0 pointer-events-none bg-gradient-to-br from-black/40 via-black/10 to-black/30 ',
        cardContent: 'relative z-10 min-h-0 h-full flex flex-col items-center justify-center text-center transition-all duration-200',
        // Image wrapper expands into available card space while preserving the image ratio.
        cardImage: 'min-h-0 min-w-0 max-w-full max-h-full rounded-xl overflow-hidden',
        // Actual img element styling
        cardImageImg: 'w-full h-full object-contain block',
        // Use standard break-words utility for reliable wrapping
        cardText: 'text-lg sm:text-xl md:text-2xl font-medium text-gray-900 leading-relaxed break-words max-w-full',
        bothSidesContainer: 'w-full h-full flex flex-col',
        sideSection: 'min-h-0 flex-1 flex flex-col items-center justify-center',
        sideLabel: 'text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide',
        sideDivider: 'w-full h-px bg-gray-300 my-4',
        swipeIndicator: 'absolute inset-0 rounded-2xl border-[8px] border-solid flex flex-col items-center justify-center text-white font-semibold pointer-events-none z-10',
        indicatorEmoji: 'text-3xl mb-2',
        indicatorLabel: 'text-lg uppercase tracking-wider'
    }

    const baseStyles = useStyle()
    const styles = { ...baseStyles, flashcard: { ...baseStyles.flashcard, ...customStyles } }

    const memoryBarStyle = {
        width: `${Math.max(6, memoryMeta.strength)}%`,
    }

    return (
        <div
            ref={cardContainerRef}
            className={`${styles.flashcard.flashcardContainer} ${isDragging ? 'will-change-transform' : ''}`}
            style={{
                transform: 'translate(var(--drag-x, 0px), var(--drag-y, 0px)) rotate(var(--drag-rotation, 0deg))',
                opacity: isDragging ? 0.8 : 1,
                touchAction: 'none' /* prevent browser pull-to-refresh / scroll while interacting with card */
            }}
            onClick={handleCardClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
        >
            <div
                ref={cardRef}
                className={`${styles.flashcard.flashcard} ${isDragging ? styles.flashcard.dragging : ''}`}
                style={{ perspective: '1000px' }}
            >
                <div
                    className={styles.flashcard.cardInner}
                    style={{
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                >
                    <div className={`${styles.flashcard.cardFront} study-card-surface`} style={cardFaceStyle}>
                        {frontImageUrl && (
                            <>
                                <div
                                    className={styles.flashcard.cardBackground}
                                    style={{
                                        backgroundImage: `url(${frontImageUrl})`
                                    }}
                                ></div>
                                <div className={styles.flashcard.cardGradientOverlay}></div>
                            </>
                        )}
                        <div
                            className={`${styles.flashcard.cardContent} ${frontImageUrl ? 'p-2 sm:p-3' : 'p-4 sm:p-6'}`}
                            style={getContentLayoutStyle(false)}
                        >
                            <div className="flex min-h-0 w-full flex-1" style={getContentLayoutStyle(Boolean(frontImageUrl))}>
                                {frontImageUrl && (
                                    <div className={styles.flashcard.cardImage} style={getImageStyle(Boolean(frontText?.trim()))}>
                                        <img
                                            src={frontImageUrl}
                                            alt="Card visual"
                                            loading="eager"
                                            fetchPriority="high"
                                            decoding="async"
                                            draggable={false}
                                            onDragStart={(e) => e.preventDefault()}
                                            className={styles.flashcard.cardImageImg}
                                            style={{ width: '100%', height: '100%', objectFit: appearance.imageFit === 'fill' ? 'cover' : 'contain' }}
                                        />
                                    </div>
                                )}
                                {frontText && frontText.trim() ? (
                                    <div className={styles.flashcard.cardText} style={getTextStyle(Boolean(frontImageUrl))}>{frontText}</div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    <div className={`${styles.flashcard.cardBack} study-card-surface`} style={cardFaceStyle}>
                        {showBackContent && backImageUrl && (
                            <>
                                <div
                                    className={styles.flashcard.cardBackground}
                                    style={{
                                        backgroundImage: `url(${backImageUrl})`
                                    }}
                                ></div>
                                <div className={styles.flashcard.cardGradientOverlay}></div>
                            </>
                        )}
                        <div
                            className={`${styles.flashcard.cardContent} ${backImageUrl ? 'p-2 sm:p-3' : 'p-4 sm:p-6'}`}
                            style={{
                                opacity: showBackContent ? 1 : 0,
                                visibility: showBackContent ? 'visible' : 'hidden'
                            }}
                        >
                            {showBackContent && (
                                <>
                                    <div className="mb-2 flex w-full min-w-0 items-center gap-2 whitespace-nowrap">
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${memoryMeta.badgeClass}`}>
                                            {memoryMeta.label} · {memoryMeta.strength}%
                                        </span>
                                        <div className="h-1.5 min-w-6 flex-1 overflow-hidden rounded-full bg-slate-200">
                                            <div
                                                className={`h-full rounded-full ${memoryMeta.accentClass}`}
                                                style={memoryBarStyle}
                                            />
                                        </div>
                                        <span className="min-w-0 truncate text-[10px] text-gray-500">
                                            Recent: {memoryMeta.lastResultLabel}
                                        </span>
                                        <span className="shrink-0 text-[10px] text-gray-500">{memoryMeta.reviews} reviews</span>
                                    </div>
                                    <div className="flex min-h-0 w-full flex-1" style={getContentLayoutStyle(Boolean(backImageUrl) && !studyOptions?.showBothSides && !showAnswerComparison)}>
                                    {showAnswerComparison ? (
                                        <div className={styles.flashcard.bothSidesContainer}>
                                            <div className={styles.flashcard.sideSection}>
                                                <div className="mb-2 flex w-full items-center justify-between gap-2">
                                                    <div className={styles.flashcard.sideLabel}>Your answer:</div>
                                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typedAnswerMatches ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {typedAnswerMatches ? 'Correct' : 'Incorrect'}
                                                    </span>
                                                </div>
                                                <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto">
                                                    <div className={`${styles.flashcard.cardText} w-full`} style={{ ...getTextStyle(false), whiteSpace: 'pre-wrap' }}>
                                                        {renderComparedCharacters(answerComparison.entered, 'rounded-sm bg-red-100 px-0.5 font-semibold text-red-700')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={styles.flashcard.sideDivider}></div>
                                            <div className={styles.flashcard.sideSection}>
                                                <div className={styles.flashcard.sideLabel}>Card answer:</div>
                                                <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto">
                                                    <div className={`${styles.flashcard.cardText} w-full`} style={{ ...getTextStyle(false), whiteSpace: 'pre-wrap' }}>
                                                        {renderComparedCharacters(answerComparison.expected, 'rounded-sm bg-emerald-100 px-0.5 font-semibold text-emerald-700')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : studyOptions?.showBothSides ? (
                                        // Show both sides when option is enabled
                                        <div className={styles.flashcard.bothSidesContainer}>
                                            <div className={styles.flashcard.sideSection}>
                                                <div className={styles.flashcard.sideLabel}>Front:</div>
                                                <div className="flex min-h-0 w-full flex-1 items-center gap-2" style={getContentLayoutStyle(Boolean(frontImageUrl))}>
                                                {frontImageUrl && (
                                                    <div className={styles.flashcard.cardImage} style={getImageStyle(Boolean(frontText?.trim()))}>
                                                        <img
                                                            src={frontImageUrl}
                                                            alt="Front visual"
                                                            loading="eager"
                                                            fetchPriority="high"
                                                            decoding="async"
                                                            draggable={false}
                                                            onDragStart={(e) => e.preventDefault()}
                                                            className={styles.flashcard.cardImageImg}
                                                            style={{ width: '100%', height: '100%', objectFit: appearance.imageFit === 'fill' ? 'cover' : 'contain' }}
                                                        />
                                                    </div>
                                                )}
                                                {frontText && frontText.trim() ? (
                                                    <div className={styles.flashcard.cardText} style={getTextStyle(Boolean(frontImageUrl))}>{frontText}</div>
                                                ) : null}
                                                </div>
                                            </div>
                                            <div className={styles.flashcard.sideDivider}></div>
                                            <div className={styles.flashcard.sideSection}>
                                                <div className={styles.flashcard.sideLabel}>
                                                    {studyOptions?.typeToAnswer && typedAnswer.trim() ? 'Card answer:' : 'Back:'}
                                                </div>
                                                <div className="flex min-h-0 w-full flex-1 items-center gap-2" style={getContentLayoutStyle(Boolean(backImageUrl))}>
                                                {backImageUrl && (
                                                    <div className={styles.flashcard.cardImage} style={getImageStyle(Boolean(backText?.trim()))}>
                                                        <img
                                                            src={backImageUrl}
                                                            alt="Back visual"
                                                            loading="eager"
                                                            fetchPriority="high"
                                                            decoding="async"
                                                            draggable={false}
                                                            onDragStart={(e) => e.preventDefault()}
                                                            className={styles.flashcard.cardImageImg}
                                                            style={{ width: '100%', height: '100%', objectFit: appearance.imageFit === 'fill' ? 'cover' : 'contain' }}
                                                        />
                                                    </div>
                                                )}
                                                {backText && backText.trim() ? (
                                                    <div className={styles.flashcard.cardText} style={getTextStyle(Boolean(backImageUrl))}>{backText}</div>
                                                ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Show only back side when option is disabled
                                        <>
                                            {backImageUrl && (
                                                <div className={styles.flashcard.cardImage} style={getImageStyle(Boolean(backText?.trim()))}>
                                                    <img
                                                        src={backImageUrl}
                                                        alt="Card visual"
                                                        loading="eager"
                                                        fetchPriority="high"
                                                        decoding="async"
                                                        draggable={false}
                                                        onDragStart={(e) => e.preventDefault()}
                                                        className={styles.flashcard.cardImageImg}
                                                        style={{ width: '100%', height: '100%', objectFit: appearance.imageFit === 'fill' ? 'cover' : 'contain' }}
                                                    />
                                                </div>
                                            )}
                                            {backText && backText.trim() ? (
                                                <div className={styles.flashcard.cardText} style={getTextStyle(Boolean(backImageUrl))}>{backText}</div>
                                            ) : null}
                                </>
                            )}
                            </div>
                            </>
                            )}
                        </div>
                    </div>
                </div>

                {difficultyOptions.map((option) => (
                    <div
                        key={option.id}
                        className={`${styles.flashcard.swipeIndicator} ${isDragging && selectedAnswer === option.id ? 'visible' : 'invisible'}`}
                        style={{
                            background: `linear-gradient(135deg, ${option.color}33, ${option.color}66)`,
                            borderColor: option.color
                        }}
                    >
                        <span className={styles.flashcard.indicatorEmoji}>{option.icon}</span>
                        <span className={styles.flashcard.indicatorLabel}>{option.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
