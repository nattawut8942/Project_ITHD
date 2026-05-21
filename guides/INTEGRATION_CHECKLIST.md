// INTEGRATION CHECKLIST - IT Service Desk + Login System

## 🎯 STEP 1: BACKEND SETUP (Node.js)

### ✅ 1.1 Create Middleware File
- Create: `/backend/src/middleware/authMiddleware.js`
- Copy code from: `backend_authMiddleware.js`
- Functions: verifyToken, checkCC7510, filterByEmpCode

### ✅ 1.2 Create/Update Controller
- Update: `/backend/src/controller/authController.js`
- Add: `cost_center` to JWT payload (see: `backend_authController_UPDATED.js`)
- New: `/backend/src/controller/ticketController.js`
- Copy code from: `backend_ticketController.js`

### ✅ 1.3 Create Routes
- New: `/backend/src/route/ticketRoute.js`
- Copy code from: `backend_ticketRoute.js`
- Register in server.js (see next step)

### ✅ 1.4 Update server.js
- Add imports:
  ```javascript
  import ticketRoute from './route/ticketRoute.js';
  import { verifyToken } from './middleware/authMiddleware.js';
  ```
- Register route:
  ```javascript
  app.use('/api', ticketRoute);
  ```
- Reference: `backend_server_UPDATED.js`

### ✅ 1.5 Database Setup
Create `Tickets` table in SQL Server:
```sql
CREATE TABLE dbo.Tickets (
    id INT PRIMARY KEY IDENTITY(1,1),
    req_id NVARCHAR(50) UNIQUE NOT NULL,
    request_type NVARCHAR(100),
    project_name NVARCHAR(255) NOT NULL,
    requester_name NVARCHAR(255),
    empCode_created NVARCHAR(50) NOT NULL,  -- PRIMARY KEY for filtering
    empCode_assigned NVARCHAR(50),          -- Assigned to IT staff
    cost_center NVARCHAR(10),
    device_type NVARCHAR(100),
    device_count INT,
    location NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Pending',  -- Pending, In Progress, Completed
    priority NVARCHAR(50) DEFAULT 'Normal', -- Normal, Medium, High, Critical
    target_date DATETIME,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Index for faster queries
CREATE INDEX idx_empCode_created ON dbo.Tickets(empCode_created);
CREATE INDEX idx_status ON dbo.Tickets(status);
CREATE INDEX idx_created_at ON dbo.Tickets(created_at DESC);
```

---

## 🎯 STEP 2: FRONTEND SETUP (React Vite)

### ✅ 2.1 Create Context
- New: `/frontend/src/context/AuthContext.jsx`
- Copy code from: `frontend_AuthContext.jsx`
- Provides: useAuth() hook, login(), logout()

### ✅ 2.2 Create Protected Route Component
- New: `/frontend/src/components/ProtectedRoute.jsx`
- Copy code from: `frontend_ProtectedRoute.jsx`
- Usage: Wrap routes that require authentication

### ✅ 2.3 Create API Client Utility
- Update/New: `/frontend/src/utils/apiClient.js`
- Copy code from: `frontend_apiClient.js`
- Handles: JWT token in request headers, 401 refresh

### ✅ 2.4 Update LoginPage
- Update: `/frontend/src/pages/LoginPage.jsx`
- Reference: `frontend_LoginPage_UPDATED.jsx`
- Changes:
  - Import `useAuth` from context
  - Call `setAuthToken(data.token, data.user)` on success
  - Token stored in localStorage automatically

### ✅ 2.5 Create Main Service Desk Component
- New: `/frontend/src/pages/ITServiceDesk.jsx`
- Copy from: The React component provided earlier
- Import `useAuth` and `apiClient`
- Replace mock data with API calls:
  ```javascript
  const fetchRequests = async () => {
      try {
          const response = await apiClient.get('/tickets');
          setRequests(response.data.data);
      } catch (error) {
          showNotification('Failed to load tickets', 'error');
      }
  };
  ```

### ✅ 2.6 Update App.jsx
- Update: `/frontend/src/App.jsx` (or main routing file)
- Reference: `frontend_App_UPDATED.jsx`
- Changes:
  - Wrap app with `<AuthProvider>`
  - Add routes with `<ProtectedRoute>`
  - Redirect unauthenticated users to /login

### ✅ 2.7 Config Setup
- Ensure: `/frontend/src/config/api.js` has correct API_BASE_URL
  ```javascript
  export const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3000/api';
  export const API_URL = API_BASE;
  ```

---

## 🔑 KEY FEATURES IMPLEMENTED

### Authentication Flow
✅ Login → Daikin AD API → JWT Token → LocalStorage → AuthContext
✅ Cost Center 7510 check (IT Staff only)
✅ Token refresh/expiry handling

### Ticket Management
✅ Create Ticket: Any authenticated user
✅ View All: IT Staff (CC 7510) only
✅ View Mine: All users see only their own
✅ Update/Delete: IT Staff (CC 7510) only
✅ Filter by empCode_created (primary key)

### Authorization
✅ JWT token in Authorization header
✅ `verifyToken` middleware on all protected routes
✅ `filterByEmpCode` middleware for data filtering
✅ `checkCC7510` middleware for admin-only operations

---

## 📝 API ENDPOINTS

### Auth
- `POST /api/authen` - Login

### Tickets
- `GET /api/tickets` - Get all (filtered by user)
- `GET /api/tickets/:id` - Get single
- `GET /api/tickets/stats` - Get statistics
- `POST /api/tickets` - Create new
- `PUT /api/tickets/:id` - Update (IT Staff only)
- `DELETE /api/tickets/:id` - Delete (IT Staff only)

### All ticket routes require:
1. Authorization header with Bearer token
2. Valid JWT signature
3. empCode_created match (for non-IT staff)

---

## 🧪 TESTING

### Test Case 1: IT Staff Login (CC 7510)
1. Login with username/password
2. Should see all tickets in "All Tickets" view
3. Can create tickets
4. Can update/delete any ticket

### Test Case 2: End User Login (Other CC)
1. Login with non-7510 cost center
2. Should be rejected at login
3. Error message: "Only Cost Center 7510..."

### Test Case 3: Create and View Tickets
1. Create a ticket as user A
2. User B logs in, cannot see user A's ticket
3. IT Staff can see both

### Test Case 4: Token Expiry
1. Token set to expire in 1 hour
2. After 1 hour, any API call returns 401
3. Frontend clears auth and redirects to login

---

## ⚠️ IMPORTANT NOTES

1. **Cost Center Filter**: Only CC 7510 can access the system at login
   - Other users get 403 error with message
   - Update this restriction in authController if needed

2. **Token Storage**: Uses localStorage (can be moved to sessionStorage)
   - Clear on logout
   - Cleared on 401 response

3. **empCode as Primary Key**: All filtering uses empCode_created
   - This is the user's employee code from Daikin AD
   - Change field name if your DB uses different column

4. **CORS**: Make sure backend has CORS enabled:
   ```javascript
   app.use(cors({
       origin: 'http://localhost:5173', // Your frontend URL
       credentials: true
   }));
   ```

5. **Environment Variables**:
   - Backend: `JWT_SECRET`, `DB_HOST`, `DB_USER`, `DB_PASS`
   - Frontend: `VITE_API_BASE=http://localhost:3000/api`

---

## 📋 REMAINING TASKS

- [ ] Test login with actual Daikin AD
- [ ] Implement comment system
- [ ] Add attachment upload
- [ ] Create IT Staff dashboard
- [ ] Add email notifications
- [ ] Create admin panel for user management
- [ ] Implement pagination for large datasets
- [ ] Add sorting/filtering UI
- [ ] Create reports page
- [ ] Add audit logging
