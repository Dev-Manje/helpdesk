import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Fade,
  Paper,
  TextField,
  Alert
} from '@mui/material';
import {
  SupportAgent,
  AccountCircle,
  Chat,
  Assignment,
  MenuBook,
  Logout,
  Add,
  AssignmentTurnedIn,
  Schedule,
  Warning,
  CheckCircle,
  Notifications,
  TrendingUp,
  AccessTime,
  People,
  Settings,
  Search,
  Clear,
  ShowChart
} from '@mui/icons-material';
import Chatbot from './Chatbot';
import RequestList from './RequestList';
import KnowledgeBase from './KnowledgeBase';
import NotificationCenter from './NotificationCenter';
import TicketDetail from './TicketDetail';
import axios from 'axios';

const Dashboard = ({ onLogout }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [userRole, setUserRole] = useState('client');
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalTickets: 0,
    openTickets: 0,
    slaBreached: 0,
    recentTickets: [],
    notifications: [],
    slaWarnings: [],
    personalStats: {
      avgResponseTime: 0,
      ticketsResolved: 0,
      chatbotInteractions: 0
    },
    activityTimeline: [],
    kbHighlights: [],
    ticketTrends: {
      thisWeek: 0,
      lastWeek: 0,
      trend: 0 // percentage change
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Admin users should not reach this component - they should be redirected by App.js

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Get user info to determine role
      const userRes = await axios.get('http://localhost:8000/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRole(userRes.data.role || 'client');
      setUserName(userRes.data.name || 'User');

      // For admin users, skip dashboard data fetching
      if (userRes.data.role === 'admin') {
        setLoading(false);
        return;
      }

      const [ticketsRes, notificationsRes, kbRes] = await Promise.all([
        axios.get('http://localhost:8000/requests', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/knowledge?limit=3', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const tickets = ticketsRes.data;
      const notifications = notificationsRes.data;
      const kbArticles = kbRes.data;

      // Calculate SLA warnings (tickets due within 24 hours)
      const currentTime = new Date();
      const tomorrow = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
      const slaWarnings = tickets.filter(ticket =>
        ticket.sla_due_date &&
        new Date(ticket.sla_due_date) <= tomorrow &&
        !ticket.sla_breached &&
        ticket.status !== 'resolved' &&
        ticket.status !== 'closed'
      );

      // Mock personal stats (in production, this would come from backend)
      const personalStats = {
        avgResponseTime: 2.3, // hours
        ticketsResolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        chatbotInteractions: 12 // This would come from chatbot analytics
      };

      // Calculate ticket trends (mock data - in production, this would be calculated from historical data)
      const trendNow = new Date();
      const oneWeekAgo = new Date(trendNow.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(trendNow.getTime() - 14 * 24 * 60 * 60 * 1000);

      const thisWeekTickets = tickets.filter(ticket =>
        new Date(ticket.created_at) >= oneWeekAgo
      ).length;

      const lastWeekTickets = tickets.filter(ticket =>
        new Date(ticket.created_at) >= twoWeeksAgo && new Date(ticket.created_at) < oneWeekAgo
      ).length;

      const trend = lastWeekTickets > 0 ? ((thisWeekTickets - lastWeekTickets) / lastWeekTickets) * 100 : 0;

      const ticketTrends = {
        thisWeek: thisWeekTickets,
        lastWeek: lastWeekTickets,
        trend: Math.round(trend)
      };

      // Mock activity timeline (in production, this would come from timeline API)
      const activityTimeline = [
        { type: 'ticket_created', description: 'Created ticket #1234', time: '2 hours ago' },
        { type: 'chatbot_interaction', description: 'Asked chatbot about password reset', time: '4 hours ago' },
        { type: 'ticket_resolved', description: 'Resolved ticket #1223', time: '1 day ago' }
      ];

      setDashboardData({
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        slaBreached: tickets.filter(t => t.sla_breached).length,
        recentTickets: tickets.slice(0, 5),
        notifications: notifications.slice(0, 5),
        slaWarnings,
        personalStats,
        activityTimeline,
        kbHighlights: kbArticles.slice(0, 3),
        ticketTrends
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseTicketDetail = () => {
    setSelectedTicket(null);
  };

  const handleTicketUpdate = () => {
    fetchDashboardData();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');

      // Search tickets
      const ticketResults = await axios.get(`http://localhost:8000/requests?search=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Search knowledge base
      const kbResults = await axios.get(`http://localhost:8000/knowledge?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Combine and format results
      const combinedResults = [
        ...ticketResults.data.slice(0, 3).map(ticket => ({
          type: 'ticket',
          id: ticket._id,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          status: ticket.status,
          created_at: ticket.created_at
        })),
        ...kbResults.data.slice(0, 3).map(article => ({
          type: 'kb',
          id: article.id || article._id,
          title: article.title,
          description: article.summary || article.content?.substring(0, 100) + '...',
          category: article.category,
          views: article.views || 0
        }))
      ];

      setSearchResults(combinedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchResultClick = (result) => {
    if (result.type === 'ticket') {
      handleViewTicket(result);
    } else if (result.type === 'kb') {
      window.location.hash = '#knowledge';
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: color, mr: 2 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  // Admin users get admin-specific dashboard content
  if (userRole === 'admin') {
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Fade in={true} timeout={600}>
            <Box>
              {/* Admin Dashboard Welcome */}
              <Typography variant="h4" sx={{ mb: 1, fontWeight: 300 }}>
                Admin Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Manage users, system settings, and oversee the helpdesk operations.
              </Typography>

              {/* Admin Quick Actions */}
              <Paper sx={{ p: 3, mb: 4, bgcolor: 'grey.50' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<People />}
                    onClick={() => window.location.hash = '#admin'}
                    sx={{ background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)' }}
                  >
                    Manage Users
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Settings />}
                    onClick={() => window.location.hash = '#settings'}
                  >
                    System Settings
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Assignment />}
                    onClick={() => window.location.hash = '#requests'}
                  >
                    View All Tickets
                  </Button>
                </Box>
              </Paper>

              {/* Admin Statistics */}
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="Total Users"
                    value="5" // This would be dynamic in production
                    icon={<People />}
                    color="primary.main"
                    subtitle="Active users"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="Active Agents"
                    value="3" // This would be dynamic in production
                    icon={<SupportAgent />}
                    color="success.main"
                    subtitle="Available now"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="Open Tickets"
                    value={dashboardData.openTickets}
                    icon={<Assignment />}
                    color="warning.main"
                    subtitle="Require attention"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="SLA Breached"
                    value={dashboardData.slaBreached}
                    icon={<Warning />}
                    color="error.main"
                    subtitle="Need urgent action"
                  />
                </Grid>
 
                {/* Recent Notifications */}
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <Notifications sx={{ mr: 1 }} />
                      Notifications
                    </Typography>
                    <List>
                      {dashboardData.notifications.map((notification, index) => (
                        <React.Fragment key={notification.id}>
                          <ListItem sx={{ borderRadius: 1, mb: 1 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'info.main' }}>
                                <Notifications fontSize="small" />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={notification.title}
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {notification.message}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(notification.created_at).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              }
                            />
                            {!notification.is_read && (
                              <Chip label="New" size="small" color="primary" />
                            )}
                          </ListItem>
                          {index < dashboardData.notifications.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                    {dashboardData.notifications.length === 0 && (
                      <Typography variant="body2" color="text.secondary" align="center">
                        No notifications
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Fade in={true} timeout={600}>
          <Box>
            {/* Welcome Section */}
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 300 }}>
              Welcome back, {userName}!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Here's an overview of your support tickets and recent activity.
            </Typography>

            {/* Quick Search */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quick Search
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Search tickets and knowledge base..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  sx={{ minWidth: 'auto', px: 3 }}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
                {(searchQuery || searchResults.length > 0) && (
                  <IconButton onClick={handleClearSearch} size="small">
                    <Clear />
                  </IconButton>
                )}
              </Box>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Search Results ({searchResults.length})
                  </Typography>
                  <List dense>
                    {searchResults.map((result, index) => (
                      <ListItem
                        key={index}
                        button
                        onClick={() => handleSearchResultClick(result)}
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{
                            bgcolor: result.type === 'ticket' ? 'primary.main' : 'secondary.main',
                            width: 32,
                            height: 32
                          }}>
                            {result.type === 'ticket' ? <Assignment fontSize="small" /> : <MenuBook fontSize="small" />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">
                                {result.title}
                              </Typography>
                              <Chip
                                label={result.type === 'ticket' ? result.status : result.category}
                                size="small"
                                color={result.type === 'ticket' ? 'primary' : 'secondary'}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {result.description}
                              {result.type === 'kb' && result.views && ` • ${result.views} views`}
                              {result.type === 'ticket' && result.created_at && ` • ${new Date(result.created_at).toLocaleDateString()}`}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No results found for "{searchQuery}"
                </Typography>
              )}
            </Paper>

            {/* SLA Warning Banner */}
            {dashboardData.slaWarnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ SLA Deadline Approaching
                </Typography>
                <Typography variant="body2">
                  {dashboardData.slaWarnings.length} ticket{dashboardData.slaWarnings.length > 1 ? 's' : ''} will breach SLA within 24 hours.
                  <Button
                    size="small"
                    sx={{ ml: 2, textTransform: 'none' }}
                    onClick={() => window.location.hash = '#tickets'}
                  >
                    View Tickets
                  </Button>
                </Typography>
              </Alert>
            )}

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Tickets"
                  value={dashboardData.totalTickets}
                  icon={<Assignment />}
                  color="primary.main"
                  subtitle="All time"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Open Tickets"
                  value={dashboardData.openTickets}
                  icon={<Schedule />}
                  color="warning.main"
                  subtitle="Require attention"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="SLA Breached"
                  value={dashboardData.slaBreached}
                  icon={<Warning />}
                  color="error.main"
                  subtitle="Need urgent action"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Resolved"
                  value={dashboardData.totalTickets - dashboardData.openTickets}
                  icon={<CheckCircle />}
                  color="success.main"
                  subtitle="This month"
                />
              </Grid>
            </Grid>

            {/* Personal Productivity Metrics - Single Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={3}>
                <StatCard
                  title="Avg Response Time"
                  value={`${dashboardData.personalStats.avgResponseTime}h`}
                  icon={<AccessTime />}
                  color="info.main"
                  subtitle="Your average"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <StatCard
                  title="Tickets Resolved"
                  value={dashboardData.personalStats.ticketsResolved}
                  icon={<AssignmentTurnedIn />}
                  color="success.main"
                  subtitle="By you this month"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <StatCard
                  title="AI Interactions"
                  value={dashboardData.personalStats.chatbotInteractions}
                  icon={<Chat />}
                  color="secondary.main"
                  subtitle="This week"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <StatCard
                  title="Ticket Trend"
                  value={`${dashboardData.ticketTrends.trend > 0 ? '+' : ''}${dashboardData.ticketTrends.trend}%`}
                  icon={<ShowChart />}
                  color={dashboardData.ticketTrends.trend >= 0 ? "success.main" : "error.main"}
                  subtitle={`${dashboardData.ticketTrends.thisWeek} this week`}
                />
              </Grid>
            </Grid>


            {/* Recent Activity */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Recent Tickets */}
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Assignment sx={{ mr: 1 }} />
                    Recent Tickets
                  </Typography>
                  <List>
                    {dashboardData.recentTickets.map((ticket, index) => (
                      <React.Fragment key={ticket._id}>
                        <ListItem
                          button
                          onClick={() => handleViewTicket(ticket)}
                          sx={{ borderRadius: 1, mb: 1 }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: ticket.sla_breached ? 'error.main' : 'primary.main' }}>
                              <Assignment fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={ticket.title}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Status: {ticket.status} • {new Date(ticket.created_at).toLocaleDateString()}
                                </Typography>
                                {ticket.sla_breached && (
                                  <Chip label="SLA Breached" size="small" color="error" sx={{ mt: 0.5 }} />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < dashboardData.recentTickets.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  {dashboardData.recentTickets.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No tickets yet
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* Personal Activity Timeline */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <TrendingUp sx={{ mr: 1 }} />
                    Your Recent Activity
                  </Typography>
                  <List>
                    {dashboardData.activityTimeline.map((activity, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ borderRadius: 1, mb: 1 }}>
                          <ListItemAvatar>
                            <Avatar sx={{
                              bgcolor: activity.type === 'ticket_created' ? 'primary.main' :
                                      activity.type === 'chatbot_interaction' ? 'secondary.main' : 'success.main'
                            }}>
                              {activity.type === 'ticket_created' ? <Assignment /> :
                               activity.type === 'chatbot_interaction' ? <Chat /> : <CheckCircle />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={activity.description}
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {activity.time}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {index < dashboardData.activityTimeline.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  {dashboardData.activityTimeline.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No recent activity
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* Recent Notifications */}
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Notifications sx={{ mr: 1 }} />
                    Notifications
                  </Typography>
                  <List>
                    {dashboardData.notifications.map((notification, index) => (
                      <React.Fragment key={notification.id}>
                        <ListItem sx={{ borderRadius: 1, mb: 1 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'info.main' }}>
                              <Notifications fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={notification.title}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {notification.message}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(notification.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                          />
                          {!notification.is_read && (
                            <Chip label="New" size="small" color="primary" />
                          )}
                        </ListItem>
                        {index < dashboardData.notifications.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  {dashboardData.notifications.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No notifications
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Knowledge Base Highlights */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <MenuBook sx={{ mr: 1 }} />
                Knowledge Base Highlights
              </Typography>
              <Grid container spacing={2}>
                {dashboardData.kbHighlights.map((article, index) => (
                  <Grid item xs={12} md={4} key={article.id || index}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3
                        }
                      }}
                      onClick={() => window.location.hash = '#knowledge'}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                          {article.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {article.summary || article.content?.substring(0, 80) + '...'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip
                            label={article.category}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {article.views || 0} views
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              {dashboardData.kbHighlights.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center">
                  No knowledge base articles available
                </Typography>
              )}
            </Paper>
          </Box>
        </Fade>
      </Container>

      {/* Ticket Detail Modal */}
      <TicketDetail
        ticket={selectedTicket}
        onClose={handleCloseTicketDetail}
        onUpdate={handleTicketUpdate}
      />

    </Box>
  );
};

export default Dashboard;