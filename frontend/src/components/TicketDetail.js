import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Grid,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemAvatar, Avatar,
  Divider, Paper, IconButton, Tooltip, Alert,
  Pagination
} from '@mui/material';
import {
  Comment, AttachFile, Escalator, Close, Send,
  Person, Schedule, PriorityHigh, Warning, CheckCircle
} from '@mui/icons-material';
import axios from 'axios';

const TicketDetail = ({ ticket, onClose, onUpdate }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState('comment');
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsPagination, setCommentsPagination] = useState(null);

  useEffect(() => {
    if (ticket) {
      fetchComments();
    }
  }, [ticket]);

  const fetchComments = async (page = 1) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/requests/${ticket._id}/comments?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Comments fetched:', response.data);
      setComments(response.data.comments || []);
      setCommentsPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching comments:', error);
      console.error('Error details:', error.response?.data);
      setComments([]);
      setCommentsPagination(null);
    }
  };


  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', newComment);
      formData.append('comment_type', commentType);
      formData.append('is_internal', isInternal.toString());

      // Add attachments if any
      attachments.forEach((file, index) => {
        formData.append('files', file);
      });

      const response = await axios.post(`http://localhost:8000/requests/${ticket._id}/comments`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Comment added:', response.data);
      setNewComment('');
      setAttachments([]);
      fetchComments(1); // Reset to first page when adding new comment
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:8000/escalate/${ticket._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Escalation response:', response.data);
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error escalating ticket:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const handleCloseTicket = async (status) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('status', status);

      const response = await axios.post(`http://localhost:8000/requests/${ticket._id}/close`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Close ticket response:', response.data);
      onUpdate && onUpdate();
      onClose();
    } catch (error) {
      console.error('Error closing ticket:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const handleFileChange = (event) => {
    setAttachments(Array.from(event.target.files));
  };

  const handleCommentsPageChange = (event, page) => {
    setCommentsPage(page);
    fetchComments(page);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'primary';
      case 'assigned': return 'info';
      case 'in_progress': return 'warning';
      case 'pending_client': return 'secondary';
      case 'escalated': return 'error';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 1: return <PriorityHigh color="error" />;
      case 2: return <Warning color="warning" />;
      case 3: return <Schedule color="info" />;
      default: return <Schedule />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!ticket) return null;

  return (
    <Dialog open={!!ticket} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{ticket.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {getUrgencyIcon(ticket.urgency_level)}
            <Chip label={ticket.status} color={getStatusColor(ticket.status)} size="small" />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Ticket Details */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Description</Typography>
                <Typography variant="body1" paragraph>{ticket.description}</Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip label={`Category: ${ticket.category}`} variant="outlined" />
                  <Chip label={`Priority: ${ticket.priority}`} variant="outlined" />
                  {ticket.sla_breached && (
                    <Chip label="SLA Breached" color="error" icon={<Warning />} />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(ticket.created_at)}
                  {ticket.sla_due_date && (
                    <> • SLA Due: {formatDate(ticket.sla_due_date)}</>
                  )}
                </Typography>
              </CardContent>
            </Card>

            {ticket.sla_breached && (
              <Alert severity="error" sx={{ mt: 2 }}>
                This ticket has breached its SLA deadline!
              </Alert>
            )}

            {/* Comments Section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Comments</Typography>

              {/* Add Comment */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>Add Comment</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your comment..."
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFile />}
                  >
                    Attach Files
                    <input
                      type="file"
                      multiple
                      hidden
                      onChange={handleFileChange}
                    />
                  </Button>
                  {attachments.length > 0 && (
                    <Typography variant="body2">
                      {attachments.length} file(s) selected
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Button
                      onClick={handleAddComment}
                      variant="contained"
                      startIcon={<Send />}
                      disabled={!newComment.trim() || loading}
                    >
                      {loading ? 'Sending...' : 'Send Comment'}
                    </Button>
                  </Box>
                </Box>
              </Paper>

              {/* Comments List */}
              <List>
                {comments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No comments yet. Add the first comment above.
                  </Typography>
                ) : (
                  comments.map((comment) => (
                    <React.Fragment key={comment.id || comment._id}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar>
                            <Person />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">
                                {comment.user_name || comment.user_id || 'Unknown User'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(comment.created_at)}
                              </Typography>
                              {comment.is_internal && (
                                <Chip label="Internal" size="small" color="warning" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body1" paragraph>
                                {comment.content}
                              </Typography>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Attachments:
                                  </Typography>
                                  {comment.attachments.map((att, idx) => (
                                    <Button
                                      key={idx}
                                      size="small"
                                      href={att.url}
                                      target="_blank"
                                    >
                                      {att.filename}
                                    </Button>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))
                )}
              </List>

              {/* Comments Pagination */}
              {commentsPagination && commentsPagination.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
                  <Pagination
                    count={commentsPagination.pages}
                    page={commentsPage}
                    onChange={handleCommentsPageChange}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </Box>
          </Grid>

        </Grid>
      </DialogContent>

      <DialogActions>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Escalator />}
            onClick={handleEscalate}
            color="warning"
          >
            Escalate Ticket
          </Button>

          <Button
            variant="outlined"
            startIcon={<CheckCircle />}
            onClick={() => handleCloseTicket('resolved')}
            color="success"
          >
            Mark as Resolved
          </Button>

          <Button
            variant="outlined"
            startIcon={<Close />}
            onClick={() => handleCloseTicket('closed')}
          >
            Close Ticket
          </Button>
        </Box>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketDetail;