import React, { useState } from 'react';
import {
  Fab, Dialog, DialogContent, DialogTitle, IconButton,
  Box, Typography, Avatar, Badge
} from '@mui/material';
import {
  Chat, Close, SmartToy, SupportAgent
} from '@mui/icons-material';
import Chatbot from './Chatbot';

const FloatingChatbot = () => {
  const [open, setOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setHasNewMessage(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="chat"
        onClick={handleOpen}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #7b1fa2 30%, #9c27b0 90%)',
          }
        }}
      >
        <Badge
          color="error"
          variant={hasNewMessage ? "dot" : "standard"}
          invisible={!hasNewMessage}
        >
          <Chat />
        </Badge>
      </Fab>

      {/* Chat Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            height: '80vh',
            maxHeight: '600px',
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle
          sx={{
            p: 2,
            background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2, width: 32, height: 32 }}>
              <SupportAgent fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                HelpMate Assistant
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                AI-powered IT Support
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{ color: 'rgba(255,255,255,0.8)' }}
            size="small"
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, flex: 1 }}>
          <Chatbot />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingChatbot;