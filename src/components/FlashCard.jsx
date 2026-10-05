import { useStyle, useSpeech } from '../utils'
import { useState, useRef, useEffect } from 'react'
import { FaTimes, FaFrown, FaCheck, FaRocket } from 'react-icons/fa'

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

    // Fetch and decode both sides while the current card is being reviewed.
    useEffect(() => {
        const imageUrls = new Set([frontImageUrl, backImageUrl].filter(Boolean))
        imageUrls.forEach((url) => {
            const image = new Image()
            image.decoding = 'async'
            image.fetchPriority = 'high'
            image.src = url
            image.decode?.().catch(() => {})
        })
    }, [frontImageUrl, backImageUrl])

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

        const nextIsFlipped = !isFlipped
        setIsFlipping(true)
        setIsFlipped(nextIsFlipped)
        setShowBackContent(nextIsFlipped)

        setTimeout(() => setIsFlipping(false), 200)
    }

    const handleTypeAnswerSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!typedAnswer.trim() || isFlipping) return

        setIsFlipping(true)
        setIsFlipped(true)
        setShowBackContent(true)
        setTimeout(() => setIsFlipping(false), 200)
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
        handleTypeAnswerSubmit,
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
        setTypedAnswer,
        handleTypeAnswerSubmit,
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

    // Custom styles for FlashCard
    const customStyles = {
        // Ensure the card sits above the quadrant backgrounds
        flashcardContainer: 'relative w-full h-full touch-none select-none transition-none z-30',
        flashcard: 'relative w-full h-full cursor-pointer transform-gpu transition-all duration-200 ease-out',
        dragging: 'transition-none',
        // Use the utility name defined in index.css for 3D transform support
        cardInner: 'relative w-full h-full transition-transform duration-200 ease-out transform-3d',
        // Give front and back clear background color and a visible solid border
        // Use opaque white for card faces so the backface doesn't show through during 3D flips
        cardFront: 'absolute inset-0 w-full h-full backface-hidden bg-white backdrop-blur-md border-[8px] border-solid rounded-2xl shadow-lg overflow-hidden',
        cardBack: 'absolute inset-0 w-full h-full backface-hidden bg-white backdrop-blur-md border-[8px] border-solid rounded-2xl shadow-lg overflow-hidden transform-rotateY-180',
        // stronger blur and rounded corners so background image softly diffuses behind the card
        cardBackground: 'absolute inset-0 bg-center bg-cover filter blur-sm rounded-2xl',
        // Richer gradient overlay to add depth and a subtle vignette without blocking interactions
        cardGradientOverlay: 'absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-br from-black/40 via-black/10 to-black/30 ',
        cardContent: 'relative z-10 min-h-0 p-4 sm:p-6 h-full flex flex-col items-center justify-center text-center transition-all duration-200',
        // Image wrapper expands into available card space while preserving the image ratio.
        cardImage: 'min-h-0 min-w-0 max-w-full max-h-full rounded-xl overflow-hidden shadow-2xl',
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
                            className={styles.flashcard.cardContent}
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
                            {studyOptions?.typeToAnswer && (
                                <form
                                    className="z-20 w-full shrink-0 px-2 py-1"
                                    onSubmit={handleTypeAnswerSubmit}
                                    onPointerDown={event => event.stopPropagation()}
                                    onPointerMove={event => event.stopPropagation()}
                                    onPointerUp={event => event.stopPropagation()}
                                    onPointerCancel={event => event.stopPropagation()}
                                    onClick={event => event.stopPropagation()}
                                >
                                    <input
                                        id={`typed-answer-${card.id}`}
                                        type="text"
                                        value={typedAnswer}
                                        onChange={event => setTypedAnswer(event.target.value)}
                                        placeholder="Type your answer..."
                                        aria-label="Type your answer"
                                        autoComplete="off"
                                        required
                                        className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-center text-base placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-0"
                                        style={{ color: cardTextColor }}
                                    />
                                </form>
                            )}
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
                        <div className={styles.flashcard.cardContent} style={{
                            opacity: showBackContent ? 1 : 0,
                            visibility: showBackContent ? 'visible' : 'hidden'
                        }}>
                            {showBackContent && (
                                <>
                                    <div className="w-full flex items-center justify-between gap-2 mb-3">
                                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${memoryMeta.badgeClass}`}>
                                            {memoryMeta.label}
                                        </span>
                                        <span className="text-[10px] font-medium text-gray-500">
                                            {memoryMeta.strength}% memory
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                                        <div
                                            className={`h-full rounded-full ${memoryMeta.badgeClass.includes('emerald') ? 'bg-emerald-500' : memoryMeta.badgeClass.includes('blue') ? 'bg-blue-500' : memoryMeta.badgeClass.includes('amber') ? 'bg-amber-500' : 'bg-slate-400'}`}
                                            style={memoryBarStyle}
                                        />
                                    </div>
                                    <div className="w-full flex items-center justify-between text-[10px] text-gray-500 mb-3">
                                        <span>Recent: {memoryMeta.lastResultLabel}</span>
                                        <span>{memoryMeta.reviews} reviews</span>
                                    </div>
                                    {studyOptions?.typeToAnswer && typedAnswer.trim() && (
                                        <div className="mb-2 flex max-h-16 w-full shrink-0 items-start justify-between gap-2 overflow-y-auto rounded-lg bg-blue-50 px-3 py-2 text-left text-xs text-gray-700">
                                            <div className="min-w-0">
                                                <span className="font-semibold">Your answer</span>
                                                <p className="break-words">{typedAnswer}</p>
                                            </div>
                                            {backText.trim() && (
                                                <span className={`shrink-0 rounded-full px-2 py-1 font-semibold ${typedAnswerMatches ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {typedAnswerMatches ? 'Exact match' : 'Review below'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {studyOptions?.typeToAnswer && typedAnswer.trim() && !studyOptions?.showBothSides && (
                                        <div className="mb-1 w-full shrink-0 text-left text-[10px] font-semibold uppercase text-gray-500">
                                            Card answer
                                        </div>
                                    )}
                                    <div className="flex min-h-0 w-full flex-1" style={getContentLayoutStyle(Boolean(backImageUrl) && !studyOptions?.showBothSides)}>
                                    {studyOptions?.showBothSides ? (
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


