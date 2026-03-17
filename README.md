# Finance Dashboard - Web App

A modern, responsive financial dashboard built with Next.js, React, Convex, and Clerk for visualizing and managing personal finance data.

## Features

- 📊 **Interactive Charts** - Monthly trends, category breakdowns, and savings rate visualization
- 💰 **KPI Cards** - Quick overview of income, expenses, and savings
- 🔍 **Advanced Filtering** - Filter by year, account, and toggle transfers/savings
- 📋 **Transaction Management** - Browse, search, and exclude transactions with pagination
- 🎨 **Modern UI** - Built with Tailwind CSS and shadcn/ui components
- 🌓 **Dark Mode** - Full dark mode support
- 📱 **Responsive** - Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Backend/Data:** Convex
- **Authentication:** Clerk
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui + Radix UI
- **Charts:** Recharts
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Convex project
- Clerk application

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/finance-dashboard.git
cd finance-dashboard
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
MIGRATION_CLERK_USER_ID=your_target_clerk_user_id
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Data Setup

The Convex schema includes these migrated tables:

- `fin_transactions` - Main transaction data
- `fin_categories` - Category definitions
- `fin_exclusions` - User exclusions
- `fin_sync_log` - Sync history

View-equivalent aggregates are implemented as Convex queries:

- `monthly_stats`
- `category_stats`

Run migration from Supabase:

```bash
npm run migrate:convex
```

## Development

### Project Structure

```
finance-dashboard/
├── app/                    # Next.js app router pages
├── components/
│   ├── dashboard/         # Dashboard-specific components
│   └── ui/                # Reusable UI components (shadcn/ui)
├── lib/
│   ├── data/              # Data fetching and actions
│   ├── convex/            # Convex server client helpers
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── convex/                # Convex schema and functions
├── scripts/               # Migration scripts
├── public/                # Static assets
└── styles/                # Global styles
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run migrate:convex` - Migrate Supabase data to Convex

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/finance-dashboard)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | Yes |
| `CLERK_SECRET_KEY` | Clerk backend secret key | Yes |
| `MIGRATION_CLERK_USER_ID` | Clerk user id for imported data | For migration |
| `SUPABASE_URL` | Legacy Supabase URL | For migration |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key | For migration |

## Features in Detail

### Dashboard Components

- **Filter Bar** - Year and account filtering
- **Yearly KPIs** - Income, expenses, net savings, and savings rate
- **Monthly Trend Chart** - Bar chart showing income vs expenses over time
- **Category Breakdown** - Pie and bar charts for expense categories
- **Monthly Explorer** - Month-by-month detailed breakdown
- **Transactions Table** - Searchable, filterable, paginated transaction list

### Transaction Management

- Search across description, counterparty, and category
- Filter by category
- Pagination (10, 25, 50, 100 per page)
- Exclude/include transactions from calculations
- Visual indicators for excluded transactions

## Contributing

This is a personal project, but suggestions and bug reports are welcome!

## License

MIT

## Related Projects

This web dashboard is part of a larger finance management system that includes:
- Desktop categorization tool (Python)
- PDF extraction tool (Python)
- Convex sync utilities

---

Built with ❤️ using Next.js, Convex, and Clerk
