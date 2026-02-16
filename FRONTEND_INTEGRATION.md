# Frontend Integration Guide

This guide explains how to connect your React frontend to the SecondOp backend API.

## 🔗 Backend URL Configuration

### Development
```typescript
// src/config/api.ts
export const API_BASE_URL = 'http://localhost:3000/api/v1';
export const SOCKET_URL = 'http://localhost:3000';
```

### Production
```typescript
export const API_BASE_URL = process.env.VITE_API_URL || 'https://api.secondop.com/api/v1';
export const SOCKET_URL = process.env.VITE_SOCKET_URL || 'https://api.secondop.com';
```

## 🔐 Authentication Flow

### 1. Register/Login

```typescript
// Register new user
const register = async (userData: {
  email: string;
  password: string;
  userType: 'patient' | 'doctor';
  firstName: string;
  lastName: string;
  phone?: string;
  // For doctors:
  specialty?: string;
  licenseNumber?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  
  const data = await response.json();
  
  if (data.status === 'success') {
    // Store tokens
    localStorage.setItem('accessToken', data.data.token);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
  }
  
  return data;
};

// Login
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (data.status === 'success') {
    localStorage.setItem('accessToken', data.data.token);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
  }
  
  return data;
};
```

### 2. Phone-based OTP Login

```typescript
// Step 1: Request OTP
const requestOTP = async (phone: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  
  return await response.json();
};

// Step 2: Verify OTP
const verifyOTP = async (userId: string, otp: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, otp }),
  });
  
  const data = await response.json();
  
  if (data.status === 'success') {
    localStorage.setItem('accessToken', data.data.token);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  }
  
  return data;
};
```

### 3. Authenticated Requests

```typescript
// API client with auth
const apiClient = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return await response.json();
  },
  
  post: async (endpoint: string, data: any) => {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return await response.json();
  },
  
  // Add PUT, DELETE methods similarly
};

// Usage
const profile = await apiClient.get('/users/profile');
const cases = await apiClient.get('/cases/my-cases');
```

## 📁 File Upload

```typescript
const uploadFile = async (file: File, caseId: string, category: string) => {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  
  formData.append('file', file);
  formData.append('caseId', caseId);
  formData.append('category', category);
  formData.append('description', 'Medical report');
  
  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  return await response.json();
};
```

## 💬 Real-time Messaging with Socket.IO

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket;

const connectSocket = () => {
  const token = localStorage.getItem('accessToken');
  
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
  });
  
  socket.on('connect', () => {
    console.log('Connected to socket server');
  });
  
  return socket;
};

// Join a case room
const joinCaseRoom = (caseId: string) => {
  socket.emit('join-case', caseId);
};

// Listen for new messages
const onNewMessage = (callback: (message: any) => void) => {
  socket.on('new-message', callback);
};

// Send a message
const sendMessage = async (caseId: string, receiverId: string, content: string) => {
  const response = await apiClient.post('/messages', {
    caseId,
    receiverId,
    content,
    messageType: 'text',
  });
  
  return response;
};
```

## 🏥 Common API Calls

### Cases

```typescript
// Create a case
const createCase = async (caseData: {
  title: string;
  description: string;
  specialty: string;
  priority?: string;
  urgencyLevel?: string;
}) => {
  return await apiClient.post('/cases', caseData);
};

// Get my cases
const getMyCases = async () => {
  return await apiClient.get('/cases/my-cases');
};

// Get case details
const getCaseDetails = async (caseId: string) => {
  return await apiClient.get(`/cases/${caseId}`);
};
```

### Doctors

```typescript
// Get all doctors
const getDoctors = async (filters?: {
  specialty?: string;
  country?: string;
  minRating?: number;
}) => {
  const params = new URLSearchParams(filters as any);
  return await apiClient.get(`/doctors?${params}`);
};

// Search doctors
const searchDoctors = async (query: string) => {
  return await apiClient.get(`/doctors/search?query=${query}`);
};
```

### Health Metrics

```typescript
// Add health metric
const addHealthMetric = async (metric: {
  metricType: string;
  value: number;
  unit: string;
  notes?: string;
}) => {
  return await apiClient.post('/health/metrics', metric);
};

// Get health metrics
const getHealthMetrics = async () => {
  return await apiClient.get('/health/metrics');
};
```

### Appointments

```typescript
// Create appointment
const createAppointment = async (appointment: {
  doctorId: string;
  caseId: string;
  appointmentDate: string;
  appointmentType: 'video' | 'chat' | 'phone';
  notes?: string;
}) => {
  return await apiClient.post('/appointments', appointment);
};

// Get my appointments
const getAppointments = async () => {
  return await apiClient.get('/appointments');
};
```

## 🔄 Token Refresh

```typescript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  
  const data = await response.json();
  
  if (data.status === 'success') {
    localStorage.setItem('accessToken', data.data.token);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  }
  
  return data;
};

// Intercept 401 errors and refresh token
const apiClientWithRefresh = async (endpoint: string, options: RequestInit) => {
  let response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  
  if (response.status === 401) {
    // Try to refresh token
    await refreshAccessToken();
    
    // Retry the request
    const token = localStorage.getItem('accessToken');
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
    
    response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  }
  
  return await response.json();
};
```

## 🎨 React Query Integration

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Fetch user profile
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/users/profile'),
  });
};

// Fetch cases
export const useCases = () => {
  return useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.get('/cases/my-cases'),
  });
};

// Create case mutation
export const useCreateCase = () => {
  return useMutation({
    mutationFn: (caseData: any) => apiClient.post('/cases', caseData),
    onSuccess: () => {
      // Invalidate and refetch cases
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
};
```

## 🚨 Error Handling

```typescript
const handleApiError = (error: any) => {
  if (error.statusCode === 401) {
    // Unauthorized - redirect to login
    localStorage.clear();
    window.location.href = '/login';
  } else if (error.statusCode === 403) {
    // Forbidden - show error
    toast.error('You do not have permission to perform this action');
  } else if (error.statusCode === 404) {
    // Not found
    toast.error('Resource not found');
  } else {
    // Generic error
    toast.error(error.message || 'An error occurred');
  }
};
```

## ✅ Testing the Connection

```typescript
// Test health endpoint
const testConnection = async () => {
  try {
    const response = await fetch('http://localhost:3000/health');
    const data = await response.json();
    console.log('Backend is running:', data);
  } catch (error) {
    console.error('Backend is not reachable:', error);
  }
};
```

## 🔧 Environment Variables

Create a `.env` file in your frontend:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

---

**Ready to connect!** Start your backend with `npm run dev` and your frontend should be able to communicate with it.

