import React from 'react'

function ChatBubble({ role, children }) {
  return (
    <div className={`chatbot-card__bubble chatbot-card__bubble--${role}`}>
      {children}
    </div>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7.5C5 6.12 6.12 5 7.5 5H16.5C17.88 5 19 6.12 19 7.5V13.5C19 14.88 17.88 16 16.5 16H11L7 19V16H7.5C6.12 16 5 14.88 5 13.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 9.5H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 12.5H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ChatbotWidget({
  isOpen,
  onToggle,
  isAuthenticated,
  onLoginIntent,
  onRegisterIntent,
  chatMessages,
  chatInput,
  onInputChange,
  onSubmit,
  isSubmitting,
  isSubmitDisabled,
  stateMessage,
  stateStatus,
}) {
  return (
    <div className="chatbot-dock">
      {isOpen ? (
        <section className="chatbot-card" id="website-chatbot-panel" aria-label="Delivery assistant">
          <div className="chatbot-card__header">
            <div className="chatbot-card__header-copy">
              <p className="chatbot-card__eyebrow">Website chatbot</p>
              <h3 className="chatbot-card__title">Delivery assistant</h3>
            </div>
            <button
              className="chatbot-card__close"
              type="button"
              aria-label="Close chatbot"
              onClick={onToggle}
            >
              Close
            </button>
          </div>

          {isAuthenticated ? (
            <>
              <div className="chatbot-card__messages" role="log" aria-live="polite">
                {chatMessages.map((message) => (
                  <ChatBubble key={message.id} role={message.role}>
                    {message.content}
                  </ChatBubble>
                ))}
              </div>

              <div className="chatbot-card__composer">
                <textarea
                  className="chatbot-card__input"
                  name="chatMessage"
                  placeholder="Ask about a shipment or paste a tracking number like GP6566"
                  value={chatInput}
                  onChange={onInputChange}
                  disabled={isSubmitting}
                  rows={2}
                />
                <button
                  className="button button--primary chatbot-card__send"
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitDisabled}
                >
                  {isSubmitting ? 'Sending...' : 'Send message'}
                </button>
              </div>
            </>
          ) : (
            <div className="chatbot-card__gate">
              <p className="chatbot-card__hint">
                Log in or create an account to chat with the delivery assistant on the website.
              </p>
              <div className="chatbot-card__gate-actions">
                <button className="button button--primary chatbot-card__gate-button" type="button" onClick={onLoginIntent}>
                  Log in to chat
                </button>
                <button className="button button--outline chatbot-card__gate-button" type="button" onClick={onRegisterIntent}>
                  Register to chat
                </button>
              </div>
            </div>
          )}

          {stateStatus !== 'idle' ? (
            <p className={`chatbot-card__message chatbot-card__message--${stateStatus}`}>{stateMessage}</p>
          ) : null}
        </section>
      ) : null}

      <button
        className="chatbot-launcher"
        type="button"
        aria-expanded={isOpen}
        aria-controls="website-chatbot-panel"
        onClick={onToggle}
      >
        <span className="chatbot-launcher__icon" aria-hidden="true">
          <ChatIcon />
        </span>
        <span>{isOpen ? 'Hide chat' : 'Chat with us'}</span>
      </button>
    </div>
  )
}
