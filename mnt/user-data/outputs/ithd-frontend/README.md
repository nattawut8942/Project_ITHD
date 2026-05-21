# IT Service Desk - FRONTEND

## 📁 Folder Structure

```
ithd-frontend/
└── src/
    ├── App.jsx                     # Main app routing
    ├── pages/
    │   ├── LoginPage.jsx           # Login page
    │   └── ITServiceDesk.jsx       # Main dashboard
    ├── components/
    │   └── ProtectedRoute.jsx      # Route protection wrapper
    ├── context/
    │   └── AuthContext.jsx         # Authentication state management
    ├── utils/
    │   └── apiClient.js            # API client with JWT headers
    └── config/
        └── (Your existing config files)
```

## 🚀 Setup Instructions

### Step 1: Copy Files to Your Project

```bash
# Copy all src files to your React Vite project
cp -r src/* /your/frontend/project/src/
```

### Step 2: Update .env

Create/update `.env` in your frontend root:

```env
VITE_API_BASE=http://localhost:3000/api
```

### Step 3: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 4: Update Your App Structure

Make sure your project has React Router v6:

```bash
npm install react-router-dom
```

### Step 5: Import in Your Main App

Ensure your `main.jsx` or `index.jsx` includes:

```javascript
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>,
);
```

### Step 6: Start Development Server

```bash
npm run dev

# Frontend will be at http://localhost:5173
```

## 📋 File Descriptions

### App.jsx
Main routing component that handles:
- Login page route
- Protected dashboard route
- Redirect to login if not authenticated

```javascript
Routes:
- /login         → LoginPage
- /              → ITServiceDesk (Protected)
- *              → Redirect to /login
```

### LoginPage.jsx
Login component with:
- Username/password input
- Show/hide password toggle
- Loading state during authentication
- Auto-redirect to dashboard on success
- Error message display

Features:
- Uses `useAuth()` for authentication
- Calls `POST /api/authen`
- Stores JWT token in localStorage
- Supports Lucide icons (Eye, EyeOff)

### ITServiceDesk.jsx
Main dashboard with:
- Ticket list view
- Create new ticket form
- View ticket details in drawer
- Edit/update ticket (IT Staff only)
- Delete ticket (IT Staff only)
- Statistics/summary

Access Control:
- IT Staff (CC 7510): View/Edit all tickets, "All Tickets" sidebar
- End Users: View/Edit only their own tickets

### ProtectedRoute.jsx
Route guard component:
- Checks if user is authenticated (token exists)
- Redirects to `/login` if not authenticated
- Optional `requireITStaff` prop for CC 7510 only routes
- Passes user data to child components

### AuthContext.jsx
Authentication state management:
- `user` state: { username, role, name, sect, empcode, email, cost_center }
- `token` state: JWT token
- `login(username, password)` - Calls backend login
- `logout()` - Clears auth & redirects to login
- `setAuthToken(token, user)` - Set auth state directly
- `useAuth()` hook - Use auth anywhere

Stores in localStorage:
- `authToken` - JWT token
- `authUser` - User object (JSON)

### apiClient.js
Axios instance with:
- Base URL from environment
- Auto JWT header injection
- Response interceptor for 401 errors
- Helper functions: `getTickets()`, `createTicket()`, etc.

Usage:
```javascript
import { ticketAPI } from '@/utils/apiClient';

const tickets = await ticketAPI.getTickets();
const newTicket = await ticketAPI.createTicket(data);
const updated = await ticketAPI.updateTicket(id, data);
await ticketAPI.deleteTicket(id);
const stats = await ticketAPI.getStats();
```

## 🎨 UI Components Used

- **React Router v6** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icons (Eye, EyeOff, Plus, Trash, etc.)
- **Tailwind CSS** - Styling (your existing setup)

### Example UI Elements

```jsx
// Button with icon
<button className="flex items-center gap-2">
  <Plus size={20} /> Create Ticket
</button>

// Input field
<input 
  type="text"
  placeholder="Project name"
  className="w-full px-3 py-2 border border-gray-300 rounded"
/>

// Status badge
<span className={`px-3 py-1 rounded-full text-sm ${
  status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100'
}`}>
  {status}
</span>
```

## 🔐 Authentication Flow

1. User visits `/login`
2. Enters username/password
3. LoginPage calls `useAuth().login(username, password)`
4. AuthContext calls `POST /api/authen` on backend
5. Backend verifies with Daikin AD API
6. Returns JWT token + user data
7. AuthContext stores in localStorage
8. Redirects to `/`
9. App component checks `useAuth().token`
10. If token exists → show dashboard
11. If no token → redirect to `/login`

On token expiry:
- apiClient detects 401 response
- Clears localStorage
- Redirects to `/login`

## 📱 User Types & Permissions

### IT Staff (Cost Center 7510)
✅ View all tickets
✅ Create new tickets
✅ Edit any ticket
✅ Update status
✅ Assign to staff
✅ Delete tickets
✅ View all users' tickets

### End Users (Other Cost Centers)
✅ View own tickets only
✅ Create new tickets
✅ View ticket details
❌ Edit other users' tickets
❌ Delete tickets
❌ View all tickets

## 🎯 Key States & Hooks

```javascript
// From AuthContext
const { user, token, login, logout } = useAuth();

// From apiClient
const response = await apiClient.get('/tickets');

// Component state for forms
const [formData, setFormData] = useState({
  project_name: '',
  location: '',
  priority: 'Normal'
});
```

## 🧪 Testing the Frontend

### Test 1: Login
1. Go to http://localhost:5173/login
2. Enter username/password
3. Should redirect to dashboard
4. Token should be in localStorage

### Test 2: Create Ticket
1. On dashboard, fill form and submit
2. Should appear in ticket list
3. Should send confirmation email

### Test 3: Access Control
1. Login as IT Staff (CC 7510)
   - See "All Tickets" in sidebar
2. Login as regular user
   - See only own tickets
   - No edit/delete buttons

## ✅ Checklist

- [ ] Files copied to src/
- [ ] .env configured with API_BASE
- [ ] react-router-dom installed
- [ ] AuthProvider wraps app in main.jsx
- [ ] App.jsx properly configured
- [ ] Backend is running on :3000
- [ ] Frontend starts: `npm run dev`
- [ ] Can login successfully
- [ ] Token saved in localStorage
- [ ] Can create ticket
- [ ] Can view own tickets
- [ ] IT Staff can see all tickets

## 🐛 Troubleshooting

**"Cannot GET /api/tickets":**
- Backend not running
- API_BASE in .env is wrong
- Backend routes not registered

**Login fails:**
- Backend not running
- Daikin AD API unreachable
- Wrong credentials

**Token not saving:**
- Check browser localStorage
- Check AuthContext implementation
- Verify setAuthToken() is called

**"Access Denied" error:**
- User's cost_center is not 7510
- Only IT Staff (CC 7510) can use this system

## 📚 Component Props

### ProtectedRoute
```jsx
<ProtectedRoute requireITStaff={true}>
  <AdminPanel />
</ProtectedRoute>
```

### ITServiceDesk
```jsx
<ITServiceDesk />
// No props - uses useAuth() internally
```

## 🚀 Deploy to Production

Before deploying:

1. Update `.env`:
```env
VITE_API_BASE=https://your-production-api.com/api
```

2. Build:
```bash
npm run build
```

3. Deploy `dist/` folder to your server

Good luck! 🎉
