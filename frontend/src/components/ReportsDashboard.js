import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  TextField, Chip, Alert, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip
} from '@mui/material';
import {
  Assessment, Timeline, CheckCircle, People, Download, Email,
  Schedule, History, PictureAsPdf, TableChart, GetApp
} from '@mui/icons-material';
import axios from 'axios';

const ReportsDashboard = () => {
  const [generateDialog, setGenerateDialog] = useState({ open: false, type: '' });
  const [reportConfig, setReportConfig] = useState({
    type: 'ticket_summary',
    format: 'pdf',
    dateRange: 'last_30_days',
    email: false,
    recipients: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [recentReports, setRecentReports] = useState([
    {
      id: 1,
      name: 'Ticket Summary Report',
      type: 'ticket_summary',
      generated: '2024-01-15 14:30',
      format: 'PDF',
      size: '2.3 MB',
      status: 'completed'
    },
    {
      id: 2,
      name: 'SLA Compliance Report',
      type: 'sla_compliance',
      generated: '2024-01-10 09:15',
      format: 'Excel',
      size: '1.8 MB',
      status: 'completed'
    },
    {
      id: 3,
      name: 'Agent Productivity Report',
      type: 'agent_productivity',
      generated: '2024-01-05 16:45',
      format: 'PDF',
      size: '1.5 MB',
      status: 'completed'
    }
  ]);

  const token = localStorage.getItem('token');

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const reportTypes = [
    {
      id: 'ticket_summary',
      name: 'Ticket Summary Report',
      description: 'Comprehensive overview of all tickets with key metrics',
      icon: <Assessment />,
      color: 'primary'
    },
    {
      id: 'sla_compliance',
      name: 'SLA Compliance Report',
      description: 'Detailed analysis of SLA performance and breaches',
      icon: <CheckCircle />,
      color: 'success'
    },
    {
      id: 'agent_productivity',
      name: 'Agent Productivity Report',
      description: 'Individual agent performance and workload analysis',
      icon: <People />,
      color: 'info'
    },
    {
      id: 'ticket_trends',
      name: 'Ticket Trends Report',
      description: 'Time-based analysis of ticket patterns and volumes',
      icon: <Timeline />,
      color: 'warning'
    }
  ];

  const handleGenerateReport = async () => {
    try {
      const response = await axios.post('http://localhost:8000/reports/generate', {
        type: reportConfig.type,
        format: reportConfig.format,
        date_range: reportConfig.dateRange,
        email: reportConfig.email,
        recipients: reportConfig.email ? reportConfig.recipients.split(',').map(r => r.trim()) : []
      }, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob' // For file download
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportConfig.type}_report.${reportConfig.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showSnackbar('Report generated and downloaded successfully');
      setGenerateDialog({ open: false, type: '' });

    } catch (error) {
      console.error('Error generating report:', error);
      showSnackbar('Error generating report', 'error');
    }
  };

  const handleQuickDownload = async (reportType) => {
    setReportConfig(prev => ({ ...prev, type: reportType }));
    setGenerateDialog({ open: true, type: reportType });
  };

  const getReportTypeInfo = (type) => {
    return reportTypes.find(r => r.id === type) || reportTypes[0];
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Reports & Analytics
      </Typography>

      {/* Report Types Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {reportTypes.map((report) => (
          <Grid item xs={12} sm={6} md={3} key={report.id}>
            <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => handleQuickDownload(report.id)}>
              <CardContent sx={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ color: `${report.color}.main`, mb: 2, fontSize: 48 }}>
                  {report.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {report.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
                  {report.description}
                </Typography>
                <Button variant="contained" color={report.color} fullWidth>
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Reports */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Recent Reports
          </Typography>
          <Button variant="outlined" startIcon={<History />}>
            View All History
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Report Name</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentReports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {report.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getReportTypeInfo(report.type).name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{report.generated}</TableCell>
                  <TableCell>
                    <Chip
                      label={report.format}
                      size="small"
                      color={report.format === 'PDF' ? 'error' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>{report.size}</TableCell>
                  <TableCell>
                    <Chip
                      label={report.status}
                      size="small"
                      color={report.status === 'completed' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Download">
                      <IconButton size="small" color="primary">
                        <Download />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Email">
                      <IconButton size="small" color="secondary">
                        <Email />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Scheduled Reports */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Scheduled Reports
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Weekly Summary:</strong> Every Monday at 9:00 AM
          </Typography>
          <Typography variant="body2">
            <strong>SLA Report:</strong> Every Friday at 5:00 PM
          </Typography>
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Schedule />}>
            Schedule New Report
          </Button>
          <Button variant="outlined" startIcon={<History />}>
            Manage Schedules
          </Button>
        </Box>
      </Paper>

      {/* Generate Report Dialog */}
      <Dialog
        open={generateDialog.open}
        onClose={() => setGenerateDialog({ open: false, type: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Generate {getReportTypeInfo(generateDialog.type).name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportConfig.type}
                onChange={(e) => setReportConfig(prev => ({ ...prev, type: e.target.value }))}
                label="Report Type"
              >
                {reportTypes.map((report) => (
                  <MenuItem key={report.id} value={report.id}>
                    {report.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={reportConfig.dateRange}
                onChange={(e) => setReportConfig(prev => ({ ...prev, dateRange: e.target.value }))}
                label="Date Range"
              >
                <MenuItem value="last_7_days">Last 7 Days</MenuItem>
                <MenuItem value="last_30_days">Last 30 Days</MenuItem>
                <MenuItem value="last_90_days">Last 90 Days</MenuItem>
                <MenuItem value="last_quarter">Last Quarter</MenuItem>
                <MenuItem value="last_year">Last Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={reportConfig.format}
                onChange={(e) => setReportConfig(prev => ({ ...prev, format: e.target.value }))}
                label="Format"
              >
                <MenuItem value="pdf">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PictureAsPdf sx={{ mr: 1, color: 'error.main' }} />
                    PDF Document
                  </Box>
                </MenuItem>
                <MenuItem value="excel">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TableChart sx={{ mr: 1, color: 'success.main' }} />
                    Excel Spreadsheet
                  </Box>
                </MenuItem>
                <MenuItem value="csv">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TableChart sx={{ mr: 1, color: 'primary.main' }} />
                    CSV Data
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant={reportConfig.email ? "contained" : "outlined"}
                startIcon={<Email />}
                onClick={() => setReportConfig(prev => ({ ...prev, email: !prev.email }))}
                size="small"
              >
                {reportConfig.email ? 'Email Enabled' : 'Email Report'}
              </Button>
            </Box>

            {reportConfig.email && (
              <TextField
                fullWidth
                label="Email Recipients"
                placeholder="email1@company.com, email2@company.com"
                value={reportConfig.recipients}
                onChange={(e) => setReportConfig(prev => ({ ...prev, recipients: e.target.value }))}
                helperText="Separate multiple emails with commas"
              />
            )}

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Report will include real-time data from the database and be formatted professionally.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialog({ open: false, type: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            variant="contained"
            startIcon={<GetApp />}
          >
            Generate & Download
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

export default ReportsDashboard;