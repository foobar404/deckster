import { useState, useRef, useEffect } from 'react'
import styles from './FlashCard.module.css'
import { FaTimes, FaFrown, FaCheck, FaRocket } from 'react-icons/fa'

const FlashCard = ({ card, onReview, onDragStateChange }) => {
    const [isFlipped, setIsFlipped] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const cardRef = useRef(null)
    const startPos = useRef({ x: 0, y: 0 })
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
    }, [card.id]);

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
        <div className={styles.flashcardContainer}>
            <div
                ref={cardRef}
                className={`${styles.flashcard} ${isDragging ? styles.dragging : ''}`}
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
                    className={styles.cardInner}
                    style={{
                        transform: isFlipped ? 'rotateY(180deg)' : ''
                    }}
                >
                    <div className={styles.cardFront}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardText}>{card.front}</div>
                            <div className={styles.flipHint}>Tap to reveal</div>
                        </div>
                    </div>
                    <div className={styles.cardBack}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardText}>{card.back}</div>
                            <div className={styles.swipeHint}>
                                Drag to corners to rate difficulty
                            </div>
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
