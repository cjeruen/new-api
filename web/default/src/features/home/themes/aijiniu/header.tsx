/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useState, useCallback, type MouseEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { useAijiniuTranslation } from './locales'

/** Smooth-scroll to an in-page section; returns false if the target is missing. */
export function scrollToAijiniuSection(
  id: string,
  options?: { updateHash?: boolean }
): boolean {
  const el = document.getElementById(id)
  if (!el) return false

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  // Calculate dynamic header offset to prevent sticky nav overlap
  const nav = document.querySelector('.nav')
  const navHeight = nav ? nav.getBoundingClientRect().height : 70
  const rect = el.getBoundingClientRect()
  const scrollTop = window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop
  const targetY = rect.top + scrollTop - navHeight - 16 // 16px extra breathing space

  window.scrollTo({
    top: targetY,
    behavior: reduceMotion ? 'auto' : 'smooth',
  })

  if (options?.updateHash !== false) {
    const next = `#${id}`
    if (window.location.hash !== next) {
      history.pushState(null, '', next)
    }
  }
  return true
}

/**
 * Same-page #hash clicks: smooth scroll instead of an instant jump.
 * Cross-route links like `/#advantage` are left alone when not on `/`.
 */
export function handleAijiniuSectionClick(
  e: MouseEvent<HTMLAnchorElement>,
  options?: { beforeScroll?: () => void; delayMs?: number }
) {
  const href = e.currentTarget.getAttribute('href') || ''
  let id: string | null = null

  if (href.startsWith('#')) {
    id = decodeURIComponent(href.slice(1))
  } else if (href.startsWith('/#')) {
    const path = window.location.pathname
    if (path === '/' || path === '') {
      id = decodeURIComponent(href.slice(2))
    }
  }

  if (!id) return

  e.preventDefault()
  options?.beforeScroll?.()

  const delay = options?.delayMs ?? 0
  if (delay > 0) {
    window.setTimeout(() => scrollToAijiniuSection(id!), delay)
  } else {
    // Next frame: layout after menu close / sticky nav is stable
    requestAnimationFrame(() => scrollToAijiniuSection(id!))
  }
}

// 主题专属的胶囊双色按钮语言切换器
function AijiniuLanguageSwitcher() {
  const { i18n, isZh } = useAijiniuTranslation()
  const user = useAuthStore((s) => s.auth.user)

  const handleChangeLanguage = useCallback(
    async (code: string) => {
      await i18n.changeLanguage(code)
      if (user) {
        try {
          await api.put('/api/user/self', { language: code })
        } catch {
          // ignore
        }
      }
    },
    [i18n, user]
  )

  return (
    <div className="jn-lang">
      <button
        type="button"
        className={isZh ? 'active' : ''}
        onClick={() => handleChangeLanguage('zhCN')}
      >
        中
      </button>
      <button
        type="button"
        className={!isZh ? 'active' : ''}
        onClick={() => handleChangeLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}

interface AijiniuHeaderProps {
  activeTab?: 'home' | 'pricing' | 'other'
}

export function AijiniuHeader({ activeTab = 'home' }: AijiniuHeaderProps) {
  const { t, logo, displayBrandName } = useAijiniuTranslation()
  const { auth } = useAuthStore()
  const brandName = displayBrandName

  const isAuthenticated = !!auth.user
  const loginLink = isAuthenticated ? '/dashboard' : '/sign-in'

  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Listen to window scroll for dynamic background translucency
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open')
    } else {
      document.body.classList.remove('menu-open')
    }
    return () => document.body.classList.remove('menu-open')
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu()
    }
    const handleResize = () => {
      if (window.innerWidth > 860) closeMobileMenu()
    }

    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMobileMenuOpen])

  const isHome = activeTab === 'home'

  return (
    <>
      {/* ============ NAVIGATION ============ */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="brand">
          <span className="brand-logo">
            <img src={logo || "/favicon.ico"} alt={brandName} loading="eager" />
          </span>
          <span className="brand-text">
            <span className="cn">{brandName}</span>
            {/* <span className="en">&nbsp;&nbsp;AI&nbsp;&nbsp;CLOUD</span> */}
          </span>
        </Link>
        <div className="nav-links">
          {isHome ? (
            <a href="#advantage" onClick={handleAijiniuSectionClick}>
              {t('Core Advantages')}
            </a>
          ) : (
            <a href="/#advantage">{t('Core Advantages')}</a>
          )}

          <Link to="/pricing" className={activeTab === 'pricing' ? 'active' : ''}>
            {t('Model Square')}
          </Link>

          {isHome ? (
            <a href="#industry" onClick={handleAijiniuSectionClick}>
              {t('Industry Applications')}
            </a>
          ) : (
            <a href="/#industry">{t('Industry Applications')}</a>
          )}
        </div>
        <div className="nav-right">
          <AijiniuLanguageSwitcher />
          <Link to={loginLink} className="nav-ghost">
            {isAuthenticated ? auth.user?.username : t('登录')}
          </Link>
          <Link to={loginLink} className="nav-cta">
            {t('进入控制台 →')}
          </Link>
        </div>
        <button
          className="nav-toggle"
          onClick={toggleMobileMenu}
          aria-label={t('Open menu')}
          aria-expanded={isMobileMenuOpen}
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </nav>

      {/* ============ MOBILE COVER MENU ============ */}
      <div
        className={`m-menu ${isMobileMenuOpen ? 'open' : ''}`}
        aria-hidden={!isMobileMenuOpen}
        onClick={(e) => e.target === e.currentTarget && closeMobileMenu()}
      >
        <div className="m-sheet">
          <div className="m-menu-head">
            <Link to="/" className="brand" onClick={closeMobileMenu}>
              <span className="brand-logo">
                <img src={logo || "/favicon.ico"} alt={brandName} />
              </span>
              <span className="brand-text">
                <span className="cn">{brandName}</span>
                <span className="en">&nbsp;&nbsp;AI&nbsp;&nbsp;CLOUD</span>
              </span>
            </Link>
            <button className="m-close" onClick={closeMobileMenu} aria-label={t('Close menu')}>
              <svg viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav className="m-menu-links">
            {isHome ? (
              <a
                href="#advantage"
                onClick={(e) =>
                  handleAijiniuSectionClick(e, {
                    beforeScroll: closeMobileMenu,
                    delayMs: 80,
                  })
                }
              >
                {t('Core Advantages')}
              </a>
            ) : (
              <a href="/#advantage" onClick={closeMobileMenu}>{t('Core Advantages')}</a>
            )}

            <Link to="/pricing" className={activeTab === 'pricing' ? 'active' : ''} onClick={closeMobileMenu}>
              {t('Model Square')}
            </Link>

            {isHome ? (
              <a
                href="#industry"
                onClick={(e) =>
                  handleAijiniuSectionClick(e, {
                    beforeScroll: closeMobileMenu,
                    delayMs: 80,
                  })
                }
              >
                {t('Industry Applications')}
              </a>
            ) : (
              <a href="/#industry" onClick={closeMobileMenu}>{t('Industry Applications')}</a>
            )}

            {isHome ? (
              <a
                href="#onboarding"
                onClick={(e) =>
                  handleAijiniuSectionClick(e, {
                    beforeScroll: closeMobileMenu,
                    delayMs: 80,
                  })
                }
              >
                {t('Onboarding Process')}
              </a>
            ) : (
              <a href="/#onboarding" onClick={closeMobileMenu}>{t('Onboarding Process')}</a>
            )}
          </nav>
          <div className="m-menu-actions">
            <div className="m-menu-lang">
              <AijiniuLanguageSwitcher />
            </div>
            <Link to={loginLink} className="m-btn-ghost" onClick={closeMobileMenu}>
              {isAuthenticated ? auth.user?.username : t('登录')}
            </Link>
            <Link to={loginLink} className="m-btn-primary" onClick={closeMobileMenu}>
              {t('进入控制台')}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
