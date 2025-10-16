import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close,
  AttachFile,
  Delete,
  CloudUpload,
  Assignment
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const TicketForm = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  const [attachments, setAttachments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8000/requests/categories', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(response.data.categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback categories
        setCategories([
          'Hardware Issues',
          'Software Issues',
          'Network & Connectivity',
          'Email & Communication',
          'Account & Security',
          'General Support',
          'Other'
        ]);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  // File drop zone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setAttachments(prev => [...prev, ...acceptedFiles]);
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('priority', formData.priority);
      
      // Add attachments
      attachments.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await axios.post(
        'http://localhost:8000/requests/with-attachments',
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      onSuccess(response.data);
      handleClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'medium'
    });
    setAttachments([]);
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              <Assignment />
            </Avatar>
            <Typography variant="h5">Create Support Ticket</Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Title */}
          <TextField
            fullWidth
            label="Brief Description *"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g., Computer won't start, Email not working"
            required
          />

          {/* Category */}
          <FormControl fullWidth required>
            <InputLabel>Category *</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              label="Category *"
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Priority */}
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              label="Priority"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>

          {/* Description */}
          <TextField
            fullWidth
            label="Detailed Description *"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            multiline
            rows={4}
            placeholder="Please provide detailed information about your issue, including any error messages, steps you've tried, and when the problem started."
            required
          />

          {/* File Attachments */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Attachments (Optional)
            </Typography>
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'primary.50' : 'grey.50',
                transition: 'all 0.2s ease'
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supports: Images, PDFs, Word documents, Text files (Max 10MB each)
              </Typography>
            </Paper>
            
            {attachments.length > 0 && (
              <List sx={{ mt: 2 }}>
                {attachments.map((file, index) => (
                  <ListItem key={index} divider>
                    <ListItemAvatar>
                      <Avatar>
                        <AttachFile />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(1)} KB`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => removeAttachment(index)}>
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title || !formData.description || !formData.category}
          startIcon={loading ? <CircularProgress size={16} /> : <Assignment />}
          sx={{
            background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
          }}
        >
          {loading ? 'Creating...' : 'Create Ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketForm;
