import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock animejs
vi.mock('animejs', () => ({
  default: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}))

// Mock ethers
vi.mock('ethers', async (importOriginal) => {
  const actual: any = await importOriginal();
  
  class MockContract {
    getOrganizerEvents = vi.fn().mockResolvedValue([1]);
    events = vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Event',
      maxSupply: 100,
      mintedCount: 10,
      isActive: true,
    });
    createEvent = vi.fn().mockResolvedValue({ wait: vi.fn() });
    mintTicket = vi.fn().mockResolvedValue({ wait: vi.fn() });
    assignTicket = vi.fn().mockResolvedValue({ wait: vi.fn() });
    getTicketDetails = vi.fn().mockResolvedValue([{
      eventId: 1,
      holderNameHash: '0x000',
      holderStudentIdHash: '0x000',
      isScanned: false
    }, '0xOwner']);
    getEventTickets = vi.fn().mockResolvedValue([1, 2]); // Return some dummy ticket IDs
    generateGuestAddress = vi.fn().mockResolvedValue('0xGuestAddress');
    
    // Mocks for Event Name fetching
    filters = {
      EventCreated: vi.fn(),
    };
    queryFilter = vi.fn().mockResolvedValue([
      {
        args: {
          eventId: 1,
          organizer: '0x123...',
          name: 'Test Event'
        }
      }
    ]);
    interface = {
      parseLog: vi.fn((log) => ({
        args: log.args,
        name: 'EventCreated' 
      }))
    };

    on = vi.fn();
    off = vi.fn();
  }

  class MockProvider {
    getSigner = vi.fn().mockResolvedValue({
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    });
    getNetwork = vi.fn().mockResolvedValue({ chainId: 137 });
  }

  return {
    ...actual,
    BrowserProvider: MockProvider,
    Contract: MockContract,
    // Add getAddress to signer mock if needed in direct signer usage
    JsonRpcSigner: class {
       getAddress = vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890');
    }
  };
})

// Global window mocks
Object.defineProperty(window, 'ethereum', {
  value: {
    request: vi.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890']),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  writable: true,
})
