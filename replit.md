# Poll Vault

## Overview

Poll Vault is a comprehensive full-stack polling and survey platform built for Replit that empowers creators to design, distribute, and analyze polls and surveys with advanced recipient management capabilities. The platform supports multiple user roles (admin, creator, respondent) with Replit's OIDC-based authentication for admins and creators, while respondents access surveys through secure tokenized links. Core features include an intuitive survey builder with various question types, conditional logic, real-time response collection, comprehensive analytics dashboard, and a powerful global recipient management system that streamlines contact organization and survey distribution.

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
  - Surveys with status tracking (draft/open/closed) and anonymous access configuration
  - Survey pages for multi-page surveys
  - Questions with multiple types (text, choice, file upload, loop groups, etc.)
  - Recipients for survey-specific distribution
  - **Global Recipients** for centralized contact management across all surveys
  - Responses and answers for data collection (supporting both authenticated and anonymous responses)
  - Analytics events for comprehensive user interaction tracking
  - Conditional rules for dynamic survey logic
  - Loop group subquestions for repeatable question sets
  - File storage for upload question types
  - Anonymous response tracking for access control

### Authentication & Authorization
- **Primary Auth**: Replit OIDC integration for seamless platform integration
- **Session Management**: Secure HTTP-only cookies with PostgreSQL session store
- **Access Control**: Role-based permissions with middleware protection
- **Respondent Access**: Tokenized survey links without requiring authentication
- **Anonymous Access**: Configurable anonymous survey access with IP/session limiting
- **Creator Isolation**: Global recipients and surveys are isolated per creator for data privacy

### Survey Builder Architecture
- **Component-Based**: Modular question components for different input types including loop groups
- **Conditional Logic**: Advanced question dependencies and page flow control with multiple operators
- **Real-time Preview**: Live survey preview during creation
- **Validation**: Client and server-side validation for survey integrity
- **Anonymous Survey Support**: Configurable anonymous access with various limiting options
- **Loop Groups**: Repeatable question sets with dynamic add/remove functionality

### File Architecture
- **Monorepo Structure**: Single repository with client, server, and shared code
- **Shared Types**: Common TypeScript definitions in `/shared` directory with comprehensive data models
- **Asset Management**: Centralized asset handling through Vite with file upload support
- **Build Process**: Separate build processes for client (Vite) and server (esbuild)
- **Component Organization**: Modular UI components with dedicated recipient management interfaces
- **Service Layer**: Specialized services for email notifications, file handling, and data export

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver for database connectivity
- **drizzle-orm**: Type-safe ORM for database operations and migrations
- **@tanstack/react-query**: Server state management and caching for real-time recipient updates
- **express**: Web framework for API server with rate limiting and file upload support
- **passport**: Authentication middleware for Replit OIDC integration
- **multer**: File upload middleware for survey file attachments
- **express-rate-limit**: API rate limiting for security and performance

### UI Component Libraries
- **@radix-ui/react-***: Headless UI components for accessibility and customization including advanced dialogs, tabs, and selection components
- **tailwindcss**: Utility-first CSS framework for styling with custom color schemes and responsive design
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library for consistent iconography across recipient management interfaces
- **@radix-ui/react-tabs**: Tabbed interface components for dual-mode recipient management
- **@radix-ui/react-checkbox**: Advanced checkbox components for bulk selection operations

### Development Tools
- **vite**: Build tool and development server for frontend with hot module replacement
- **typescript**: Type safety across the entire application including recipient management types
- **esbuild**: Fast bundler for server-side code
- **drizzle-kit**: Database migration and introspection tools for schema evolution
- **zod**: Runtime type validation for API requests and recipient data
- **csv-writer**: CSV export functionality for recipient and response data
- **jspdf**: PDF generation for survey responses and analytics reports

### Replit-Specific Integrations
- **@replit/vite-plugin-dev-banner**: Development environment enhancements
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling
- **openid-client**: OIDC client for Replit authentication integration
- **connect-pg-simple**: PostgreSQL session store integration for Replit deployment
- **express-session**: Session management optimized for Replit's infrastructure

## Enhanced Recipient Management Architecture

Poll Vault features a sophisticated dual-mode recipient management system that significantly enhances contact organization and survey distribution capabilities.

### Global Recipient System
- **Centralized Contact Database**: Creators maintain a unified global recipient list across all surveys
- **Creator Isolation**: Each creator's global recipients are private and isolated from other users
- **Tag-Based Organization**: Recipients can be categorized using custom tags for efficient filtering and selection
- **Search and Filter**: Advanced search capabilities across names, emails, and tags for quick contact discovery
- **Bulk Operations**: Mass delete, export, and selection operations for efficient contact management
- **Duplicate Prevention**: Automatic detection and prevention of duplicate email addresses within creator's global list

### Dual-Mode Recipient Selection
- **From Global Contacts**: Select existing recipients from global database with real-time search and filtering
- **New Contact Creation**: Add new recipients directly to surveys with optional global list saving
- **Bulk Import**: Add multiple global recipients to surveys simultaneously with duplicate detection
- **Cross-Survey Reusability**: Global recipients can be easily added to multiple surveys without re-entering information

### Enhanced User Interface
- **Tabbed Interface**: Clean separation between global recipient management and survey-specific recipients
- **Dynamic Selection**: Real-time filtering and selection of recipients based on search criteria and tags
- **Bulk Selection Controls**: Select all/none toggles with visual feedback for mass operations
- **Already Added Indicators**: Visual cues showing which global recipients are already in specific surveys
- **Responsive Design**: Optimized interface that works seamlessly across desktop and mobile devices

### Database Schema Integration
- **Global Recipients Table**: Dedicated table linking recipients to creators with tag support and indexing
- **Performance Optimization**: Strategic database indices for efficient searching and filtering operations
- **Data Integrity**: Foreign key relationships ensuring data consistency between global and survey-specific recipients
- **Timestamp Tracking**: Created and updated timestamps for audit trails and data management

### API Architecture for Global Recipients
- **RESTful Endpoints**: Comprehensive CRUD operations for global recipient management
- **Bulk Operations**: Specialized endpoints for mass operations and data transfers
- **Duplicate Detection**: Built-in validation to prevent duplicate entries within creator's scope
- **Performance Optimization**: Efficient query patterns with pagination and filtering support

## Core Features

### Survey Creation and Management
- **Intuitive Survey Builder**: Drag-and-drop interface for creating multi-page surveys
- **Advanced Question Types**: Support for text, multiple choice, radio buttons, yes/no, date/time, file uploads, and loop groups
- **Conditional Logic**: Dynamic question visibility and requirements based on previous responses
- **Real-time Preview**: Live preview of surveys during creation process
- **Survey Status Management**: Draft, open, and closed states with bulk operations
- **Anonymous Survey Support**: Configurable anonymous access with various limiting options

### Enhanced Recipient Management
- **Global Contact Database**: Centralized recipient management across all surveys
- **Advanced Search and Filtering**: Find recipients by name, email, or custom tags
- **Bulk Operations**: Mass selection, deletion, and survey assignment capabilities
- **Tag-Based Organization**: Categorize recipients with custom tags for efficient management
- **Duplicate Prevention**: Automatic detection and prevention of duplicate contacts
- **Cross-Survey Distribution**: Easily distribute surveys to existing global recipients
- **Import/Export Capabilities**: Bulk import contacts and export recipient data

### Response Collection and Analytics
- **Real-time Response Tracking**: Monitor survey responses as they come in
- **Comprehensive Analytics Dashboard**: Detailed insights into survey performance
- **Advanced Metrics**: Completion rates, time spent, drop-off analysis, and engagement scoring
- **Question-Level Analytics**: Individual question performance and answer distribution
- **Response Export**: Multiple format support including CSV and PDF
- **Anonymous Response Handling**: Support for anonymous responses with configurable access controls

### User Roles and Permissions
- **Creator Access**: Full survey creation, recipient management, and analytics access
- **Admin Capabilities**: Platform-wide management and user oversight
- **Respondent Experience**: Seamless survey completion without account requirements
- **Data Privacy**: Creator-isolated data ensuring privacy and security
- **Role-Based Access Control**: Granular permissions based on user roles

### Technical Capabilities
- **File Upload Support**: Secure file attachments with type validation
- **Conditional Survey Logic**: Dynamic question flow based on responses
- **Loop Group Questions**: Repeatable question sets for complex data collection
- **Rate Limiting**: API protection against abuse and spam
- **Session Management**: Secure, scalable session handling
- **Database Optimization**: Efficient queries with strategic indexing for performance

## Recent Changes

### September 2025 - Poll Vault Rebranding and Enhanced Recipient Management
- **Complete Platform Rebranding**: Transitioned from "Survey Platform" to "Poll Vault" with updated branding and messaging
- **Global Recipient System**: Implemented comprehensive global recipient management with creator isolation
- **Enhanced UI/UX**: Redesigned recipient management interface with tabbed navigation and advanced filtering
- **Bulk Operations**: Added mass selection, deletion, and assignment capabilities for efficient contact management
- **Tag-Based Organization**: Introduced custom tagging system for recipient categorization and filtering
- **Advanced Search**: Implemented real-time search across recipient names, emails, and tags
- **Duplicate Prevention**: Added automatic duplicate detection for global recipient lists
- **Cross-Survey Distribution**: Enabled easy recipient selection across multiple surveys
- **Performance Optimization**: Added strategic database indexing for improved search and filter performance
- **API Enhancement**: Extended API with comprehensive global recipient endpoints and bulk operations

## User Preferences

Preferred communication style: Simple, everyday language.

*Last updated: September 27, 2025*