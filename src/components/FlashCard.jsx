import { useState, useRef, useEffect } from 'react'
import styles from './FlashCard.module.css'
import { FaTimes, FaFrown, FaCheck, FaRocket, FaVolumeUp, FaVolumeMute } from 'react-icons/fa'
import { speakText, stopSpeech, isSpeechSupported, detectLanguage, extractImageUrl, cleanTextFromImages } from '../utils/speechUtils'

const FlashCard = ({ card, onReview, onDragStateChange, studyOptions }) => {
    const [isFlipped, setIsFlipped] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [isSpeaking, setIsSpeaking] = useState(false)
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
        // Only flip if card is not flipped and not dragging
        if (!isFlipped) {
            e.preventDefault()
            setIsFlipped(!isFlipped)
        }
    }

    const handleSpeech = async (e) => {
        e.stopPropagation() // Prevent card flip
        
        console.log('Speech button clicked')
        console.log('isSpeaking:', isSpeaking)
        console.log('isSpeechSupported:', isSpeechSupported())
        
        if (isSpeaking) {
            console.log('Stopping speech')
            stopSpeech()
            setIsSpeaking(false)
            return
        }
        
        // Use cleaned text for TTS (URLs are already stripped from frontText/backText)
        const textToSpeak = isFlipped ? backText : frontText
        console.log('Text to speak:', textToSpeak)
        console.log('Is flipped:', isFlipped)
        
        if (!textToSpeak || !textToSpeak.trim()) {
            console.log('No text to speak')
            return
        }
        
        try {
            setIsSpeaking(true)
            const language = detectLanguage(textToSpeak)
            console.log('Detected language:', language)
            
            await speakText(textToSpeak, { 
                language,
                rate: 0.9,
                pitch: 1,
                volume: 0.8 
            })
            
            console.log('Speech completed successfully')
        } catch (error) {
            console.error('Speech synthesis failed:', error)
            // Show user-friendly error message
            if (error.message.includes('not supported')) {
                console.log('TTS not supported on this device')
            }
        } finally {
            setIsSpeaking(false)
        }
    }

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
        setIsDragging(false)

        // If card is not flipped, handle flip logic
        if (!isFlipped) {
            setIsFlipped(true)
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
        if (!isFlipped) return
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
        setDragOffset({ x: 0, y: 0 })
        setIsDragging(false)
        setSelectedAnswer(null)
        setIsSpeaking(false)
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
                        {isSpeechSupported() && frontText.trim() && (
                            <button 
                                className={styles.speechButton}
                                onClick={handleSpeech}
                                aria-label="Read text aloud"
                            >
                                {isSpeaking && !isFlipped ? <FaVolumeMute /> : <FaVolumeUp />}
                            </button>
                        )}
                        <div className={styles.cardContent}>
                            {frontImageUrl && (
                                <div className={styles.cardImage}>
                                    <img src={frontImageUrl} alt="Card visual" />
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
                        backgroundRepeat: 'no-repeat'
                    }}>
                        {backImageUrl && (
                            <div className={styles.cardGradientOverlay}></div>
                        )}
                        {isSpeechSupported() && backText.trim() && (
                            <button 
                                className={styles.speechButton}
                                onClick={handleSpeech}
                                aria-label="Read text aloud"
                            >
                                {isSpeaking && isFlipped ? <FaVolumeMute /> : <FaVolumeUp />}
                            </button>
                        )}
                        <div className={styles.cardContent}>
                            {studyOptions?.showBothSides ? (
                                // Show both sides when option is enabled
                                <div className={styles.bothSidesContainer}>
                                    <div className={styles.sideSection}>
                                        <div className={styles.sideLabel}>Front:</div>
                                        {frontImageUrl && (
                                            <div className={styles.cardImage}>
                                                <img src={frontImageUrl} alt="Front visual" />
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
                                                <img src={backImageUrl} alt="Back visual" />
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
                                            <img src={backImageUrl} alt="Card visual" />
                                        </div>
                                    )}
                                    {backText && backText.trim() ? (
                                        <div className={styles.cardText}>{backText}</div>
                                    ) : null}
                                </>
                            )}
                        </div>
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
