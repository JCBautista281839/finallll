# Access Control System Documentation

## Overview

This document describes the comprehensive role-based access control system implemented for Victoria's Bistro application. The system ensures that admin and kitchen users can only access the features and pages appropriate for their roles.

## System Components

### 1. Server-Side Authentication Middleware (`server.js`)

#### Authentication Middleware

- **`authenticateUser`**: Verifies Firebase tokens and loads user roles from Firestore
- **`requireRole`**: Middleware factory for role-based access control
- **`checkAuthForPage`**: Basic middleware for HTML page access logging

#### Route Protection

All main application routes now include `checkAuthForPage` middleware:

- `/dashboard` - Dashboard access
- `/kitchen` - Kitchen dashboard
- `/inventory` - Inventory management
- `/order` - Order management
- `/analytics` - Analytics and reports
- `/settings` - System settings
- `/user` - User management
- `/notifications` - Notifications
- `/pos` - Point of Sale
- `/menu` - Menu management

### 2. Client-Side Authentication Guard (`auth-guard.js`)

#### Core Features

- **Automatic Authentication**: Monitors Firebase auth state changes
- **Role Loading**: Fetches user roles from Firestore
- **Access Enforcement**: Redirects users to appropriate pages based on roles
- **Page-Specific Restrictions**: Applies role-based UI restrictions

#### Role Hierarchy

```
Admin (Level 4) - Full access to everything
Manager (Level 3) - Access to most features except admin-only functions
Server (Level 2) - Limited access to order management and POS
Kitchen (Level 2) - Access only to kitchen dashboard and view-only inventory
User (Level 1) - Basic access to dashboard and menu
```

### 3. Role-Based Navigation (`nav.js`)

#### Navigation Rules by Role

**Kitchen Staff:**

- ✅ Kitchen Dashboard (`/kitchen`)
- ✅ Notifications (`/notifications`)
- ✅ Inventory (View Only) (`/inventory`)
- ❌ All other pages blocked

**Server Staff:**

- ✅ Dashboard (`/dashboard`)
- ✅ Orders (`/order`)
- ✅ POS (`/pos`)
- ✅ Menu (`/menu`)
- ✅ Notifications (`/notifications`)
- ❌ Admin/Manager functions blocked

**Manager:**

- ✅ Dashboard (`/dashboard`)
- ✅ Orders (`/order`)
- ✅ POS (`/pos`)
- ✅ Menu (`/menu`)
- ✅ Inventory (`/inventory`)
- ✅ Users (`/user`)
- ✅ Analytics (`/analytics`)
- ✅ Settings (`/settings`)
- ✅ Notifications (`/notifications`)
- ❌ Admin-only functions blocked

**Admin:**

- ✅ Full access to all pages and functions
- ✅ All navigation items visible
- ✅ All administrative functions available

### 4. Enhanced Inventory Access Control (`inventory.js`)

#### Kitchen Staff Restrictions

- **View Only**: Can view inventory but cannot add, edit, or delete items
- **Visual Indicators**: "View Only" badge displayed on page title
- **Button Hiding**: Add, edit, and delete buttons are hidden
- **Navigation**: Home link redirects to kitchen dashboard

#### Server Staff Restrictions

- **Limited Access**: Cannot manage inventory
- **Admin Elements**: Admin-only elements hidden
- **Navigation**: Limited to order management functions

## Implementation Details

### Authentication Flow

1. User logs in through Firebase Authentication
2. AuthGuard loads user role from Firestore
3. Role-based access control is applied
4. Navigation is updated based on user role
5. Page-specific restrictions are enforced

### Security Features

- **Token Verification**: All API calls verify Firebase tokens
- **Role Validation**: Server-side role checking for sensitive operations
- **Client-Side Protection**: UI elements hidden/disabled based on roles
- **Automatic Redirects**: Users redirected to appropriate pages
- **Access Denied Messages**: Clear feedback when access is denied

### Visual Indicators

- **Role Badge**: Displays current user role in sidebar
- **View Only Badge**: Shows when kitchen staff views inventory
- **Access Denied Messages**: Temporary notifications for denied access
- **Navigation Hiding**: Unauthorized menu items are hidden

## Testing

### Access Control Test (`access-control-test.js`)

The system includes comprehensive testing functionality:

- **AuthGuard Initialization Test**: Verifies authentication system is working
- **Role-Based Navigation Test**: Checks navigation visibility
- **Page Access Restrictions Test**: Validates page access control
- **Kitchen Restrictions Test**: Ensures kitchen staff limitations
- **Admin Access Test**: Confirms admin privileges

### Manual Testing

1. Login with different user roles
2. Verify navigation menu shows appropriate items
3. Test page access restrictions
4. Confirm UI elements are hidden/shown correctly
5. Check redirects work properly

## Configuration

### User Roles in Firestore

Users must have a `role` field in their Firestore document:

```javascript
{
  email: "user@example.com",
  role: "kitchen", // or "admin", "manager", "server", "user"
  // other user data...
}
```

### Role Assignment

Roles can be assigned through:

- Admin panel user management
- Direct Firestore document updates
- User registration process

## Security Considerations

### Client-Side Limitations

- Client-side restrictions are for UX only
- Server-side validation is required for security
- Sensitive operations must verify tokens server-side

### Best Practices

- Always verify user roles server-side for critical operations
- Use Firebase Security Rules for Firestore access control
- Implement proper error handling for authentication failures
- Log access attempts for security auditing

## Troubleshooting

### Common Issues

1. **AuthGuard not initializing**: Check Firebase configuration
2. **Role not loading**: Verify Firestore permissions and user document
3. **Navigation not updating**: Ensure auth-guard.js is loaded before nav.js
4. **Access denied errors**: Check user role assignment in Firestore

### Debug Mode

Enable debug logging by setting:

```javascript
window.authGuard.debug = true;
```

## Future Enhancements

### Planned Features

- **Two-Factor Authentication**: Additional security layer
- **Session Management**: Enhanced session control
- **Audit Logging**: Comprehensive access logging
- **Role Permissions**: Granular permission system
- **API Rate Limiting**: Prevent abuse of restricted endpoints

### Integration Points

- **Firebase Security Rules**: Server-side data access control
- **Email Notifications**: Security alerts for admin users
- **Backup Systems**: Redundant authentication methods
- **Monitoring**: Real-time security monitoring

## Support

For issues or questions regarding the access control system:

1. Check browser console for error messages
2. Verify Firebase configuration
3. Test with different user roles
4. Review Firestore security rules
5. Contact system administrator for role assignments
