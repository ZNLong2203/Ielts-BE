CREATE USER rag_reader WITH PASSWORD 'rag_password';

GRANT CONNECT ON DATABASE ielts TO rag_reader;
GRANT USAGE ON SCHEMA public TO rag_reader;
