# Authentication Setup Guide

Elastic Git Sync now requires authentication to access the application. All routes are protected and users must sign in with valid credentials.

## Initial Setup

### Option 1: Using the Admin Dashboard (Recommended)

1. **Start the services**:
   ```bash
   docker compose up -d
   ```

2. **Access the PocketBase Admin Dashboard**:
   - Open: http://localhost:8090/_/
   - You'll be prompted to create the first admin account
   - Fill in your email and password
   - Click "Create and Login"

3. **Create a user for the application**:
   - In the PocketBase admin dashboard, go to "Collections"
   - Click on "users"
   - Click "+ New record"
   - Fill in:
     - **email**: Your email address
     - **password**: Your password
     - **passwordConfirm**: Same password
     - **emailVisibility**: ✓ (checked)
   - Click "Create"

4. **Sign in to Elastic Git Sync**:
   - Open: http://localhost:3000
   - You'll be redirected to the login page
   - Enter your email and password
   - Click "Sign In"

### Option 2: Using Docker Command

Create a user directly via command line:

```bash
docker compose exec pocketbase /usr/local/bin/pocketbase superuser upsert admin@example.com yourpassword
```

Then sign in at http://localhost:3000/login with those credentials.

## Managing Users

### Creating Additional Users

1. Sign in to PocketBase Admin: http://localhost:8090/_/
2. Go to "Collections" → "users"
3. Click "+ New record"
4. Fill in user details
5. Click "Create"

### Deleting Users

1. Sign in to PocketBase Admin
2. Go to "Collections" → "users"
3. Find the user
4. Click the trash icon
5. Confirm deletion

### Changing Passwords

**For yourself:**
- Currently needs to be done through PocketBase admin
- Future versions will include user profile management

**For other users:**
1. Sign in to PocketBase Admin
2. Go to "Collections" → "users"
3. Find the user
4. Click edit (pencil icon)
5. Enter new password and confirm
6. Click "Save"

## Security Best Practices

### Production Deployment

1. **Change default credentials immediately**
   - Never use default passwords in production
   - Use strong, unique passwords

2. **Restrict PocketBase Admin access**
   - Only allow access from trusted IPs
   - Use VPN for remote access
   - Add authentication layer (reverse proxy with basic auth)

3. **Use HTTPS**
   - Always use HTTPS in production
   - Get SSL certificates from Let's Encrypt
   - Configure reverse proxy (nginx, traefik, etc.)

4. **Regular backups**
   - Backup `backend/pb_data` directory
   - Include user data in backups
   - Test restore procedures

### Nginx Configuration Example

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # PocketBase API
    location /api/ {
        proxy_pass http://localhost:8090/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # PocketBase Admin (restrict to internal IPs)
    location /_/ {
        allow 192.168.1.0/24;  # Your internal network
        deny all;

        proxy_pass http://localhost:8090/_/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Can't access the application

**Problem**: Redirected to /login but can't sign in

**Solution**:
1. Make sure you created a user account
2. Check credentials are correct
3. Verify PocketBase is running: `docker compose ps`
4. Check logs: `docker compose logs pocketbase`

### Forgot password

**Solution**:
1. Access PocketBase admin: http://localhost:8090/_/
2. Go to Collections → users
3. Find your user
4. Click edit
5. Set new password
6. Save changes

### PocketBase admin not accessible

**Problem**: Can't access http://localhost:8090/_/

**Solution**:
1. Check container is running: `docker compose ps`
2. Check logs: `docker compose logs pocketbase`
3. Restart services: `docker compose restart`
4. Check firewall settings

### Authentication token expired

**Problem**: Logged out unexpectedly

**Solution**:
- This is normal security behavior
- Simply log in again
- Session tokens expire after inactivity

### Can't create users

**Problem**: Error when creating users in PocketBase admin

**Solution**:
1. Ensure you're logged into PocketBase admin as a superuser
2. Check password meets requirements (minimum 8 characters)
3. Verify email is valid format
4. Check PocketBase logs for specific errors

## API Authentication

If you need to access the API programmatically:

```bash
# Login to get token
curl -X POST http://localhost:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "admin@example.com",
    "password": "yourpassword"
  }'

# Use token in subsequent requests
curl -X GET http://localhost:8090/api/collections/projects/records \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Future Enhancements

Planned authentication features:
- [ ] User registration (optional, can be disabled)
- [ ] Password reset via email
- [ ] Two-factor authentication (2FA)
- [ ] OAuth providers (Google, GitHub, etc.)
- [ ] Role-based access control (RBAC)
- [ ] User profile management
- [ ] API key management
- [ ] Session management dashboard
- [ ] Audit logs for authentication events

## Support

For authentication issues:
- Check PocketBase logs: `docker compose logs pocketbase`
- Check frontend logs: `docker compose logs frontend`
- Review this guide
- Open an issue on GitHub

---

**Security Note**: Always keep your PocketBase admin credentials secure. These provide full access to the database and should be treated like root credentials.
