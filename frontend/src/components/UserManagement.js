import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Autocomplete,
  Checkbox
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  AdminPanelSettings,
  SupportAgent,
  Business,
  SupervisorAccount
} from '@mui/icons-material';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [availableCategories, setAvailableCategories] = useState([]);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    status: 'active',
    department_id: '',
    agent_level: null,
    skills: [],
    categories: [],
    max_concurrent_tickets: 5
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:8000/requests/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to default categories if API fails
      setAvailableCategories([
        "Hardware Issues",
        "Software Issues",
        "Network & Connectivity",
        "Email & Communication",
        "Account & Security",
        "Printer & Peripherals",
        "General Support",
        "Other"
      ]);
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

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'client',
      status: 'active',
      department_id: '',
      agent_level: null,
      skills: [],
      categories: [],
      max_concurrent_tickets: 5
    });
    setDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      password: '', // Don't populate password for editing
      role: user.role || 'client',
      status: user.status || 'active',
      department_id: user.department_id || '',
      agent_level: user.agent_level || null,
      skills: user.skills || [],
      categories: user.categories || [],
      max_concurrent_tickets: user.max_concurrent_tickets || 5
    });
    setDialogOpen(true);
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`http://localhost:8000/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchUsers();
        showSnackbar('User deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting user:', error);
        showSnackbar('Failed to delete user', 'error');
      }
    }
  };

  const handleSaveUser = async () => {
    try {
      const userData = { ...userForm };

      // Remove empty password for updates
      if (!userData.password && editingUser) {
        delete userData.password;
      }

      // Convert skills string to array if needed
      if (typeof userData.skills === 'string') {
        userData.skills = userData.skills.split(',').map(s => s.trim()).filter(s => s);
      }

      if (editingUser) {
        await axios.put(`http://localhost:8000/users/${editingUser.id}`, userData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('User updated successfully', 'success');
      } else {
        await axios.post('http://localhost:8000/users', userData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('User created successfully', 'success');
      }

      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      showSnackbar('Failed to save user', 'error');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <AdminPanelSettings />;
      case 'manager': return <SupervisorAccount />;
      case 'agent': return <SupportAgent />;
      case 'client': return <Person />;
      default: return <Person />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'agent': return 'info';
      case 'client': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'busy': return 'warning';
      case 'offline': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Typography>Loading users...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main' }}>
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateUser}
          sx={{ borderRadius: 2 }}
        >
          Add User
        </Button>
      </Box>

      {/* Users Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Department</strong></TableCell>
                  <TableCell><strong>Agent Level</strong></TableCell>
                  <TableCell><strong>Skills</strong></TableCell>
                  <TableCell><strong>Categories</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                          label={`${user.status || 'active'} (${user.current_ticket_count || 0}/${user.max_concurrent_tickets || 5})`}
                          color={getStatusColor(user.status || 'active')}
                          size="small"
                          variant="filled"
                        />
                      </TableCell>
                    <TableCell>{user.department_id || 'N/A'}</TableCell>
                    <TableCell>
                      {user.agent_level ? `Level ${user.agent_level}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {user.skills && user.skills.length > 0
                        ? user.skills.map(skill => (
                            <Chip key={skill} label={skill} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {user.categories && user.categories.length > 0
                        ? user.categories.map(category => (
                            <Chip key={category} label={category} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                        sx={{ color: 'primary.main', mr: 1 }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        sx={{ color: 'error.main' }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {users.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No users found
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                fullWidth
                required
                disabled={!!editingUser} // Can't change email when editing
              />
            </Box>

            {!editingUser && (
              <TextField
                label="Password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                fullWidth
                required
                helperText="Minimum 6 characters"
              />
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <MenuItem value="client">Client</MenuItem>
                  <MenuItem value="agent">Agent</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={userForm.status}
                  onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="busy">Busy</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Department ID"
                value={userForm.department_id}
                onChange={(e) => setUserForm({ ...userForm, department_id: e.target.value })}
                fullWidth
                helperText="Optional department identifier"
              />
            </Box>

            {userForm.role === 'agent' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Agent Level</InputLabel>
                    <Select
                      value={userForm.agent_level || ''}
                      onChange={(e) => setUserForm({ ...userForm, agent_level: e.target.value })}
                    >
                      <MenuItem value={1}>Level 1 - Urgent/Critical</MenuItem>
                      <MenuItem value={2}>Level 2 - Moderate</MenuItem>
                      <MenuItem value={3}>Level 3 - Mild/General</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Max Concurrent Tickets"
                    type="number"
                    value={userForm.max_concurrent_tickets}
                    onChange={(e) => setUserForm({ ...userForm, max_concurrent_tickets: parseInt(e.target.value) || 5 })}
                    fullWidth
                    helperText="Maximum tickets this agent can handle simultaneously"
                    inputProps={{ min: 1, max: 20 }}
                  />
                </Box>

                <TextField
                  label="Skills"
                  value={userForm.skills.join(', ')}
                  onChange={(e) => setUserForm({
                    ...userForm,
                    skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                  fullWidth
                  helperText="Comma-separated skills (e.g., hardware, network, software)"
                />

                <Autocomplete
                  multiple
                  options={availableCategories}
                  value={userForm.categories}
                  onChange={(event, newValue) => {
                    setUserForm({
                      ...userForm,
                      categories: newValue
                    });
                  }}
                  disableCloseOnSelect
                  getOptionLabel={(option) => option}
                  renderOption={(props, option, { selected }) => (
                    <li {...props}>
                      <Checkbox
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {option}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Categories"
                      placeholder="Select categories this agent can handle"
                      helperText="Search and select multiple categories"
                    />
                  )}
                  fullWidth
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            disabled={!userForm.name || !userForm.email || (!editingUser && !userForm.password)}
          >
            {editingUser ? 'Update User' : 'Create User'}
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

export default UserManagement;