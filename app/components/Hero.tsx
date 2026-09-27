'use client'
import {
  ARC_GRADIENT, ARC_GRADIENT_VIVID_TEXT, COLOR_ACCENT_TINT_VIVID, COLOR_BG, COLOR_BG_TRANSLUCENT, COLOR_BORDER,
  COLOR_BORDER_TRANSLUCENT, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY,
} from '@/lib/theme'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { ConnectWallet } from './ConnectWallet'
import { HeroNetwork } from './HeroNetwork'
import { HeroScene } from './HeroScene'
import { CheckCircleIcon, ClockIcon, UsersIcon } from './icons'
import './hero.css'
import './ui.css'

const stats = [
  { value: 'Non-custodial', label: 'No one else holds your funds' },
  { value: 'Immutable', label: 'Rules can\'t be changed' },
  { value: '<$0.01', label: 'per transaction' },
]

const features = [
  { Icon: ClockIcon, title: 'Check in periodically', description: 'Confirm you\'re still active, as often as you choose' },
  { Icon: UsersIcon, title: 'Add your heirs', description: 'Assign wallet addresses and their share' },
  { Icon: CheckCircleIcon, title: 'Automatic claim', description: 'Heirs claim directly from the contract if you go silent' },
]

// Same light-glass treatment as .hero-scene-card (translucent + blur), applied via the
// .hero-card-glass class below — see hero.css for why the blur is lighter down here.
const cardStyle = {
  background: COLOR_BG_TRANSLUCENT,
  border: `1px solid ${COLOR_BORDER_TRANSLUCENT}`,
  borderRadius: 12,
} as const

// Fades up into view the first time it scrolls into the viewport (once — never replays), unlike the
// stat cards above it which are part of the initial above-the-fold read and stay static.
function FeatureCard({ Icon, title, description }: { Icon: typeof ClockIcon; title: string; description: string }) {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      data-testid="hero-feature-card"
      className={`hero-card-glass scroll-reveal${revealed ? ' is-revealed' : ''}`}
      style={{ ...cardStyle, padding: '1.25rem', textAlign: 'left' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: COLOR_ACCENT_TINT_VIVID, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={20} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: COLOR_TEXT_PRIMARY, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.6 }}>{description}</div>
    </div>
  )
}

export function Hero() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: COLOR_BG, borderBottom: `1px solid ${COLOR_BORDER}` }}>
      {/* Faint network of nodes behind the whole Hero (replaces the old dotted texture) */}
      <HeroNetwork />

      <div className="hero-content" style={{ position: 'relative' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', background: ARC_GRADIENT, color: '#fff', fontSize: 13, fontWeight: 600,
            borderRadius: 9999, padding: '6px 16px', marginBottom: 20, whiteSpace: 'nowrap',
          }}>
            Built on Arc
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, color: COLOR_TEXT_PRIMARY, marginBottom: 16, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Your crypto.<br />
            <span style={{ backgroundImage: ARC_GRADIENT_VIVID_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Your heirs.</span>
          </div>
          <div style={{ fontSize: 16, color: COLOR_TEXT_SECONDARY, maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.7 }}>
            Set up an onchain inheritance vault in minutes. If you stop checking in, your designated heirs can claim their share automatically — no lawyers, no paperwork, no middlemen.
          </div>
          <ConnectWallet size="lg" />

          {/* Focal piece: the looping vault -> heir / check-in timer scene. Comes after the CTA so the
              page reads text-first (badge, headline, pitch, action) before the diagram that explains it. */}
          <HeroScene />
        </div>

        {/* Stat cards (replaces the old one-line "Built on Arc · Non-custodial · ..." tagline) */}
        <div className="hero-card-grid" style={{ maxWidth: 960, margin: '3rem auto 0' }}>
          {stats.map(stat => (
            <div key={stat.value} data-testid="hero-stat-card" className="hero-card-glass" style={{ ...cardStyle, padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLOR_TEXT_PRIMARY, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: COLOR_TEXT_SECONDARY, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Feature cards: a short teaser of "How it works", not a replacement for it or the FAQ.
            The generous top margin (vs. the tight 20px between kicker and cards) is what makes the stat
            cards above and this group read as two separate groups instead of one continuous stack.
            id is the scroll target for the header's "How it works" button (see app/page.tsx). */}
        <div id="how-it-works" style={{ maxWidth: 960, margin: 'clamp(3rem, 7vw, 4.5rem) auto 0' }}>
          <div
            data-testid="hero-features-kicker"
            style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: COLOR_TEXT_SECONDARY, textAlign: 'center', marginBottom: 20,
            }}
          >
            How it works
          </div>
          <div className="hero-card-grid">
            {features.map(({ Icon, title, description }) => (
              <FeatureCard key={title} Icon={Icon} title={title} description={description} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
