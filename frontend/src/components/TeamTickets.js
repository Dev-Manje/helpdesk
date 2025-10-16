import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, TextField,
  Alert, Snackbar, IconButton, Tooltip, Grid, Card, CardContent,
  InputAdornment, FormControlLabel, Checkbox
} from '@mui/material';
import {
  Visibility, SwapHoriz, Person, Schedule, PriorityHigh,
  Search, FilterList, Refresh
} from '@mui/icons-material';
import axios from 'axios';

const TeamTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reassignDialog, setReassignDialog] = useState({ open: false, ticket: null });
  const [selectedAgent, setSelectedAgent] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [overrideCapacity, setOverrideCapacity] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    agent: 'all',
    priority: 'all'
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTeamTickets();
    fetchAgents();
  }, []);

  const fetchTeamTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching team tickets:', error);
      showSnackbar('Error loading team tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get('http://localhost:8000/agents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleReassignClick = (ticket) => {
    setReassignDialog({ open: true, ticket });
    setSelectedAgent('');
    setReassignReason('');
    setOverrideCapacity(false);
  };

  const handleReassignConfirm = async () => {
    if (!selectedAgent) {
      showSnackbar('Please select an agent', 'warning');
      return;
    }

    try {
      const updateData = {
        assigned_agent: selectedAgent,
        status: 'assigned'
      };

      await axios.put(`http://localhost:8000/requests/${reassignDialog.ticket._id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Create timeline entry for reassignment
      await axios.post(`http://localhost:8000/requests/${reassignDialog.ticket._id}/comments`, {
        content: `Ticket reassigned to ${agents.find(a => a.id === selectedAgent)?.name || 'new agent'}. Reason: ${reassignReason || 'Manager reassignment'}`,
        comment_type: 'system',
        is_internal: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSnackbar('Ticket reassigned successfully');
      setReassignDialog({ open: false, ticket: null });
      fetchTeamTickets(); // Refresh the list

    } catch (error) {
      console.error('Error reassigning ticket:', error);
      showSnackbar('Error reassigning ticket', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'warning';
      case 'assigned': return 'info';
      case 'in_progress': return 'primary';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Unassigned';
  };

  const getAgentCapacity = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;
    return `${agent.current_ticket_count || 0}/${agent.max_capacity || 5}`;
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !filters.search ||
      ticket.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      ticket.description.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus = filters.status === 'all' || ticket.status === filters.status;
    const matchesAgent = filters.agent === 'all' || ticket.assigned_agent === filters.agent;
    const matchesPriority = filters.priority === 'all' || ticket.priority === filters.priority;

    return matchesSearch && matchesStatus && matchesAgent && matchesPriority;
  });

  const selectedAgentInfo = agents.find(a => a.id === selectedAgent);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Team Tickets Management
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Agent</InputLabel>
              <Select
                value={filters.agent}
                onChange={(e) => setFilters(prev => ({ ...prev, agent: e.target.value }))}
              >
                <MenuItem value="all">All Agents</MenuItem>
                {agents.map(agent => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <MenuItem value="all">All Priority</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchTeamTickets}
              fullWidth
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tickets Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ticket ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned Agent</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket._id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {ticket._id.slice(-8)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ticket.title}
                  </Typography>
                </TableCell>
                <TableCell>{ticket.category}</TableCell>
                <TableCell>
                  <Chip
                    label={ticket.priority || 'medium'}
                    color={getPriorityColor(ticket.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={ticket.status}
                    color={getStatusColor(ticket.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      {getAgentName(ticket.assigned_agent)}
                    </Typography>
                    {ticket.assigned_agent && (
                      <Typography variant="caption" color="text.secondary">
                        {getAgentCapacity(ticket.assigned_agent)}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton size="small" color="primary">
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reassign Ticket">
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => handleReassignClick(ticket)}
                    >
                      <SwapHoriz />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredTickets.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No tickets found matching your filters
          </Typography>
        </Box>
      )}

      {/* Reassignment Dialog */}
      <Dialog
        open={reassignDialog.open}
        onClose={() => setReassignDialog({ open: false, ticket: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reassign Ticket {reassignDialog.ticket?._id.slice(-8)}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {reassignDialog.ticket && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Assignment
                </Typography>
                <Typography variant="body2">
                  <strong>Agent:</strong> {getAgentName(reassignDialog.ticket.assigned_agent)}
                </Typography>
                <Typography variant="body2">
                  <strong>Title:</strong> {reassignDialog.ticket.title}
                </Typography>
                <Typography variant="body2">
                  <strong>Category:</strong> {reassignDialog.ticket.category}
                </Typography>
              </Box>
            )}

            <FormControl fullWidth>
              <InputLabel>Select New Agent</InputLabel>
              <Select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                label="Select New Agent"
              >
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    <Box>
                      <Typography variant="body2">
                        {agent.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Capacity: {agent.current_ticket_count || 0}/{agent.max_capacity || 5} •
                        Skills: {agent.categories?.join(', ') || 'General'}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedAgentInfo && (
              <Alert severity={
                (selectedAgentInfo.current_ticket_count || 0) >= (selectedAgentInfo.max_capacity || 5) ? 'warning' : 'info'
              }>
                <Typography variant="body2">
                  <strong>{selectedAgentInfo.name}</strong> current capacity: {selectedAgentInfo.current_ticket_count || 0}/{selectedAgentInfo.max_capacity || 5}
                  {selectedAgentInfo.categories?.includes(reassignDialog.ticket?.category) && (
                    <span> • Has expertise in {reassignDialog.ticket?.category}</span>
                  )}
                </Typography>
              </Alert>
            )}

            <TextField
              fullWidth
              label="Reason for Reassignment (Optional)"
              multiline
              rows={2}
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="e.g., Agent on leave, workload balancing, skill mismatch..."
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={overrideCapacity}
                  onChange={(e) => setOverrideCapacity(e.target.checked)}
                />
              }
              label="Override capacity limits (assign even if agent is at max capacity)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialog({ open: false, ticket: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleReassignConfirm}
            variant="contained"
            disabled={!selectedAgent}
          >
            Reassign Ticket
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

export default TeamTickets;