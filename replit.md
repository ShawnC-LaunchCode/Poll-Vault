# Poll Vault

## Overview
Poll Vault is a full-stack polling and survey platform designed for creators. It enables users to build, distribute, and analyze polls and surveys, supporting multiple user roles (admin, creator, respondent). Key capabilities include an intuitive survey builder with various question types, conditional logic, real-time response collection, comprehensive analytics, and a global recipient management system for efficient contact organization and distribution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Poll Vault utilizes a monorepo structure, separating client, server, and shared codebases.

### UI/UX Decisions
The frontend is built with React and Vite, styled using TailwindCSS and shadcn/ui for a consistent design system. Wouter handles client-side routing, and React Hook Form with Zod provides robust form handling. The recipient management interface features dual-mode navigation with tabs, real-time filtering, bulk selection, and visual cues.

### Technical Implementations
The backend is powered by Node.js with Express.js. Data persistence is managed with PostgreSQL via Drizzle ORM. Authentication is handled by Google OAuth2, employing secure HTTP-only cookies and a PostgreSQL session store. The API is RESTful with consistent error handling. The survey builder is component-based, supporting modular question types, advanced conditional logic, real-time previews, and both client/server-side validation. It also supports anonymous surveys and loop groups. File management uses Multer for uploads, and shared TypeScript definitions reside in a `/shared` directory. Separate build processes are used for the client (Vite) and server (esbuild).

### Feature Specifications
Poll Vault supports Admin, Creator, and Respondent user roles with role-based access control. Survey features include multi-page surveys, advanced question types (text, choice, file upload, loop groups), conditional logic, and configurable anonymous access. Recipient management offers a centralized, creator-isolated contact database with tag-based organization, advanced search/filter, bulk operations, duplicate prevention, dual-mode selection, and cross-survey reusability. Response and analytics capabilities include real-time tracking, a comprehensive analytics dashboard, question-level analytics, and response export (CSV, PDF).

### System Design Choices
PostgreSQL with a Neon serverless driver is used for the database, and Drizzle Kit manages schema migrations. Key database tables include Users, Surveys, Questions, Recipients, Responses, and Analytics Events. Session management is secure and scalable using `connect-pg-simple`, and API protection is implemented with `express-rate-limit`.

## External Dependencies

### Core Framework & Database
- `@neondatabase/serverless`: PostgreSQL serverless driver
- `drizzle-orm`: Type-safe ORM
- `@tanstack/react-query`: Server state management and caching
- `express`: Web framework
- `google-auth-library`: Google OAuth2 client library
- `multer`: File upload middleware
- `express-rate-limit`: API rate limiting

### UI Components
- `@radix-ui/*`: Headless UI components
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority`: Variant-based component APIs
- `lucide-react`: Icon library

### Development & Utilities
- `vite`: Frontend build tool and dev server
- `typescript`: For type safety
- `esbuild`: Fast bundler for server-side code
- `drizzle-kit`: Database migration tools
- `zod`: Runtime type validation
- `csv-writer`: CSV export functionality
- `jspdf`: PDF generation

### Hosting & Authentication
- `connect-pg-simple`: PostgreSQL session store integration
- `express-session`: Session management
- `SendGrid`: Email delivery for survey invitations and notifications