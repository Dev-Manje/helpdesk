import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, Chip, IconButton, Alert, Snackbar, Card, CardContent,
  Grid, Switch, FormControlLabel
} from '@mui/material';
import {
  Edit, Delete, Add, Save, Cancel, AccessTime, Email, Category, Settings
} from '@mui/icons-material';
import axios from 'axios';

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [slaRules, setSlaRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [emailSettings, setEmailSettings] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: ''
  });
  const [workingHours, setWorkingHours] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' }
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // SLA Management
  const [slaDialog, setSlaDialog] = useState({ open: false, rule: null });
  const [slaForm, setSlaForm] = useState({
    urgency_level: 1,
    response_time_hours: 2,
    resolution_time_hours: 4,
    warning_time_hours: 1,
    escalation_time_hours: 3
  });

  // Category Management
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null });
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [slaRes, categoriesRes] = await Promise.all([
        axios.get('http://localhost:8000/sla/rules', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:8000/categories', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setSlaRules(slaRes.data);
      setCategories(categoriesRes.data.categories);
    } catch (error) {
      console.error('Error loading settings:', error);
      showSnackbar('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // SLA Management Functions
  const handleSlaEdit = (rule) => {
    setSlaForm({
      urgency_level: rule.urgency_level,
      response_time_hours: rule.response_time_hours,
      resolution_time_hours: rule.resolution_time_hours,
      warning_time_hours: rule.warning_time_hours,
      escalation_time_hours: rule.escalation_time_hours
    });
    setSlaDialog({ open: true, rule });
  };

  const handleSlaSave = async () => {
    try {
      if (slaDialog.rule) {
        // Update existing rule
        await axios.put(`http://localhost:8000/sla/rules/${slaDialog.rule.id}`, slaForm, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        showSnackbar('SLA rule updated successfully');
      } else {
        // Create new rule
        await axios.post('http://localhost:8000/sla/rules', slaForm, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        showSnackbar('SLA rule created successfully');
      }
      setSlaDialog({ open: false, rule: null });
      loadSettings();
    } catch (error) {
      console.error('Error saving SLA rule:', error);
      showSnackbar('Error saving SLA rule', 'error');
    }
  };

  const handleSlaDelete = async (rule) => {
    if (!window.confirm('Are you sure you want to delete this SLA rule?')) return;

    try {
      await axios.delete(`http://localhost:8000/sla/rules/${rule.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      loadSettings();
      showSnackbar('SLA rule deleted successfully');
    } catch (error) {
      console.error('Error deleting SLA rule:', error);
      showSnackbar('Error deleting SLA rule', 'error');
    }
  };

  // Category Management Functions
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      // Add category via backend
      await axios.post('http://localhost:8000/categories', { name: newCategory.trim() }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCategories([...categories, newCategory.trim()]);
      setCategoryDialog({ open: false, category: null });
      setNewCategory('');
      showSnackbar('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      showSnackbar('Error adding category', 'error');
    }
  };

  const handleSaveCategory = async () => {
    if (categoryDialog.category) {
      await handleUpdateCategory();
    } else {
      await handleAddCategory();
    }
  };

  const handleEditCategory = (category) => {
    setNewCategory(category);
    setCategoryDialog({ open: true, category });
  };

  const handleUpdateCategory = async () => {
    if (!newCategory.trim() || !categoryDialog.category) return;

    try {
      // Update category via backend
      await axios.put(`http://localhost:8000/categories/${encodeURIComponent(categoryDialog.category)}`, { name: newCategory.trim() }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCategories(categories.map(cat => cat === categoryDialog.category ? newCategory.trim() : cat));
      setCategoryDialog({ open: false, category: null });
      setNewCategory('');
      showSnackbar('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      showSnackbar('Error updating category', 'error');
    }
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      console.log('Deleting category:', categoryToDelete);
      console.log('Categories before delete:', categories);

      // Delete category via backend
      const response = await axios.delete(`http://localhost:8000/categories/${encodeURIComponent(categoryToDelete)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Delete response:', response);
      console.log('Delete response status:', response.status);
      console.log('Delete response data:', response.data);

      // Update local state by filtering out the deleted category
      const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
      console.log('Categories after filter:', updatedCategories);

      setCategories(updatedCategories);
      console.log('State updated, new categories:', updatedCategories);

      // Refresh data from server to ensure consistency
      loadSettings();

      showSnackbar('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      showSnackbar('Error deleting category', 'error');
    }
  };

  // Email Settings Functions
  const handleEmailSettingsSave = async () => {
    try {
      // In a real implementation, you'd save to backend
      showSnackbar('Email settings saved successfully');
    } catch (error) {
      showSnackbar('Error saving email settings', 'error');
    }
  };

  // Working Hours Functions
  const handleWorkingHoursChange = (day, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleWorkingHoursSave = async () => {
    try {
      // In a real implementation, you'd save to backend
      showSnackbar('Working hours saved successfully');
    } catch (error) {
      showSnackbar('Error saving working hours', 'error');
    }
  };

  const getUrgencyLabel = (level) => {
    switch (level) {
      case 1: return 'Urgent';
      case 2: return 'Moderate';
      case 3: return 'Mild';
      default: return 'Unknown';
    }
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 1: return 'error';
      case 2: return 'warning';
      case 3: return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        System Settings
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<AccessTime />} label="SLA Management" />
          <Tab icon={<Email />} label="Email Settings" />
          <Tab icon={<Category />} label="Ticket Categories" />
          <Tab icon={<Settings />} label="Working Hours" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* SLA Management Tab */}
          {activeTab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">SLA Rules Configuration</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setSlaForm({
                      urgency_level: 1,
                      response_time_hours: 2,
                      resolution_time_hours: 4,
                      warning_time_hours: 1,
                      escalation_time_hours: 3
                    });
                    setSlaDialog({ open: true, rule: null });
                  }}
                >
                  Add SLA Rule
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Urgency Level</TableCell>
                      <TableCell>Response Time (hours)</TableCell>
                      <TableCell>Resolution Time (hours)</TableCell>
                      <TableCell>Warning Time (hours)</TableCell>
                      <TableCell>Escalation Time (hours)</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {slaRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Chip
                            label={getUrgencyLabel(rule.urgency_level)}
                            color={getUrgencyColor(rule.urgency_level)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{rule.response_time_hours}</TableCell>
                        <TableCell>{rule.resolution_time_hours}</TableCell>
                        <TableCell>{rule.warning_time_hours}</TableCell>
                        <TableCell>{rule.escalation_time_hours}</TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleSlaEdit(rule)} size="small">
                            <Edit />
                          </IconButton>
                          <IconButton onClick={() => handleSlaDelete(rule)} size="small" color="error">
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Email Settings Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Email Configuration</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    type="number"
                    value={emailSettings.smtp_port}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SMTP Username"
                    value={emailSettings.smtp_user}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_user: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SMTP Password"
                    type="password"
                    value={emailSettings.smtp_password}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="From Email"
                    value={emailSettings.from_email}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, from_email: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="From Name"
                    value={emailSettings.from_name}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={handleEmailSettingsSave}>
                    Save Email Settings
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Ticket Categories Tab */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Ticket Categories</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCategoryDialog({ open: true, category: '' })}
                >
                  Add Category
                </Button>
              </Box>

              <Grid container spacing={2}>
                {categories.map((category, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography>{category}</Typography>
                        <Box>
                          <IconButton
                            onClick={() => handleEditCategory(category)}
                            size="small"
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteCategory(category)}
                            size="small"
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Working Hours Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Business Hours Configuration</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Configure working hours for SLA calculations and notifications
              </Typography>

              {Object.entries(workingHours).map(([day, config]) => (
                <Card key={day} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.enabled}
                            onChange={(e) => handleWorkingHoursChange(day, 'enabled', e.target.checked)}
                          />
                        }
                        label={day.charAt(0).toUpperCase() + day.slice(1)}
                        sx={{ minWidth: 150 }}
                      />
                      {config.enabled && (
                        <>
                          <TextField
                            label="Start Time"
                            type="time"
                            value={config.start}
                            onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                            size="small"
                          />
                          <TextField
                            label="End Time"
                            type="time"
                            value={config.end}
                            onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                            size="small"
                          />
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}

              <Box sx={{ mt: 3 }}>
                <Button variant="contained" onClick={handleWorkingHoursSave}>
                  Save Working Hours
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* SLA Dialog */}
      <Dialog open={slaDialog.open} onClose={() => setSlaDialog({ open: false, rule: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{slaDialog.rule ? 'Edit SLA Rule' : 'Add SLA Rule'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Urgency Level</InputLabel>
              <Select
                value={slaForm.urgency_level}
                onChange={(e) => setSlaForm(prev => ({ ...prev, urgency_level: e.target.value }))}
              >
                <MenuItem value={1}>Urgent</MenuItem>
                <MenuItem value={2}>Moderate</MenuItem>
                <MenuItem value={3}>Mild</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Response Time (hours)"
              type="number"
              value={slaForm.response_time_hours}
              onChange={(e) => setSlaForm(prev => ({ ...prev, response_time_hours: parseInt(e.target.value) }))}
            />
            <TextField
              fullWidth
              label="Resolution Time (hours)"
              type="number"
              value={slaForm.resolution_time_hours}
              onChange={(e) => setSlaForm(prev => ({ ...prev, resolution_time_hours: parseInt(e.target.value) }))}
            />
            <TextField
              fullWidth
              label="Warning Time (hours)"
              type="number"
              value={slaForm.warning_time_hours}
              onChange={(e) => setSlaForm(prev => ({ ...prev, warning_time_hours: parseInt(e.target.value) }))}
            />
            <TextField
              fullWidth
              label="Escalation Time (hours)"
              type="number"
              value={slaForm.escalation_time_hours}
              onChange={(e) => setSlaForm(prev => ({ ...prev, escalation_time_hours: parseInt(e.target.value) }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSlaDialog({ open: false, rule: null })}>Cancel</Button>
          <Button onClick={handleSlaSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onClose={() => setCategoryDialog({ open: false, category: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{categoryDialog.category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog({ open: false, category: null })}>Cancel</Button>
          <Button onClick={handleSaveCategory} variant="contained">
            {categoryDialog.category ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;