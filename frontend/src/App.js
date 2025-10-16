import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment,
  Chat,
  MenuBook,
  People,
  Settings,
  Business,
  Assessment
} from '@mui/icons-material';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TeamTickets from './components/TeamTickets';
import ReportsDashboard from './components/ReportsDashboard';
import RequestList from './components/RequestList';
import Chatbot from './components/Chatbot';
import KnowledgeBase from './components/KnowledgeBase';
import TicketDetail from './components/TicketDetail';
import SystemSettings from './components/SystemSettings';
import UserManagement from './components/UserManagement';
import Layout from './components/Layout';
import theme from './theme';

// Navigation configuration by role
const NAVIGATION_CONFIG = {
  admin: [
    { label: 'Dashboard', view: 'dashboard', icon: DashboardIcon },
    { label: 'User Management', view: 'users', icon: People },
    { label: 'System Settings', view: 'settings', icon: Settings }
  ],
  manager: [
    { label: 'Dashboard', view: 'dashboard', icon: DashboardIcon },
    { label: 'Analytics', view: 'analytics', icon: Assessment },
    { label: 'Team Tickets', view: 'team-tickets', icon: Assignment },
    { label: 'Reports', view: 'reports', icon: Business }
  ],
  agent: [
    { label: 'Dashboard', view: 'dashboard', icon: DashboardIcon },
    { label: 'My Tickets', view: 'tickets', icon: Assignment },
    { label: 'AI Assistant', view: 'chatbot', icon: Chat },
    { label: 'Knowledge Base', view: 'knowledge', icon: MenuBook }
  ],
  user: [
    { label: 'Dashboard', view: 'dashboard', icon: DashboardIcon },
    { label: 'My Tickets', view: 'tickets', icon: Assignment },
    { label: 'AI Assistant', view: 'chatbot', icon: Chat },
    { label: 'Knowledge Base', view: 'knowledge', icon: MenuBook }
  ],
  client: [
    { label: 'Dashboard', view: 'dashboard', icon: DashboardIcon },
    { label: 'My Tickets', view: 'tickets', icon: Assignment },
    { label: 'AI Assistant', view: 'chatbot', icon: Chat },
    { label: 'Knowledge Base', view: 'knowledge', icon: MenuBook }
  ]
};

function App() {
  const token = localStorage.getItem('token');
  const [currentView, setCurrentView] = useState('loading');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userRoleLoaded, setUserRoleLoaded] = useState(false);

  useEffect(() => {
    // Fetch user role on app load
    const fetchUserRole = async () => {
      if (token) {
        try {
          const response = await fetch('http://localhost:8000/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userData = await response.json();
          setUserRole(userData.role || 'client');
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('client');
        }
      }
      setUserRoleLoaded(true);
    };

    fetchUserRole();
  }, [token]);

  useEffect(() => {
    // Set initial view based on user role after it's loaded
    if (userRoleLoaded) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setCurrentView(hash);
      } else {
        // All users start with dashboard, regardless of role
        setCurrentView('dashboard');
      }
    }
  }, [userRole, userRoleLoaded]);

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseTicketDetail = () => {
    setSelectedTicket(null);
  };

  const handleTicketUpdate = () => {
    // Refresh data if needed
  };

  const handleNavigate = (view) => {
    console.log('Navigating to:', view);
    setCurrentView(view);
    // Update URL hash for bookmarkability
    window.location.hash = view;
  };

  const renderCurrentView = () => {
    const layoutProps = {
      onLogout: () => {
        localStorage.removeItem('token');
        window.location.reload();
      },
      onNavigate: handleNavigate,
      currentView,
      userRole,
      navigationConfig: NAVIGATION_CONFIG
    };

    switch (currentView) {
      case 'tickets':
        return (
          <Layout {...layoutProps} showBackButton={true} title="My Tickets">
            <RequestList
              onViewTicket={handleViewTicket}
              refreshTrigger={0}
            />
          </Layout>
        );
      case 'chatbot':
        return (
          <Layout {...layoutProps} showBackButton={true} title="AI Assistant">
            <Chatbot />
          </Layout>
        );
      case 'knowledge':
        return (
          <Layout {...layoutProps} showBackButton={true} title="Knowledge Base">
            <KnowledgeBase />
          </Layout>
        );
      case 'settings':
        return (
          <Layout {...layoutProps} showBackButton={true} title="System Settings">
            <SystemSettings />
          </Layout>
        );
      case 'users':
        return (
          <Layout {...layoutProps} title="User Management">
            <UserManagement />
          </Layout>
        );
      case 'analytics':
        return (
          <Layout {...layoutProps} title="Analytics Dashboard">
            <AnalyticsDashboard />
          </Layout>
        );
      case 'team-tickets':
        return (
          <Layout {...layoutProps} title="Team Tickets">
            <TeamTickets />
          </Layout>
        );
      case 'reports':
        return (
          <Layout {...layoutProps} title="Reports">
            <ReportsDashboard />
          </Layout>
        );
      default:
        return (
          <Layout {...layoutProps} title="Dashboard">
            <Dashboard />
          </Layout>
        );
    }
  };

  // Show loading while determining user role
  if (token && !userRoleLoaded) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6">Loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: token ? 'background.default' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {token ? (
          <>
            {renderCurrentView()}
            <TicketDetail
              ticket={selectedTicket}
              onClose={handleCloseTicketDetail}
              onUpdate={handleTicketUpdate}
            />
          </>
        ) : (
          <Login onLogin={() => {
            window.location.hash = '';
            window.location.reload();
          }} />
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
