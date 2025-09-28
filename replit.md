# Poll Vault

## Overview
Poll Vault is a full-stack polling and survey platform for creators to build, distribute, and analyze polls and surveys. It supports multiple user roles (admin, creator, respondent) and features an intuitive survey builder with various question types, conditional logic, real-time response collection, comprehensive analytics, and a global recipient management system for streamlined contact organization and distribution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Poll Vault employs a monorepo structure with distinct client, server, and shared codebases.

### UI/UX Decisions
- **Frontend Framework**: React with Vite
- **Styling**: TailwindCSS with shadcn/ui for a consistent design system.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod validation.
- **Recipient Management UI**: Dual-mode interface with tabbed navigation, real-time filtering, bulk selection controls, and visual cues for added recipients.

### Technical Implementations
- **Backend Runtime**: Node.js with Express.js.
- **Database ORM**: Drizzle ORM with PostgreSQL.
- **Authentication**: Google OAuth2 with secure HTTP-only cookies and PostgreSQL session store.
- **API Design**: RESTful API with consistent error handling.
- **Survey Builder**: Component-based with modular question types, advanced conditional logic, real-time preview, and client/server-side validation. Supports anonymous surveys and loop groups.
- **File Management**: Centralized asset handling via Vite, with Multer for file uploads.
- **Shared Types**: Common TypeScript definitions in a `/shared` directory.
- **Build Process**: Separate build processes for client (Vite) and server (esbuild).

### Feature Specifications
- **User Roles**: Admin, Creator, Respondent with role-based access control.
- **Survey Features**: Multi-page surveys, advanced question types (text, choice, file upload, loop groups), conditional logic, and configurable anonymous access.
- **Recipient Management**: Centralized, creator-isolated contact database with tag-based organization, advanced search/filter, bulk operations, duplicate prevention, dual-mode selection, and cross-survey reusability.
- **Response & Analytics**: Real-time tracking, comprehensive analytics dashboard, question-level analytics, and response export (CSV, PDF).

### System Design Choices
- **Database**: PostgreSQL with Neon serverless driver.
- **Schema Management**: Drizzle Kit for migrations.
- **Key Database Tables**: Users, Surveys, Survey Pages, Questions, Recipients, Global Recipients, Responses, Answers, Analytics Events, Conditional Rules, Loop Group Subquestions, File Storage.
- **Session Management**: Secure, scalable session handling with `connect-pg-simple`.
- **Rate Limiting**: API protection using `express-rate-limit`.

## External Dependencies

### Core Framework & Database
- `@neondatabase/serverless`: PostgreSQL serverless driver.
- `drizzle-orm`: Type-safe ORM.
- `@tanstack/react-query`: Server state management and caching.
- `express`: Web framework.
- `google-auth-library`: Google OAuth2 client library.
- `multer`: File upload middleware.
- `express-rate-limit`: API rate limiting.

### UI Components
- `@radix-ui/*`: Headless UI components (dialogs, tabs, checkboxes).
- `tailwindcss`: Utility-first CSS framework.
- `class-variance-authority`: Variant-based component APIs.
- `lucide-react`: Icon library.

### Development & Utilities
- `vite`: Frontend build tool and dev server.
- `typescript`: For type safety.
- `esbuild`: Fast bundler for server-side code.
- `drizzle-kit`: Database migration tools.
- `zod`: Runtime type validation.
- `csv-writer`: CSV export functionality.
- `jspdf`: PDF generation.

### Hosting & Authentication
- `connect-pg-simple`: PostgreSQL session store integration.
- `express-session`: Session management.
- `SendGrid`: Email delivery for survey invitations and notifications.