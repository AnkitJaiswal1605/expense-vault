# ExpenseVault

A dark, luxury expense tracker web app built with React, Vite, and Supabase.

## Features

- **Supabase Auth** for sign up / sign in (email + password)
- **PostgreSQL database** with Row Level Security per user
- **Add expenses** with name, amount, category (food, travel, bills, other), and date
- **View all expenses** in a clean, categorized list
- **Filter by category** using chip buttons
- **Delete expenses** with a smooth slide-out animation
- **Dashboard summary** showing total spend and per-category breakdowns
- **Dark premium theme** with gold accents

## Getting Started

```bash
npm install
npm run dev
```

## Tech Stack

- React 18
- Vite
- Supabase (Auth + PostgreSQL + RLS)
- Pure CSS-in-JS styling

## Database Schema

The `expenses` table:

| Column     | Type         | Notes                                 |
|------------|--------------|---------------------------------------|
| id         | uuid         | Primary key, auto-generated           |
| user_id    | uuid         | References auth.users, cascading      |
| name       | text         | Expense description                   |
| amount     | numeric(12,2)| Must be > 0                           |
| category   | text         | One of: food, travel, bills, other    |
| date       | date         | Expense date                          |
| created_at | timestamptz  | Auto-set on insert                    |

RLS policies ensure each user can only SELECT, INSERT, and DELETE their own rows.

## License

MIT
