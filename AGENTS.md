# Admin Frontend Development Instructions

## Project Overview

This project is a modern administration panel for an existing PHP backend API.

The frontend must consume and integrate with the existing API rather than reimplementing backend functionality.

The backend API is the source of truth for:

* available features
* authentication
* authorization
* business rules
* entities
* relationships
* validation rules
* API response formats
* API error formats
* pagination
* filtering
* sorting
* permissions

Do not invent API endpoints or business logic when the existing backend already provides the required functionality.

---

## Technology Stack

Use the following stack unless there is a strong technical reason not to:

* React
* TypeScript
* Vite
* Ant Design
* React Router
* TanStack Query
* React Hook Form
* Zod
* Axios or native fetch
* Zustand only when local/global client state is actually required

Prefer existing project dependencies if they already satisfy the requirement.

Do not introduce a new library when an existing dependency can solve the problem cleanly.

---

# CRITICAL RULE: Inspect Before Implementing

Before implementing any feature, inspect the existing PHP API and frontend code.

Do not guess how the backend works.

First identify:

1. Available API endpoints
2. HTTP methods
3. Authentication mechanism
4. Authorization and permissions
5. Request parameters
6. Request bodies
7. Response structures
8. Error responses
9. Pagination format
10. Filtering capabilities
11. Sorting capabilities
12. Search capabilities
13. File upload/download behavior
14. Entity relationships
15. Existing business rules
16. Existing validation
17. Existing status/state values

If API documentation does not exist, inspect the PHP backend source code.

Search for:

* routes
* controllers
* services
* repositories
* models
* request validators
* authentication middleware
* authorization middleware
* serializers/resources
* database relationships
* existing API clients

Use the backend implementation to determine how the frontend should communicate with the API.

---

# Backend Is Read-Only by Default

The PHP API is an existing system.

Do NOT modify backend code unless explicitly instructed.

Do NOT:

* change database schemas
* change API contracts
* rename endpoints
* change response formats
* change authentication
* change permissions
* remove existing functionality
* introduce breaking changes

If the frontend cannot correctly implement a feature because the API is missing something, report the missing API capability before modifying the backend.

---

# Development Workflow

For every significant feature, follow this workflow:

## Step 1 — Investigate

Inspect the relevant frontend and backend code.

Determine:

* which API endpoints are involved
* what data they return
* what actions are supported
* what permissions are required
* what UI is needed

## Step 2 — Plan

Before making large changes, describe the implementation plan briefly.

Example:

```text
Feature: User Management

API:
- GET /users
- GET /users/{id}
- POST /users
- PUT /users/{id}
- DELETE /users/{id}

Frontend:
- UsersPage
- UsersTable
- UserFilters
- UserForm
- UserDetailsDrawer

React Query:
- useUsers
- useUser
- useCreateUser
- useUpdateUser
- useDeleteUser
```

## Step 3 — Implement

Implement the feature using the existing API.

Keep the implementation modular and reusable.

## Step 4 — Verify

After implementation:

* run TypeScript checks
* run linting
* run tests if available
* build the project
* inspect errors
* fix issues

Do not claim a feature is complete if the project does not build successfully.

---

# Architecture

Use a feature-oriented architecture.

Prefer:

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── layouts/
│
├── components/
│   ├── common/
│   ├── forms/
│   ├── tables/
│   └── feedback/
│
├── features/
│   ├── auth/
│   ├── users/
│   ├── roles/
│   ├── products/
│   ├── orders/
│   └── ...
│
├── api/
│   ├── client.ts
│   ├── types.ts
│   └── ...
│
├── hooks/
├── lib/
├── types/
└── main.tsx
```

Adapt this structure to the existing project instead of blindly replacing an existing architecture.

Each feature should ideally contain its own:

```text
feature/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── types/
└── index.ts
```

---

# API Layer

Do not call APIs directly from UI components.

Bad:

```tsx
const UsersPage = () => {
  useEffect(() => {
    fetch('/api/users')
  }, [])
}
```

Prefer:

```text
UI
 ↓
React Query hook
 ↓
API function
 ↓
API client
 ↓
PHP backend
```

Example:

```ts
export const getUsers = async (
  params: UsersQuery
): Promise<UsersResponse> => {
  const response = await api.get('/users', { params });
  return response.data;
};
```

Then:

```ts
export const useUsers = (params: UsersQuery) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => getUsers(params),
  });
};
```

---

# React Query

Use TanStack Query for server state.

Do not use Zustand, Context, or local state as a replacement for server-state management.

Use React Query for:

* API data
* caching
* loading states
* mutations
* invalidation
* optimistic updates where appropriate
* pagination
* refetching

After mutations, invalidate or update the relevant queries.

Example:

```ts
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['users'],
    });
  },
});
```

---

# Authentication

First inspect how the PHP API authenticates users.

Possible mechanisms may include:

* session cookies
* JWT
* access/refresh tokens
* bearer tokens
* CSRF protection
* custom authentication

Do not assume JWT.

Implement authentication according to the existing backend.

Protect private routes.

Handle:

* login
* logout
* expired authentication
* unauthorized responses
* forbidden responses
* token/session refresh if supported

Never store sensitive credentials insecurely.

---

# Authorization

The backend is authoritative for permissions.

The frontend may hide UI elements based on permissions for usability, but this must never be considered a security mechanism.

For example:

```tsx
{can('users.create') && (
  <Button>Create user</Button>
)}
```

However, API authorization must still be enforced by the PHP backend.

First inspect the existing permission model before creating frontend permission abstractions.

Do not invent permission names if the backend already defines them.

---

# Tables

Administration pages will frequently use tables.

Use Ant Design Table unless there is a specific reason to use another table library.

Tables should support backend capabilities where available:

* pagination
* sorting
* filtering
* search
* column visibility where useful
* row actions
* bulk actions where supported
* loading states
* empty states
* error states

Do not fetch the entire dataset just to perform filtering or pagination in the browser if the backend already supports server-side operations.

---

# Forms

Use:

* React Hook Form
* Zod where appropriate
* Ant Design form controls

Forms should:

* validate user input
* display API validation errors
* preserve server-side validation
* show loading states
* prevent accidental duplicate submissions
* clearly indicate required fields

Do not duplicate complex backend business rules in the frontend unless there is a clear UX reason.

The backend remains authoritative.

---

# Error Handling

Implement consistent handling for:

* network errors
* HTTP 400 errors
* HTTP 401 errors
* HTTP 403 errors
* HTTP 404 errors
* HTTP 409 errors
* HTTP 422 validation errors
* HTTP 500 errors

Do not silently swallow errors.

Provide useful user-facing messages while keeping technical details in logs where appropriate.

---

# Loading and Empty States

Every API-driven page should properly handle:

```text
Loading
Success with data
Success with no data
Error
Unauthorized
Forbidden
```

Avoid blank screens while requests are loading.

---

# TypeScript

Use strict TypeScript.

Avoid:

```ts
any
```

unless absolutely unavoidable.

Prefer explicit types and API response interfaces.

Do not blindly trust API data.

If API schemas are available, use them as the basis for frontend types.

If the backend API has OpenAPI/Swagger documentation, investigate whether types can be generated instead of manually duplicating them.

---

# UI/UX

Use Ant Design consistently.

Prefer reusable components over repeated markup.

Examples:

```text
PageHeader
DataTable
ConfirmDeleteModal
StatusBadge
PermissionGuard
FormDrawer
EntitySelect
EmptyState
ErrorState
```

Do not create unnecessary abstractions.

The UI should be:

* responsive
* consistent
* accessible
* keyboard-friendly
* clear about destructive actions
* consistent with existing application behavior

---

# Routing

Use React Router.

Routes should be organized by feature.

Example:

```text
/admin
/admin/dashboard
/admin/users
/admin/users/:id
/admin/roles
/admin/products
/admin/orders
```

Protected routes should require authentication.

Permission-specific routes should respect the backend permission model.

---

# Existing Features

The existing PHP API may already expose many features.

Your job is to discover them and progressively implement the frontend.

When asked to "implement the next feature":

1. Inspect the PHP API.
2. Identify the relevant endpoints.
3. Understand the request/response contracts.
4. Check existing frontend patterns.
5. Implement the feature.
6. Reuse existing components.
7. Add missing reusable components only when necessary.
8. Run checks.
9. Report what was implemented and any API limitations.

---

# Do Not Overengineer

Prefer simple solutions.

Do not introduce:

* micro-frontends
* unnecessary state management
* unnecessary abstractions
* unnecessary design systems
* unnecessary dependencies
* complex generic components

unless the project actually needs them.

A straightforward implementation is preferred over an abstract implementation that is difficult to maintain.

---

# Code Quality

Write production-quality code.

Requirements:

* readable
* typed
* modular
* maintainable
* testable
* consistent

Follow the existing project's formatting and linting rules.

Do not rewrite unrelated files.

Do not perform large refactors while implementing a small feature unless explicitly requested.

---

# Git Safety

Do not delete or overwrite user changes.

Before making large changes, inspect the current git state.

Do not reset, checkout, or revert unrelated user work.

Do not commit changes unless explicitly requested.

---

# Communication

When a task is ambiguous:

1. Inspect the codebase first.
2. Look for existing patterns.
3. Make reasonable assumptions when they are safe.
4. Ask for clarification only when necessary.

When reporting completed work, provide:

```text
Implemented:
- ...

API endpoints used:
- ...

Files changed:
- ...

Verification:
- TypeScript: passed/failed
- Lint: passed/failed
- Build: passed/failed
- Tests: passed/failed

Notes:
- ...
```

---

# Most Important Principle

The existing PHP API is the source of truth.

Understand the backend first.

Then build a clean, maintainable React administration interface around the functionality that already exists.

Do not invent backend behavior.
Do not change the API contract.
Do not assume undocumented behavior.
Inspect first, plan second, implement third, verify last.
