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
import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useAijiniuTranslation } from './locales'
import {
  AijiniuHeader,
  handleAijiniuSectionClick,
  scrollToAijiniuSection,
} from './header'
import { AijiniuFooter } from './footer'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { getLobeIcon } from '@/lib/lobe-icon'

import './aijiniu.css'

const getModelCategories = (model: any) => {
  const cats: string[] = []
  const name = (model.model_name || '').toLowerCase()
  const tags = (model.tags || '').toLowerCase()

  if (name.includes('r1') || name.includes('reason') || name.includes('think') || tags.includes('推理') || tags.includes('reason') || tags.includes('think') || tags.includes('thinking')) {
    cats.push('reason')
  }
  if (name.includes('coder') || name.includes('code') || tags.includes('代码') || tags.includes('code') || tags.includes('编码')) {
    cats.push('code')
  }
  if (
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

  if (
    cats.length === 0 ||
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

const VENDOR_SYMBOL_MAP: Record<string, string> = {
  deepseek: '#lg-deepseek',
  kimi: '#lg-kimi',
  moonshot: '#lg-kimi',
  zhipu: '#lg-zhipu',
  智谱: '#lg-zhipu',
  qwen: '#lg-qwen',
  千问: '#lg-qwen',
  minimax: '#lg-minimax',
  海螺: '#lg-minimax',
  doubao: '#lg-doubao',
  豆包: '#lg-doubao',
  grok: '#lg-grok',
  xai: '#lg-grok',
  mimo: '#lg-mimo',
  小米: '#lg-mimo',
  openai: '#lg-openai',
  google: '#lg-google',
  gemini: '#lg-google',
  anthropic: '#lg-anthropic',
  claude: '#lg-anthropic',
}

function getVendorSymbol(name: string): string | null {
  const n = name.toLowerCase()
  for (const k in VENDOR_SYMBOL_MAP) {
    if (n.includes(k)) {
      return VENDOR_SYMBOL_MAP[k]
    }
  }
  return null
}

function renderVendorIcon(name: string, iconKey?: string) {
  const symbol = getVendorSymbol(name)
  if (symbol) {
    return (
      <svg>
        <use href={symbol} />
      </svg>
    )
  }
  const finalKey = iconKey || name
  return getLobeIcon(finalKey, 16)
}

function VendorMarqueeRow({
    reverse,
    children,
}: {
    reverse?: boolean
    children: ReactNode
}) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [animate, setAnimate] = useState(false)

    useLayoutEffect(() => {
        const track = trackRef.current
        if (!track) return

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setAnimate(false)
            return
        }

        track.querySelectorAll('[data-marquee-clone]').forEach((node) => node.remove())
        Array.from(track.children).forEach((el) => {
            const clone = el.cloneNode(true) as HTMLElement
            clone.setAttribute('aria-hidden', 'true')
            clone.setAttribute('data-marquee-clone', '')
            track.appendChild(clone)
        })
        setAnimate(true)
    })

    return (
        <div className={`vm-row${reverse ? ' rev' : ''}`}>
            <div
                ref={trackRef}
                className={`vm-track${animate ? ' go' : ''}`}
                data-marquee
            >
                {children}
            </div>
        </div>
    )
}

export function AijiniuHome() {
    const { t, tBrandPhrase, tBrandIn } = useAijiniuTranslation()
    const { auth } = useAuthStore()
    const isAuthenticated = !!auth.user

    const { models, isLoading } = usePricingData()

    const activeModels = useMemo(() => {
        return (models || []).filter((m) => m.tags && m.tags.trim() !== '')
    }, [models])

    const pricingStats = useMemo(() => {
        const vendorSet = new Set(
            activeModels.map((m) => m.vendor_name).filter(Boolean)
        )
        return {
            modelCount: activeModels.length,
            vendorCount: vendorSet.size,
        }
    }, [activeModels])

    const matrixData = useMemo(() => {
        const categories = {
            text: new Map<string, { name: string; icon?: string }>(),
            code: new Map<string, { name: string; icon?: string }>(),
            image: new Map<string, { name: string; icon?: string }>(),
            video: new Map<string, { name: string; icon?: string }>(),
        }

        activeModels.forEach((m) => {
            const cats = getModelCategories(m)
            const vName = m.vendor_name || t('平台优选')
            const vIcon = m.vendor_icon

            cats.forEach((cat) => {
                if (cat in categories) {
                    const map = categories[cat as keyof typeof categories]
                    if (!map.has(vName)) {
                        map.set(vName, { name: vName, icon: vIcon })
                    }
                }
            })
        })

        return {
            text: Array.from(categories.text.values()),
            code: Array.from(categories.code.values()),
            image: Array.from(categories.image.values()),
            video: Array.from(categories.video.values()),
        }
    }, [activeModels, t])

    const showLiveMatrix = !isLoading && activeModels.length > 0

    const animateCount = useCallback((el: HTMLElement) => {
        const target = +(el.dataset.count || 0);
        const suffix = el.dataset.suffix || '';
        const dur = 1100;
        let start: number | null = null;
        const tick = (t: number) => {
            if (start === null) start = t;
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        if (isLoading || pricingStats.modelCount === 0) return;

        document.querySelectorAll('.stats-band .num').forEach((el: any) => {
            const target = parseInt(el.getAttribute('data-count') || '0', 10);
            if (target > 0 && !el.dataset.done) {
                const parentReveal = el.closest('.reveal');
                if (parentReveal && parentReveal.classList.contains('in')) {
                    el.dataset.done = '1';
                    animateCount(el);
                }
            }
        });
    }, [pricingStats, isLoading, animateCount]);

    useEffect(() => {
        // 1. Run 3D tilt logic
        const runTilt = () => {
            document.querySelectorAll('.tilt').forEach((card) => {
                let raf: any = null;
                const handleMouseMove = (e: any) => {
                    if (raf) cancelAnimationFrame(raf);
                    raf = requestAnimationFrame(() => {
                        const r = card.getBoundingClientRect();
                        const x = (e.clientX - r.left) / r.width - 0.5;
                        const y = (e.clientY - r.top) / r.height - 0.5;
                        const max = card.classList.contains('spot') ? 3 : 6;
                        (card as HTMLElement).style.transform =
                            'translateY(-5px) rotateX(' + -y * max + 'deg) rotateY(' + x * max + 'deg)';
                    });
                };
                const handleMouseLeave = () => {
                    if (raf) cancelAnimationFrame(raf);
                    (card as HTMLElement).style.transform = '';
                };
                card.addEventListener('mousemove', handleMouseMove);
                card.addEventListener('mouseleave', handleMouseLeave);
            });
        };
        runTilt();

        // 3. Canvas animation logic
        const runCanvas = () => {
            const cvs = document.getElementById('neural') as HTMLCanvasElement;
            if (!cvs) return;
            const ctx = cvs.getContext('2d')!;

            const host = cvs.parentElement!;

            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const DPR = Math.min(window.devicePixelRatio || 1, 2);
            const PAL = ['245,179,1', '232,165,0', '255,200,60'];
            let W = 0,
                H = 0,
                cx = 0,
                cy = 0,
                R = 0;
            let rotY = 0,
                autoV = 0.0026,
                rotV = 0.0026;
            const baseTilt = -0.42;
            let tiltAng = baseTilt;
            let pts = [] as any[],
                edges = [] as any[],
                adj = [] as any[],
                pulses = [] as any[],
                last = 0;
            let glowGrad = null as any,
                coreGrad = null as any;
            const mouse = { x: 0, y: 0, on: false };

            function fib(n: number) {
                const out = [] as any[],
                    ga = Math.PI * (3 - Math.sqrt(5));
                for (let i = 0; i < n; i++) {
                    const y = 1 - (i / (n - 1)) * 2;
                    const rr = Math.sqrt(Math.max(0, 1 - y * y));
                    const th = ga * i;
                    out.push({ x: Math.cos(th) * rr, y: y, z: Math.sin(th) * rr, c: PAL[i % PAL.length] });
                }
                return out;
            }
            function buildEdges() {
                const E = [] as any[],
                    seen = new Set();
                const POOL = 7;
                const add = (i: number, j: number) => {
                    if (i === j) return;
                    const key = i < j ? i + '_' + j : j + '_' + i;
                    if (seen.has(key)) return;
                    seen.add(key);
                    E.push([i, j]);
                };
                for (let i = 0; i < pts.length; i++) {
                    const a = pts[i],
                        d = [] as any[];
                    for (let j = 0; j < pts.length; j++) {
                        if (j === i) continue;
                        const b = pts[j];
                        const dd = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
                        d.push([dd, j]);
                    }
                    d.sort((p, q) => p[0] - q[0]);
                    const k = 1 + ((Math.random() * 2) | 0);
                    const picks = new Set();
                    let guard = 0;
                    while (picks.size < k && guard < 24) {
                        guard++;
                        const idx = Math.min((Math.pow(Math.random(), 1.7) * POOL) | 0, d.length - 1);
                        picks.add(idx);
                    }
                    picks.forEach((m: any) => add(i, d[m][1]));
                }
                const longCount = Math.round(pts.length * 0.03);
                for (let n = 0; n < longCount; n++) {
                    add((Math.random() * pts.length) | 0, (Math.random() * pts.length) | 0);
                }
                return E;
            }
            function resize() {
                const r = host.getBoundingClientRect();
                W = cvs.width = Math.max(1, Math.round(r.width * DPR));
                H = cvs.height = Math.max(1, Math.round(r.height * DPR));
                cvs.style.width = r.width + 'px';
                cvs.style.height = r.height + 'px';
                cx = W / 2;
                cy = H * 0.5;
                R = Math.min(W * 0.36, H * 0.48);
                glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.45);
                glowGrad.addColorStop(0, 'rgba(255, 200, 70, 0.30)');
                glowGrad.addColorStop(0.42, 'rgba(245, 179, 1, 0.12)');
                glowGrad.addColorStop(1, 'rgba(245, 179, 1, 0)');
                coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
                coreGrad.addColorStop(0, 'rgba(255, 216, 96, 0.55)');
                coreGrad.addColorStop(0.5, 'rgba(245, 179, 1, 0.18)');
                coreGrad.addColorStop(1, 'rgba(245, 179, 1, 0)');
            }
            function init() {
                pts = fib(window.innerWidth < 760 ? 180 : 250);
                edges = buildEdges();
                adj = pts.map(() => []);
                for (let i = 0; i < edges.length; i++) {
                    adj[edges[i][0]].push(edges[i][1]);
                    adj[edges[i][1]].push(edges[i][0]);
                }
                pulses = [];
            }
            function project(p: any, cosY: number, sinY: number, cosX: number, sinX: number) {
                const x = p.x * cosY - p.z * sinY;
                const z = p.x * sinY + p.z * cosY;
                const y2 = p.y * cosX - z * sinX;
                const z2 = p.y * sinX + z * cosX;
                return { sx: cx + x * R, sy: cy + y2 * R, z: z2 };
            }
            function spawnPulse() {
                if (!edges.length || pulses.length > 10) return;
                let cur = (Math.random() * pts.length) | 0;
                if (!adj[cur] || !adj[cur].length) return;
                const path = [cur];
                const hops = 5 + ((Math.random() * 5) | 0);
                let prev = -1;
                for (let h = 0; h < hops; h++) {
                    const nb = adj[cur];
                    if (!nb.length) break;
                    let nxt = nb[(Math.random() * nb.length) | 0];
                    if (nb.length > 1 && nxt === prev) nxt = nb[(Math.random() * nb.length) | 0];
                    path.push(nxt);
                    prev = cur;
                    cur = nxt;
                }
                if (path.length < 2) return;
                pulses.push({
                    path: path,
                    segs: path.length - 1,
                    t: 0,
                    sp: 0.006 + Math.random() * 0.006,
                });
            }
            function render() {
                ctx.clearRect(0, 0, W, H);
                const tx = tiltAng;
                const cosY = Math.cos(rotY),
                    sinY = Math.sin(rotY),
                    cosX = Math.cos(tx),
                    sinX = Math.sin(tx);
                const P = new Array(pts.length);
                for (let i = 0; i < pts.length; i++) P[i] = project(pts[i], cosY, sinY, cosX, sinX);

                ctx.fillStyle = glowGrad;
                ctx.fillRect(0, 0, W, H);

                ctx.fillStyle = coreGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, R * 0.55, 0, 6.2832);
                ctx.fill();

                ctx.lineWidth = 0.85 * DPR;
                for (let i = 0; i < edges.length; i++) {
                    const a = P[edges[i][0]],
                        b = P[edges[i][1]];
                    const al = ((a.z + b.z) / 2 + 1) / 2;
                    if (al < 0.1) continue;
                    ctx.strokeStyle = 'rgba(186, 132, 8,' + (0.1 + al * 0.42) + ')';
                    ctx.beginPath();
                    ctx.moveTo(a.sx, a.sy);
                    ctx.lineTo(b.sx, b.sy);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                for (let i = 0; i < pts.length; i++) {
                    const p = P[i];
                    const al = (p.z + 1) / 2;
                    ctx.beginPath();
                    ctx.arc(p.sx, p.sy, (1.1 + al * 2.5) * DPR, 0, 6.2832);
                    ctx.fillStyle = 'rgba(' + pts[i].c + ',' + (0.3 + al * 0.66) + ')';
                    ctx.fill();
                }
                ctx.shadowColor = 'rgba(255, 200, 70, 0.85)';
                ctx.shadowBlur = 8 * DPR;
                for (let i = 0; i < pts.length; i++) {
                    const p = P[i];
                    const al = (p.z + 1) / 2;
                    if (al <= 0.85) continue;
                    ctx.beginPath();
                    ctx.arc(p.sx, p.sy, (1.1 + al * 2.5) * DPR, 0, 6.2832);
                    ctx.fillStyle = 'rgba(' + pts[i].c + ',' + (0.3 + al * 0.66) + ')';
                    ctx.fill();
                }
                ctx.shadowBlur = 0;

                const HOLD = 0.25;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 1.8 * DPR;
                ctx.shadowBlur = 0;
                for (let i = pulses.length - 1; i >= 0; i--) {
                    const pu = pulses[i];
                    pu.t += pu.sp;
                    if (pu.t >= 1 + HOLD) {
                        pulses.splice(i, 1);
                        continue;
                    }
                    const ga =
                        Math.min(1, pu.t / 0.08) * (pu.t > 1 ? Math.max(0, 1 - (pu.t - 1) / HOLD) : 1);
                    const path = pu.path,
                        segs = path.length - 1;
                    const headPos = Math.min(pu.t, 1) * segs;
                    const full = Math.floor(headPos);
                    for (let s = 0; s < segs; s++) {
                        if (s > full) break;
                        const a = P[path[s]],
                            b = P[path[s + 1]];
                        const frac = s < full ? 1 : headPos - full;
                        if (frac <= 0) break;
                        const ex = a.sx + (b.sx - a.sx) * frac,
                            ey = a.sy + (b.sy - a.sy) * frac;
                        const zf = ((a.z + b.z) / 2 + 1) / 2;
                        if (zf <= 0.12) continue;
                        ctx.strokeStyle = 'rgba(245, 179, 1,' + ga * Math.min(1, zf * 1.5) * 0.95 + ')';
                        ctx.beginPath();
                        ctx.moveTo(a.sx, a.sy);
                        ctx.lineTo(ex, ey);
                        ctx.stroke();
                    }
                }
                ctx.lineCap = 'butt';
                ctx.lineJoin = 'miter';
            }
            let frameId: any;
            function frame(now: number) {
                frameId = requestAnimationFrame(frame);
                const targetV = autoV + (mouse.on ? mouse.x * 0.014 : 0);
                rotV += (targetV - rotV) * 0.06;
                rotY += rotV;
                const targetTilt = baseTilt + (mouse.on ? mouse.y * 0.6 : 0);
                tiltAng += (targetTilt - tiltAng) * 0.07;
                if (now - last > 150) {
                    last = now;
                    spawnPulse();
                }
                render();
            }

            resize();
            init();
            if (reduce) render();
            else frameId = requestAnimationFrame(frame);

            const handleMouseMove = (e: any) => {
                const r = host.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;
                if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
                    mouse.x = x - 0.5;
                    mouse.y = y - 0.5;
                    mouse.on = true;
                } else {
                    mouse.on = false;
                }
            };

            const handleMouseLeave = () => {
                mouse.on = false;
            };

            if (!reduce) {
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseleave', handleMouseLeave);
            }

            let rt: any;
            const handleResize = () => {
                clearTimeout(rt);
                rt = setTimeout(() => {
                    resize();
                    init();
                    if (reduce) render();
                }, 200);
            };
            window.addEventListener('resize', handleResize);

            return () => {
                if (frameId) cancelAnimationFrame(frameId);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseleave', handleMouseLeave);
                window.removeEventListener('resize', handleResize);
            };
        };

        const cancelCanvas = runCanvas();

        // 4. Scroll reveal and stat counting logic
        const runReveal = () => {
            document.querySelectorAll('.reveal').forEach((el: any) => {
                const sibs = [...(el.parentElement?.children || [])].filter((n: any) =>
                    n.classList?.contains('reveal')
                );
                const idx = sibs.indexOf(el);
                if (idx > 0) el.style.setProperty('--rd', idx * 70 + 'ms');
            });

            const io = new IntersectionObserver(
                (entries) => {
                    for (const e of entries) {
                        if (e.isIntersecting) {
                            const targetEl = e.target as HTMLElement;
                            targetEl.classList.add('in');
                            const num = targetEl.querySelector('.num') as HTMLElement;
                            if (num) {
                                const target = +(num.dataset.count || 0);
                                if (target > 0 && !num.dataset.done) {
                                    num.dataset.done = '1';
                                    animateCount(num);
                                    io.unobserve(targetEl);
                                }
                            } else {
                                io.unobserve(targetEl);
                            }
                        }
                    }
                },
                { threshold: 0.15 }
            );

            document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

            return () => {
                io.disconnect();
            };
        };
        const cancelReveal = runReveal();

        return () => {
            if (cancelCanvas) cancelCanvas();
            if (cancelReveal) cancelReveal();
        };
    }, []);

    // From other routes (e.g. /#industry): avoid hard jump — reset to top, then ease to section
    useLayoutEffect(() => {
        const hash = window.location.hash
        if (!hash || hash.length < 2) return

        const id = decodeURIComponent(hash.slice(1))
        if (!document.getElementById(id)) return

        // Cancel the browser's instant fragment jump before paint when possible
        window.scrollTo({ top: 0, behavior: 'auto' })
    }, [])

    useEffect(() => {
        const hash = window.location.hash
        if (!hash || hash.length < 2) return

        const id = decodeURIComponent(hash.slice(1))
        if (!document.getElementById(id)) return

        let cancelled = false
        const t = window.setTimeout(() => {
            if (!cancelled) scrollToAijiniuSection(id, { updateHash: false })
        }, 60)

        return () => {
            cancelled = true
            window.clearTimeout(t)
        }
    }, [])

    const loginLink = (isAuthenticated ? '/dashboard' : '/sign-in') as any;

    return (
        <div className="aijiniu-theme">

            {/* 背景层 */}
            <div className="bg-base"></div>
            <div className="bg-grid"></div>

            {/* ============ Logo 雪碧图（供能力矩阵复用） ============ */}
            <svg width="0" height="0" style={{ "position": "absolute" }} aria-hidden="true" focusable="false">
                <symbol id="lg-openai" viewBox="0 0 24 24">
                    <path fill="#10a37f"
                        d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                </symbol>
                <symbol id="lg-anthropic" viewBox="0 0 24 24">
                    <path fill="#D4732F"
                        d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm1.21 5.14l-2.33 5.833h4.658L7.78 8.66z" />
                </symbol>
                <symbol id="lg-google" viewBox="0 0 24 24">
                    <path fill="#4285F4"
                        d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
                </symbol>
                <symbol id="lg-deepseek" viewBox="0 0 24 24">
                    <path fill="#4D6BFE"
                        d="M23.749 4.88c-.256-.12-.366.108-.514.225-.05.038-.094.087-.136.131-.373.386-.808.64-1.373.608-.83-.044-1.538.21-2.164.823-.133-.758-.575-1.21-1.247-1.502-.352-.15-.709-.3-.954-.63-.173-.232-.22-.492-.307-.749-.053-.154-.108-.312-.293-.34-.2-.03-.277.133-.355.27-.313.551-.434 1.164-.423 1.782.028 1.39.635 2.498 1.84 3.288.136.09.171.181.13.313-.084.27-.18.535-.269.806-.054.174-.136.212-.327.135a5.504 5.327 0 0 1-1.737-1.142c-.857-.803-1.63-1.69-2.598-2.382a11 11 0 0 0-.687-.456c-.986-.928.13-1.69.387-1.78.27-.094.093-.418-.78-.415-.87.004-1.67.287-2.684.663a2.81 2.72 0 0 1-.466.131 9.655 9.343 0 0 0-2.883-.097c-1.884.205-3.391 1.07-4.498 2.542C.08 8.875-.23 10.888.15 12.99c.403 2.211 1.569 4.046 3.36 5.478 1.86 1.484 4 2.212 6.44 2.072 1.481-.082 3.133-.274 4.994-1.8.47.224.963.314 1.78.383.63.057 1.236-.03 1.706-.124.735-.15.684-.81.418-.932-2.156-.972-1.682-.576-2.113-.897 1.095-1.255 2.747-2.56 3.392-6.784.05-.337.007-.547 0-.82-.004-.165.035-.23.23-.248a4.128 3.995 0 0 0 1.545-.46c1.397-.74 1.96-1.953 2.092-3.408.02-.222-.004-.453-.245-.57m-12.17 13.096c-2.09-1.592-3.101-2.114-3.52-2.092-.39.021-.32.455-.234.738.09.278.207.471.372.715.114.163.192.405-.113.584-.673.406-1.843-.135-1.897-.16-1.361-.776-2.5-1.802-3.302-3.204-.773-1.35-1.224-2.799-1.298-4.343-.02-.376.094-.507.477-.574a4.742 4.59 0 0 1 1.53-.038c2.132.303 3.946 1.226 5.466 2.687.869.835 1.525 1.83 2.202 2.803.72 1.032 1.494 2.017 2.48 2.822.347.283.625.5.892.657-.802.087-2.14.106-3.055-.595m1-6.24a.308.297 0 1 1 .615 0 .3.3 0 0 1-.309.298.304.294 0 0 1-.306-.299zm3.11 1.547c-.198.078-.398.146-.59.155a1.259 1.218 0 0 1-.797-.247c-.274-.222-.47-.346-.553-.735a1.77 1.714 0 0 1 .016-.57c.071-.317-.008-.519-.237-.705-.189-.15-.427-.19-.69-.19a.557.54 0 0 1-.254-.077c-.11-.054-.2-.185-.113-.347.026-.052.161-.18.191-.203.356-.196.766-.132 1.146.015.353.14.618.397 1.001.757.392.438.462.56.685.886.175.258.336.522.446.824.066.187-.02.341-.25.437z" />
                </symbol>
                <symbol id="lg-kimi" viewBox="0 0 24 24">
                    <path fill="#1783FF"
                        d="M21.846 0a1.923 1.923 0 110 3.846H20.15a.226.226 0 01-.227-.226V1.923C19.923.861 20.784 0 21.846 0z" />
                    <path fill="#1783FF"
                        d="M11.065 11.199l7.257-7.2c.137-.136.06-.41-.116-.41H14.3a.164.164 0 00-.117.051l-7.82 7.756c-.122.12-.302.013-.302-.179V3.82c0-.127-.083-.23-.185-.23H3.186c-.103 0-.186.103-.186.23V19.77c0 .128.083.23.186.23h2.69c.103 0 .186-.102.186-.23v-3.25c0-.069.025-.135.069-.178l2.424-2.406a.158.158 0 01.205-.023l6.484 4.772a7.677 7.677 0 003.453 1.283c.108.012.2-.095.2-.23v-3.06c0-.117-.07-.212-.164-.227a5.028 5.028 0 01-2.027-.807l-5.613-4.064c-.117-.078-.132-.279-.028-.381z" />
                </symbol>
                <symbol id="lg-zhipu" viewBox="0 0 24 24">
                    <path fill="#3859FF"
                        d="M11.991 23.503a.24.24 0 00-.244.248.24.24 0 00.244.249.24.24 0 00.245-.249.24.24 0 00-.22-.247l-.025-.001zM9.671 5.365a1.697 1.697 0 011.099 2.132l-.071.172-.016.04-.018.054c-.07.16-.104.32-.104.498-.035.71.47 1.279 1.186 1.314h.366c1.309.053 2.338 1.173 2.286 2.523-.052 1.332-1.152 2.38-2.478 2.327h-.174c-.715.018-1.274.64-1.239 1.368 0 .124.018.23.053.337.209.373.54.658.96.8.75.23 1.517-.125 1.9-.782l.018-.035c.402-.64 1.17-.96 1.92-.711.854.284 1.378 1.226 1.099 2.167a1.661 1.661 0 01-2.077 1.102 1.711 1.711 0 01-.907-.711l-.017-.035c-.2-.323-.463-.58-.851-.711l-.056-.018a1.646 1.646 0 00-1.954.746 1.66 1.66 0 01-1.065.764 1.677 1.677 0 01-1.989-1.279c-.209-.906.332-1.83 1.257-2.043a1.51 1.51 0 01.296-.035h.018c.68-.071 1.151-.622 1.116-1.333a1.307 1.307 0 00-.227-.693 2.515 2.515 0 01-.366-1.403 2.39 2.39 0 01.366-1.208c.14-.195.21-.444.227-.693.018-.71-.506-1.261-1.186-1.332l-.07-.018a1.43 1.43 0 01-.299-.07l-.05-.019a1.7 1.7 0 01-1.047-2.114 1.68 1.68 0 012.094-1.101zm-5.575 10.11c.26-.264.639-.367.994-.27.355.096.633.379.728.74.095.362-.007.748-.267 1.013-.402.41-1.053.41-1.455 0a1.062 1.062 0 010-1.482zm14.845-.294c.359-.09.738.024.992.297.254.274.344.665.237 1.025-.107.36-.396.634-.756.718-.551.128-1.1-.22-1.23-.781a1.05 1.05 0 01.757-1.26zm-.064-4.39c.314.32.49.753.49 1.206 0 .452-.176.886-.49 1.206-.315.32-.74.5-1.185.5-.444 0-.87-.18-1.184-.5a1.727 1.727 0 010-2.412 1.654 1.654 0 012.369 0zm-11.243.163c.364.484.447 1.128.218 1.691a1.665 1.665 0 01-2.188.923c-.855-.36-1.26-1.358-.907-2.228a1.68 1.68 0 011.33-1.038c.593-.08 1.183.169 1.547.652zm11.545-4.221c.368 0 .708.2.892.524.184.324.184.724 0 1.048a1.026 1.026 0 01-.892.524c-.568 0-1.03-.47-1.03-1.048 0-.579.462-1.048 1.03-1.048zm-14.358 0c.368 0 .707.2.891.524.184.324.184.724 0 1.048a1.026 1.026 0 01-.891.524c-.569 0-1.03-.47-1.03-1.048 0-.579.461-1.048 1.03-1.048zm10.031-1.475c.925 0 1.675.764 1.675 1.706s-.75 1.705-1.675 1.705-1.674-.763-1.674-1.705c0-.942.75-1.706 1.674-1.706z" />
                </symbol>
                <symbol id="lg-qwen" viewBox="0 0 24 24">
                    <path fill="#615CED" fillRule="evenodd"
                        d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z" />
                </symbol>
                <symbol id="lg-minimax" viewBox="0 0 24 24">
                    <path fill="#F23F5D"
                        d="M11.43 3.92a.86.86 0 1 0-1.718 0v14.236a1.999 1.999 0 0 1-3.997 0V9.022a.86.86 0 1 0-1.718 0v3.87a1.999 1.999 0 0 1-3.997 0V11.49a.57.57 0 0 1 1.139 0v1.404a.86.86 0 0 0 1.719 0V9.022a1.999 1.999 0 0 1 3.997 0v9.134a.86.86 0 0 0 1.719 0V3.92a1.998 1.998 0 1 1 3.996 0v11.788a.57.57 0 1 1-1.139 0zm10.572 3.105a2 2 0 0 0-1.999 1.997v7.63a.86.86 0 0 1-1.718 0V3.923a1.999 1.999 0 0 0-3.997 0v16.16a.86.86 0 0 1-1.719 0V18.08a.57.57 0 1 0-1.138 0v2a1.998 1.998 0 0 0 3.996 0V3.92a.86.86 0 0 1 1.719 0v12.73a1.999 1.999 0 0 0 3.996 0V9.023a.86.86 0 1 1 1.72 0v6.686a.57.57 0 0 0 1.138 0V9.022a2 2 0 0 0-1.998-1.997" />
                </symbol>
                <symbol id="lg-doubao" viewBox="0 0 24 24">
                    <path fill="#1E37FC" fill-opacity=".7"
                        d="M5.31 15.756c.172-3.75 1.883-5.999 2.549-6.739-3.26 2.058-5.425 5.658-6.358 8.308v1.12C1.501 21.513 4.226 24 7.59 24a6.59 6.59 0 002.2-.375c.353-.12.7-.248 1.039-.378.913-.899 1.65-1.91 2.243-2.992-4.877 2.431-7.974.072-7.763-4.5l.002.001z" />
                    <path fill="#37E1BE"
                        d="M22.57 10.283c-1.212-.901-4.109-2.404-7.397-2.8.295 3.792.093 8.766-2.1 12.773a12.782 12.782 0 01-2.244 2.992c3.764-1.448 6.746-3.457 8.596-5.219 2.82-2.683 3.353-5.178 3.361-6.66a2.737 2.737 0 00-.216-1.084v-.002z" />
                    <path fill="#A569FF"
                        d="M14.303 1.867C12.955.7 11.248 0 9.39 0 7.532 0 5.883.677 4.545 1.807 2.791 3.29 1.627 5.557 1.5 8.125v9.201c.932-2.65 3.097-6.25 6.357-8.307.5-.318 1.025-.595 1.569-.829 1.883-.801 3.878-.932 5.746-.706-.222-2.83-.718-5.002-.87-5.617h.001z" />
                    <path fill="#1E37FC" fill-opacity=".7"
                        d="M17.305 4.961a199.47 199.47 0 01-1.08-1.094c-.202-.213-.398-.419-.586-.622l-1.333-1.378c.151.615.648 2.786.869 5.617 3.288.395 6.185 1.898 7.396 2.8-1.306-1.275-3.475-3.487-5.266-5.323z" />
                </symbol>
                <symbol id="lg-grok" viewBox="0 0 24 24">
                    <path fill="#000" fillRule="evenodd"
                        d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
                </symbol>
                <symbol id="lg-mimo" viewBox="0 0 808 808">
                    <path fill="#ff6900"
                        d="M723.79,84.42C647.55,8.48,537.94,0,404,0,269.89,0,160.12,8.58,83.92,84.72S0,270.43,0,404.39,7.74,648,84,724.14,269.9,808,404,808s243.85-7.71,320-83.86,84-185.78,84-319.75C808,270.25,800.16,160.54,723.79,84.42Z" />
                    <path fill="#fff"
                        d="M374.26,553.72a5,5,0,0,1-5.06,5H300.3a5.05,5.05,0,0,1-5.12-5V373.53a5.05,5.05,0,0,1,5.12-5h68.9a5,5,0,0,1,5.06,5Z" />
                    <path fill="#fff"
                        d="M509.18,553.72a5.05,5.05,0,0,1-5.09,5H438.5a5,5,0,0,1-5.1-5V398.26c-.07-27.15-1.62-55-15.64-69.06-12-12.09-34.51-14.86-57.88-15.44H241a5,5,0,0,0-5.07,5v235a5.07,5.07,0,0,1-5.12,5H165.16a5,5,0,0,1-5.06-5V254.31a5,5,0,0,1,5.06-5H354.52c49.49,0,101.22,2.26,126.74,27.81s27.92,77.3,27.92,126.85Z" />
                    <path fill="#fff"
                        d="M644.29,553.72a5.06,5.06,0,0,1-5.09,5H573.57a5,5,0,0,1-5.08-5V254.31a5,5,0,0,1,5.08-5H639.2a5.06,5.06,0,0,1,5.09,5Z" />
                </symbol>
                <symbol id="lg-perplexity" viewBox="0 0 24 24">
                    <path fill="#20B8CD"
                        d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z" />
                </symbol>
            </svg>

            {/* ============ NAVIGATION & MOBILE MENU ============ */}
            <AijiniuHeader activeTab="home" />

            {/* ============ HERO ============ */}
            <section className="hero">
                <div className="hero-fx" aria-hidden="true">
                    <span className="hb hb1"></span>
                    <span className="hb hb2"></span>
                    <span className="hb hb3"></span>
                    <canvas id="neural"></canvas>
                </div>
                <div className="container">
                    <span className="eyebrow reveal"><span className="dot"></span>{t('领先产业 AI 服务商')}</span>
                    <h1 className="reveal">{t('大模型算力')}<br /><span className="grad">{t('与 Token 服务')}</span></h1>
                    <p className="lead reveal">{t('深耕 AI+金融、AI+营销 及大模型算力 Token 服务，')}<br />{t('用 AI 驱动业务，从「有 AI」迈向「用好 AI」。')}</p>

                    <div className="pain-row reveal">
                        <span className="pain" aria-label={t('痛点：接入复杂')}>
                            <span className="x" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                                    strokeLinecap="round">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </span>
                            <span className="label">{t('接入复杂')}</span>
                        </span>
                        <span className="pain" aria-label={t('痛点：成本高昂')}>
                            <span className="x" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                                    strokeLinecap="round">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </span>
                            <span className="label">{t('成本高昂')}</span>
                        </span>
                        <span className="pain" aria-label={t('痛点：管理分散')}>
                            <span className="x" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                                    strokeLinecap="round">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </span>
                            <span className="label">{t('管理分散')}</span>
                        </span>
                        <span className="pain" aria-label={t('痛点：费用不透明')}>
                            <span className="x" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                                    strokeLinecap="round">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </span>
                            <span className="label">{t('费用不透明')}</span>
                        </span>
                    </div>

                    <div className="hero-cta reveal">
                        <Link to={loginLink} className="btn btn-primary">{t('立即开启 AI 升级')}<span className="arrow">{t('→')}</span></Link>
                        <a
                            href="#advantage"
                            className="btn btn-ghost"
                            onClick={handleAijiniuSectionClick}
                        >
                            {t('了解核心优势')}
                            <span className="arrow">{t('↓')}</span>
                        </a>
                    </div>

                    {/* 全球模型亮点 */}
                    <div className="spot reveal tilt">
                        <div className="spot-icons">
                            <span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                                </svg>
                            </span>
                            <span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
                                </svg>
                            </span>
                            <span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 7l8-4 8 4-8 4-8-4zM4 13l8 4 8-4M4 17l8 4 8-4" />
                                </svg>
                            </span>
                        </div>
                        <div className="spot-main">
                            <div className="spot-title"><span className="dia">{t('◆')}</span>{t('全球顶级模型 · 本地无缝调用')}</div>
                            <div className="spot-desc" dangerouslySetInnerHTML={{ __html: t('平台集成适用于多种 Vibe Coding、AI Agent等场景的顶级海内外大模型，真正实现「全球 AI，随心调用」。') }} />
                            <div className="spot-tags">
                                <span className="spot-tag">{t('低延迟')}</span>
                                <span className="spot-tag">{t('高可用')}</span>
                                <span className="spot-tag">{t('全兼容')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 数据指标（独立分段 · 背景图） ============ */}
            <section className="stats-band">
                <div className="stats-bg" aria-hidden="true"></div>
                <div className="container">
                    <div className="stats-head reveal">
                        <span className="stats-kicker">{t('BY THE NUMBERS')}</span>
                        <h2>{t('用数据说话的 AI 算力底座')}</h2>
                    </div>
                    <div className="stats">
                        <div className="stat reveal">
                            <div className="num" data-count={pricingStats.modelCount} data-suffix="+">{t('0')}</div>
                            <div className="label">{t('主流大模型')}</div>
                        </div>
                        <div className="stat reveal">
                            <div className="num" data-count={pricingStats.vendorCount} data-suffix="+">{t('0')}</div>
                            <div className="label">{t('AI 厂商接入')}</div>
                        </div>
                        <div className="stat reveal">
                            <div className="num" data-count="6" data-suffix="+">{t('0')}</div>
                            <div className="label">{t('深耕行业')}</div>
                        </div>
                        <div className="stat reveal">
                            <div className="num" data-count="99" data-suffix="%">{t('0')}</div>
                            <div className="label">{t('服务可用性')}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 核心优势 ============ */}
            <section id="advantage" className="section soft">
                <div className="container">
                    <div className="section-head">
                        <span className="eyebrow reveal"><span className="dot"></span>{t('CORE ADVANTAGES')}</span>
                        <h2 className="section-title reveal">{t('三大核心优势')}</h2>
                        <p className="section-sub reveal">{t('从接入、成本到管理，把企业级 AI 基础设施一次做对。')}</p>
                    </div>

                    <div className="adv">
                        <div className="adv-card reveal tilt">
                            <span className="adv-badge"><span className="num-em">{pricingStats.modelCount}+</span>{t('模型')}</span>
                            <div className="adv-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
                                    <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
                                </svg>
                            </div>
                            <h3>{t('统一接入')}</h3>
                            <p>{t('主流大模型一键接入，多模型自由切换，告别繁琐对接与管理。', { count: pricingStats.modelCount })}</p>
                        </div>

                        <div className="adv-card reveal tilt">
                            <span className="adv-badge">{t('大幅降本')}</span>
                            <div className="adv-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 3v18h18" />
                                    <path d="M7 15l4-4 4 4 6-6" />
                                    <path d="M15 9h6v6" />
                                </svg>
                            </div>
                            <h3>{t('成本可控')}</h3>
                            <p>{t('依托集采优势大幅降低单价，按需匹配最优成本模型，效率与性价比更高。')}</p>
                        </div>

                        <div className="adv-card reveal tilt">
                            <span className="adv-badge">{t('一站式管理')}</span>
                            <div className="adv-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7l-9-5z" />
                                    <path d="M9 12l2 2 4-4" />
                                </svg>
                            </div>
                            <h3>{t('统一管理')}</h3>
                            <p>{t('统一管理、智能密钥分发、精准用量分析、透明计费，一站式掌控 AI 资源全生命周期。')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 平台能力矩阵 ============ */}
            <section id="platform" className="section">
                <div className="container">
                    <div className="section-head center">
                        <span className="eyebrow reveal"><span className="dot"></span>{t('PLATFORM ARCHITECTURE')}</span>
                        <h2 className="section-title reveal">{t('一站式 AI 能力矩阵')}</h2>
                        <p className="section-sub reveal">{tBrandIn('从应用场景、智能路由到算力底座，{brand}把全栈 AI 能力收敛为一张清晰的架构图。', { short: true })}</p>
                    </div>

                    <div className="arch-panel reveal">
                        {/* 应用场景 */}
                        <div className="arch-row reveal">
                            <div className="arch-label">{t('应用场景')}<span className="en">{t('SCENARIOS')}</span></div>
                            <div className="arch-cells c4">
                                <div className="scene s1">
                                    <span className="s-en">{t('VIBE CODING')}</span>
                                    <span className="s-title">{t('代码生成')}</span>
                                    <span className="s-ico">
                                        <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
                                            strokeLinejoin="round">
                                            <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="scene s2">
                                    <span className="s-en">{t('CHAT & QA')}</span>
                                    <span className="s-title">{t('智能问答')}</span>
                                    <span className="s-ico">
                                        <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
                                            strokeLinejoin="round">
                                            <path
                                                d="M21 11.5a8.38 8.38 0 01-9 8.3 9 9 0 01-3.8-.8L3 21l1.9-4.4A8.38 8.38 0 014 11.5 8.5 8.5 0 0112.5 3 8.38 8.38 0 0121 11.5z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="scene s3">
                                    <span className="s-en">{t('AI AGENT')}</span>
                                    <span className="s-title">{t('智能体 Agent')}</span>
                                    <span className="s-ico">
                                        <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
                                            strokeLinejoin="round">
                                            <rect x="6" y="8" width="12" height="10" rx="2" />
                                            <path d="M12 8V4M9 13h.01M15 13h.01M9 4h6" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="scene s4">
                                    <span className="s-en">{t('DATA')}</span>
                                    <span className="s-title">{t('数据处理')}</span>
                                    <span className="s-ico">
                                        <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"
                                            strokeLinejoin="round">
                                            <ellipse cx="12" cy="5" rx="8" ry="3" />
                                            <path
                                                d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 模型矩阵 */}
                        <div className="arch-row reveal">
                            <div className="arch-label">{t('模型矩阵')}<span className="en">{t('MODELS')}</span></div>
                            <div className="mm-groups">
                                {showLiveMatrix ? (
                                    <>
                                        <div className="mm-group">
                                            <h5><span>{t('文本生成')}</span></h5>
                                            <div className="mm-logos">
                                                {matrixData.text.length > 0 ? (
                                                    matrixData.text.map((v) => (
                                                        <span key={v.name} className="ml">
                                                            <span className="lico">{renderVendorIcon(v.name, v.icon)}</span>
                                                            <span className="lname">{t(v.name)}</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="mm-placeholder">—</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mm-group">
                                            <h5><span>{t('图片生成')}</span></h5>
                                            <div className="mm-logos">
                                                {matrixData.image.length > 0 ? (
                                                    matrixData.image.map((v) => (
                                                        <span key={v.name} className="ml">
                                                            <span className="lico">{renderVendorIcon(v.name, v.icon)}</span>
                                                            <span className="lname">{t(v.name)}</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="mm-placeholder">—</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mm-group">
                                            <h5><span>{t('代码生成')}</span></h5>
                                            <div className="mm-logos">
                                                {matrixData.code.length > 0 ? (
                                                    matrixData.code.map((v) => (
                                                        <span key={v.name} className="ml">
                                                            <span className="lico">{renderVendorIcon(v.name, v.icon)}</span>
                                                            <span className="lname">{t(v.name)}</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="mm-placeholder">—</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mm-group">
                                            <h5><span>{t('视频生成')}</span></h5>
                                            <div className="mm-logos">
                                                {matrixData.video.length > 0 ? (
                                                    matrixData.video.map((v) => (
                                                        <span key={v.name} className="ml">
                                                            <span className="lico">{renderVendorIcon(v.name, v.icon)}</span>
                                                            <span className="lname">{t(v.name)}</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="mm-placeholder">—</span>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mm-group">
                                            <h5><span>{t('文本生成')}</span></h5>
                                            <div className="mm-logos">
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-deepseek" />
                                                </svg></span><span className="lname">{t('DeepSeek')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-kimi" />
                                                </svg></span><span className="lname">{t('Kimi')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-zhipu" />
                                                </svg></span><span className="lname">{t('智谱 AI')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-qwen" />
                                                </svg></span><span className="lname">{t('通义千问')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-minimax" />
                                                </svg></span><span className="lname">{t('MiniMax')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-doubao" />
                                                </svg></span><span className="lname">{t('豆包')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-grok" />
                                                </svg></span><span className="lname">{t('Grok')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-mimo" />
                                                </svg></span><span className="lname">{t('小米 MiMo')}</span></span>
                                            </div>
                                        </div>
                                        <div className="mm-group">
                                            <h5><span>{t('图片生成')}</span></h5>
                                            <div className="mm-logos">
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-doubao" />
                                                </svg></span><span className="lname">{t('豆包')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-google" />
                                                </svg></span><span className="lname">{t('Google')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-openai" />
                                                </svg></span><span className="lname">{t('OpenAI')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-zhipu" />
                                                </svg></span><span className="lname">{t('智谱 AI')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-mimo" />
                                                </svg></span><span className="lname">{t('小米 MiMo')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-grok" />
                                                </svg></span><span className="lname">{t('Grok')}</span></span>
                                            </div>
                                        </div>
                                        <div className="mm-group">
                                            <h5><span>{t('代码生成')}</span></h5>
                                            <div className="mm-logos">
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-anthropic" />
                                                </svg></span><span className="lname">{t('Anthropic')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-openai" />
                                                </svg></span><span className="lname">{t('OpenAI')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-qwen" />
                                                </svg></span><span className="lname">{t('通义千问')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-deepseek" />
                                                </svg></span><span className="lname">{t('DeepSeek')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-grok" />
                                                </svg></span><span className="lname">{t('Grok')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-mimo" />
                                                </svg></span><span className="lname">{t('小米 MiMo')}</span></span>
                                            </div>
                                        </div>
                                        <div className="mm-group">
                                            <h5><span>{t('视频生成')}</span></h5>
                                            <div className="mm-logos">
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-doubao" />
                                                </svg></span><span className="lname">{t('豆包')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-minimax" />
                                                </svg></span><span className="lname">{t('MiniMax')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-mimo" />
                                                </svg></span><span className="lname">{t('小米 MiMo')}</span></span>
                                                <span className="ml"><span className="lico"><svg>
                                                    <use href="#lg-grok" />
                                                </svg></span><span className="lname">{t('Grok')}</span></span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 算力底座 */}
                        {/* <div className="arch-row reveal">
                            <div className="arch-label">{t('算力底座')}<span className="en">{t('INFRA')}</span></div>
                            <div className="arch-cells c2">
                                <div className="acell base">{displayShortBrandName}<b>{t('算力交易平台')}</b></div>
                                <div className="acell base">{displayShortBrandName}<b>{t('算力调度引擎')}</b></div>
                            </div>
                        </div> */}
                    </div>
                </div>
            </section>

            {/* ============ 模型矩阵 / 厂商 ============ */}
            <section id="models" className="section soft">
                <div className="container">
                    <div className="section-head center">
                        <span className="eyebrow reveal"><span className="dot"></span>{t('GLOBAL AI VENDORS')}</span>
                        <h2 className="section-title reveal">{t('全球主流 AI 厂商')}</h2>
                        <p className="section-sub reveal">{t('接入顶尖模型供应商，覆盖文本、代码、推理、语音等多种能力。')}</p>
                    </div>

                    <div className="vendor-marquee" aria-label={t('全球主流 AI 厂商')}>
                        <VendorMarqueeRow>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-anthropic" />
                                    </svg></span><span className="vname">{t('Anthropic')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-openai" />
                                    </svg></span><span className="vname">{t('OpenAI')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-google" />
                                    </svg></span><span className="vname">{t('Google')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-deepseek" />
                                    </svg></span><span className="vname">{t('DeepSeek')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-perplexity" />
                                    </svg></span><span className="vname">{t('Perplexity')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-doubao" />
                                    </svg></span><span className="vname">{t('豆包')}</span>
                                </div>
                        </VendorMarqueeRow>
                        <VendorMarqueeRow reverse>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-zhipu" />
                                    </svg></span><span className="vname">{t('智谱 AI')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-qwen" />
                                    </svg></span><span className="vname">{t('通义千问')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-kimi" />
                                    </svg></span><span className="vname">{t('Kimi')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-minimax" />
                                    </svg></span><span className="vname">{t('MiniMax')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-grok" />
                                    </svg></span><span className="vname">{t('Grok')}</span>
                                </div>
                                <div className="vm-card">
                                    <span className="vlogo"><svg>
                                        <use href="#lg-mimo" />
                                    </svg></span><span className="vname">{t('小米 MiMo')}</span>
                                </div>
                        </VendorMarqueeRow>
                    </div>
                </div>
            </section>

            {/* ============ 行业应用 ============ */}
            <section id="industry" className="section">
                <div className="container">
                    <div className="section-head center">
                        <span className="eyebrow reveal"><span className="dot"></span>{t('INDUSTRIES')}</span>
                        <h2 className="section-title reveal">{t('全行业适用 · 场景全覆盖')}</h2>
                        <p className="section-sub reveal">{t('助力企业从「有 AI」迈向「用好 AI」，实现业务智能化转型。')}</p>
                    </div>

                    <div className="industries">
                        <div className="industry reveal tilt">
                            <span className="ind-bg" aria-hidden="true">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10l10-7 10 7" />
                                </svg>
                            </span>
                            <span className="ind-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10l10-7 10 7" />
                                </svg>
                            </span>
                            <span className="ind-text">
                                <span className="ind-name">{t('金融')}</span>
                                <span className="ind-tag">{t('智能风控 · 智能投研')}</span>
                            </span>
                        </div>
                        <div className="industry reveal tilt">
                            <span className="ind-bg" aria-hidden="true">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2l-2 5h16l-2-5M4 7v13a1 1 0 001 1h14a1 1 0 001-1V7M9 11a3 3 0 006 0" />
                                </svg>
                            </span>
                            <span className="ind-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2l-2 5h16l-2-5M4 7v13a1 1 0 001 1h14a1 1 0 001-1V7M9 11a3 3 0 006 0" />
                                </svg>
                            </span>
                            <span className="ind-text">
                                <span className="ind-name">{t('消费')}</span>
                                <span className="ind-tag">{t('智能导购 · 内容生成')}</span>
                            </span>
                        </div>
                        <div className="industry reveal tilt">
                            <span className="ind-bg" aria-hidden="true">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="10" r="3" />
                                    <path d="M12 2a8 8 0 00-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 00-8-8z" />
                                </svg>
                            </span>
                            <span className="ind-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="10" r="3" />
                                    <path d="M12 2a8 8 0 00-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 00-8-8z" />
                                </svg>
                            </span>
                            <span className="ind-text">
                                <span className="ind-name">{t('文旅')}</span>
                                <span className="ind-tag">{t('智慧导览 · 行程规划')}</span>
                            </span>
                        </div>
                        <div className="industry reveal tilt">
                            <span className="ind-bg" aria-hidden="true">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 21h18M4 21V8l8-5 8 5v13M9 21v-8h6v8" />
                                </svg>
                            </span>
                            <span className="ind-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 21h18M4 21V8l8-5 8 5v13M9 21v-8h6v8" />
                                </svg>
                            </span>
                            <span className="ind-text">
                                <span className="ind-name">{t('政务')}</span>
                                <span className="ind-tag">{t('政务问答 · 公文辅助')}</span>
                            </span>
                        </div>
                        <div className="industry reveal tilt">
                            <span className="ind-bg" aria-hidden="true">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="20" r="1.5" />
                                    <circle cx="18" cy="20" r="1.5" />
                                    <path d="M2 3h3l3 13h12l2-8H6" />
                                </svg>
                            </span>
                            <span className="ind-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="20" r="1.5" />
                                    <circle cx="18" cy="20" r="1.5" />
                                    <path d="M2 3h3l3 13h12l2-8H6" />
                                </svg>
                            </span>
                            <span className="ind-text">
                                <span className="ind-name">{t('电商')}</span>
                                <span className="ind-tag">{t('智能客服 · 商品文案')}</span>
                            </span>
                        </div>
                        <div className="industry reveal tilt">
                            <span className="ind-bg" aria-hidden="true">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 10L12 5 2 10l10 5 10-5z" />
                                    <path d="M6 12v5a6 4 0 0012 0v-5M22 10v6" />
                                </svg>
                            </span>
                            <span className="ind-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 10L12 5 2 10l10 5 10-5z" />
                                    <path d="M6 12v5a6 4 0 0012 0v-5M22 10v6" />
                                </svg>
                            </span>
                            <span className="ind-text">
                                <span className="ind-name">{t('教培')}</span>
                                <span className="ind-tag">{t('AI 助教 · 个性辅导')}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 企业级管控能力 ============ */}
            <section id="control" className="control-band">
                <div className="control-bg" aria-hidden="true"></div>
                <div className="container">
                    <div className="section-head center">
                        <span className="eyebrow reveal"><span className="dot"></span>{t('ENTERPRISE CONTROL')}</span>
                        <h2 className="section-title reveal">{t('企业级管控能力')}</h2>
                        <p className="section-sub reveal">{t('令牌管理 + 日志监控，精细化管控每一次调用。')}</p>
                    </div>

                    <div className="ctrl-grid">
                        <div className="ctrl-item reveal">
                            <span className="ctrl-icon">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <div className="ctrl-text">
                                <h3>{t('权限隔离')}</h3>
                                <p>{t('不同项目使用独立令牌，边界清晰、互不干扰。')}</p>
                            </div>
                        </div>
                        <div className="ctrl-item reveal">
                            <span className="ctrl-icon">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </span>
                            <div className="ctrl-text">
                                <h3>{t('成本透明')}</h3>
                                <p>{t('调用量与费用可追踪，支持按部门或项目分摊。')}</p>
                            </div>
                        </div>
                        <div className="ctrl-item reveal">
                            <span className="ctrl-icon">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="9" />
                                    <path
                                        d="M12 7v10M14.6 9.3c-.5-.8-1.5-1.3-2.6-1.3-1.5 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2.1-.5-2.6-1.3" />
                                </svg>
                            </span>
                            <div className="ctrl-text">
                                <h3>{t('成本可控')}</h3>
                                <p>{t('按成员设限，防止单用户或单应用过量消耗。')}</p>
                            </div>
                        </div>
                        <div className="ctrl-item reveal">
                            <span className="ctrl-icon">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </span>
                            <div className="ctrl-text">
                                <h3>{t('权限管理')}</h3>
                                <p>{t('结合令牌分组，明确各团队的调用责任边界。')}</p>
                            </div>
                        </div>
                        <div className="ctrl-item reveal">
                            <span className="ctrl-icon">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                                </svg>
                            </span>
                            <div className="ctrl-text">
                                <h3>{t('快速止损')}</h3>
                                <p>{t('密钥泄露或异常调用时，一键禁用即时止损。')}</p>
                            </div>
                        </div>
                        <div className="ctrl-item reveal">
                            <span className="ctrl-icon">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 20V13M12 20V8M19 20V11" />
                                </svg>
                            </span>
                            <div className="ctrl-text">
                                <h3>{t('快速排障')}</h3>
                                <p>{t('异常峰值与错误调用可按时间维度精准定位。')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 4 步完成接入 ============ */}
            <section id="onboarding" className="section soft">
                <div className="container">
                    <div className="section-head center">
                        <span className="eyebrow reveal"><span className="dot"></span>{t('ONBOARDING')}</span>
                        <h2 className="section-title reveal">{t('4 步完成接入')}</h2>
                        <p className="section-sub reveal">{tBrandIn('最快 10 分钟，零改造成本切换到{brand}。', { short: true })}</p>
                    </div>

                    <div className="steps">
                        <div className="step reveal">
                            <div className="step-num">{t('01')}</div>
                            <span className="step-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </span>
                            <h3>{t('咨询沟通')}</h3>
                            <p>{t('明确用量规模与模型需求，匹配最优方案。')}</p>
                        </div>
                        <div className="step reveal">
                            <div className="step-num">{t('02')}</div>
                            <span className="step-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path
                                        d="M21 2l-2 2M11.5 11.5a5 5 0 1 1-7 7 5 5 0 0 1 7-7zm0 0L15 8m0 0l3 3 3.5-3.5L18.5 4.5" />
                                </svg>
                            </span>
                            <h3>{t('开通账号')}</h3>
                            <p>{t('签约后即时开通企业账号，配置令牌与权限。')}</p>
                        </div>
                        <div className="step reveal">
                            <div className="step-num">{t('03')}</div>
                            <span className="step-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                                </svg>
                            </span>
                            <h3>{t('一键接入')}</h3>
                            <p>{t('仅需替换 API Base URL，代码零改造即可调用。')}</p>
                        </div>
                        <div className="step reveal">
                            <div className="step-num">{t('04')}</div>
                            <span className="step-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path
                                        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
                                </svg>
                            </span>
                            <h3>{t('持续服务')}</h3>
                            <p>{t('专属技术支持 + 用量监控 + 账单与开票服务。')}</p>
                        </div>
                    </div>

                    <div className="steps-note reveal">
                        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>{t('兼容 OpenAI SDK，已有代码无需任何修改')}</div>
                </div>
            </section>

            {/* ============ CTA ============ */}
            <section id="contact" className="section">
                <div className="container">
                    <div className="cta-banner reveal">
                        <div className="cta-inner">
                            <span className="cta-tag">{t('✦&nbsp;&nbsp;READY TO UPGRADE')}</span>
                            <h2>{t('立即开启您的')}<span className="hl">{t('AI 升级')}</span>{t('之旅')}</h2>
                            <div className="cta-feats"><span>{t('稳定')}</span><span>{t('高效')}</span><span>{t('低成本')}</span></div>
                            <div className="cta-actions">
                                <Link to={loginLink} className="btn btn-white">{t('进入控制台')}<span className="arrow">{t('→')}</span></Link>
                            </div>
                            <div className="cta-partner">{tBrandPhrase('值得信赖的产业 AI 合作伙伴')}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 备案信息 ============ */}
            <AijiniuFooter />



        </div>
    )
}
