import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTRACT_ADDRESS } from './contract'

const { mockDoc, textCalls, saveCalls, addImageCalls } = vi.hoisted(() => {
  const textCalls: unknown[][] = []
  const saveCalls: unknown[][] = []
  const addImageCalls: unknown[][] = []
  const mockDoc = {
    internal: { pageSize: { getWidth: () => 612, getHeight: () => 792 } },
    addPage: () => {},
    setFont: () => {},
    setFontSize: () => {},
    setTextColor: () => {},
    splitTextToSize: (text: string) => [text],
    text: (...args: unknown[]) => { textCalls.push(args) },
    addImage: (...args: unknown[]) => { addImageCalls.push(args) },
    save: (...args: unknown[]) => { saveCalls.push(args) },
  }
  return { mockDoc, textCalls, saveCalls, addImageCalls }
})

vi.mock('jspdf', () => ({
  // Must be a real function (not an arrow function) so `new jsPDF(...)` works.
  jsPDF: vi.fn(function jsPDF() { return mockDoc }),
}))

import { generateInheritancePdf, INHERITANCE_PDF_FILENAME } from './generateInheritancePdf'

const OWNER = '0x1111111111111111111111111111111111111111'
const HEIR_A = '0x2222222222222222222222222222222222222222'
const HEIR_B = '0x3333333333333333333333333333333333333333'

function allTextContent(): string {
  return textCalls.map(call => (Array.isArray(call[0]) ? call[0].join(' ') : call[0])).join('\n')
}

describe('generateInheritancePdf', () => {
  beforeEach(() => {
    textCalls.length = 0
    saveCalls.length = 0
    addImageCalls.length = 0
    // No global fetch in this test — exercises the "logo failed to load" fallback path,
    // which must not stop the rest of the document from generating.
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in tests'))))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves the PDF under the exact expected filename', async () => {
    await generateInheritancePdf({
      ownerAddress: OWNER,
      heirs: [{ wallet: HEIR_A, percentage: 100 }],
      timelockDuration: BigInt(365 * 86400),
      gracePeriod: BigInt(30 * 86400),
    })

    expect(saveCalls).toEqual([[INHERITANCE_PDF_FILENAME]])
    expect(INHERITANCE_PDF_FILENAME).toBe('heirloom-inheritance-instructions.pdf')
  })

  it('embeds the real owner address, contract address, and network in the document text', async () => {
    await generateInheritancePdf({
      ownerAddress: OWNER,
      heirs: [{ wallet: HEIR_A, percentage: 100 }],
      timelockDuration: BigInt(365 * 86400),
      gracePeriod: BigInt(30 * 86400),
    })

    const content = allTextContent()
    expect(content).toContain(`Vault owner address: ${OWNER}`)
    expect(content).toContain(`Contract address: ${CONTRACT_ADDRESS}`)
    expect(content).toContain('Network: Arc Testnet')
  })

  it('lists every heir with their address and percentage when there are multiple heirs', async () => {
    await generateInheritancePdf({
      ownerAddress: OWNER,
      heirs: [
        { wallet: HEIR_A, percentage: 60 },
        { wallet: HEIR_B, percentage: 40 },
      ],
      timelockDuration: BigInt(365 * 86400),
      gracePeriod: BigInt(30 * 86400),
    })

    const content = allTextContent()
    expect(content).toContain(`Heir address on file: ${HEIR_A} — Share: 60%`)
    expect(content).toContain(`Heir address on file: ${HEIR_B} — Share: 40%`)
  })

  it('formats the check-in period and safety window from the raw on-chain seconds', async () => {
    await generateInheritancePdf({
      ownerAddress: OWNER,
      heirs: [{ wallet: HEIR_A, percentage: 100 }],
      timelockDuration: BigInt(365 * 86400), // 1 year
      gracePeriod: BigInt(14 * 86400), // 14 days
    })

    const content = allTextContent()
    expect(content).toContain('Check-in period: every 1 year')
    expect(content).toContain('Safety window: 14 days after a missed check-in')
  })

  it('still generates and saves the document when the logo fails to load', async () => {
    await generateInheritancePdf({
      ownerAddress: OWNER,
      heirs: [{ wallet: HEIR_A, percentage: 100 }],
      timelockDuration: BigInt(365 * 86400),
      gracePeriod: BigInt(30 * 86400),
    })

    expect(addImageCalls).toHaveLength(0)
    expect(saveCalls).toEqual([[INHERITANCE_PDF_FILENAME]])
  })

  it('includes the fixed non-custodial security and scam-warning text verbatim', async () => {
    await generateInheritancePdf({
      ownerAddress: OWNER,
      heirs: [{ wallet: HEIR_A, percentage: 100 }],
      timelockDuration: BigInt(365 * 86400),
      gracePeriod: BigInt(30 * 86400),
    })

    const content = allTextContent()
    expect(content).toContain('It does NOT contain any private keys, passwords, or recovery phrases')
    expect(content).toContain('Heirloom staff will never ask for a recovery phrase or private key. If anyone claiming to be from Heirloom asks for either, it is a scam.')
  })
})
