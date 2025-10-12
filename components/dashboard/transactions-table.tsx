"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EyeIcon, EyeOffIcon, SearchIcon, ChevronLeft, ChevronRight } from "lucide-react"
import type { Transaction } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { toggleTransactionExclusion } from "@/lib/data/actions"
import { cn } from "@/lib/utils"

interface TransactionsTableProps {
  initialTransactions: Transaction[]
}

export function TransactionsTable({ initialTransactions }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

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

  const excludedCount = transactions.filter((t) => t.user_excluded).length
  const excludedAmount = transactions.filter((t) => t.user_excluded).reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transactions • {excludedCount} excluded ({formatCurrency(excludedAmount)})
            </CardDescription>
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
                <TableHead className="w-[110px]">Date</TableHead>
                <TableHead className="min-w-[200px] max-w-[400px]">Description</TableHead>
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead className="w-[130px]">Account</TableHead>
                <TableHead className="w-[120px] text-right">Amount</TableHead>
                <TableHead className="w-[100px] text-center">Status</TableHead>
                <TableHead className="w-[80px] text-center">Actions</TableHead>
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
                    <TableCell className="font-medium whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                    <TableCell className="max-w-[400px]">
                      <div className="flex flex-col gap-1">
                        <span
                          className="font-medium truncate cursor-help"
                          title={transaction.description || ""}
                        >
                          {transaction.description || "—"}
                        </span>
                        {transaction.counterparty && (
                          <span
                            className="text-xs text-muted-foreground truncate cursor-help"
                            title={transaction.counterparty}
                          >
                            {transaction.counterparty}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: transaction.category_color || "#94a3b8" }}
                        />
                        <span className="text-sm truncate cursor-help" title={transaction.category}>
                          {transaction.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[130px]">
                      <span className="truncate cursor-help block" title={transaction.account}>
                        {transaction.account}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        transaction.amount >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {transaction.amount >= 0 ? "+" : ""}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-center">
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
