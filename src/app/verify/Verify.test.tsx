import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import VerifyPage from './page'
import { useWallet } from '@/hooks/useWallet'

// Mock useWallet
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}))

// Mock useScannerSound
vi.mock('@/hooks/useScannerSound', () => ({
  useScannerSound: () => vi.fn(),
}))

// Mock Html5QrcodeScanner
const mockClear = vi.fn().mockResolvedValue(undefined);
const mockRender = vi.fn();

vi.mock('html5-qrcode', () => {
  return {
    Html5QrcodeScanner: class {
      render = mockRender;
      clear = mockClear;
    }
  }
})

describe('Gatekeeper Scanner Flow', () => {
  const mockConnect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL.createObjectURL since it might be used by QR libs
    if (typeof window.URL.createObjectURL === 'undefined') {
      window.URL.createObjectURL = vi.fn()
    }
  })

  it('renders connect button for organizer', () => {
    ;(useWallet as any).mockReturnValue({
      isConnected: false,
      isProviderAvailable: true,
      connect: mockConnect,
    })

    render(<VerifyPage />)
    expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument()
  })

  it('starts in IDLE mode and moves to CHALLENGE after ticket scan', async () => {
    ;(useWallet as any).mockReturnValue({
      isConnected: true,
      address: '0xOrganizer',
      signer: {},
      connect: mockConnect,
    })

    render(<VerifyPage />)

    expect(screen.getByText(/Align the attendee's Ticket QR/i)).toBeInTheDocument()

    // Simulate successful scan of a ticket ID
    // We need to trigger the callback passed to scanner.render
    const onScanSuccess = mockRender.mock.calls[0][0]
    
    // Trigger is implicit via scanner.render call in useEffect
    
    await waitFor(() => {
        onScanSuccess(JSON.stringify({ tokenId: '42' }))
    })

    await waitFor(() => {
      // "Identity Proof" is the title of the Challenge step
      expect(screen.getByText(/Identity Proof/i)).toBeInTheDocument()
      expect(screen.getByText(/Attendee must scan this to sign the challenge/i)).toBeInTheDocument()
    })
  })
})
