import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Dashboard from './page'
import { useWallet } from '@/hooks/useWallet'
import { toast } from 'sonner'

// Mock useWallet hook
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }
}))

describe('Dashboard (Booth Operator Flow)', () => {
  const mockConnect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders connect button when not connected', () => {
    ;(useWallet as any).mockReturnValue({
      isConnected: false,
      isProviderAvailable: true,
      connect: mockConnect,
    })

    render(<Dashboard />)
    expect(screen.getByText(/Connect Now/i)).toBeInTheDocument()
  })

  it('shows events and allows toggling Booth Assignment mode', async () => {
    ;(useWallet as any).mockReturnValue({
      isConnected: true,
      address: '0x123...',
      isProviderAvailable: true,
      signer: {
        getAddress: vi.fn().mockResolvedValue('0x123...')
      },
      connect: mockConnect,
    })

    render(<Dashboard />)

    // Wait for event to load
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })

    // Click Manage
    const manageBtn = screen.getByText('Manage')
    fireEvent.click(manageBtn)

    // Verify Standard Mint is active by default (Text is "Standard")
    expect(screen.getByText('Standard')).toHaveClass('bg-teal-600')

    // Click Booth Mode (Text is "Booth Mode")
    const boothBtn = screen.getByText('Booth Mode')
    fireEvent.click(boothBtn)

    expect(boothBtn).toHaveClass('bg-orange-600')
    
    // Identity fields should appear
    expect(screen.getByText(/Student Name/i)).toBeInTheDocument()
    expect(screen.getByText(/Student ID/i)).toBeInTheDocument()
  })

  it('submits booth assignment with identity data', async () => {
    ;(useWallet as any).mockReturnValue({
      isConnected: true,
      address: '0x123...',
      isProviderAvailable: true,
      signer: {
        getAddress: vi.fn().mockResolvedValue('0x123...')
      },
      connect: mockConnect,
    })

    render(<Dashboard />)

    await waitFor(() => screen.getByText('Manage'))
    fireEvent.click(screen.getByText('Manage'))
    fireEvent.click(screen.getByText('Booth Mode'))

    // Fill fields
    fireEvent.change(screen.getByPlaceholderText('0x...'), { target: { value: '0xRecipient' } })
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Jane Student' } })
    fireEvent.change(screen.getByPlaceholderText('ID-00000'), { target: { value: 'ID-999' } })

    const submitBtn = screen.getByText(/Issue Identity-Locked Ticket/i)
    fireEvent.click(submitBtn)

    await waitFor(() => {
      // Check for toast.success instead of alert
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Ticket Assigned'))
    })
  })
})
