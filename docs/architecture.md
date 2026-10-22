
# System Architecture

## Overview

The Document Repository is a full-stack application for uploading,
searching, viewing, downloading, and versioning corporate documents.

## Components

1. Frontend: Next.js using the App Router.
2. Backend: Node.js with Express REST APIs.
3. Database: PostgreSQL for structured metadata.
4. File Storage: Local filesystem for uploaded documents.
5. Docker Compose: Runs PostgreSQL in a reproducible environment.

## Design Choices

The frontend and backend are separated to keep user interface logic
independent from business logic.

The backend is responsible for validation, permissions, document
management, and database access.

Document metadata is stored in PostgreSQL, while actual files are
stored separately on the filesystem.

The backend will be organized into routes, controllers, services,
and repositories.

The initial POC uses local file storage. For a larger deployment,
object storage could replace the local filesystem.

## Assumptions

- Authentication is simplified for the POC using predefined demo users.
- The backend is responsible for enforcing department permissions.
- New document versions are retained rather than overwriting old files.
- PostgreSQL is started using Docker Compose.
