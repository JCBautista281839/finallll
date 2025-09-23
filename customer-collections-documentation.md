# Customer Signup Collections - Viktoria's Bistro

## Overview
The customer signup process now creates data across multiple Firebase collections for better organization and scalability.

## Collection Structure

### 1. `customers` Collection
**Purpose:** Main customer information and account status
```javascript
{
  customerId: "user_uid",
  name: "John Doe",
  email: "john@example.com",
  phone: "+639123456789",
  role: "customer",
  userType: "customer",
  isActive: true,
  isEmailVerified: false,
  isPhoneVerified: false,
  accountStatus: "pending_verification",
  verificationMethod: "sms",
  referralCode: "JOH1234",
  referredBy: null,
  referralCount: 0,
  createdAt: timestamp,
  lastLogin: timestamp,
  lastUpdated: timestamp
}
```

### 2. `customer_profiles` Collection
**Purpose:** Detailed customer profile information
```javascript
{
  customerId: "user_uid",
  displayName: "John Doe",
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "+639123456789",
  emailAddress: "john@example.com",
  profilePicture: null,
  dateOfBirth: null,
  gender: null,
  address: {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Philippines",
    isDefault: true
  },
  emergencyContact: {
    name: "",
    phone: "",
    relationship: ""
  },
  profileCompletion: 25,
  lastProfileUpdate: timestamp
}
```

### 3. `customer_preferences` Collection
**Purpose:** Customer preferences and settings
```javascript
{
  customerId: "user_uid",
  notifications: {
    email: true,
    sms: true,
    push: true,
    marketing: false,
    orderUpdates: true,
    promotions: false
  },
  dietaryRestrictions: [],
  allergies: [],
  favoriteCuisines: [],
  favoriteItems: [],
  preferredDeliveryTime: "",
  deliveryInstructions: "",
  language: "en",
  currency: "PHP",
  timezone: "Asia/Manila",
  theme: "light",
  lastUpdated: timestamp
}
```

### 4. `customer_loyalty` Collection
**Purpose:** Loyalty points and rewards system
```javascript
{
  customerId: "user_uid",
  loyaltyPoints: 0,
  totalPointsEarned: 0,
  totalPointsRedeemed: 0,
  membershipLevel: "Bronze",
  membershipTier: "New Member",
  membershipStartDate: timestamp,
  availableRewards: [],
  redeemedRewards: [],
  referralCode: "JOH1234",
  referrals: [],
  referralRewards: 0,
  lastUpdated: timestamp
}
```

### 5. `customer_orders_summary` Collection
**Purpose:** Order history and statistics
```javascript
{
  customerId: "user_uid",
  totalOrders: 0,
  totalSpent: 0,
  averageOrderValue: 0,
  orderHistory: [],
  favoriteRestaurants: [],
  totalDeliveries: 0,
  averageDeliveryTime: 0,
  savedPaymentMethods: [],
  defaultPaymentMethod: null,
  lastOrderDate: null,
  lastUpdated: timestamp
}
```

### 6. `users` Collection (Backup)
**Purpose:** Authentication backup and quick access
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  phone: "+639123456789",
  role: "customer",
  userType: "customer",
  createdAt: timestamp,
  lastLogin: timestamp,
  isActive: true
}
```

## Benefits of This Structure

### ✅ **Organization**
- Data is logically separated by purpose
- Easy to query specific information
- Better performance for targeted operations

### ✅ **Scalability**
- Each collection can be optimized independently
- Easy to add new features without affecting existing data
- Better for future analytics and reporting

### ✅ **Security**
- Granular access control per collection
- Users can only access their own data
- Sensitive information can be protected separately

### ✅ **Maintenance**
- Easier to update specific data types
- Clear separation of concerns
- Better error handling and debugging

## Firestore Rules

All collections allow:
- **Create:** Anyone (for signup process)
- **Read/Write:** Only authenticated users accessing their own data

```javascript
match /customers/{userId} {
  allow create: if true; // Allow signup
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Usage Examples

### Query Customer Profile
```javascript
const profile = await firebase.firestore()
  .collection('customer_profiles')
  .doc(userId)
  .get();
```

### Update Preferences
```javascript
await firebase.firestore()
  .collection('customer_preferences')
  .doc(userId)
  .update({
    notifications: {
      email: false,
      sms: true
    },
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  });
```

### Add Loyalty Points
```javascript
await firebase.firestore()
  .collection('customer_loyalty')
  .doc(userId)
  .update({
    loyaltyPoints: firebase.firestore.FieldValue.increment(100),
    totalPointsEarned: firebase.firestore.FieldValue.increment(100)
  });
```

## Migration Notes

- Existing customers will need to be migrated to the new structure
- The old single collection approach is still supported as backup
- New signups automatically use the new structure
- Gradual migration can be implemented for existing users
