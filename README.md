# EEMW Document Repository

A full-stack proof-of-concept document repository built with
Next.js, Node.js, Express, and PostgreSQL.

Features will include document upload, search, download,
version history, and department-based access control.


## Environment Configuration

Create a `.env` file inside the `backend` folder
and add the following configuration:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=eemw_user
DB_PASSWORD=eemw_local_password
DB_NAME=eemw_documents
```

These credentials are for the local development
PostgreSQL database configured in docker-compose.yml.