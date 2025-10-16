import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress,
  Alert, CircularProgress, Tabs, Tab, Button, FormControl, InputLabel,
  Select, MenuItem, TextField
} from '@mui/material';
import {
  Assessment, TrendingUp, AccessTime, CheckCircle, Warning,
  People, Category, PriorityHigh, Timeline, SmartToy, ThumbUp
} from '@mui/icons-material';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [summaryData, setSummaryData] = useState({});
  const [statusData, setStatusData] = useState({});
  const [categoryData, setCategoryData] = useState({});
  const [agentData, setAgentData] = useState({});
  const [trendData, setTrendData] = useState({});
  const [slaData, setSlaData] = useState({});
  const [priorityData, setPriorityData] = useState({});
  const [chatbotData, setChatbotData] = useState({});
  const [chatbotEfficiencyData, setChatbotEfficiencyData] = useState({});
  const [dateRange, setDateRange] = useState(30);
  const [groupBy, setGroupBy] = useState('daily');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAllAnalytics();
  }, [dateRange, groupBy, selectedCategory]);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        summaryRes,
        statusRes,
        categoryRes,
        agentRes,
        trendRes,
        slaRes,
        priorityRes,
        chatbotRes,
        chatbotEfficiencyRes
      ] = await Promise.all([
        axios.get('http://localhost:8000/analytics/dashboard-summary', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/analytics/ticket-status-distribution', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/analytics/category-breakdown', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/analytics/agent-performance', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:8000/analytics/ticket-trends?days=${dateRange}&group_by=${groupBy}&category=${selectedCategory}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/analytics/sla-compliance', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/analytics/priority-distribution', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/analytics/chatbot-summary', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:8000/analytics/chatbot-efficiency?days=${dateRange}&group_by=${groupBy}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setSummaryData(summaryRes.data);
      setStatusData(statusRes.data);
      setCategoryData(categoryRes.data);
      setAgentData(agentRes.data);
      setTrendData(trendRes.data);
      setSlaData(slaRes.data);
      setPriorityData(priorityRes.data);
      setChatbotData(chatbotRes.data);
      setChatbotEfficiencyData(chatbotEfficiencyRes.data);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Analytics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchAllAnalytics}>
          Retry
        </Button>
      </Box>
    );
  }

  // Status distribution chart data
  const statusChartData = {
    labels: statusData.distribution?.map(item => item.status) || [],
    datasets: [{
      data: statusData.distribution?.map(item => item.count) || [],
      backgroundColor: [
        '#ff9800', // open - orange
        '#2196f3', // assigned - blue
        '#ff5722', // in_progress - red
        '#4caf50', // resolved - green
        '#9c27b0'  // closed - purple
      ],
      borderWidth: 1,
    }],
  };

  // Category chart data
  const categoryChartData = {
    labels: categoryData.categories?.map(item => item.category) || [],
    datasets: [{
      label: 'Tickets',
      data: categoryData.categories?.map(item => item.count) || [],
      backgroundColor: '#2196f3',
      borderColor: '#1976d2',
      borderWidth: 1,
    }],
  };

  // Trend chart data
  const trendChartData = {
    labels: trendData.trends?.map(item => {
      if (trendData.group_by === 'weekly') {
        return `Week ${item.period.split('-')[1]}`;
      } else if (trendData.group_by === 'monthly') {
        const [year, month] = item.period.split('-');
        return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        const date = new Date(item.period);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }) || [],
    datasets: [
      {
        label: 'Created',
        data: trendData.trends?.map(item => item.created) || [],
        borderColor: '#ff5722',
        backgroundColor: '#ff5722',
        tension: 0.1,
      },
      {
        label: 'Resolved',
        data: trendData.trends?.map(item => item.resolved) || [],
        borderColor: '#4caf50',
        backgroundColor: '#4caf50',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main' }}>
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
              <MenuItem value={180}>Last 6 months</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Group By</InputLabel>
            <Select
              value={groupBy}
              label="Group By"
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={fetchAllAnalytics} startIcon={<Assessment />}>
            Refresh Data
          </Button>
        </Box>
      </Box>

      {/* Executive Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Total Tickets</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {summaryData.total_tickets || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTime sx={{ mr: 1, color: 'orange' }} />
                <Typography variant="h6">Open Tickets</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'orange' }}>
                {summaryData.open_tickets || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e8' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Resolved Today</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {summaryData.resolved_today || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fce4ec' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">SLA Compliance</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                {summaryData.sla_compliance_percentage || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Active Agents</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {summaryData.active_agents || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Timeline sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Avg Resolution Time</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {summaryData.avg_resolution_time_hours || 0}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PriorityHigh sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="h6">Escalated Tickets</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {summaryData.escalated_tickets || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chatbot Analytics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e1f5fe' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Chatbot Queries</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {chatbotData.total_interactions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f3e5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ThumbUp sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">Resolution Rate</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                {chatbotData.resolution_rate_percentage || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e8' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Time Saved (min)</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {chatbotEfficiencyData.estimated_time_saved_minutes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Cost Saved ($)</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                ${chatbotEfficiencyData.estimated_cost_saved_usd || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Analytics Sections */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<Assessment />} label="Status Overview" />
          <Tab icon={<Category />} label="Categories" />
          <Tab icon={<People />} label="Agent Performance" />
          <Tab icon={<TrendingUp />} label="Trends" />
          <Tab icon={<CheckCircle />} label="SLA Compliance" />
          <Tab icon={<SmartToy />} label="Chatbot Analytics" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Status Overview Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Ticket Status Distribution</Typography>
                    <Box sx={{ height: 300 }}>
                      <Pie data={statusChartData} options={chartOptions} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Status Breakdown</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Count</TableCell>
                            <TableCell align="right">Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {statusData.distribution?.map((item) => (
                            <TableRow key={item.status}>
                              <TableCell>
                                <Chip
                                  label={item.status}
                                  size="small"
                                  color={
                                    item.status === 'open' ? 'warning' :
                                    item.status === 'assigned' ? 'info' :
                                    item.status === 'resolved' ? 'success' :
                                    item.status === 'closed' ? 'default' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell align="right">{item.count}</TableCell>
                              <TableCell align="right">{item.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Categories Tab */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Tickets by Category</Typography>
                    <Box sx={{ height: 400 }}>
                      <Bar data={categoryChartData} options={chartOptions} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Category Details</Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Tickets</TableCell>
                            <TableCell align="right">Percentage</TableCell>
                            <TableCell>Progress</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {categoryData.categories?.map((item) => (
                            <TableRow key={item.category}>
                              <TableCell>{item.category}</TableCell>
                              <TableCell align="right">{item.count}</TableCell>
                              <TableCell align="right">{item.percentage}%</TableCell>
                              <TableCell sx={{ width: 200 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={item.percentage}
                                  sx={{ height: 8, borderRadius: 4 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Agent Performance Tab */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Agent Performance Metrics</Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Agent Name</TableCell>
                            <TableCell align="right">Assigned</TableCell>
                            <TableCell align="right">Resolved</TableCell>
                            <TableCell align="right">Avg Time (h)</TableCell>
                            <TableCell align="right">SLA %</TableCell>
                            <TableCell align="right">Current Load</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {agentData.agents?.map((agent) => (
                            <TableRow key={agent.agent_id} hover>
                              <TableCell>{agent.agent_name}</TableCell>
                              <TableCell align="right">{agent.total_assigned}</TableCell>
                              <TableCell align="right">{agent.resolved_count}</TableCell>
                              <TableCell align="right">{agent.avg_resolution_time_hours}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${agent.sla_compliance_percentage}%`}
                                  color={agent.sla_compliance_percentage >= 90 ? 'success' :
                                         agent.sla_compliance_percentage >= 80 ? 'warning' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">
                                {agent.current_workload}/{agent.max_capacity}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${agent.status} (${agent.utilization_percentage}%)`}
                                  color={
                                    agent.status === 'active' ? 'success' :
                                    agent.status === 'busy' ? 'warning' :
                                    agent.status === 'inactive' ? 'default' : 'error'
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Trends Tab */}
          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Ticket Trends (Last {trendData.period_days || 30} Days - {trendData.group_by || 'daily'})
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Category Filter</InputLabel>
                        <Select
                          value={selectedCategory}
                          label="Category Filter"
                          onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                          <MenuItem value="">All Categories</MenuItem>
                          {categoryData.categories?.map(cat => (
                            <MenuItem key={cat.category} value={cat.category}>
                              {cat.category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ height: 400 }}>
                      <Line data={trendChartData} options={chartOptions} />
                    </Box>
                    {selectedCategory && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Filtered by category: {selectedCategory}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* SLA Compliance Tab */}
          {activeTab === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>SLA Compliance Overview</Typography>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {slaData.overall_compliance || 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overall SLA Compliance
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={slaData.overall_compliance || 0}
                        sx={{ height: 10, borderRadius: 5, mt: 2 }}
                        color={slaData.overall_compliance >= 90 ? 'success' :
                               slaData.overall_compliance >= 80 ? 'warning' : 'error'}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Compliant: {slaData.sla_compliant || 0}</Typography>
                      <Typography>Breached: {slaData.sla_breached || 0}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>SLA by Urgency Level</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Urgency</TableCell>
                            <TableCell align="right">Resolved</TableCell>
                            <TableCell align="right">Compliant</TableCell>
                            <TableCell align="right">SLA %</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {slaData.compliance_by_urgency?.map((item) => (
                            <TableRow key={item.urgency_level}>
                              <TableCell>
                                <Chip
                                  label={item.urgency_level}
                                  color={
                                    item.urgency_level === 'urgent' ? 'error' :
                                    item.urgency_level === 'moderate' ? 'warning' : 'info'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">{item.total_resolved}</TableCell>
                              <TableCell align="right">{item.compliant}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${item.compliance_percentage}%`}
                                  color={item.compliance_percentage >= 90 ? 'success' :
                                         item.compliance_percentage >= 80 ? 'warning' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Priority Distribution & Escalations</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" gutterBottom>Priority Breakdown</Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Priority</TableCell>
                                <TableCell align="right">Count</TableCell>
                                <TableCell align="right">Percentage</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {priorityData.priorities?.map((item) => (
                                <TableRow key={item.priority}>
                                  <TableCell>
                                    <Chip
                                      label={item.priority}
                                      color={
                                        item.priority === 'urgent' ? 'error' :
                                        item.priority === 'high' ? 'warning' :
                                        item.priority === 'medium' ? 'info' : 'success'
                                      }
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell align="right">{item.count}</TableCell>
                                  <TableCell align="right">{item.percentage}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" gutterBottom>Escalation Statistics</Typography>
                        <Box sx={{ textAlign: 'center', p: 3 }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main', mb: 2 }}>
                            {priorityData.escalation?.escalation_rate_percentage || 0}%
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            Escalation Rate
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {priorityData.escalation?.total_escalated || 0} of {priorityData.escalation?.total_tickets || 0} tickets escalated
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={priorityData.escalation?.escalation_rate_percentage || 0}
                            sx={{ height: 12, borderRadius: 6, mt: 2 }}
                            color="error"
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Chatbot Analytics Tab */}
          {activeTab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Chatbot Performance Overview</Typography>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {chatbotData.resolution_rate_percentage || 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Resolution Rate
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={chatbotData.resolution_rate_percentage || 0}
                        sx={{ height: 10, borderRadius: 5, mt: 2 }}
                        color="primary"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Total Queries: {chatbotData.total_interactions || 0}</Typography>
                      <Typography>Resolved: {chatbotData.resolution_rate_percentage ?
                        Math.round((chatbotData.total_interactions || 0) * chatbotData.resolution_rate_percentage / 100) : 0}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Efficiency Metrics</Typography>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Time Saved (Last {chatbotEfficiencyData.period_days || 30} days)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {chatbotEfficiencyData.estimated_time_saved_minutes || 0} minutes
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Cost Savings (Estimated)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                        ${chatbotEfficiencyData.estimated_cost_saved_usd || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Tickets from Chatbot
                      </Typography>
                      <Typography variant="h5">
                        {chatbotEfficiencyData.tickets_from_chatbot || 0} of {chatbotEfficiencyData.total_tickets_created || 0}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Chatbot vs Manual Comparison Chart */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Chatbot vs Manual Resolution Trends (Last {chatbotEfficiencyData.period_days || 30} Days - {chatbotEfficiencyData.group_by || 'daily'})
                    </Typography>
                    <Box sx={{ height: 400 }}>
                      <Line
                        data={{
                          labels: chatbotEfficiencyData.trends?.map(item => {
                            if (chatbotEfficiencyData.group_by === 'weekly') {
                              return `Week ${item.period.split('-')[1]}`;
                            } else if (chatbotEfficiencyData.group_by === 'monthly') {
                              const [year, month] = item.period.split('-');
                              return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                            } else {
                              const date = new Date(item.period);
                              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }
                          }) || [],
                          datasets: [
                            {
                              label: 'Chatbot Queries',
                              data: chatbotEfficiencyData.trends?.map(item => item.chatbot_queries) || [],
                              borderColor: '#2196f3',
                              backgroundColor: '#2196f3',
                              tension: 0.1,
                            },
                            {
                              label: 'Chatbot Resolutions',
                              data: chatbotEfficiencyData.trends?.map(item => item.chatbot_resolved) || [],
                              borderColor: '#4caf50',
                              backgroundColor: '#4caf50',
                              tension: 0.1,
                            },
                            {
                              label: 'Manual Tickets',
                              data: chatbotEfficiencyData.trends?.map(item => item.manual_tickets) || [],
                              borderColor: '#ff5722',
                              backgroundColor: '#ff5722',
                              tension: 0.1,
                            },
                          ],
                        }}
                        options={chartOptions}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Comparing chatbot interactions vs manual ticket creation over time
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Feedback Distribution</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Feedback Type</TableCell>
                            <TableCell align="right">Count</TableCell>
                            <TableCell align="right">Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {chatbotData.feedback_distribution && Object.entries(chatbotData.feedback_distribution).map(([feedback, count]) => {
                            const percentage = chatbotData.total_interactions ?
                              Math.round((count / chatbotData.total_interactions) * 100) : 0;
                            return (
                              <TableRow key={feedback}>
                                <TableCell>
                                  <Chip
                                    label={feedback.replace('_', ' ').toUpperCase()}
                                    size="small"
                                    color={
                                      feedback === 'helpful' ? 'success' :
                                      feedback === 'not_helpful' ? 'warning' :
                                      feedback === 'ticket_created' ? 'info' :
                                      feedback === 'kb_shown' ? 'primary' : 'default'
                                    }
                                  />
                                </TableCell>
                                <TableCell align="right">{count}</TableCell>
                                <TableCell align="right">{percentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Most Used Knowledge Base Articles</Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Article Title</TableCell>
                            <TableCell align="right">Usage Count</TableCell>
                            <TableCell>Article ID</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {chatbotData.top_kb_articles?.map((article) => (
                            <TableRow key={article.article_id} hover>
                              <TableCell>{article.title}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={article.usage_count}
                                  size="small"
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                {article.article_id?.slice(-8) || 'N/A'}
                              </TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                <Typography variant="body2" color="text.secondary">
                                  No knowledge base usage data available
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AnalyticsDashboard;