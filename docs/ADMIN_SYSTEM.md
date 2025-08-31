# Admin System Documentation

## Overview

The system has been restructured to use a dedicated `AdminUser` collection for officers instead of relying on the member collection's roles field. This provides better separation of concerns and easier management.

## Admin Roles

The following admin roles are available:

- `super-admin` - Can manage all other officers (CRUD operations)
- `chairman` - Chairman of the organization
- `secretary` - Secretary 
- `vice-chairman` - Vice Chairman
- `vice-secretary` - Vice Secretary
- `treasurer` - Treasurer
- `loan-treasurer` - Loan Treasurer
- `auditor` - Auditor (NEW)
- `speaker-handler` - Speaker Handler

## Setup

### 1. Create Super Admin

Run the setup script to create the initial super admin:

```bash
npm run setup-admin
```

This creates:
- Member ID: 0
- Password: admin
- Role: super-admin

**Important**: Change the default password after first login.

### 2. Login

Use the existing login endpoint `/auth/login` with:
- `member_id`: 0
- `password`: admin

The system will automatically check both AdminUser and Member collections.

## API Endpoints

All officer management endpoints require super-admin role access.

### Base URL: `/officer`

#### Get All Officers
- **GET** `/`
- **Auth**: Required (super-admin)
- **Response**: List of all active officers

#### Get Officer by ID  
- **GET** `/:id`
- **Auth**: Required (super-admin)
- **Response**: Single officer data

#### Create Officer
- **POST** `/`
- **Auth**: Required (super-admin)
- **Body**: 
  ```json
  {
    "member_id": 123,
    "name": "John Doe",
    "role": "treasurer",
    "password": "secure_password"
  }
  ```

#### Update Officer
- **PUT** `/:id`
- **Auth**: Required (super-admin)
- **Body**: Fields to update (member_id cannot be changed)

#### Deactivate Officer
- **PUT** `/:id/deactivate`
- **Auth**: Required (super-admin)
- **Action**: Soft delete (sets isActive: false)

#### Reactivate Officer
- **PUT** `/:id/reactivate` 
- **Auth**: Required (super-admin)
- **Action**: Reactivates deactivated officer

#### Delete Officer
- **DELETE** `/:id`
- **Auth**: Required (super-admin)
- **Action**: Permanent deletion

#### Change Password
- **PUT** `/:id/change-password`
- **Auth**: Required (any officer can change own password)
- **Body**:
  ```json
  {
    "currentPassword": "old_password",
    "newPassword": "new_password"
  }
  ```

#### Get Officers by Role
- **GET** `/role/:role`
- **Auth**: Required (super-admin)
- **Response**: Officers with specific role

## Database Collections

### AdminUser Collection
```javascript
{
  member_id: Number,      // Unique member ID
  password: String,       // Hashed password
  name: String,          // Officer name
  role: String,          // Admin role
  isActive: Boolean,     // Active status
  createdAt: Date,       // Creation timestamp
  updatedAt: Date        // Update timestamp
}
```

### Admin Collection (Organizational Structure)
Keeps the existing structure but adds auditor role:
```javascript
{
  chairman: { memberId, name },
  secretary: { memberId, name },
  viceChairman: { memberId, name },
  viceSecretary: { memberId, name },
  treasurer: { memberId, name },
  loanTreasurer: { memberId, name },
  auditor: { memberId, name },        // NEW
  speakerHandler: { memberId, name },
  areaAdmins: [...]
}
```

## Authentication Flow

1. Login request sent to `/auth/login`
2. System checks AdminUser collection first
3. If not found, checks Member collection
4. Returns JWT token with role and userType information
5. Token includes:
   ```javascript
   {
     member_id: 123,
     name: "John Doe", 
     roles: ["treasurer"],
     userType: "admin" | "member"
   }
   ```

## Security Features

- Passwords are automatically hashed using bcrypt
- JWT tokens with expiration
- Role-based access control
- Super-admin role required for officer management
- Soft delete for officers (deactivation)
- Officers can change their own passwords

## Migration Notes

- Existing member login still works
- AdminUser collection is separate from Member collection
- Super-admin (member_id: 0) is not a regular member
- Both collections can be used simultaneously
- Backward compatibility maintained

## Usage Examples

### Create a new treasurer:
```bash
POST /officer
Authorization: Bearer <super_admin_token>
{
  "member_id": 45,
  "name": "Jane Smith", 
  "role": "treasurer",
  "password": "secure123"
}
```

### Login as officer:
```bash
POST /auth/login
{
  "member_id": 45,
  "password": "secure123"
}
```

### Change officer password:
```bash
PUT /officer/<officer_id>/change-password
Authorization: Bearer <officer_token>
{
  "currentPassword": "secure123",
  "newPassword": "newsecure456"
}
```
