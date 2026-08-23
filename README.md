
  # Inventory Management System

  Inventory Management System built with React, Vite, and Tailwind.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Supabase setup

  The app now supports two modes:

  - Demo mode: used automatically when Supabase env vars are missing. Data stays in `localStorage`.
  - Supabase mode: used when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

  ### 1. Create your env file

  Copy `.env.example` to `.env.local` and fill in your Supabase project values:

  ```bash
  VITE_SUPABASE_URL=https://your-project-id.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

  ### 2. Create the database schema

  Open the Supabase SQL editor and run the contents of `supabase-schema.sql`.

  That script creates:

  - `profiles`
  - `organizations`
  - `organization_members`
  - `categories`
  - `inventory_items`

  It also enables Row Level Security policies for the app.

  ### 3. Create users

  This project now signs in through Supabase Auth using email/password.

  Root admins and organization admins can create users from Organization Settings. They assign a temporary password manually or generate one in the app. No invitation email is sent.

  In Supabase mode, deploy the Edge Function in `supabase/functions/create-organization-user` so admins can create Auth users safely without exposing the service role key in the browser:

  ```bash
  supabase functions deploy create-organization-user
  supabase functions deploy update-user-password
  ```

  The function expects Supabase's standard function environment variables, including `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

  On first login, the app will:

  - create/update the user profile in `profiles`
  - create a default organization if the user has none
  - seed default categories
  - seed starter inventory items for the first organization

  ### 4. Install the new dependency

  This repo now expects:

  ```bash
  npm install @supabase/supabase-js
  ```
  
