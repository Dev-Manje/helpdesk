import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import {
  SupportAgent,
  AccountCircle,
  Logout,
  ArrowBack,
  Assignment,
  Chat,
  MenuBook,
  Dashboard,
  People,
  Settings,
  Business,
  Lock,
} from '@mui/icons-material';
import NotificationCenter from './NotificationCenter';
import FloatingChatbot from './FloatingChatbot';
import axios from 'axios';
import { useState, useEffect } from 'react';

const Layout = ({
  children,
  onLogout,
  onNavigate,
  showBackButton = false,
  title = "HelpMate",
  currentView = "",
  userRole = null,
  navigationConfig = {}
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false);
  const [passwordData, setPasswordData] = React.useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordError, setPasswordError] = React.useState('');
  const [passwordSuccess, setPasswordSuccess] = React.useState('');

  // Get navigation items for current user role
  const navigationItems = navigationConfig[userRole] || navigationConfig['client'] || [];

  // Calculate current tab index
  const getCurrentTabIndex = () => {
    const currentItemIndex = navigationItems.findIndex(item => item.view === currentView);
    return currentItemIndex >= 0 ? currentItemIndex : 0;
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  const handlePasswordChange = () => {
    handleMenuClose();
    setPasswordDialogOpen(true);
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
    setPasswordData({ current: '', new: '', confirm: '' });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.new.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('current_password', passwordData.current);
      formData.append('new_password', passwordData.new);

      const response = await axios.post('http://localhost:8000/auth/change-password', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => {
        handlePasswordDialogClose();
      }, 2000);
    } catch (error) {
      setPasswordError(error.response?.data?.detail || 'Failed to change password');
    }
  };

  const handleBack = () => {
    window.location.hash = '';
  };

  const handleTabChange = (event, newValue) => {
    console.log('Tab clicked:', newValue, 'navigation items:', navigationItems.length);

    // Navigate using the navigation config
    if (navigationItems[newValue]) {
      const targetView = navigationItems[newValue].view;
      console.log('Navigating to:', targetView);
      onNavigate(targetView);
    } else {
      console.log('Invalid tab index:', newValue);
      onNavigate('dashboard'); // fallback
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ px: 3 }}>
          {showBackButton && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              <ArrowBack />
            </IconButton>
          )}
          <Avatar
            sx={{
              mr: 2,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              width: 40,
              height: 40,
            }}
          >
            <SupportAgent />
          </Avatar>
          <Typography
            variant="h5"
            component="div"
            sx={{
              mr: 3,
              fontWeight: 300,
              color: 'white',
            }}
          >
            {userRole === 'admin' ? 'Admin Dashboard' : title}
          </Typography>

          {/* Navigation Tabs - Configuration-based */}
          {userRole && navigationItems.length > 0 && (
            <Tabs
              value={getCurrentTabIndex()}
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="secondary"
              sx={{
                flexGrow: 1,
                '& .MuiTab-root': {
                  minWidth: 100,
                  fontSize: '0.875rem',
                  fontWeight: 400,
                  cursor: 'pointer !important',
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 1.5,
                },
              }}
            >
              {navigationItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <Tab
                    key={item.view}
                    icon={<IconComponent />}
                    label={item.label}
                    data-view={item.view}
                  />
                );
              })}
            </Tabs>
          )}

          <NotificationCenter />
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handlePasswordChange}>
              <Lock sx={{ mr: 1 }} />
              Change Password
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={handlePasswordDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Current Password"
              type="password"
              value={passwordData.current}
              onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="New Password"
              type="password"
              value={passwordData.new}
              onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              fullWidth
              required
              helperText="Password must be at least 6 characters long"
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              fullWidth
              required
            />
            {passwordError && (
              <Alert severity="error">{passwordError}</Alert>
            )}
            {passwordSuccess && (
              <Alert severity="success">{passwordSuccess}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePasswordDialogClose}>Cancel</Button>
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            disabled={!passwordData.current || !passwordData.new || !passwordData.confirm}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Chatbot */}
      <FloatingChatbot />
    </Box>
  );
};

export default Layout;