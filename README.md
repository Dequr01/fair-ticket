This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Frontend Testing

The project uses [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for automated frontend testing.

### Commands

*   **Run tests:** `npm run test:frontend`
*   **Watch mode:** `npm run test:watch`
*   **Coverage report:** `npm run test:coverage`

### Testing Strategy

1.  **Mocks:** Ethers.js and Smart Contract calls are mocked in `src/test/setup.ts` to allow testing without a local node.
2.  **Wallet Simulation:** The `useWallet` hook and `window.ethereum` are mocked to simulate various connection states.
3.  **Booth Operator Flow:** Tests verify that identity fields (Name, ID) appear only in Booth Mode and that the correct contract functions are called.
4.  **Scanner Flow:** Tests simulate QR code scanning and verify the transition from IDLE to CHALLENGE states.

Coverage reports are generated in the `coverage/` directory in HTML format.

## Ticket Designer & Printing

The application now includes a built-in **Ticket Designer** for organizers.

### Features
*   **Visual Editor:** Customize ticket appearance with background images, text colors, and layout presets (Modern, Classic, Minimal).
*   **QR Generation:** Automatically generates secure QR codes containing the unique `tokenId` for each attendee.
*   **Batch Printing:** Designed for standard paper printing. The UI automatically optimizes for print (hiding controls/navigation) when `Ctrl+P` or the "Print" button is used.
*   **Dashboard Integration:** Access the designer directly from the Event Management card in the Dashboard.

### Usage
1.  Navigate to **Dashboard**.
2.  Find your event and click **Design** (Blue button).
3.  Use the left sidebar to upload a background image or toggle fields.
4.  Click **Print Tickets** to generate a PDF or print directly.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.