import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Button,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import {
  Search,
  ThumbUp,
  Visibility,
  Category,
  Close,
  Launch,
  Add,
  Edit,
  Delete,
  Save,
  Cancel
} from '@mui/icons-material';
import axios from 'axios';

const KnowledgeBase = () => {
  const [articles, setArticles] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState('client');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    summary: '',
    category: '',
    tags: '',
    status: 'published'
  });
  const [attachments, setAttachments] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const articlesPerPage = 12;

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCategories();
    fetchArticles();
    getUserRole();
  }, [search, selectedCategory, page]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('skip', ((page - 1) * articlesPerPage).toString());
      params.append('limit', articlesPerPage.toString());

      const response = await axios.get(`http://localhost:8000/knowledge?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArticles(response.data.map(article => ({ ...article, id: article.id || article._id })));

      // Calculate total pages (simplified - in production, backend should return total count)
      const totalResponse = await axios.get(`http://localhost:8000/knowledge?${new URLSearchParams({
        q: search,
        category: selectedCategory
      })}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const totalArticles = totalResponse.data.length;
      setTotalPages(Math.ceil(totalArticles / articlesPerPage));
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError('Failed to load knowledge base articles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const allArticlesResponse = await axios.get('http://localhost:8000/knowledge', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Calculate category counts
      const counts = {};
      allArticlesResponse.data.forEach(article => {
        const category = article.category;
        counts[category] = (counts[category] || 0) + 1;
      });
      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleVoteHelpful = async (articleId) => {
    try {
      await axios.post(`http://localhost:8000/knowledge/${articleId}/vote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh articles to update vote count
      fetchArticles();
      showSnackbar('Article marked as helpful!', 'success');
    } catch (error) {
      console.error('Error voting:', error);
      showSnackbar('Failed to mark article as helpful', 'error');
    }
  };

  const handleArticleClick = async (article) => {
    try {
      // Fetch full article details
      const response = await axios.get(`http://localhost:8000/knowledge/${article.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedArticle(response.data);
      setArticleDialogOpen(true);
    } catch (error) {
      console.error('Error fetching article details:', error);
    }
  };

  const handleCloseArticleDialog = () => {
    setArticleDialogOpen(false);
    setSelectedArticle(null);
  };

  const getUserRole = async () => {
    try {
      console.log('Getting user role...');
      const response = await axios.get('http://localhost:8000/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('User role response:', response.data);
      setUserRole(response.data.role || 'client');
    } catch (error) {
      console.error('Error getting user role:', error);
      setUserRole('client');
    }
  };

  const handleCreateArticle = () => {
    setNewArticle({
      title: '',
      content: '',
      summary: '',
      category: '',
      tags: '',
      status: 'published'
    });
    setAttachments([]);
    setCreateDialogOpen(true);
  };

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setNewArticle({
      title: article.title || '',
      content: article.content || '',
      summary: article.summary || '',
      category: article.category || '',
      tags: (article.tags || []).join(', '),
      status: article.status || 'published'
    });
    setCreateDialogOpen(true);
  };

  const handleDeleteArticle = async (articleId) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      try {
        await axios.delete(`http://localhost:8000/knowledge/${articleId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchArticles();
        fetchCategories();
        showSnackbar('Article deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting article:', error);
        showSnackbar('Failed to delete article', 'error');
      }
    }
  };

  const handleSaveArticle = async () => {
    try {
      const articleData = new FormData();
      articleData.append('title', newArticle.title);
      articleData.append('content', newArticle.content);
      articleData.append('summary', newArticle.summary);
      articleData.append('category', newArticle.category);
      articleData.append('tags', newArticle.tags);
      articleData.append('status', newArticle.status);

      // Add attachments
      attachments.forEach((attachment, index) => {
        articleData.append('files', attachment.file);
      });

      if (editingArticle) {
        // Update existing article
        await axios.put(`http://localhost:8000/knowledge/${editingArticle.id}`, articleData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Article updated successfully!', 'success');
      } else {
        // Create new article
        await axios.post('http://localhost:8000/knowledge', articleData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Article created successfully!', 'success');
      }

      setCreateDialogOpen(false);
      setEditingArticle(null);
      setAttachments([]);
      fetchArticles();
      fetchCategories();
    } catch (error) {
      console.error('Error saving article:', error);
      showSnackbar('Failed to save article', 'error');
    }
  };

  const handleCancelEdit = () => {
    setCreateDialogOpen(false);
    setEditingArticle(null);
    setNewArticle({
      title: '',
      content: '',
      summary: '',
      category: '',
      tags: '',
      status: 'published'
    });
    setAttachments([]);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(selectedCategory === category ? '' : category);
    setPage(1);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main' }}>
          Knowledge Base
        </Typography>
        {(userRole === 'agent' || userRole === 'manager' || userRole === 'admin') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateArticle}
            sx={{ borderRadius: 2 }}
          >
            Create Article
          </Button>
        )}
      </Box>

      {/* Category Dashboard */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
          Article Categories
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(categoryCounts).map(([category, count]) => (
            <Chip
              key={category}
              label={`${category} - ${count}`}
              onClick={() => handleCategoryClick(category)}
              color={selectedCategory === category ? 'primary' : 'default'}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
        {selectedCategory && (
          <Box sx={{ mt: 2 }}>
            <Button
              size="small"
              onClick={() => setSelectedCategory('')}
              sx={{ textTransform: 'none' }}
            >
              Clear category filter
            </Button>
          </Box>
        )}
      </Paper>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Box>

      {/* Articles Grid */}
      <Grid container spacing={3}>
        {articles.map((article) => (
          <Grid item xs={12} md={6} lg={4} key={article.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => handleArticleClick(article)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 500,
                    lineHeight: 1.3,
                    mb: 2,
                    color: 'primary.main'
                  }}
                >
                  {article.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {article.summary || (article.content ? article.content.substring(0, 120) + '...' : '')}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  <Chip
                    label={article.category}
                    size="small"
                    color="primary"
                    variant="outlined"
                    icon={<Category />}
                  />
                  {article.tags && article.tags.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Visibility sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {article.views || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ThumbUp sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {article.helpful_votes || 0}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {(userRole === 'agent' || userRole === 'manager' || userRole === 'admin') && (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditArticle(article);
                          }}
                          sx={{ color: 'primary.main' }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteArticle(article.id);
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    {userRole === 'client' && (
                      <Chip
                        label="Helpful"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVoteHelpful(article.id);
                        }}
                        sx={{ cursor: 'pointer' }}
                      />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {articles.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No articles found
          </Typography>
          {(search || selectedCategory) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting your search or category filter
            </Typography>
          )}
        </Box>
      )}

      {/* Article Detail Dialog */}
      <Dialog
        open={articleDialogOpen}
        onClose={handleCloseArticleDialog}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        {selectedArticle && (
          <>
            <DialogTitle sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pb: 1
            }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 500, color: 'primary.main' }}>
                  {selectedArticle.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {selectedArticle.category} • By {selectedArticle.author}
                </Typography>
              </Box>
              <IconButton onClick={handleCloseArticleDialog} size="small">
                <Close />
              </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ py: 3 }}>
              {/* Article Content */}
              <Box sx={{ mb: 3 }}>
                <MDEditor.Markdown
                  source={selectedArticle.content}
                  style={{
                    background: 'transparent',
                    color: 'inherit',
                    fontFamily: 'inherit'
                  }}
                />
              </Box>

              {/* Tags */}
              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                    Tags:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedArticle.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Links */}
              {selectedArticle.links && selectedArticle.links.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                    Related Links:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedArticle.links.map((link, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Launch sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'primary.main',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            '&:hover': { textDecoration: 'none' }
                          }}
                          onClick={() => window.open(link.url, '_blank')}
                        >
                          {link.title}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Attachments */}
              {selectedArticle.attachments && selectedArticle.attachments.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                    Attachments:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedArticle.attachments.map((attachment, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Launch sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'primary.main',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            '&:hover': { textDecoration: 'none' }
                          }}
                          onClick={() => window.open(attachment.url, '_blank')}
                        >
                          {attachment.filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Article Stats */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Visibility sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {selectedArticle.views || 0} views
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ThumbUp sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {selectedArticle.helpful_votes || 0} helpful votes
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Last updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                onClick={() => handleVoteHelpful(selectedArticle.id)}
                variant="outlined"
                startIcon={<ThumbUp />}
                sx={{ mr: 1 }}
              >
                Mark as Helpful
              </Button>
              <Button onClick={handleCloseArticleDialog} variant="contained">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create/Edit Article Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h5" sx={{ fontWeight: 500, color: 'primary.main' }}>
            {editingArticle ? 'Edit Article' : 'Create New Article'}
          </Typography>
          <IconButton onClick={handleCancelEdit} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Article Title"
              value={newArticle.title}
              onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Summary"
              value={newArticle.summary}
              onChange={(e) => setNewArticle({ ...newArticle, summary: e.target.value })}
              fullWidth
              multiline
              rows={2}
              helperText="Brief description of the article"
            />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Content *
              </Typography>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <MDEditor
                  value={newArticle.content}
                  onChange={(content) => setNewArticle({ ...newArticle, content })}
                  preview="edit"
                  hideToolbar={false}
                  visibleDragBar={false}
                  height={400}
                  data-color-mode="light"
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Markdown editor with rich formatting, code blocks, tables, and more.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Category"
                value={newArticle.category}
                onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                sx={{ flex: 1 }}
                required
              />

              <TextField
                label="Tags"
                value={newArticle.tags}
                onChange={(e) => setNewArticle({ ...newArticle, tags: e.target.value })}
                sx={{ flex: 1 }}
                helperText="Comma-separated tags"
              />
            </Box>

            {/* File Attachments */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Attachments
              </Typography>
              <input
                accept="*/*"
                style={{ display: 'none' }}
                id="file-upload"
                multiple
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<Add />}
                  sx={{ mb: 2 }}
                >
                  Add Files
                </Button>
              </label>

              {attachments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Selected Files:
                  </Typography>
                  {attachments.map((attachment, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {attachment.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => removeAttachment(index)}
                        sx={{ color: 'error.main' }}
                      >
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={newArticle.status}
                onChange={(e) => setNewArticle({ ...newArticle, status: e.target.value })}
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="published">Published</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCancelEdit} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveArticle}
            variant="contained"
            startIcon={editingArticle ? <Save /> : <Add />}
            disabled={!newArticle.title || !newArticle.content || !newArticle.category}
          >
            {editingArticle ? 'Update Article' : 'Create Article'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default KnowledgeBase;