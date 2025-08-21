import { useState, useRef, useEffect } from 'react'
import styles from './FlashCard.module.css'
import { FaTimes, FaFrown, FaCheck, FaRocket } from 'react-icons/fa'
import { speakText, stopSpeech, isSpeechSupported, detectLanguage, extractImageUrl, cleanTextFromImages, cleanTextForSpeech } from '../utils/speechUtils'

const FlashCard = ({ card, onReview, onDragStateChange, studyOptions }) => {
    const [isFlipped, setIsFlipped] = useState(false)
    const [showBackContent, setShowBackContent] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [isFlipping, setIsFlipping] = useState(false)
    const cardRef = useRef(null)
    const startPos = useRef({ x: 0, y: 0 })
    const hasDragged = useRef(false)
    
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
        
        // Start flip animation
        setTimeout(() => {
            setIsFlipped(!isFlipped)
            
            // Clear flipping state after animation completes
            setTimeout(() => {
                setIsFlipping(false)
            }, 300) // Match CSS animation duration (0.3s)
        }, 10)
    }

    // Handle delayed back content visibility for smooth animations
    useEffect(() => {
        if (isFlipped) {
            // Show back content after flip animation reaches halfway point (150ms for faster animation)
            const timer = setTimeout(() => {
                setShowBackContent(true)
            }, 150)
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
        if (!studyOptions?.autoRead || !isSpeechSupported()) return
        
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
    }, [isFlipped, card, studyOptions?.autoRead])

    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        startPos.current = { x: touch.clientX, y: touch.clientY }
        hasDragged.current = false

        // Enable dragging when card is flipped (showing answer)
        if (isFlipped) {
            setIsDragging(true)
        }
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

        // Start dragging if moved more than 10px
        if (distance > 10) {
            hasDragged.current = true
            if (!isDragging) {
                setIsDragging(true)
            }
        }

        if (isDragging) {
            e.preventDefault()
            setDragOffset({ x: deltaX, y: deltaY })
        }
    }

    const handleTouchEnd = (e) => {
        const currentSelectedAnswer = selectedAnswer // Capture before clearing state
        const wasDragging = isDragging
        setIsDragging(false)

        // If card is not flipped, flip is handled by click event
        if (!isFlipped) {
            setDragOffset({ x: 0, y: 0 })
            return
        }

        // If card is flipped and user dragged, handle drag logic
        if (hasDragged.current) {
            // Submit the selected answer if we have one
            if (currentSelectedAnswer !== null) {
                onReview(currentSelectedAnswer)
            } else {
                // No answer selected, reset position
                setDragOffset({ x: 0, y: 0 })
            }
        }
        // If no dragging occurred, flip is handled by click event
    }

    const handleMouseEnd = () => {
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

        setDragOffset({ x: deltaX, y: deltaY })
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

    useEffect(() => {
        if (isDragging && dragOffset.x < -30 && dragOffset.y < -30) setSelectedAnswer(0);
        if (isDragging && dragOffset.x < -30 && dragOffset.y > 30) setSelectedAnswer(1);
        if (isDragging && dragOffset.x > 30 && dragOffset.y > 30) setSelectedAnswer(2);
        if (isDragging && dragOffset.x > 30 && dragOffset.y < -30) setSelectedAnswer(3);
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
        if (isDragging && dragOffset.x < -30 && dragOffset.y < -30)
            return { ...difficultyOptions[0], gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.4))', borderColor: 'rgba(239, 68, 68, 0.8)' };
        if (isDragging && dragOffset.x < -30 && dragOffset.y > 30)
            return { ...difficultyOptions[1], gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.4))', borderColor: 'rgba(245, 158, 11, 0.8)' };
        if (isDragging && dragOffset.x > 30 && dragOffset.y > 30)
            return { ...difficultyOptions[2], gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.4))', borderColor: 'rgba(16, 185, 129, 0.8)' };
        if (isDragging && dragOffset.x > 30 && dragOffset.y < -30)
            return { ...difficultyOptions[3], gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.4))', borderColor: 'rgba(99, 102, 241, 0.8)' };
    }

    const swipeIndicator = getSwipeIndicator()

    return (
        <div 
            className={styles.flashcardContainer}
            style={{
                transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg) ${isFlipping ? 'scale(1.02)' : 'scale(1)'}`,
                opacity: isDragging ? 0.8 : 1,
                touchAction: isDragging ? 'none' : 'auto'
            }}
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseStart}
        >
            <div
                ref={cardRef}
                className={`${styles.flashcard} ${isDragging ? styles.dragging : ''}`}
            >
                <div
                    className={styles.cardInner}
                    style={{
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                >
                    <div className={styles.cardFront}>
                        {frontImageUrl && (
                            <>
                                <div 
                                    className={styles.cardBackground}
                                    style={{
                                        backgroundImage: `url(${frontImageUrl})`
                                    }}
                                ></div>
                                <div className={styles.cardGradientOverlay}></div>
                            </>
                        )}
                        <div className={styles.cardContent}>
                            {frontImageUrl && (
                                <div className={styles.cardImage}>
                                    <img 
                                        src={frontImageUrl} 
                                        alt="Card visual" 
                                        draggable={false}
                                        onDragStart={(e) => e.preventDefault()}
                                    />
                                </div>
                            )}
                            {frontText && frontText.trim() ? (
                                <div className={styles.cardText}>{frontText}</div>
                            ) : null}
                        </div>
                    </div>
                    <div className={styles.cardBack}>
                        {showBackContent && backImageUrl && (
                            <>
                                <div 
                                    className={styles.cardBackground}
                                    style={{
                                        backgroundImage: `url(${backImageUrl})`
                                    }}
                                ></div>
                                <div className={styles.cardGradientOverlay}></div>
                            </>
                        )}
                        <div className={styles.cardContent} style={{
                            opacity: showBackContent ? 1 : 0,
                            visibility: showBackContent ? 'visible' : 'hidden'
                        }}>
                            {showBackContent && (
                                studyOptions?.showBothSides ? (
                                    // Show both sides when option is enabled
                                    <div className={styles.bothSidesContainer}>
                                        <div className={styles.sideSection}>
                                            <div className={styles.sideLabel}>Front:</div>
                                            {frontImageUrl && (
                                                <div className={styles.cardImage}>
                                                    <img 
                                                        src={frontImageUrl} 
                                                        alt="Front visual" 
                                                        draggable={false}
                                                        onDragStart={(e) => e.preventDefault()}
                                                    />
                                                </div>
                                            )}
                                            {frontText && frontText.trim() ? (
                                                <div className={styles.cardText}>{frontText}</div>
                                            ) : null}
                                        </div>
                                        <div className={styles.sideDivider}></div>
                                        <div className={styles.sideSection}>
                                            <div className={styles.sideLabel}>Back:</div>
                                            {backImageUrl && (
                                                <div className={styles.cardImage}>
                                                    <img 
                                                        src={backImageUrl} 
                                                        alt="Back visual" 
                                                        draggable={false}
                                                        onDragStart={(e) => e.preventDefault()}
                                                    />
                                                </div>
                                            )}
                                            {backText && backText.trim() ? (
                                                <div className={styles.cardText}>{backText}</div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    // Show only back side when option is disabled
                                    <>
                                        {backImageUrl && (
                                            <div className={styles.cardImage}>
                                                <img 
                                                    src={backImageUrl} 
                                                    alt="Card visual" 
                                                    draggable={false}
                                                    onDragStart={(e) => e.preventDefault()}
                                                />
                                            </div>
                                        )}
                                        {backText && backText.trim() ? (
                                            <div className={styles.cardText}>{backText}</div>
                                        ) : null}
                                    </>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {swipeIndicator && (
                    <div
                        className={styles.swipeIndicator}
                        style={{ 
                            background: swipeIndicator.gradient,
                            borderColor: swipeIndicator.borderColor,
                            color: 'white'
                        }}
                    >
                        <span className={styles.indicatorEmoji}>{swipeIndicator.icon}</span>
                        <span className={styles.indicatorLabel}>{swipeIndicator.label}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default FlashCard
