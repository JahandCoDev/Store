-- ECOM.session.sql
-- Insert an admin user into the new database
-- Replace the password hash with a real bcrypt hash if you plan on logging in with credentials.

INSERT INTO "User" (
    "id", 
    "displayId",
    "firstName", 
    "lastName",
    "phone",
    "dateOfBirth",
    "email", 
    "password", 
    "role", 
    "createdAt", 
    "updatedAt"
) VALUES (
    'admin_user_001',                   -- Generate a random valid CUID or String here
    'cus_adminJah',
    'Jah', 
    'Dev', 
    '+14073082412',
    '2002-07-26 00:00:00',
    'admin@jahandco.dev', 
    '$2a$12$UKFa3QGKoBX5323mK27kWOqi1P9uI4HEfdkad05xT4CQ7OSvxLqDK', -- "password123" Bcrypt hash
    'ADMIN',                                 -- Must match the Role Enum value
    NOW(), 
    NOW()
) 
ON CONFLICT ("email") 
DO UPDATE SET 
    "displayId" = EXCLUDED."displayId",
    "firstName" = EXCLUDED."firstName", 
    "lastName" = EXCLUDED."lastName",
    "phone" = EXCLUDED."phone",
    "password" = EXCLUDED."password",
    "dateOfBirth" = EXCLUDED."dateOfBirth",
    "updatedAt" = EXCLUDED."updatedAt";
