import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import TicketDesignerPage from './page'
import { useWallet } from '@/hooks/useWallet'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

// Mock useWallet
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }
}))

// Mock html2canvas and jspdf
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
  })
}))

vi.mock('jspdf', () => ({
  default: class {
    getImageProperties = vi.fn().mockReturnValue({ width: 100, height: 50 })
    addImage = vi.fn()
    text = vi.fn()
    save = vi.fn()
  }
}))

describe('Ticket Designer', () => {
  const mockConnect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSearchParams as any).mockReturnValue({ get: () => '1' })
    localStorage.clear()
    
    // Ensure localStorage is mocked if not available in environment
    if (!global.localStorage) {
       global.localStorage = {
         getItem: vi.fn(),
         setItem: vi.fn(),
         clear: vi.fn(),
         removeItem: vi.fn(),
         key: vi.fn(),
         length: 0
       } as any;
    } else {
       vi.spyOn(Storage.prototype, 'setItem');
    }
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads saved design from localStorage if available', async () => {
    // Setup Mock LocalStorage
    const savedDesign = {
      bgImage: null,
      textColor: '#ff0000',
      accentColor: '#14b8a6',
      showEventName: true,
      showDate: true,
      showHolder: true,
      showId: true,
      layout: 'modern',
    }
    localStorage.setItem('ticketDesign_1', JSON.stringify(savedDesign))

    ;(useWallet as any).mockReturnValue({
      isConnected: true,
      address: '0x123',
      signer: {},
      connect: mockConnect,
    })

    render(<TicketDesignerPage />)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Loaded saved design!')
    })
  })

  it('saves design to localStorage on change', async () => {
    ;(useWallet as any).mockReturnValue({
      isConnected: true,
      address: '0x123',
      signer: {},
      connect: mockConnect,
    })

    render(<TicketDesignerPage />)

    // Wait for events to load and select box to be populated
    // We expect "Test Event" (from setup.ts mock) to be in the document
    await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Interact
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) 

    // Wait for debounce (1000ms in code). 
    // We wait 2000ms to be safe.
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
          'ticketDesign_1', 
          expect.stringContaining('"showEventName":false')
      )
    }, { timeout: 3000 })
  })

  it('triggers PDF download', async () => {
    ;(useWallet as any).mockReturnValue({
      isConnected: true,
      address: '0x123',
      signer: {},
      connect: mockConnect,
    })

    render(<TicketDesignerPage />)

    // Wait for tickets to load. 
    await waitFor(() => {
       expect(screen.getByText('#1')).toBeInTheDocument() 
    })

    const pdfBtn = await screen.findByText(/Save PDF/i)
    fireEvent.click(pdfBtn)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('PDF Downloaded!')
    })
  })
})