import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Fade,
  CircularProgress,
  IconButton,
  Divider,
  Button
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  Clear,
  SupportAgent,
  Assignment
} from '@mui/icons-material';
import TicketForm from './TicketForm';
import axios from 'axios';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { text: "Hello! I'm HelpMate, your IT support assistant. How can I help you today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [conversationState, setConversationState] = useState('initial'); // initial, kb_shown, feedback_given
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Call API
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post('http://localhost:8000/chatbot/message', { message: input }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Check if response indicates to show ticket form
      if (response.data.response === 'SHOW_TICKET_FORM') {
        setMessages([...newMessages, {
          text: "I'll help you create a support ticket. Please fill out the form below with your issue details.",
          sender: 'bot',
          showTicketButton: true
        }]);
        setConversationState('ticket_creation');
      } else {
        const botMessage = { text: response.data.response, sender: 'bot' };

        // Check if this is a knowledge base response with feedback options
        if (response.data.response.includes('Was this helpful?')) {
          botMessage.showFeedbackButtons = true;
          setConversationState('kb_shown');
        } else if (response.data.response.includes('Would you like me to create a support ticket')) {
          botMessage.showTicketOptions = true;
          setConversationState('ticket_offer');
        } else {
          setConversationState('general');
        }

        setMessages([...newMessages, botMessage]);
      }
    } catch (error) {
      setMessages([...newMessages, { text: 'Sorry, I encountered an error. Please try again.', sender: 'bot' }]);
      setConversationState('error');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      { text: "Hello! I'm HelpMate, your IT support assistant. How can I help you today?", sender: 'bot' }
    ]);
    setConversationState('initial');
  };

  const handleTicketFormOpen = () => {
    setShowTicketForm(true);
  };

  const handleTicketFormClose = () => {
    setShowTicketForm(false);
  };

  const handleTicketSuccess = (ticketData) => {
    const successMessage = `✅ **Ticket Created Successfully!**\n\n` +
      `**Ticket ID:** #${ticketData.ticket_id.slice(-6)}\n` +
      `**Status:** ${ticketData.status}\n` +
      `**Attachments:** ${ticketData.attachments_count} file(s)\n\n` +
      `Your ticket has been submitted and ${ticketData.status === 'assigned' ? 'assigned to an agent' : 'is in our queue'}. ` +
      `You'll receive updates via email. Is there anything else I can help you with?`;

    setMessages(prev => [...prev, {
      text: successMessage,
      sender: 'bot'
    }]);
    setConversationState('ticket_created');
  };

  const handleFeedbackClick = (feedback) => {
    let responseMessage = '';

    switch (feedback) {
      case 'helpful':
        responseMessage = "Great! I'm glad I could help. Is there anything else I can assist you with?";
        setConversationState('resolved');
        break;
      case 'try_again':
        responseMessage = "I understand. Could you please provide more details about your issue or rephrase your question?";
        setConversationState('retry_search');
        break;
      case 'create_ticket':
        setShowTicketForm(true);
        setConversationState('ticket_creation');
        return; // Don't add a message, the form will handle it
      default:
        responseMessage = "How else can I help you?";
        setConversationState('general');
    }

    setMessages(prev => [...prev, {
      text: responseMessage,
      sender: 'bot'
    }]);
  };

  return (
    <Card
      sx={{
        height: 600,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <CardContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 3,
            background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
              <SupportAgent />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                HelpMate Assistant
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                AI-powered IT Support
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={clearChat}
            sx={{ color: 'rgba(255,255,255,0.8)' }}
            title="Clear Chat"
          >
            <Clear />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 2,
            background: '#ffffff',
          }}
        >
          {messages.map((msg, index) => (
            <Fade in={true} timeout={300} key={index}>
              <Box
                sx={{
                  display: 'flex',
                  mb: 2,
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.sender === 'bot' && (
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      mr: 1,
                      width: 32,
                      height: 32,
                      background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
                    }}
                  >
                    <SmartToy fontSize="small" />
                  </Avatar>
                )}

                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: msg.sender === 'user' ? 'primary.main' : 'grey.100',
                    color: msg.sender === 'user' ? 'white' : 'text.primary',
                    borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)'
                      : '#f5f5f5',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </Typography>

                  {/* Show feedback buttons for knowledge base responses */}
                  {msg.showFeedbackButtons && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleFeedbackClick('helpful')}
                        sx={{ minWidth: 'auto' }}
                      >
                        Yes, this helped!
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleFeedbackClick('try_again')}
                        sx={{ minWidth: 'auto' }}
                      >
                        Try different search
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Assignment />}
                        onClick={() => handleFeedbackClick('create_ticket')}
                        sx={{ minWidth: 'auto' }}
                      >
                        Create Ticket
                      </Button>
                    </Box>
                  )}

                  {/* Show ticket options for fallback responses */}
                  {msg.showTicketOptions && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Assignment />}
                        onClick={() => handleFeedbackClick('create_ticket')}
                        sx={{
                          background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #7b1fa2 30%, #9c27b0 90%)',
                          }
                        }}
                      >
                        Create Ticket
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setInput("Let me try asking differently")}
                        sx={{ minWidth: 'auto' }}
                      >
                        Ask Something Else
                      </Button>
                    </Box>
                  )}

                  {/* Show ticket creation button if this message has the flag */}
                  {msg.showTicketButton && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<Assignment />}
                        onClick={handleTicketFormOpen}
                        sx={{
                          background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #7b1fa2 30%, #9c27b0 90%)',
                          }
                        }}
                      >
                        Create Ticket
                      </Button>
                    </Box>
                  )}
                </Paper>

                {msg.sender === 'user' && (
                  <Avatar
                    sx={{
                      bgcolor: 'secondary.main',
                      ml: 1,
                      width: 32,
                      height: 32
                    }}
                  >
                    <Person fontSize="small" />
                  </Avatar>
                )}
              </Box>
            </Fade>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  mr: 1,
                  width: 32,
                  height: 32,
                  background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
                }}
              >
                <SmartToy fontSize="small" />
              </Avatar>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: '20px 20px 20px 5px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Thinking...
                </Typography>
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input */}
        <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: 'white',
                }
              }}
            />
            <IconButton
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&:disabled': {
                  bgcolor: 'grey.300',
                }
              }}
            >
              <Send />
            </IconButton>
          </Box>

          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Reset password"
              size="small"
              onClick={() => setInput("I forgot my password")}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Computer issues"
              size="small"
              onClick={() => setInput("My computer won't start")}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Network problems"
              size="small"
              onClick={() => setInput("I can't connect to WiFi")}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Create ticket"
              size="small"
              onClick={() => setInput("Create a ticket for me")}
              sx={{ cursor: 'pointer' }}
              icon={<Assignment />}
            />
          </Box>
        </Box>
      </CardContent>

      {/* Ticket Creation Form */}
      <TicketForm
        open={showTicketForm}
        onClose={handleTicketFormClose}
        onSuccess={handleTicketSuccess}
      />
    </Card>
  );
};

export default Chatbot;