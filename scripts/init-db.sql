-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant full permissions on public schema to overline user
GRANT ALL ON SCHEMA public TO overline;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO overline;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO overline;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO overline;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO overline;
