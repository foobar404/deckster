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
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [isFlipping, setIsFlipping] = useState(false)
    const cardRef = useRef(null)
    const startPos = useRef({ x: 0, y: 0 })
    const hasDragged = useRef(false)
    const prevMove = useRef({ x: 0, y: 0, t: 0 })
    const lastMove = useRef({ x: 0, y: 0, t: 0 })
    const rafRef = useRef(null)
    const dragOffsetRef = useRef({ x: 0, y: 0 })

    const updateDragOffset = (offset) => {
        dragOffsetRef.current = { x: offset.x, y: offset.y }
        setDragOffset({ x: offset.x, y: offset.y })
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

    // Extract image URLs and clean text for both sides - URLs are stripped from display text
    const frontImageUrl = extractImageUrl(card.front)
    const backImageUrl = extractImageUrl(card.back)
    // Clean text removes ALL URLs, not just images, for clean display during study
    const frontText = cleanTextFromImages(card.front)
    const backText = cleanTextFromImages(card.back)

    // Preload images to prevent flicker during flip
    useEffect(() => {
        const preloadImages = () => {
            if (frontImageUrl) {
                const frontImg = new Image()
                frontImg.src = frontImageUrl
            }
            if (backImageUrl) {
                const backImg = new Image()
                backImg.src = backImageUrl
            }
        }

        preloadImages()
    }, [frontImageUrl, backImageUrl])

    const difficultyOptions = [
        { id: 0, label: 'Again', color: '#ef4444', icon: <FaTimes /> },
        { id: 1, label: 'Hard', color: '#f59e0b', icon: <FaFrown /> },
        { id: 2, label: 'Good', color: '#10b981', icon: <FaCheck /> },
        { id: 3, label: 'Easy', color: '#6366f1', icon: <FaRocket /> }
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

        // Add flipping state for smoother animation
        setIsFlipping(true)

        // Start flip animation quickly
        setTimeout(() => {
            setIsFlipped(!isFlipped)

            // Clear flipping state after a shorter animation period
            setTimeout(() => {
                setIsFlipping(false)
            }, 180)
        }, 8)
    }

    // Handle delayed back content visibility for smooth animations
    useEffect(() => {
        if (isFlipped) {
            // Show back content after flip animation reaches halfway point (shorter delay for snappy feel)
            const timer = setTimeout(() => {
                setShowBackContent(true)
            }, 90)
            return () => clearTimeout(timer)
        } else {
            // Hide back content immediately when flipping to front
            setShowBackContent(false)
        }
    }, [isFlipped])

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

    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        startPos.current = { x: touch.clientX, y: touch.clientY }
        hasDragged.current = false

        // Enable dragging when card is flipped (showing answer)
        if (isFlipped) {
            setIsDragging(true)
        }
        // Prevent page gestures while interacting with the card
        if (e.cancelable) e.preventDefault()
        const now = performance.now()
        prevMove.current = { x: startPos.current.x, y: startPos.current.y, t: now }
        lastMove.current = { x: startPos.current.x, y: startPos.current.y, t: now }
    }

    const handleTouchMove = (e) => {
        const touch = e.touches[0]
        const deltaX = touch.clientX - startPos.current.x
        const deltaY = touch.clientY - startPos.current.y
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        // Only allow dragging when card is flipped
        if (!isFlipped) {
            return
        }

        // Start dragging if moved more than 5px (reduced threshold for faster response)
        if (distance > 5) {
            hasDragged.current = true
            if (!isDragging) {
                setIsDragging(true)
            }
        }

        if (isDragging) {
            // preventDefault when actively dragging so browser won't interpret as scroll/pull-to-refresh
            if (e.cancelable) e.preventDefault()
            updateDragOffset({ x: deltaX, y: deltaY })
            const now = performance.now()
            prevMove.current = lastMove.current
            lastMove.current = { x: touch.clientX, y: touch.clientY, t: now }
        }
    }

    const handleTouchCancel = (e) => {
        // Reset dragging state if touch is cancelled
        setIsDragging(false)
        setDragOffset({ x: 0, y: 0 })
        hasDragged.current = false
    }

    const handleTouchEnd = (e) => {
        const currentSelectedAnswer = selectedAnswer // Capture before clearing state
        const wasDragging = isDragging

        // Determine final answer from final dragOffset if selectedAnswer wasn't set yet
        const computeAnswerFromOffset = (offset) => {
            if (!offset) return null
            const x = offset.x
            const y = offset.y
            if (x < -20 && y < -20) return 0
            if (x < -20 && y > 20) return 1
            if (x > 20 && y > 20) return 2
            if (x > 20 && y < -20) return 3
            return null
        }

        // Stop dragging state first
        setIsDragging(false)

        // If card is not flipped, flip is handled by click event
        if (!isFlipped) {
            setDragOffset({ x: 0, y: 0 })
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
            let finalAnswer = currentSelectedAnswer

            if (speed > flingSpeedThreshold) {
                // Determine quadrant from velocity vector
                if (vx < -0.1 && vy < -0.1) finalAnswer = 0
                else if (vx < -0.1 && vy > 0.1) finalAnswer = 1
                else if (vx > 0.1 && vy > 0.1) finalAnswer = 2
                else if (vx > 0.1 && vy < -0.1) finalAnswer = 3
            }

            if (finalAnswer === null) {
                finalAnswer = computeAnswerFromOffset(dragOffsetRef.current)
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
                        // swallow
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

        setDragOffset({ x: deltaX, y: deltaY })
    }

    // Pointer event handlers unify mouse/touch and improve reliability with pointer capture
    const handlePointerDown = (e) => {
        try {
            e.currentTarget.setPointerCapture?.(e.pointerId)
        } catch (err) { }

        if (e.pointerType === 'touch') {
            startPos.current = { x: e.clientX, y: e.clientY }
            hasDragged.current = false
            if (isFlipped) setIsDragging(true)
            if (e.cancelable) e.preventDefault()
        } else {
            handleMouseStart(e)
        }
    }

    const handlePointerMove = (e) => {
        if (e.pointerType === 'touch') {
            if (!isFlipped) return
            const deltaX = e.clientX - startPos.current.x
            const deltaY = e.clientY - startPos.current.y
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

            if (distance > 5) {
                hasDragged.current = true
                if (!isDragging) setIsDragging(true)
            }

            if (isDragging) {
                if (e.cancelable) e.preventDefault()
                setDragOffset({ x: deltaX, y: deltaY })
            }
        } else {
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

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseEnd)
            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseEnd)
            }
        }
    }, [isDragging, selectedAnswer]);

    // Reset card state when card changes
    useEffect(() => {
        setIsFlipped(false)
        setShowBackContent(false)
        setDragOffset({ x: 0, y: 0 })
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
        }
    }, [card.id])

    useEffect(() => {
        if (isDragging && dragOffset.x < -20 && dragOffset.y < -20) setSelectedAnswer(0);
        if (isDragging && dragOffset.x < -20 && dragOffset.y > 20) setSelectedAnswer(1);
        if (isDragging && dragOffset.x > 20 && dragOffset.y > 20) setSelectedAnswer(2);
        if (isDragging && dragOffset.x > 20 && dragOffset.y < -20) setSelectedAnswer(3);
    }, [dragOffset]);

    // Notify parent of drag state changes
    useEffect(() => {
        if (onDragStateChange) {
            onDragStateChange({
                isFlipped,
                isDragging,
                dragOffset,
                selectedAnswer
            })
        }
    }, [isFlipped, isDragging, dragOffset, selectedAnswer]); // Removed onDragStateChange from dependencies

    const getSwipeIndicator = () => {
        if (isDragging && dragOffset.x < -20 && dragOffset.y < -20)
            return { ...difficultyOptions[0], gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.4))', borderColor: 'rgba(239, 68, 68, 0.8)' };
        if (isDragging && dragOffset.x < -20 && dragOffset.y > 20)
            return { ...difficultyOptions[1], gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.4))', borderColor: 'rgba(245, 158, 11, 0.8)' };
        if (isDragging && dragOffset.x > 20 && dragOffset.y > 20)
            return { ...difficultyOptions[2], gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.4))', borderColor: 'rgba(16, 185, 129, 0.8)' };
        if (isDragging && dragOffset.x > 20 && dragOffset.y < -20)
            return { ...difficultyOptions[3], gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.4))', borderColor: 'rgba(99, 102, 241, 0.8)' };
    }

    const swipeIndicator = getSwipeIndicator()

    return {
        isFlipped,
        showBackContent,
        dragOffset,
        isDragging,
        selectedAnswer,
        isFlipping,
        cardRef,
        frontImageUrl,
        backImageUrl,
        frontText,
        backText,
        difficultyOptions,
        handleCardClick,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
        handleMouseStart,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
        swipeIndicator
    }
}

export function FlashCard({ card, onReview, onDragStateChange, studyOptions = {} }) {
    const {
        isFlipped,
        showBackContent,
        dragOffset,
        isDragging,
        selectedAnswer,
        isFlipping,
        cardRef,
        frontImageUrl,
        backImageUrl,
        frontText,
        backText,
        difficultyOptions,
        handleCardClick,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
        handleMouseStart,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
        swipeIndicator
    } = useFlashCard(card, onReview, onDragStateChange, studyOptions)

    // Custom styles for FlashCard
    const customStyles = {
        // Ensure the card sits above the quadrant backgrounds
        flashcardContainer: 'relative w-full h-full touch-none select-none transition-all duration-300 ease-out z-30',
        flashcard: 'relative w-full h-full cursor-pointer transform-gpu transition-all duration-200 ease-out',
        dragging: 'transition-none',
        // Use the utility name defined in index.css for 3D transform support
        cardInner: 'relative w-full h-full transition-transform duration-300 ease-out transform-3d',
        // Give front and back clear background color and a visible solid border
        // Use opaque white for card faces so the backface doesn't show through during 3D flips
        cardFront: 'absolute inset-0 w-full h-full backface-hidden bg-white backdrop-blur-md border-[6px] border-gray-200/60 rounded-2xl shadow-lg overflow-hidden',
        cardBack: 'absolute inset-0 w-full h-full backface-hidden bg-white backdrop-blur-md border-[6px] border-gray-200/60 rounded-2xl shadow-lg overflow-hidden transform-rotateY-180',
        // stronger blur and rounded corners so background image softly diffuses behind the card
        cardBackground: 'absolute inset-0 bg-center bg-cover filter blur-sm rounded-2xl',
        // Richer gradient overlay to add depth and a subtle vignette without blocking interactions
        cardGradientOverlay: 'absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-br from-black/40 via-black/10 to-black/30 ',
        cardContent: 'relative z-10 p-6 h-full flex flex-col items-center justify-center text-center transition-all duration-200',
        // Image wrapper: rounded with shadow to lift visuals
        cardImage: 'mb-4 max-w-full max-h-48 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl',
        // Actual img element styling
        cardImageImg: 'w-full h-auto object-contain block',
        // Use standard break-words utility for reliable wrapping
        cardText: 'text-lg sm:text-xl md:text-2xl font-medium text-gray-900 leading-relaxed break-words max-w-full',
        bothSidesContainer: 'w-full h-full flex flex-col',
        sideSection: 'flex-1 flex flex-col items-center justify-center',
        sideLabel: 'text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide',
        sideDivider: 'w-full h-px bg-gray-300 my-4',
        swipeIndicator: 'absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center text-white font-semibold transition-all duration-200 pointer-events-none z-10',
        indicatorEmoji: 'text-3xl mb-2',
        indicatorLabel: 'text-lg uppercase tracking-wider'
    }

    const baseStyles = useStyle()
    const styles = { ...baseStyles, flashcard: { ...baseStyles.flashcard, ...customStyles } }

    return (
        <div
            className={styles.flashcard.flashcardContainer}
            style={{
                transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg) ${isFlipping ? 'scale(1.02)' : 'scale(1)'}`,
                opacity: isDragging ? 0.8 : 1,
                touchAction: 'none' /* prevent browser pull-to-refresh / scroll while interacting with card */
            }}
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onMouseDown={handleMouseStart}
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
                    <div className={styles.flashcard.cardFront}>
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
                        <div className={styles.flashcard.cardContent}>
                            {frontImageUrl && (
                                <div className={styles.flashcard.cardImage}>
                                    <img
                                        src={frontImageUrl}
                                        alt="Card visual"
                                        draggable={false}
                                        onDragStart={(e) => e.preventDefault()}
                                        className={styles.flashcard.cardImageImg}
                                    />
                                </div>
                            )}
                            {frontText && frontText.trim() ? (
                                <div className={styles.flashcard.cardText}>{frontText}</div>
                            ) : null}
                        </div>
                    </div>
                    <div className={styles.flashcard.cardBack}>
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
                                studyOptions?.showBothSides ? (
                                    // Show both sides when option is enabled
                                    <div className={styles.flashcard.bothSidesContainer}>
                                        <div className={styles.flashcard.sideSection}>
                                            <div className={styles.flashcard.sideLabel}>Front:</div>
                                            {frontImageUrl && (
                                                <div className={styles.flashcard.cardImage}>
                                                    <img
                                                        src={frontImageUrl}
                                                        alt="Front visual"
                                                        draggable={false}
                                                        onDragStart={(e) => e.preventDefault()}
                                                        className={styles.flashcard.cardImageImg}
                                                    />
                                                </div>
                                            )}
                                            {frontText && frontText.trim() ? (
                                                <div className={styles.flashcard.cardText}>{frontText}</div>
                                            ) : null}
                                        </div>
                                        <div className={styles.flashcard.sideDivider}></div>
                                        <div className={styles.flashcard.sideSection}>
                                            <div className={styles.flashcard.sideLabel}>Back:</div>
                                            {backImageUrl && (
                                                <div className={styles.flashcard.cardImage}>
                                                    <img
                                                        src={backImageUrl}
                                                        alt="Back visual"
                                                        draggable={false}
                                                        onDragStart={(e) => e.preventDefault()}
                                                        className={styles.flashcard.cardImageImg}
                                                    />
                                                </div>
                                            )}
                                            {backText && backText.trim() ? (
                                                <div className={styles.flashcard.cardText}>{backText}</div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    // Show only back side when option is disabled
                                    <>
                                        {backImageUrl && (
                                            <div className={styles.flashcard.cardImage}>
                                                <img
                                                    src={backImageUrl}
                                                    alt="Card visual"
                                                    draggable={false}
                                                    onDragStart={(e) => e.preventDefault()}
                                                    className={styles.flashcard.cardImageImg}
                                                />
                                            </div>
                                        )}
                                        {backText && backText.trim() ? (
                                            <div className={styles.flashcard.cardText}>{backText}</div>
                                        ) : null}
                                    </>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {swipeIndicator && (
                    <div
                        className={styles.flashcard.swipeIndicator}
                        style={{
                            background: swipeIndicator.gradient,
                            borderColor: swipeIndicator.borderColor,
                            color: 'white'
                        }}
                    >
                        <span className={styles.flashcard.indicatorEmoji}>{swipeIndicator.icon}</span>
                        <span className={styles.flashcard.indicatorLabel}>{swipeIndicator.label}</span>
                    </div>
                )}
            </div>
        </div>
    )
}


