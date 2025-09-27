# Survey Platform

## Overview

This is a full-stack survey platform built for Replit that enables creators to design, distribute, and analyze surveys. The platform supports multiple user roles (admin, creator, respondent) with JWT-based authentication for admins and creators, while respondents access surveys through secure tokenized links. Core features include a drag-and-drop survey builder with various question types, conditional logic, real-time response collection, and analytics dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite for fast development and hot module replacement
- **Styling**: TailwindCSS with shadcn/ui component library for consistent design system
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe forms

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Replit's OIDC-based authentication with session management
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful API with consistent error handling and logging middleware

### Database Design
- **Database**: PostgreSQL with Neon serverless driver for scalability
- **Schema Management**: Drizzle Kit for migrations and schema versioning
- **Key Tables**: 
  - Users with role-based access (admin/creator)
  - Surveys with status tracking (draft/open/closed)
  - Survey pages for multi-page surveys
  - Questions with multiple types (text, choice, file upload, etc.)
  - Recipients for survey distribution
  - Responses and answers for data collection
  - Analytics events for tracking user interactions

### Authentication & Authorization
- **Primary Auth**: Replit OIDC integration for seamless platform integration
- **Session Management**: Secure HTTP-only cookies with PostgreSQL session store
- **Access Control**: Role-based permissions with middleware protection
- **Respondent Access**: Tokenized survey links without requiring authentication

### Survey Builder Architecture
- **Component-Based**: Modular question components for different input types
- **Conditional Logic**: Question dependencies and page flow control
- **Real-time Preview**: Live survey preview during creation
- **Validation**: Client and server-side validation for survey integrity

### File Architecture
- **Monorepo Structure**: Single repository with client, server, and shared code
- **Shared Types**: Common TypeScript definitions in `/shared` directory
- **Asset Management**: Centralized asset handling through Vite
- **Build Process**: Separate build processes for client (Vite) and server (esbuild)

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver for database connectivity
- **drizzle-orm**: Type-safe ORM for database operations and migrations
- **@tanstack/react-query**: Server state management and caching
- **express**: Web framework for API server
- **passport**: Authentication middleware for Replit OIDC

### UI Component Libraries
- **@radix-ui/react-***: Headless UI components for accessibility and customization
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library for consistent iconography

### Development Tools
- **vite**: Build tool and development server for frontend
- **typescript**: Type safety across the entire application
- **esbuild**: Fast bundler for server-side code
- **drizzle-kit**: Database migration and introspection tools

### Replit-Specific Integrations
- **@replit/vite-plugin-dev-banner**: Development environment enhancements
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling
- **openid-client**: OIDC client for Replit authentication integration