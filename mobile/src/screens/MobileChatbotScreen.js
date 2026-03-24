import { useMemo, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { OutlineButton, PrimaryButton } from '../components/AuthButton'
import { colors, spacing, typography } from '../constants/theme'
import { sendMobileChatMessage } from '../services/chatbotClient'

const INITIAL_CHAT_STATE = {
  status: 'idle',
  message: '',
}

function ChatLauncherIcon() {
  return (
    <View style={styles.launcherIcon}>
      <View style={styles.launcherIconBubble} />
      <View style={styles.launcherIconLine} />
      <View style={[styles.launcherIconLine, styles.launcherIconLineShort]} />
    </View>
  )
}

export function MobileChatbotScreen({
  currentUser,
  isOpen,
  onToggle,
  onLoginIntent,
  onRegisterIntent,
}) {
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome-message',
      role: 'assistant',
      content: 'Hi! Ask about your delivery and I will help you track it.',
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatState, setChatState] = useState(INITIAL_CHAT_STATE)

  const isAuthenticated = Boolean(currentUser)
  const isSubmitting = chatState.status === 'loading'
  const isSendDisabled = !isAuthenticated || isSubmitting || !chatInput.trim()

  const statusStyle = useMemo(() => {
    if (chatState.status === 'error') {
      return styles.statusError
    }
    if (chatState.status === 'success') {
      return styles.statusSuccess
    }
    return null
  }, [chatState.status])

  const handleSend = async () => {
    const trimmedMessage = chatInput.trim()

    if (!currentUser || !trimmedMessage) {
      setChatState({
        status: 'error',
        message: 'Log in or register to use the mobile chatbot.',
      })
      return
    }

    const nextUserMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
    }

    setChatMessages((current) => [...current, nextUserMessage])
    setChatInput('')
    setChatState({
      status: 'loading',
      message: 'Sending your message...',
    })

    try {
      const result = await sendMobileChatMessage({
        customerName: currentUser.fullName,
        customerPhone: currentUser.phone,
        message: trimmedMessage,
      })

      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.reply,
        },
      ])
      setChatState({
        status: 'success',
        message: `Intent detected: ${result.intent}`,
      })
    } catch (error) {
      setChatState({
        status: 'error',
        message: error.message || 'Mobile chatbot is currently unavailable.',
      })
    }
  }

  return (
    <View style={styles.dock}>
      {isOpen ? (
        <View style={styles.chatCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>Mobile chatbot</Text>
              <Text style={styles.title}>Delivery assistant</Text>
            </View>
            <Pressable onPress={onToggle} style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          {isAuthenticated ? (
            <>
              <Text style={styles.subtitle}>{currentUser.fullName}</Text>

              <View style={styles.messages}>
                {chatMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      message.role === 'assistant' ? styles.assistantBubble : styles.userBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        message.role === 'assistant' ? styles.assistantText : styles.userText,
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder="Ask about a shipment or tracking number like GP6566"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={chatInput}
                  onChangeText={setChatInput}
                  multiline
                  editable={!isSubmitting}
                />
                <PrimaryButton
                  label={isSubmitting ? 'Sending...' : 'Send'}
                  disabled={isSendDisabled}
                  onPress={handleSend}
                />
              </View>
            </>
          ) : (
            <View style={styles.gate}>
              <Text style={styles.gateMessage}>
                Log in or create an account to chat with the delivery assistant on mobile.
              </Text>
              <View style={styles.gateActions}>
                <PrimaryButton label="Log in to chat" onPress={onLoginIntent} />
                <OutlineButton label="Register to chat" onPress={onRegisterIntent} />
              </View>
            </View>
          )}

          {chatState.status !== 'idle' ? (
            <Text style={[styles.statusMessage, statusStyle]}>{chatState.message}</Text>
          ) : null}
        </View>
      ) : null}

      <Pressable onPress={onToggle} style={({ pressed }) => [styles.launcher, pressed && styles.launcherPressed]}>
        <ChatLauncherIcon />
        <Text style={styles.launcherLabel}>{isOpen ? 'Hide chat' : 'Chat with us'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  dock: {
    width: spacing.panelWidth,
    gap: 14,
    alignItems: 'stretch',
  },
  launcher: {
    minHeight: 50,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  launcherPressed: {
    opacity: 0.92,
  },
  launcherLabel: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
  },
  launcherIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launcherIconBubble: {
    position: 'absolute',
    width: 18,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  launcherIconLine: {
    width: 8,
    height: 1.5,
    borderRadius: 999,
    backgroundColor: colors.white,
    marginBottom: 2,
  },
  launcherIconLineShort: {
    width: 5,
    marginBottom: 0,
  },
  chatCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    color: colors.primarySoft,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    color: colors.primaryDark,
    ...typography.title,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.infoBg,
  },
  closeButtonPressed: {
    opacity: 0.9,
  },
  closeLabel: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  subtitle: {
    flex: 1,
    color: colors.bodyText,
    fontSize: 14,
    lineHeight: 18,
  },
  messages: {
    gap: 12,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.infoBg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  assistantText: {
    color: colors.bodyText,
  },
  userText: {
    color: colors.white,
  },
  composer: {
    gap: 12,
  },
  input: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.bodyText,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 20,
  },
  gate: {
    gap: 12,
  },
  gateMessage: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.infoBg,
    color: colors.bodyText,
    fontSize: 13,
    lineHeight: 19,
  },
  gateActions: {
    gap: 10,
  },
  statusMessage: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  statusSuccess: {
    backgroundColor: colors.successBg,
    color: colors.successText,
  },
  statusError: {
    backgroundColor: colors.errorBg,
    color: colors.errorText,
  },
})
