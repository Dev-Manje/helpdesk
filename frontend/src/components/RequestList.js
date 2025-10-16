import React, { useEffect, useState } from 'react';
import {
  Card, CardContent, Typography, Grid, Chip, Button, Box,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton,
  Tooltip, Badge, Tabs, Tab
} from '@mui/material';
import {
  Assignment, Schedule, PriorityHigh, CheckCircle,
  Error, Warning, Add, Search, FilterList
} from '@mui/icons-material';
import axios from 'axios';

const RequestList = ({ onViewTicket, refreshTrigger }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchRequests();
  }, [refreshTrigger]);

  useEffect(() => {
    filterRequests();
  }, [requests, filter, searchTerm, tabValue]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Filter by tab (for agents: assigned vs unassigned)
    if (tabValue === 1) { // Unassigned tickets (for agents)
      filtered = filtered.filter(req => !req.assigned_agent && req.status === 'open');
    } else if (tabValue === 2) { // Assigned tickets (for agents)
      filtered = filtered.filter(req => req.assigned_agent && req.status !== 'closed');
    }

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(req => req.status === filter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
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
      default: return <Assignment />;
    }
  };

  const getUrgencyLabel = (urgency) => {
    switch (urgency) {
      case 1: return 'Urgent';
      case 2: return 'Moderate';
      case 3: return 'Mild';
      default: return 'Normal';
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return <Typography>Loading tickets...</Typography>;
  }

  return (
    <Box>
      {/* Search and Filter Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
          }}
          sx={{ minWidth: 300 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="escalated">Escalated</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tabs for Agent View */}
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="All Tickets" />
        <Tab label="Unassigned" />
        <Tab label="My Tickets" />
      </Tabs>

      {/* Tickets Grid */}
      <Grid container spacing={2}>
        {filteredRequests.map((req) => (
          <Grid item xs={12} sm={6} md={4} key={req._id}>
            <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => onViewTicket && onViewTicket(req)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" sx={{ flex: 1, mr: 1 }}>
                    {req.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getUrgencyIcon(req.urgency_level)}
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {req.description.length > 100
                    ? `${req.description.substring(0, 100)}...`
                    : req.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={req.status}
                    color={getStatusColor(req.status)}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {req.category}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption">
                    {getUrgencyLabel(req.urgency_level)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(req.created_at).toLocaleDateString()}
                  </Typography>
                </Box>

                {req.sla_breached && (
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label="SLA Breached"
                      color="error"
                      size="small"
                      icon={<Error />}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredRequests.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No tickets found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default RequestList;