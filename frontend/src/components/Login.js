import React, { useState } from 'react';
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Alert,
  Fade,
  CircularProgress
} from '@mui/material';
import { LockOutlined, SupportAgent } from '@mui/icons-material';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      const response = await axios.post('http://localhost:8000/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      localStorage.setItem('token', response.data.access_token);
      onLogin();
    } catch (error) {
      console.log('Login error:', error);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Fade in={true} timeout={800}>
        <Card
          sx={{
            mt: 8,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Avatar
                sx={{
                  m: 1,
                  bgcolor: 'primary.main',
                  width: 56,
                  height: 56,
                  background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
                }}
              >
                <SupportAgent fontSize="large" />
              </Avatar>

              <Typography
                component="h1"
                variant="h4"
                sx={{
                  mt: 2,
                  mb: 1,
                  fontWeight: 300,
                  background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                HelpMate
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Sign in to access your support dashboard
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    position: 'relative',
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                    Demo Credentials:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    <strong>Client:</strong> client@example.com / password<br/>
                    <strong>Agent:</strong> agent1@example.com / password<br/>
                    <strong>Manager:</strong> manager@example.com / password<br/>
                    <strong>Admin:</strong> admin@example.com / password
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
};

export default Login;