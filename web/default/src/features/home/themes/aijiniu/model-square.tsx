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
import { useEffect, useState, useMemo } from 'react'
import { useAijiniuTranslation } from './locales'
import { Link } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth-store'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import type { PricingModel } from '@/features/pricing/types'
import { getLobeIcon } from '@/lib/lobe-icon'
import { AijiniuHeader } from './header'
import { AijiniuFooter } from './footer'
import {
  getAijiniuModelDisplayPrices,
  type AijiniuPriceCurrency,
} from './model-square-price'

import './aijiniu.css'
import './model-square.css'

// Helper to determine model capabilities/categories from API details
const getModelCategories = (model: any) => {
  const cats: string[] = []
  const name = (model.model_name || '').toLowerCase()
  const tags = (model.tags || '').toLowerCase()
  const caps = (model.capabilities || []).map((c: string) => c.toLowerCase())
  const outModal = (model.output_modalities || []).map((m: string) => m.toLowerCase())

  if (
    caps.includes('reasoning') ||
    name.includes('r1') ||
    name.includes('reason') ||
    name.includes('think') ||
    tags.includes('推理') ||
    tags.includes('reason') ||
    tags.includes('think') ||
    tags.includes('thinking')
  ) {
    cats.push('reason')
  }
  if (name.includes('coder') || name.includes('code') || tags.includes('代码') || tags.includes('code') || tags.includes('编码')) {
    cats.push('code')
  }
  if (
    outModal.includes('image') ||
    tags.includes('图片') ||
    tags.includes('image') ||
    name.includes('sd') ||
    name.includes('flux') ||
    name.includes('dall') ||
    name.includes('midjourney') ||
    name.includes('mj') ||
    name.includes('seedream') ||
    name.includes('draw')
  ) {
    cats.push('image')
  }
  if (
    outModal.includes('video') ||
    tags.includes('视频') ||
    tags.includes('video') ||
    name.includes('sora') ||
    name.includes('hailuo') ||
    name.includes('luma') ||
    name.includes('runway') ||
    name.includes('kling')
  ) {
    cats.push('video')
  }

  // Fallback to text generation if empty or matches standard tags
  if (
    cats.length === 0 ||
    outModal.includes('text') ||
    tags.includes('文本') ||
    tags.includes('text') ||
    name.includes('gpt') ||
    name.includes('claude') ||
    name.includes('gemini') ||
    name.includes('deepseek') ||
    name.includes('qwen') ||
    name.includes('glm') ||
    name.includes('doubao')
  ) {
    cats.push('text')
  }

  return cats
}

type DisplayModel = {
  id: string
  kind: 'db' | 'static'
  pricingModel?: PricingModel
  model_name: string
  vendor_name: string
  description: string
  tags: string
  icon: string
  quota_type: number
  categories: string[]
  context_length?: number
  input_cny?: number
  output_cny?: number
  price_cny?: number
  price_unit_desc?: string
  price_type_desc?: string
  price_type_val?: string
}

// 12 static preview models from model.html, used as templates or fallback/additional showcase items
const STATIC_MODELS: DisplayModel[] = [
]

export function AijiniuModelSquare() {
  const { t, isZh } = useAijiniuTranslation()
  const { auth } = useAuthStore()

  const isAuthenticated = !!auth.user
  const loginLink = isAuthenticated ? '/dashboard' : '/sign-in'

  // Fetch live pricing configs from the API
  const {
    models,
    isLoading,
    usdExchangeRate,
  } = usePricingData()

  // State definitions
  const [curFilter, setCurFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [priceCurrency, setPriceCurrency] = useState<AijiniuPriceCurrency>(() =>
    isZh ? 'cny' : 'usd'
  )

  // Scroll counting states (stats values)
  const [stats, setStats] = useState({ models: 0, vendors: 0, uptime: 0 })

  // Merge live database models with static template models
  const allDisplayModels = useMemo(() => {
    const dbList = models || []

    // Avoid duplicates: if backend already lists a model (case-insensitive), hide the static version
    const dbModelNames = new Set(dbList.map((m) => m.model_name.toLowerCase()))
    const filteredStatic = STATIC_MODELS.filter((sm) => !dbModelNames.has(sm.model_name.toLowerCase()))

    const mappedDbModels: DisplayModel[] = dbList
      .filter((m) => m.tags && m.tags.trim() !== '')
      .map((m) => {
        const tags = (m.tags || '').split(',').map((t) => t.trim()).filter(Boolean)

        return {
          id: `db-${m.id}`,
          kind: 'db',
          pricingModel: m,
          model_name: m.model_name,
          vendor_name: m.vendor_name || t('平台优选'),
          description: m.description || '',
          tags: tags.join(', '),
          icon: m.icon || m.vendor_icon || '',
          quota_type: m.quota_type,
          price_unit_desc: '/次',
          price_type_desc: '方式',
          price_type_val: '按次固定价',
          categories: getModelCategories(m),
          context_length: m.context_length,
        }
      })

    return [...mappedDbModels, ...filteredStatic]
  }, [models, t])

  // Stats number animation
  useEffect(() => {
    if (isLoading || !allDisplayModels || allDisplayModels.length === 0) return

    const vendorSet = new Set(allDisplayModels.map((m) => m.vendor_name).filter(Boolean))
    const totalModels = allDisplayModels.length
    const totalVendors = vendorSet.size || 10

    const dur = 1100
    let start: number | null = null
    let frameId: number

    const tick = (tNow: number) => {
      if (start === null) start = tNow
      const p = Math.min(1, (tNow - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3) // Cubic ease-out

      setStats({
        models: Math.round(totalModels * eased),
        vendors: Math.round(totalVendors * eased),
        uptime: Math.round(99 * eased),
      })

      if (p < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [isLoading, allDisplayModels])

  // Filter combined list according to selected category & search input
  const filteredModels = useMemo(() => {
    return allDisplayModels.filter((m) => {
      const cats = m.categories
      const matchesCat = curFilter === 'all' || cats.includes(curFilter)

      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (m.model_name || '').toLowerCase().includes(q) ||
        (m.vendor_name || '').toLowerCase().includes(q) ||
        (m.tags || '').toLowerCase().includes(q)

      return matchesCat && matchesSearch
    })
  }, [allDisplayModels, curFilter, searchQuery])

  // Listen to list changes to bind scroll reveal animations dynamically
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Setup staggered animation delay triggers
      document.querySelectorAll('.reveal').forEach((el: any) => {
        const sibs = [...(el.parentElement?.children || [])].filter((n: any) =>
          n.classList?.contains('reveal')
        );
        const idx = sibs.indexOf(el);
        if (idx > 0) el.style.setProperty('--rd', idx * 70 + 'ms');
      });

      // 2. Set up IntersectionObserver target registration
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const targetEl = e.target as HTMLElement;
              targetEl.classList.add('in');
              io.unobserve(targetEl);
            }
          }
        },
        { threshold: 0.15 }
      );

      document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

      return () => {
        io.disconnect();
      };
    }, 50);

    return () => clearTimeout(timer);
  }, [filteredModels, isLoading]);



  // Pre-determined localized list tags
  const filterTabs = [
    { value: 'all', label: t('All') },
    { value: 'text', label: t('Text Generation') },
    { value: 'reason', label: t('Reasoning') },
    { value: 'code', label: t('Code') },
    { value: 'image', label: t('Image') },
    { value: 'video', label: t('Video') },
  ]

  return (
    <div className='aijiniu-theme relative min-h-screen overflow-x-clip bg-white text-[#17150f] antialiased'>
      {/* Background gradients and meshes */}
      <div className='bg-base pointer-events-none fixed inset-0 z-[-5] bg-[radial-gradient(120%_80%_at_50%_-10%,_#fdf6e3_0%,_#fcfaf4_38%,_#ffffff_70%)]' />
      <div
        className="bg-grid pointer-events-none fixed inset-0 z-[-4] opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(190, 150, 30, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(190, 150, 30, 0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 14%, #000 22%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 14%, #000 22%, transparent 80%)',
        }}
      />

      {/* ============ NAVIGATION & MOBILE MENU ============ */}
      <AijiniuHeader activeTab="pricing" />

      {/* ============ HERO HEADER ============ */}
      <header className="mp-hero">
        <div className="container">
          <span className="eyebrow"><span className="dot"></span>MODEL PLAZA</span>
          <h1 className="page-title">
            <span className="pt-left">{t('模型广场')}</span>
            <span className="pt-dot">·</span>
            <span className="pt-right grad">{t('一处接入全球 AI')}</span>
          </h1>
          <p className="page-sub">
            {t('主流大模型一处接入、自由切换，按 Token 透明计费，覆盖文本、推理、代码、图片与视频等多种能力。', {
              count: stats.models || allDisplayModels.length,
            })}
          </p>
          <div className="mp-stats">
            <div className="mp-stat">
              <b>{stats.models || allDisplayModels.length}+</b>
              <span>{t('主流大模型')}</span>
            </div>
            <div className="mp-stat">
              <b>{stats.vendors}+</b>
              <span>{t('AI 厂商')}</span>
            </div>
            <div className="mp-stat">
              <b>{stats.uptime || '99'}%</b>
              <span>{t('服务可用性')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ============ TOOLBAR (SEARCH + FILTERS) ============ */}
      <div className="container">
        <div className="mp-toolbar">
          <div className="mp-toolbar-left">
            <div className="mp-search">
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input
                type="search"
                placeholder={t('搜索模型 / 厂商，如 DeepSeek、Claude…')}
                aria-label={t('搜索模型')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div
              className="jn-lang mp-currency"
              role="group"
              aria-label={t('货币')}
            >
              <button
                type="button"
                className={priceCurrency === 'cny' ? 'active' : ''}
                onClick={() => setPriceCurrency('cny')}
                aria-pressed={priceCurrency === 'cny'}
              >
                ¥
              </button>
              <button
                type="button"
                className={priceCurrency === 'usd' ? 'active' : ''}
                onClick={() => setPriceCurrency('usd')}
                aria-pressed={priceCurrency === 'usd'}
              >
                $
              </button>
            </div>
          </div>
          <div className="mp-chips" role="tablist">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                className={`mp-chip ${curFilter === tab.value ? 'active' : ''}`}
                onClick={() => setCurFilter(tab.value)}
                role="tab"
                aria-selected={curFilter === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============ MODEL CARDS GRID ============ */}
      <div className="container">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
            <span>{t('Loading...')}</span>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="mp-empty show">{t('没有匹配的模型，换个关键词试试～')}</div>
        ) : (
          <div className="mp-grid">
            {filteredModels.map((model) => {
              const vendor = model.vendor_name
              const isPerCall = model.quota_type === 1
              const prices = getAijiniuModelDisplayPrices(
                model,
                priceCurrency,
                usdExchangeRate
              )

              // Split tags
              const tags = (model.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)

              // Build capability description
              const capabilityDescription = model.description ||
                (tags.length > 0
                  ? `${t('支持')}${tags.map((tg) => t(tg)).join(t('、'))}${t('能力，')}${isPerCall
                    ? t('按次计费，单次调用价格固定、成本可预估。')
                    : t('按 Token 透明计费，用多少付多少。')
                  }`
                  : isPerCall
                    ? t('按次计费，单次调用价格固定、成本可预估。')
                    : t('按 Token 透明计费，用多少付多少。')
                )

              return (
                <article key={model.id} className="mp-card reveal">
                  <div className="mp-top">
                    <span className="mp-logo">
                      {getLobeIcon(model.icon, 28)}
                    </span>
                    <div className="mp-id">
                      <h3>{model.model_name}</h3>
                      <div className="mp-vendor">{t(vendor)}</div>
                    </div>
                  </div>
                  <p className="mp-desc">{capabilityDescription}</p>
                  <div className="mp-tags">
                    {tags.slice(0, 3).map((tg: string) => (
                      <span key={tg} className="mp-tag">{t(tg)}</span>
                    ))}
                    {model.context_length && (
                      <span className="mp-tag">
                        {model.context_length >= 1048576
                          ? `${Math.round(model.context_length / 1048576)}M`
                          : model.context_length >= 1024
                            ? `${Math.round(model.context_length / 1024)}K`
                            : model.context_length}{' '}
                        {t('上下文')}
                      </span>
                    )}
                  </div>
                  <div className="mp-price">
                    {isPerCall ? (
                      <>
                        <div className="pr">
                          <span className="pr-k">{t(model.price_type_desc || '计费')}</span>
                          <span className="pr-v">
                            {prices.price_val}
                            <i>{t(model.price_unit_desc || '/次')}</i>
                          </span>
                        </div>
                        <div className="pr">
                          <span className="pr-k">{t('方式')}</span>
                          <span className="pr-v">
                            {t(model.price_type_val || '按次')}
                            <i>{t('固定价')}</i>
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="pr">
                          <span className="pr-k">{t('输入')}</span>
                          <span className="pr-v">
                            {prices.input_price}
                            <i>{t('/百万tokens')}</i>
                          </span>
                        </div>
                        <div className="pr">
                          <span className="pr-k">{t('输出')}</span>
                          <span className="pr-v">
                            {prices.output_price}
                            <i>{t('/百万tokens')}</i>
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <Link to={loginLink} className="mp-btn">
                    {t('立即调用')} <span className="arrow">→</span>
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <p className="mp-note">
        {t('* 价格为当前分组实时报价，最终以控制台实际计费为准。更多模型持续接入中。')}
      </p>

      {/* ============ 备案信息 ============ */}
      <AijiniuFooter />
    </div>
  )
}
