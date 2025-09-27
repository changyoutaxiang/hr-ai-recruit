# Overview

This is a comprehensive HR recruitment and talent management system built with a modern TypeScript/React stack. The application provides end-to-end recruitment functionality including candidate management, job posting, interview scheduling, AI-powered resume analysis, and candidate-job matching. The system features an AI assistant for recruitment guidance and customizable prompt templates for consistent AI interactions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **File Processing**: Multer for file uploads, PDF parsing for resume text extraction
- **Development**: Hot module replacement with Vite integration

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Object Storage**: Google Cloud Storage for file storage (resumes, documents)
- **Schema Management**: Drizzle migrations for database versioning
- **Data Models**: Users, Jobs, Candidates, Interviews, AI Conversations, Job Matches, Prompt Templates, and Candidate Status History

## Authentication and Authorization
- **Object-level ACL**: Custom access control system for file storage with configurable permission groups
- **Session Management**: Cookie-based authentication with credential handling
- **File Security**: Pre-signed URLs for secure file uploads and access control policies

## AI Integration Architecture
- **AI Provider**: OpenAI GPT-5 for natural language processing
- **Resume Analysis**: Automated skill extraction, experience calculation, and candidate summarization
- **Job Matching**: AI-powered candidate-job compatibility scoring with explanations
- **Conversational AI**: Chat interface for recruitment guidance and best practices
- **Template System**: Customizable prompt templates for consistent AI interactions across different use cases

## External Dependencies

- **Database**: Neon PostgreSQL serverless database with connection pooling
- **Object Storage**: Google Cloud Storage with Replit sidecar authentication
- **AI Services**: OpenAI API for resume analysis, job matching, and conversational assistance
- **File Processing**: pdf-parse library for extracting text from PDF resumes
- **File Upload**: Uppy.js with AWS S3 compatibility for robust file handling
- **UI Components**: Extensive Radix UI component library for accessible interfaces
- **Development Tools**: Replit-specific plugins for cartographer and dev banner in development