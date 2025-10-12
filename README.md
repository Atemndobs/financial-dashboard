# Finance Dashboard - Web App

A modern, responsive financial dashboard built with Next.js 14, React, and Supabase for visualizing and managing personal finance data.

## Features

- 📊 **Interactive Charts** - Monthly trends, category breakdowns, and savings rate visualization
- 💰 **KPI Cards** - Quick overview of income, expenses, and savings
- 🔍 **Advanced Filtering** - Filter by year, account, and toggle transfers/savings
- 📋 **Transaction Management** - Browse, search, and exclude transactions with pagination
- 🎨 **Modern UI** - Built with Tailwind CSS and shadcn/ui components
- 🌓 **Dark Mode** - Full dark mode support
- 📱 **Responsive** - Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui + Radix UI
- **Charts:** Recharts
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account and project

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Database Setup

The app expects the following Supabase tables:

- `fin_transactions` - Main transaction data
- `fin_category_stats` - Category statistics
- `fin_monthly_stats` - Monthly aggregated statistics
- `fin_yearly_summary` - Yearly summary data

Refer to the parent project's `supabase_migration_v2.sql` for the complete schema.

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
│   ├── supabase/          # Supabase client configuration
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static assets
└── styles/                # Global styles
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

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
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

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
- Supabase sync utilities

---

Built with ❤️ using Next.js and Supabase
