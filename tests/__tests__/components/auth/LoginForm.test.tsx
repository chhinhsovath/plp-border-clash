import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthHelpers } from '../../../setup/test-helpers'

// Mock next-auth
const mockSignIn = jest.fn()
jest.mock('next-auth/react', () => ({
  signIn: mockSignIn,
  getSession: jest.fn()
}))

// Mock router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {}
  })
}))

describe('LoginForm Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSignIn.mockResolvedValue({ ok: true })
  })

  describe('Rendering', () => {
    it('should render login form with all fields', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByText(/remember me/i)).toBeInTheDocument()
    })

    it('should have proper form structure', () => {
      render(<LoginForm />)

      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      expect(form).toHaveAttribute('noValidate')
    })

    it('should show forgot password link', () => {
      render(<LoginForm />)

      const forgotLink = screen.getByText(/forgot password/i)
      expect(forgotLink).toBeInTheDocument()
      expect(forgotLink).toHaveAttribute('href', '/auth/forgot-password')
    })

    it('should display organization selector when enabled', () => {
      render(<LoginForm showOrgSelector />)

      expect(screen.getByLabelText(/organization/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate required email field', async () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
    })

    it('should validate required password field', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user@example.com')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should validate minimum password length', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, '123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })

    it('should clear validation errors when user types', async () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })

      // Start typing in email field
      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'u')

      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Authentication', () => {
    it('should submit form with valid credentials', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'user@example.com',
          password: 'password123',
          redirect: false
        })
      })
    })

    it('should handle successful authentication', async () => {
      mockSignIn.mockResolvedValue({ ok: true })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle authentication failure', async () => {
      mockSignIn.mockResolvedValue({
        ok: false,
        error: 'Invalid credentials'
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'wrongpassword')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      mockSignIn.mockRejectedValue(new Error('Network error'))

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during authentication', async () => {
      // Make signIn hang
      let resolveSignIn: (value: any) => void
      mockSignIn.mockReturnValue(new Promise(resolve => {
        resolveSignIn = resolve
      }))

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve the promise
      resolveSignIn!({ ok: true })

      await waitFor(() => {
        expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
      })
    })

    it('should disable form during loading', async () => {
      let resolveSignIn: (value: any) => void
      mockSignIn.mockReturnValue(new Promise(resolve => {
        resolveSignIn = resolve
      }))

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // All form fields should be disabled
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()

      resolveSignIn!({ ok: true })
    })
  })

  describe('Remember Me Functionality', () => {
    it('should toggle remember me checkbox', async () => {
      render(<LoginForm />)

      const rememberCheckbox = screen.getByLabelText(/remember me/i)
      expect(rememberCheckbox).not.toBeChecked()

      await user.click(rememberCheckbox)
      expect(rememberCheckbox).toBeChecked()

      await user.click(rememberCheckbox)
      expect(rememberCheckbox).not.toBeChecked()
    })

    it('should include remember me in form submission', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const rememberCheckbox = screen.getByLabelText(/remember me/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(rememberCheckbox)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'user@example.com',
          password: 'password123',
          remember: true,
          redirect: false
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<LoginForm />)

      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('aria-labelledby', 'login-form-title')

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('aria-required', 'true')

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('aria-required', 'true')
    })

    it('should associate error messages with inputs', async () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        const errorMessage = screen.getByText(/email is required/i)
        
        expect(emailInput).toHaveAttribute('aria-describedby', errorMessage.id)
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should support keyboard navigation', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Tab through form elements
      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/remember me/i)).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    it('should submit form on Enter key', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled()
      })
    })
  })

  describe('Security Features', () => {
    it('should mask password input', () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should have autocomplete attributes', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
    })

    it('should prevent form submission on double-click', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      // Double click submit button
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only call signIn once
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Redirect Handling', () => {
    it('should redirect to callback URL after login', async () => {
      const callbackUrl = '/reports/123'
      
      render(<LoginForm callbackUrl={callbackUrl} />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(callbackUrl)
      })
    })

    it('should handle invalid callback URLs', async () => {
      const invalidCallback = 'javascript:alert("xss")'
      
      render(<LoginForm callbackUrl={invalidCallback} />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should redirect to safe default URL
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })
})