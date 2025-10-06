# 🔧 Fix for "User account not found" Error

## Problem

You're getting "User account not found. Please sign up first." when trying to log in with `gradelljbautista@gmail.com` as an Admin.

## Root Cause

The email `gradelljbautista@gmail.com` doesn't exist in your Firebase Auth system yet.

## ✅ Solution Options

### Option 1: Create Account via Browser Console (Recommended)

1. **Open your login page** in the browser
2. **Open Developer Console** (F12)
3. **Copy and paste this script**:

```javascript
async function createFirebaseAuthAccount() {
  try {
    console.log(
      "🔧 Creating Firebase Auth account for gradelljbautista@gmail.com...\n"
    );

    const email = "gradelljbautista@gmail.com";
    const password = "AdminPassword123!";

    // Check if Firebase is available
    if (typeof firebase === "undefined") {
      throw new Error(
        "Firebase not loaded. Please run this on a page with Firebase initialized."
      );
    }

    // Wait for Firebase to be ready
    await new Promise((resolve) => {
      const checkFirebase = () => {
        if (firebase.apps.length > 0) {
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });

    console.log("1️⃣ Creating Firebase Auth user...");

    // Create user with Firebase Auth
    const userCredential = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update user profile
    await user.updateProfile({
      displayName: "Christian Bautista",
    });

    console.log("✅ Firebase Auth user created:", {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });

    console.log("\n🎉 Firebase Auth account created successfully!");
    console.log("📧 Email:", email);
    console.log("🔑 Password:", password);
    console.log("👤 Name: Christian Bautista");
    console.log("\n💡 Now you can log in with these credentials.");
    console.log(
      "   The system will automatically create the Firestore documents when you log in."
    );

    // Sign out the created user so they can log in normally
    await firebase.auth().signOut();
    console.log("✅ Signed out. You can now log in normally.");
  } catch (error) {
    console.error("❌ Error creating Firebase Auth account:", error.message);

    if (error.code === "auth/email-already-in-use") {
      console.log("\n💡 The email already exists in Firebase Auth.");
      console.log("   You can now try logging in with your existing password.");
    } else if (error.code === "auth/weak-password") {
      console.log("\n💡 Password is too weak. Please use a stronger password.");
    } else if (error.code === "auth/invalid-email") {
      console.log("\n💡 Invalid email format.");
    }
  }
}

// Run the function
createFirebaseAuthAccount();
```

4. **Press Enter** to run the script
5. **Wait for success message**
6. **Try logging in** with:
   - Email: `gradelljbautista@gmail.com`
   - Password: `AdminPassword123!`

### Option 2: Use the Updated Login System

The login system has been updated to automatically create admin accounts. If you have a Firebase Auth account but no Firestore documents, the system will now:

1. ✅ Find users by email in Firestore collections
2. ✅ Create admin accounts automatically if they don't exist in Firestore
3. ✅ Handle both `users` and `customers` collections
4. ✅ Provide better error messages

## 🔍 What Was Fixed

### 1. Email-Based User Search

- **Before**: Only searched by Firebase Auth UID
- **After**: Searches Firestore collections by email address first

### 2. Automatic Account Creation

- **Before**: Required manual account creation
- **After**: Automatically creates admin accounts in Firestore when logging in

### 3. Better Error Handling

- **Before**: Generic "User account not found" error
- **After**: Clear indication of what's missing and how to fix it

### 4. Improved Form Validation

- **Before**: Text input with "Email Address or Username" placeholder
- **After**: Email input with "Email Address" placeholder and validation

## 🧪 Testing

After creating the account, you can test with:

```javascript
// Check if user exists
checkUserExists("gradelljbautista@gmail.com");

// Test login form
testLoginFormChanges();
```

## 📋 Login Credentials

Once created, use these credentials:

- **Email**: `gradelljbautista@gmail.com`
- **Password**: `AdminPassword123!`
- **Role**: Admin
- **Access**: Full admin dashboard

## 🚀 Next Steps

1. **Create the Firebase Auth account** using Option 1
2. **Test the login** with the provided credentials
3. **Verify admin access** to the dashboard
4. **Change the password** if needed through the settings

The system is now properly configured to use email addresses for login and will automatically handle account creation for admin users.
