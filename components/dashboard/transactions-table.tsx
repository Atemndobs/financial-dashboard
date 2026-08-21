"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EyeIcon, EyeOffIcon, SearchIcon, ChevronLeft, ChevronRight } from "lucide-react"
import type { Transaction, SupportedCurrency } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { toggleTransactionExclusion } from "@/lib/data/actions"
import { cn } from "@/lib/utils"
import { getCategoryColor, getCategoryIcon } from "@/lib/constants/category-visuals"

interface TransactionsTableProps {
  initialTransactions: Transaction[]
  displayCurrency: SupportedCurrency
}

export function TransactionsTable({ initialTransactions, displayCurrency }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Get unique categories
  const categories = Array.from(new Set(transactions.map((t) => t.category))).sort()

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      searchTerm === "" ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.counterparty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setCurrentPage(1)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  const handleToggleExclusion = async (transactionId: string, currentlyExcluded: boolean) => {
    setIsToggling(transactionId)
    try {
      const result = await toggleTransactionExclusion(transactionId, !currentlyExcluded)
      if (result.success) {
        // Update local state
        setTransactions((prev) =>
          prev.map((t) => (t.transaction_id === transactionId ? { ...t, user_excluded: !currentlyExcluded } : t)),
        )
      }
    } catch (error) {
      console.error("[v0] Error toggling exclusion:", error)
    } finally {
      setIsToggling(null)
    }
  }

  const filteredExcludedCount = filteredTransactions.filter((t) => t.user_excluded).length
  const filteredExcludedAmount = filteredTransactions.reduce((sum, t) => sum + (t.user_excluded ? Math.abs(t.amount) : 0), 0)
  const filteredTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const currentPageTotal = paginatedTransactions.reduce((sum, t) => sum + t.amount, 0)

  // Total of what's actually visible on this page, excluding hidden rows.
  const activePageTransactions = paginatedTransactions.filter((t) => !t.user_excluded)
  const activePageTotal = activePageTransactions.reduce((sum, t) => sum + t.amount, 0)

  // When a category filter is active, the Category column is redundant — hide it
  // on mobile so the meaningful columns fit without horizontal scrolling.
  const isCategoryFiltered = categoryFilter !== "all"
  const categoryHeadClass = isCategoryFiltered ? "hidden md:table-cell md:w-[150px]" : "w-[44px] md:w-[150px]"
  const categoryCellClass = isCategoryFiltered ? "hidden md:table-cell md:max-w-[150px]" : "w-[44px] md:max-w-[150px]"

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transactions • {filteredExcludedCount} excluded in view (
              {formatCurrency(filteredExcludedAmount, displayCurrency)})
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-1">
              Filtered total: {formatCurrency(filteredTotal, displayCurrency)} • This page:{" "}
              {formatCurrency(currentPageTotal, displayCurrency)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px] md:w-[110px]">Date</TableHead>
                <TableHead className="max-w-[90px] md:min-w-[200px] md:max-w-[400px]">Description</TableHead>
                <TableHead className={categoryHeadClass}>Category</TableHead>
                <TableHead className="hidden md:table-cell w-[130px]">Account</TableHead>
                <TableHead className="w-[90px] md:w-[120px] text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell w-[100px] text-center">Status</TableHead>
                <TableHead className="w-[48px] md:w-[80px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className={cn(transaction.user_excluded && "opacity-50 bg-muted/30")}>
                    <TableCell className="font-medium whitespace-nowrap text-xs md:text-sm">{formatDate(transaction.date)}</TableCell>
                    <TableCell className="max-w-[90px] md:max-w-[400px] align-top">
                      {(() => {
                        const isExpanded = expandedRows.has(transaction.id)
                        return (
                          <button
                            type="button"
                            onClick={() => toggleRowExpanded(transaction.id)}
                            aria-expanded={isExpanded}
                            title={isExpanded ? "Click to collapse" : "Click to expand"}
                            className="flex flex-col gap-1 text-left w-full group"
                          >
                            <span className="flex items-start gap-1">
                              <ChevronRight
                                className={cn(
                                  "h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground transition-transform",
                                  isExpanded && "rotate-90",
                                )}
                              />
                              <span
                                className={cn(
                                  "font-medium min-w-0 group-hover:text-foreground",
                                  isExpanded ? "whitespace-normal break-words" : "truncate",
                                )}
                              >
                                {transaction.description || "—"}
                              </span>
                            </span>
                            {transaction.counterparty && (
                              <span
                                className={cn(
                                  "text-xs text-muted-foreground pl-[18px]",
                                  isExpanded ? "whitespace-normal break-words" : "truncate",
                                )}
                              >
                                {transaction.counterparty}
                              </span>
                            )}
                          </button>
                        )
                      })()}
                    </TableCell>
                    <TableCell className={categoryCellClass}>
                      <div className="flex items-center gap-2" title={transaction.category}>
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0 hidden md:block"
                          style={{ backgroundColor: getCategoryColor(transaction.category, transaction.category_color) }}
                        />
                        <span>{getCategoryIcon(transaction.category, transaction.category_icon)}</span>
                        <span className="text-sm truncate cursor-help hidden md:inline">
                          {transaction.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[130px]">
                      <span className="truncate cursor-help block" title={transaction.account}>
                        {transaction.account}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold whitespace-nowrap text-xs md:text-sm",
                        transaction.amount >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {(() => {
                        const sourceCurrency: SupportedCurrency =
                          transaction.currency === "EUR" || transaction.currency === "USD" || transaction.currency === "CHF"
                            ? transaction.currency
                            : "CHF"
                        const formatted = formatCurrency(transaction.amount, displayCurrency, sourceCurrency)
                        return (
                          <>
                            {transaction.amount >= 0 ? "+" : ""}
                            {formatted}
                          </>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      {transaction.user_excluded ? (
                        <Badge variant="secondary" className="text-xs">
                          Excluded
                        </Badge>
                      ) : transaction.exclude_from_spending ? (
                        <Badge variant="outline" className="text-xs">
                          Auto-excluded
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleExclusion(transaction.transaction_id, transaction.user_excluded)}
                        disabled={isToggling === transaction.transaction_id}
                      >
                        {transaction.user_excluded ? (
                          <EyeIcon className="h-4 w-4" />
                        ) : (
                          <EyeOffIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Sticky page total — reflects only the active (non-hidden) rows on this page */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-4 rounded-md border-2 bg-slate-100 dark:bg-slate-800 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.12)]">
          <span className="text-sm font-medium text-muted-foreground">
            Page total
            <span className="ml-1 hidden sm:inline">
              ({activePageTransactions.length} active
              {activePageTransactions.length !== paginatedTransactions.length
                ? `, ${paginatedTransactions.length - activePageTransactions.length} hidden`
                : ""}
              {isCategoryFiltered ? ` · ${categoryFilter}` : ""})
            </span>
          </span>
          <span
            className={cn(
              "text-base font-bold tabular-nums",
              activePageTotal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {activePageTotal >= 0 ? "+" : ""}
            {formatCurrency(activePageTotal, displayCurrency)}
          </span>
        </div>

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of{" "}
              {filteredTransactions.length} transactions
              {transactions.length !== filteredTransactions.length && ` (filtered from ${transactions.length})`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm font-medium px-2">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
