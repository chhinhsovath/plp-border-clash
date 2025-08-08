# Deployment Status

## Recent Deployments

- **Latest Commit**: aedb75c - fix: Add all test users to database seed
- **Deployment Date**: 2025-08-08
- **Status**: Pending

## Test Credentials

All test users are now available in production:

- **Super Admin**: super@hrs.openplp.com / Super@123
- **Admin**: admin@hrs.openplp.com / Admin@123  
- **Manager**: manager@hrs.openplp.com / Manager@123
- **Data Entry**: dataentry@hrs.openplp.com / DataEntry@123
- **Viewer**: viewer@hrs.openplp.com / Viewer@123

## Build Configuration

The project uses the following build command:
```
prisma generate && prisma db push && next build
```

## Environment Variables

Required environment variables:
- DATABASE_URL
- JWT_SECRET
- NEXTAUTH_SECRET
- VERCEL_BLOB_READ_WRITE_TOKEN