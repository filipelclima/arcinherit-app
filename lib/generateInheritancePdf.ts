import { ARC_TESTNET, CONTRACT_ADDRESS } from './contract'
import { formatDuration } from './duration'

export interface InheritancePdfHeir {
  wallet: string
  percentage: number
}

export interface GenerateInheritancePdfParams {
  ownerAddress: string
  heirs: InheritancePdfHeir[]
  timelockDuration: bigint
  gracePeriod: bigint
}

export const INHERITANCE_PDF_FILENAME = 'heirloom-inheritance-instructions.pdf'

const LOGO_URL = '/heirloom-icon.png'

// Best-effort only — a failed/blocked fetch (e.g. no network, or a test environment
// without a real fetch/FileReader) must not stop the document from being generated.
// The logo is a visual nice-to-have; the instructions themselves are what matters.
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch(LOGO_URL)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateInheritancePdf({
  ownerAddress,
  heirs,
  timelockDuration,
  gracePeriod,
}: GenerateInheritancePdfParams): Promise<void> {
  // jsPDF is ~130KB and only ever needed by a vault owner clicking this one button —
  // loaded on demand instead of in everyone's initial bundle.
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 56
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - margin * 2
  let y = margin

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  function paragraph(text: string, options: {
    size?: number
    bold?: boolean
    font?: 'helvetica' | 'courier'
    gapAfter?: number
    color?: [number, number, number]
  } = {}) {
    const { size = 10.5, bold = false, font = 'helvetica', gapAfter = 14, color = [10, 10, 10] } = options
    doc.setFont(font, bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    const lines = doc.splitTextToSize(text, contentWidth) as string[]
    const lineHeight = size * 1.32
    ensureSpace(lines.length * lineHeight + gapAfter)
    doc.text(lines, margin, y)
    y += lines.length * lineHeight + gapAfter
  }

  function sectionHeading(text: string) {
    paragraph(text, { size: 12.5, bold: true, gapAfter: 8 })
  }

  function detailLine(text: string) {
    paragraph(text, { size: 10, font: 'courier', gapAfter: 6 })
  }

  // Header: logo + title
  const logoDataUrl = await loadLogoDataUrl()
  const titleX = logoDataUrl ? margin + 30 : margin
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, y - 4, 22, 22)
    } catch {
      // Corrupt/unsupported image data — skip the logo, the document is still complete without it.
    }
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(10, 10, 10)
  doc.text('HEIRLOOM — INHERITANCE INSTRUCTIONS', titleX, y + 12)
  y += 34

  paragraph(
    'Keep this document somewhere safe and accessible to your heir — same as you would a will or insurance policy.',
    { size: 10, color: [107, 114, 128], gapAfter: 20 }
  )

  sectionHeading('1. What this document is')
  paragraph(
    'This document contains instructions for claiming a cryptocurrency inheritance, protected by a smart contract on the Arc network. It does NOT contain any private keys, passwords, or recovery phrases — only the information needed to locate and claim the inheritance using the wallet already on file.'
  )

  sectionHeading('2. Vault details')
  detailLine(`Vault owner address: ${ownerAddress}`)
  for (const heir of heirs) {
    detailLine(`Heir address on file: ${heir.wallet} — Share: ${heir.percentage}%`)
  }
  detailLine(`Check-in period: every ${formatDuration(timelockDuration)}`)
  detailLine(`Safety window: ${Math.round(Number(gracePeriod) / 86400)} days after a missed check-in`)
  detailLine(`Contract address: ${CONTRACT_ADDRESS}`)
  detailLine(`Network: ${ARC_TESTNET.name}`)
  y += 8

  sectionHeading('3. What happens next')
  paragraph(
    'The owner of this vault must "check in" periodically to confirm they\'re still active. If they miss a check-in, and the safety window afterward also passes without a check-in, the heir(s) listed above become eligible to claim their share directly from the smart contract — automatically, with no lawyers, no company, and no one else\'s approval needed.'
  )

  sectionHeading('4. How to claim, step by step')
  paragraph(
    '1. Access the wallet listed above. This is the same wallet address that was registered when this vault was created — you\'ll need the app or device where that wallet is set up (e.g. MetaMask, or whichever wallet was used).'
  )
  paragraph(
    'Warning: If you no longer have access to this wallet (lost device, forgotten recovery phrase), unfortunately there is no way to recover the funds — the smart contract cannot verify identity, only wallet ownership. This is why keeping your recovery phrase safe is critical.',
    { bold: true, color: [180, 90, 0] }
  )
  paragraph(
    '2. Go to heirloom.com (or whichever domain is live at the time), using a browser or device where the wallet above is accessible.'
  )
  paragraph('3. Click "Claim" and connect the wallet listed above when prompted.')
  paragraph(
    '4. Follow the on-screen instructions. If enough time has passed since the owner\'s last check-in, the claim will be available. If not, the site will show how much time remains.'
  )

  sectionHeading('5. A note on security')
  paragraph(
    'This vault is fully non-custodial — no company, including the creators of Heirloom, can access, freeze, or redirect these funds. Heirloom staff will never ask for a recovery phrase or private key. If anyone claiming to be from Heirloom asks for either, it is a scam.',
    { gapAfter: 0 }
  )

  doc.save(INHERITANCE_PDF_FILENAME)
}
