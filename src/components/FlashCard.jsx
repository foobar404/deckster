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
    const cardRef = useRef(null)
    const startPos = useRef({ x: 0, y: 0 })
    
    // Extract image URLs and clean text for both sides - URLs are stripped from display text
    const frontImageUrl = extractImageUrl(card.front)
    const backImageUrl = extractImageUrl(card.back)
    // Clean text removes ALL URLs, not just images, for clean display during study
    const frontText = cleanTextFromImages(card.front)
    const backText = cleanTextFromImages(card.back)
    
    const difficultyOptions = [
        { id: 0, label: 'Again', color: '#ef4444', icon: <FaTimes /> },
        { id: 1, label: 'Hard', color: '#f59e0b', icon: <FaFrown /> },
        { id: 2, label: 'Good', color: '#10b981', icon: <FaCheck /> },
        { id: 3, label: 'Easy', color: '#6366f1', icon: <FaRocket /> }
    ]

    const handleCardClick = (e) => {
        // Only flip if not dragging
        if (!isDragging) {
            e.preventDefault()
            setIsFlipped(!isFlipped)
        }
    }

    // Handle delayed back content visibility for smooth animations
    useEffect(() => {
        if (isFlipped) {
            // Show back content after flip animation starts (150ms delay)
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
        if (distance > 10 && !isDragging) {
            setIsDragging(true)
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

        // If card is not flipped, handle flip logic
        if (!isFlipped) {
            setIsFlipped(true)
            setDragOffset({ x: 0, y: 0 })
            return
        }

        // If card is flipped and no dragging occurred and no answer selected, flip back to front
        if (!wasDragging && currentSelectedAnswer === null) {
            setIsFlipped(false)
            setDragOffset({ x: 0, y: 0 })
            return
        }

        // Submit the selected answer if we have one
        if (currentSelectedAnswer !== null) {
            onReview(currentSelectedAnswer)
        } else {
            // No answer selected, reset position
            setDragOffset({ x: 0, y: 0 })
        }
    }

    const handleMouseEnd = () => {
        handleTouchEnd()
    }

    const handleMouseStart = (e) => {
        // Only allow mouse interactions when card is flipped
        if (!isFlipped) return
        startPos.current = { x: e.clientX, y: e.clientY }
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
            return difficultyOptions[0];
        if (isDragging && dragOffset.x < -30 && dragOffset.y > 30)
            return difficultyOptions[1];
        if (isDragging && dragOffset.x > 30 && dragOffset.y > 30)
            return difficultyOptions[2];
        if (isDragging && dragOffset.x > 30 && dragOffset.y < -30)
            return difficultyOptions[3];
    }

    const swipeIndicator = getSwipeIndicator()

    return (
        <div 
            className={styles.flashcardContainer}
            style={{
                transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
                opacity: isDragging ? 0.8 : 1,
                touchAction: isFlipped ? 'none' : 'auto'
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
                        transform: isFlipped ? 'rotateY(180deg)' : ''
                    }}
                >
                    <div className={styles.cardFront} style={{
                        backgroundImage: frontImageUrl ? `url(${frontImageUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}>
                        {frontImageUrl && (
                            <div className={styles.cardGradientOverlay}></div>
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
                    <div className={styles.cardBack} style={{
                        backgroundImage: backImageUrl ? `url(${backImageUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        opacity: showBackContent ? 1 : 0,
                        visibility: showBackContent ? 'visible' : 'hidden'
                    }}>
                        {showBackContent && (
                            <>
                                {backImageUrl && (
                                    <div className={styles.cardGradientOverlay}></div>
                                )}
                                <div className={styles.cardContent}>
                                    {studyOptions?.showBothSides ? (
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
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {swipeIndicator && (
                    <div
                        className={styles.swipeIndicator}
                        style={{ color: swipeIndicator.color }}
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
