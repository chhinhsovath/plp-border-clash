import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReportCard } from '@/components/reports/ReportCard'
import { TestDataFactory } from '../../../setup/test-helpers'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('ReportCard Component', () => {
  const mockReport = TestDataFactory.createReport({
    title: 'Emergency Response Assessment',
    description: 'Detailed assessment of humanitarian crisis response',
    status: 'PUBLISHED',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    author: TestDataFactory.createUser({
      firstName: 'Jane',
      lastName: 'Smith'
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render report information correctly', () => {
      render(<ReportCard report={mockReport} />)

      expect(screen.getByText('Emergency Response Assessment')).toBeInTheDocument()
      expect(screen.getByText('Detailed assessment of humanitarian crisis response')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('PUBLISHED')).toBeInTheDocument()
    })

    it('should display formatted creation date', () => {
      render(<ReportCard report={mockReport} />)

      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()
    })

    it('should show status badge with correct styling', () => {
      render(<ReportCard report={mockReport} />)

      const statusBadge = screen.getByText('PUBLISHED')
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('should render different status colors', () => {
      const draftReport = { ...mockReport, status: 'DRAFT' }
      const { rerender } = render(<ReportCard report={draftReport} />)

      expect(screen.getByText('DRAFT')).toHaveClass('bg-yellow-100', 'text-yellow-800')

      const reviewReport = { ...mockReport, status: 'IN_REVIEW' }
      rerender(<ReportCard report={reviewReport} />)

      expect(screen.getByText('IN_REVIEW')).toHaveClass('bg-blue-100', 'text-blue-800')
    })

    it('should truncate long descriptions', () => {
      const longReport = {
        ...mockReport,
        description: 'A'.repeat(200) // Very long description
      }

      render(<ReportCard report={longReport} />)

      const description = screen.getByText(/A+/)
      expect(description.textContent).toHaveLength(153) // 150 chars + '...'
    })
  })

  describe('Interactions', () => {
    it('should navigate to report detail when clicked', () => {
      render(<ReportCard report={mockReport} />)

      const card = screen.getByRole('button', { name: /Emergency Response Assessment/ })
      fireEvent.click(card)

      expect(mockPush).toHaveBeenCalledWith(`/reports/${mockReport.id}`)
    })

    it('should handle keyboard navigation', () => {
      render(<ReportCard report={mockReport} />)

      const card = screen.getByRole('button', { name: /Emergency Response Assessment/ })
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })

      expect(mockPush).toHaveBeenCalledWith(`/reports/${mockReport.id}`)
    })

    it('should show loading state when navigating', () => {
      render(<ReportCard report={mockReport} />)

      const card = screen.getByRole('button', { name: /Emergency Response Assessment/ })
      fireEvent.click(card)

      expect(card).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ReportCard report={mockReport} />)

      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Emergency Response Assessment'))
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('should have semantic HTML structure', () => {
      render(<ReportCard report={mockReport} />)

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Emergency Response Assessment')
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should support screen readers', () => {
      render(<ReportCard report={mockReport} />)

      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-describedby')
      
      const description = document.getElementById(card.getAttribute('aria-describedby')!)
      expect(description).toHaveTextContent('Detailed assessment of humanitarian crisis response')
    })
  })

  describe('Actions Menu', () => {
    it('should show actions menu when enabled', () => {
      render(<ReportCard report={mockReport} showActions />)

      const actionsButton = screen.getByLabelText('Report actions')
      expect(actionsButton).toBeInTheDocument()
    })

    it('should handle edit action', () => {
      const onEdit = jest.fn()
      render(<ReportCard report={mockReport} showActions onEdit={onEdit} />)

      const actionsButton = screen.getByLabelText('Report actions')
      fireEvent.click(actionsButton)

      const editButton = screen.getByText('Edit')
      fireEvent.click(editButton)

      expect(onEdit).toHaveBeenCalledWith(mockReport)
    })

    it('should handle delete action with confirmation', () => {
      const onDelete = jest.fn()
      render(<ReportCard report={mockReport} showActions onDelete={onDelete} />)

      const actionsButton = screen.getByLabelText('Report actions')
      fireEvent.click(actionsButton)

      const deleteButton = screen.getByText('Delete')
      fireEvent.click(deleteButton)

      // Should show confirmation dialog
      expect(screen.getByText('Are you sure you want to delete this report?')).toBeInTheDocument()

      const confirmButton = screen.getByText('Delete Report')
      fireEvent.click(confirmButton)

      expect(onDelete).toHaveBeenCalledWith(mockReport)
    })

    it('should handle duplicate action', () => {
      const onDuplicate = jest.fn()
      render(<ReportCard report={mockReport} showActions onDuplicate={onDuplicate} />)

      const actionsButton = screen.getByLabelText('Report actions')
      fireEvent.click(actionsButton)

      const duplicateButton = screen.getByText('Duplicate')
      fireEvent.click(duplicateButton)

      expect(onDuplicate).toHaveBeenCalledWith(mockReport)
    })
  })

  describe('Collaborative Features', () => {
    it('should show collaborator count when present', () => {
      const collaborativeReport = {
        ...mockReport,
        collaborators: [
          TestDataFactory.createUser({ id: 'collab-1' }),
          TestDataFactory.createUser({ id: 'collab-2' })
        ]
      }

      render(<ReportCard report={collaborativeReport} />)

      expect(screen.getByText('2 collaborators')).toBeInTheDocument()
    })

    it('should show recent activity indicator', () => {
      const recentReport = {
        ...mockReport,
        updatedAt: new Date() // Very recent update
      }

      render(<ReportCard report={recentReport} />)

      expect(screen.getByLabelText('Recently updated')).toBeInTheDocument()
    })

    it('should display draft indicator for unpublished reports', () => {
      const draftReport = { ...mockReport, status: 'DRAFT' }

      render(<ReportCard report={draftReport} />)

      expect(screen.getByLabelText('Draft report')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing author gracefully', () => {
      const reportWithoutAuthor = {
        ...mockReport,
        author: null
      }

      render(<ReportCard report={reportWithoutAuthor} />)

      expect(screen.getByText('Unknown Author')).toBeInTheDocument()
    })

    it('should handle missing description gracefully', () => {
      const reportWithoutDescription = {
        ...mockReport,
        description: null
      }

      render(<ReportCard report={reportWithoutDescription} />)

      expect(screen.getByText('No description available')).toBeInTheDocument()
    })

    it('should handle navigation errors', () => {
      mockPush.mockRejectedValue(new Error('Navigation failed'))

      render(<ReportCard report={mockReport} />)

      const card = screen.getByRole('button')
      fireEvent.click(card)

      // Should show error state
      expect(screen.getByText('Failed to navigate')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should memoize expensive calculations', () => {
      const formatDateSpy = jest.spyOn(Date.prototype, 'toLocaleDateString')

      const { rerender } = render(<ReportCard report={mockReport} />)
      rerender(<ReportCard report={mockReport} />)

      // Should only format date once due to memoization
      expect(formatDateSpy).toHaveBeenCalledTimes(1)

      formatDateSpy.mockRestore()
    })

    it('should lazy load non-critical content', () => {
      render(<ReportCard report={mockReport} />)

      // Actions menu should not be rendered until needed
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(<ReportCard report={mockReport} />)

      const card = screen.getByRole('button')
      expect(card).toHaveClass('sm:flex-row', 'flex-col')
    })

    it('should show compact layout on small screens', () => {
      render(<ReportCard report={mockReport} compact />)

      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveClass('text-sm')
    })
  })
})