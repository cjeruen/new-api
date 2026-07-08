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
import { useTranslation } from 'react-i18next'

import { normalizeInterfaceLanguage } from '@/i18n/languages'
import { useSystemConfig } from '@/hooks/use-system-config'
import { DEFAULT_SYSTEM_NAME } from '@/lib/constants'

const HAN_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/

function toChineseShortName(name: string): string {
  return (
    name
      .replace(/\s*AI\s*算力平台$/i, '')
      .replace(/科技$/, '')
      .trim() || name
  )
}

function resolveBrandName(raw: string, lang: 'zh' | 'en'): string {
  const name = raw.trim()
  if (!name) return DEFAULT_SYSTEM_NAME
  if (lang === 'zh') return name
  if (!HAN_RE.test(name)) return name
  return name
}

function resolveShortBrandName(raw: string, lang: 'zh' | 'en'): string {
  const name = raw.trim() || DEFAULT_SYSTEM_NAME
  const shortZh = toChineseShortName(name)
  if (lang === 'zh') return shortZh
  if (!HAN_RE.test(name)) return name.split(/\s+/)[0] || name
  return shortZh || name
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  zh: {
    // 通用 / 导航 / 底部
    "登录": "登录",
    "进入控制台": "进入控制台",
    "进入控制台 →": "进入控制台 →",
    "模型广场": "模型广场",

    // Header 导航菜单（英文 key）
    "Core Advantages": "核心优势",
    "Industry Applications": "行业应用",
    "Onboarding Process": "接入流程",
    "Open menu": "打开菜单",
    "Close menu": "关闭菜单",
    "Model Square": "模型广场",

    // HERO SECTION
    "领先产业 AI 服务商": "领先产业 AI 服务商",
    "大模型算力": "大模型算力",
    "与 Token 服务": "与 Token 服务",
    "深耕 AI+金融、AI+营销 及大模型算力 Token 服务，": "深耕 AI+金融、AI+营销 及大模型算力 Token 服务，",
    "用 AI 驱动业务，从「有 AI」迈向「用好 AI」。": "用 AI 驱动业务，从「有 AI」迈向「用好 AI」。",
    "接入复杂": "接入复杂",
    "成本高昂": "成本高昂",
    "管理分散": "管理分散",
    "费用不透明": "费用不透明",
    "痛点：接入复杂": "痛点：接入复杂",
    "痛点：成本高昂": "痛点：成本高昂",
    "痛点：管理分散": "痛点：管理分散",
    "痛点：费用不透明": "痛点：费用不透明",
    "立即开启 AI 升级": "立即开启 AI 升级",
    "了解核心优势": "了解核心优势",
    "全球顶级模型 · 本地无缝调用": "全球顶级模型 · 本地无缝调用",
    "平台集成适用于多种 Vibe Coding、AI Agent等场景的顶级海内外大模型，真正实现「全球 AI，随心调用」。": "平台集成适用于 <span class=\"hl\">多种 Vibe Coding、AI Agent</span> 等场景的顶级海内外大模型，真正实现「<span class=\"hl\">全球 AI，随心调用</span>」。",
    "低延迟": "低延迟",
    "高可用": "高可用",
    "全兼容": "全兼容",

    // 数据指标
    "用数据说话的 AI 算力底座": "用数据说话的 AI 算力底座",
    "主流大模型": "主流大模型",
    "AI 厂商接入": "AI 厂商接入",
    "深耕行业": "深耕行业",
    "服务可用性": "服务可用性",

    // 核心优势
    "三大核心优势": "三大核心优势",
    "从接入、成本到管理，把企业级 AI 基础设施一次做对。": "从接入、成本到管理，把企业级 AI 基础设施一次做对。",
    "模型": "模型",
    "大幅降本": "大幅降本",
    "一站式管理": "一站式管理",
    "统一接入": "统一接入",
    "主流大模型一键接入，多模型自由切换，告别繁琐对接与管理。": "{count}+ 主流大模型一键接入，多模型自由切换，告别繁琐对接与管理。",
    "成本可控": "成本可控",
    "依托集采优势大幅降低单价，按需匹配最优成本模型，效率与性价比更高。": "依托集采优势大幅降低单价，按需匹配最优成本模型，效率与性价比更高。",
    "统一管理": "统一管理",
    "统一管理、智能密钥分发、精准用量分析、透明计费，一站式掌控 AI 资源全生命周期。": "统一管理、智能密钥分发、精准用量分析、透明计费，一站式掌控 AI 资源全生命周期。",

    // 能力矩阵
    "一站式 AI 能力矩阵": "一站式 AI 能力矩阵",
    "从应用场景、智能路由到算力底座，{brand}把全栈 AI 能力收敛为一张清晰的架构图。": "从应用场景、智能路由到算力底座，{brand}把全栈 AI 能力收敛为一张清晰的架构图。",
    "应用场景": "应用场景",
    "模型矩阵": "模型矩阵",
    "算力底座": "算力底座",
    "代码生成": "代码生成",
    "智能问答": "智能问答",
    "智能体 Agent": "智能体 Agent",
    "数据处理": "数据处理",
    "文本生成": "文本生成",
    "图片生成": "图片生成",
    "视频生成": "视频生成",
    "智谱 AI": "智谱 AI",
    "通义千问": "通义千问",
    "豆包": "豆包",
    "小米 MiMo": "小米 MiMo",
    "算力交易平台": "算力交易平台",
    "算力调度引擎": "算力调度引擎",

    // 厂商 / 行业
    "全球主流 AI 厂商": "全球主流 AI 厂商",
    "接入顶尖模型供应商，覆盖文本、代码、推理、语音等多种能力。": "接入顶尖模型供应商，覆盖文本、代码、推理、语音等多种能力。",
    "全行业适用 · 场景全覆盖": "全行业适用 · 场景全覆盖",
    "助力企业从「有 AI」迈向「用好 AI」，实现业务智能化转型。": "助力企业从「有 AI」迈向「用好 AI」，实现业务智能化转型。",
    "金融": "金融",
    "智能风控 · 智能投研": "智能风控 · 智能投研",
    "消费": "消费",
    "智能导购 · 内容生成": "智能导购 · 内容生成",
    "文旅": "文旅",
    "智慧导览 · 行程规划": "智慧导览 · 行程规划",
    "政务": "政务",
    "政务问答 · 公文辅助": "政务问答 · 公文辅助",
    "电商": "电商",
    "智能客服 · 商品文案": "智能客服 · 商品文案",
    "教培": "教培",
    "AI 助教 · 个性辅导": "AI 助教 · 个性辅导",

    // 企业级管控
    "企业级管控能力": "企业级管控能力",
    "令牌管理 + 日志监控，精细化管控每一次调用。": "令牌管理 + 日志监控，精细化管控每一次调用。",
    "权限隔离": "权限隔离",
    "不同项目使用独立令牌，边界清晰、互不干扰。": "不同项目使用独立令牌，边界清晰、互不干扰。",
    "成本透明": "成本透明",
    "调用量与费用可追踪，支持按部门或项目分摊。": "调用量与费用可追踪，支持按部门或项目分摊。",
    "按成员设限，防止单用户或单应用过量消耗。": "按成员设限，防止单用户或单应用过量消耗。",
    "权限管理": "权限管理",
    "结合令牌分组，明确各团队的调用责任边界。": "结合令牌分组，明确各团队的调用责任边界。",
    "快速止损": "快速止损",
    "密钥泄露或异常调用时，一键禁用即时止损。": "密钥泄露或异常调用时，一键禁用即时止损。",
    "快速排障": "快速排障",
    "异常峰值与错误调用可按时间维度精准定位。": "异常峰值与错误调用可按时间维度精准定位。",

    // 接入流程
    "4 步完成接入": "4 步完成接入",
    "最快 10 分钟，零改造成本切换到{brand}。": "最快 10 分钟，零改造成本切换到{brand}。",
    "咨询沟通": "咨询沟通",
    "明确用量规模与模型需求，匹配最优方案。": "明确用量规模与模型需求，匹配最优方案。",
    "开通账号": "开通账号",
    "签约后即时开通企业账号，配置令牌与权限。": "签约后即时开通企业账号，配置令牌与权限。",
    "一键接入": "一键接入",
    "仅需替换 API Base URL，代码零改造即可调用。": "仅需替换 API Base URL，代码零改造即可调用。",
    "持续服务": "持续服务",
    "专属技术支持 + 用量监控 + 账单与开票服务。": "专属技术支持 + 用量监控 + 账单与开票服务。",
    "兼容 OpenAI SDK，已有代码无需任何修改": "兼容 OpenAI SDK，已有代码无需任何修改",

    // CTA / 页脚
    "立即开启您的": "立即开启您的",
    "AI 升级": "AI 升级",
    "之旅": "之旅",
    "稳定": "稳定",
    "高效": "高效",
    "低成本": "低成本",
    "值得信赖的产业 AI 合作伙伴": "值得信赖的产业 AI 合作伙伴",

    // 模型广场特定
    "一处接入全球 AI": "一处接入全球 AI",
    "主流大模型一处接入、自由切换，按 Token 透明计费，覆盖文本、推理、代码、图片与视频等多种能力。": "{count}+ 主流大模型一处接入、自由切换，按 Token 透明计费，覆盖文本、推理、代码、图片与视频等多种能力。",
    "搜索模型 / 厂商，如 DeepSeek、Claude…": "搜索模型 / 厂商，如 DeepSeek、Claude…",
    "推理": "推理",
    "代码": "代码",
    "图片": "图片",
    "视频": "视频",
    "文本": "文本",
    "编码": "编码",
    "多模态": "多模态",
    "输入": "输入",
    "输出": "输出",
    "计费": "计费",
    "方式": "方式",
    "按次": "按次",
    "固定价": "固定价",
    "立即调用": "立即调用",
    "没有匹配的模型，换个关键词试试～": "没有匹配的模型，换个关键词试试～",
    "支持": "支持",
    "能力，": "能力，",
    "按次计费，单次调用价格固定、成本可预估。": "按次计费，单次调用价格固定、成本可预估。",
    "按 Token 透明计费，用多少付多少。": "按 Token 透明计费，用多少付多少。",
    "* 价格为当前分组实时报价，最终以控制台实际计费为准。更多模型持续接入中。": "* 价格为当前分组实时报价，最终以控制台实际计费为准。更多模型持续接入中。",

    // 模型广场补充
    "/百万tokens": "/百万tokens",
    "上下文": "上下文",
    "AI 厂商": "AI 厂商",
    "搜索模型": "搜索模型",
    "货币": "货币",
    "Loading...": "加载中...",
    "、": "、",
    "平台优选": "平台优选",

    // Category Tabs
    "All": "全部",
    "Text Generation": "文本生成",
    "Reasoning": "深度推理",
    "Code": "代码",
    "Image": "图片",
    "Video": "视频"
  },
  en: {
    // 通用 / 导航 / 底部
    "登录": "Sign In",
    "进入控制台": "Enter Console",
    "进入控制台 →": "Console →",
    "模型广场": "Model Plaza",

    // Header 导航菜单（英文 key）
    "Core Advantages": "Core Advantages",
    "Industry Applications": "Industries",
    "Onboarding Process": "Onboarding",
    "Open menu": "Open menu",
    "Close menu": "Close menu",
    "Model Square": "Model Plaza",

    // HERO SECTION
    "领先产业 AI 服务商": "A leading industrial AI service provider",
    "大模型算力": "LLM Compute Power",
    "与 Token 服务": "& Token Services",
    "深耕 AI+金融、AI+营销 及大模型算力 Token 服务，": "Focused on AI+Finance, AI+Marketing and LLM compute & Token services —",
    "用 AI 驱动业务，从「有 AI」迈向「用好 AI」。": "drive business with AI, from “having AI” to “using AI well”.",
    "接入复杂": "Complex integration",
    "成本高昂": "High cost",
    "管理分散": "Fragmented management",
    "费用不透明": "Opaque billing",
    "痛点：接入复杂": "Pain point: complex integration",
    "痛点：成本高昂": "Pain point: high cost",
    "痛点：管理分散": "Pain point: fragmented management",
    "痛点：费用不透明": "Pain point: opaque billing",
    "立即开启 AI 升级": "Start Your AI Upgrade",
    "了解核心优势": "Explore Advantages",
    "全球顶级模型 · 本地无缝调用": "World-class models · seamless local access",
    "平台集成适用于多种 Vibe Coding、AI Agent等场景的顶级海内外大模型，真正实现「全球 AI，随心调用」。": "The platform integrates top global models for scenarios like <span class=\"hl\">Vibe Coding and AI Agents</span>, truly delivering “<span class=\"hl\">Global AI, on demand</span>”.",
    "低延迟": "Low latency",
    "高可用": "High availability",
    "全兼容": "Full compatibility",

    // 数据指标
    "用数据说话的 AI 算力底座": "An AI compute foundation backed by numbers",
    "主流大模型": "Mainstream LLMs",
    "AI 厂商接入": "AI vendors integrated",
    "深耕行业": "Industries served",
    "服务可用性": "Service uptime",

    // 核心优势
    "三大核心优势": "Three Core Advantages",
    "从接入、成本到管理，把企业级 AI 基础设施一次做对。": "From integration and cost to management — get enterprise AI infrastructure right the first time.",
    "模型": "Models",
    "大幅降本": "Major cost savings",
    "一站式管理": "One-stop management",
    "统一接入": "Unified Integration",
    "主流大模型一键接入，多模型自由切换，告别繁琐对接与管理。": "Integrate {count}+ mainstream LLMs in one click, switch freely between models, and leave tedious integration behind.",
    "成本可控": "Controllable Cost",
    "依托集采优势大幅降低单价，按需匹配最优成本模型，效率与性价比更高。": "Leverage bulk procurement to cut unit prices and match the most cost-effective model on demand — higher efficiency and value.",
    "统一管理": "Unified Management",
    "统一管理、智能密钥分发、精准用量分析、透明计费，一站式掌控 AI 资源全生命周期。": "Unified management, smart key distribution, precise usage analytics and transparent billing — control the full AI resource lifecycle in one place.",

    // 能力矩阵
    "一站式 AI 能力矩阵": "One-Stop AI Capability Matrix",
    "从应用场景、智能路由到算力底座，{brand}把全栈 AI 能力收敛为一张清晰的架构图。": "From scenarios and smart routing to the compute foundation, {brand} distills full-stack AI capabilities into one clear architecture.",
    "应用场景": "Scenarios",
    "模型矩阵": "Model Matrix",
    "算力底座": "Compute Base",
    "代码生成": "Code Generation",
    "智能问答": "Smart Q&A",
    "智能体 Agent": "AI Agent",
    "数据处理": "Data Processing",
    "文本生成": "Text Generation",
    "图片生成": "Image Generation",
    "视频生成": "Video Generation",
    "智谱 AI": "Zhipu AI",
    "通义千问": "Tongyi Qianwen",
    "豆包": "Doubao",
    "小米 MiMo": "Xiaomi MiMo",
    "算力交易平台": "Compute Trading Platform",
    "算力调度引擎": "Compute Scheduling Engine",

    // 厂商 / 行业
    "全球主流 AI 厂商": "Global Mainstream AI Vendors",
    "接入顶尖模型供应商，覆盖文本、代码、推理、语音等多种能力。": "Integrate top model providers, covering text, code, reasoning, speech and more.",
    "全行业适用 · 场景全覆盖": "Fits Every Industry · Full Scenario Coverage",
    "助力企业从「有 AI」迈向「用好 AI」，实现业务智能化转型。": "Help enterprises move from “having AI” to “using AI well” and achieve intelligent transformation.",
    "金融": "Finance",
    "智能风控 · 智能投研": "Smart risk control · smart research",
    "消费": "Consumer",
    "智能导购 · 内容生成": "Smart shopping guide · content generation",
    "文旅": "Culture & Tourism",
    "智慧导览 · 行程规划": "Smart guiding · itinerary planning",
    "政务": "Government",
    "政务问答 · 公文辅助": "Gov Q&A · document drafting",
    "电商": "E-commerce",
    "智能客服 · 商品文案": "Smart support · product copy",
    "教培": "Education",
    "AI 助教 · 个性辅导": "AI teaching assistant · personalized tutoring",

    // 企业级管控
    "企业级管控能力": "Enterprise-Grade Governance",
    "令牌管理 + 日志监控，精细化管控每一次调用。": "Token management + log monitoring for fine-grained control over every call.",
    "权限隔离": "Permission Isolation",
    "不同项目使用独立令牌，边界清晰、互不干扰。": "Separate tokens per project — clear boundaries, no interference.",
    "成本透明": "Cost Transparency",
    "调用量与费用可追踪，支持按部门或项目分摊。": "Track usage and cost, and allocate by department or project.",
    "按成员设限，防止单用户或单应用过量消耗。": "Set per-member limits to prevent any single user or app from overspending.",
    "权限管理": "Access Management",
    "结合令牌分组，明确各团队的调用责任边界。": "Combine token groups to clarify each team’s usage responsibilities.",
    "快速止损": "Fast Containment",
    "密钥泄露或异常调用时，一键禁用即时止损。": "On key leaks or abnormal calls, disable instantly to stop losses.",
    "快速排障": "Fast Troubleshooting",
    "异常峰值与错误调用可按时间维度精准定位。": "Pinpoint abnormal spikes and failed calls along the time axis.",

    // 接入流程
    "4 步完成接入": "Onboard in 4 Steps",
    "最快 10 分钟，零改造成本切换到{brand}。": "In as little as 10 minutes — switch to {brand} with zero refactoring.",
    "咨询沟通": "Consultation",
    "明确用量规模与模型需求，匹配最优方案。": "Clarify usage scale and model needs to match the best plan.",
    "开通账号": "Account Setup",
    "签约后即时开通企业账号，配置令牌与权限。": "Activate your enterprise account on signing, then configure tokens and permissions.",
    "一键接入": "One-Click Integration",
    "仅需替换 API Base URL，代码零改造即可调用。": "Just swap the API Base URL — call with zero code changes.",
    "持续服务": "Ongoing Support",
    "专属技术支持 + 用量监控 + 账单与开票服务。": "Dedicated support + usage monitoring + billing and invoicing.",
    "兼容 OpenAI SDK，已有代码无需任何修改": "Compatible with the OpenAI SDK — no changes to existing code.",

    // CTA / 页脚
    "立即开启您的": "Start Your",
    "AI 升级": "AI Upgrade",
    "之旅": "Journey",
    "稳定": "Stable",
    "高效": "Efficient",
    "低成本": "Low cost",
    "值得信赖的产业 AI 合作伙伴": "your trusted industrial AI partner",

    // 模型广场特定
    "一处接入全球 AI": "Access Global AI in One Place",
    "主流大模型一处接入、自由切换，按 Token 透明计费，覆盖文本、推理、代码、图片与视频等多种能力。": "Integrate and switch freely across {count}+ mainstream LLMs in one place, with transparent per-Token billing across text, reasoning, code, image and video.",
    "搜索模型 / 厂商，如 DeepSeek、Claude…": "Search models / vendors, e.g. DeepSeek, Claude…",
    "推理": "Reasoning",
    "代码": "Code",
    "图片": "Image",
    "视频": "Video",
    "文本": "Text",
    "编码": "Coding",
    "多模态": "Multimodal",
    "输入": "Input",
    "输出": "Output",
    "计费": "Billing",
    "方式": "Mode",
    "按次": "Per call",
    "固定价": "fixed",
    "立即调用": "Use Now",
    "没有匹配的模型，换个关键词试试～": "No matching models — try another keyword.",
    "支持": "Supports ",
    "能力，": " capabilities. ",
    "按次计费，单次调用价格固定、成本可预估。": "Billed per call with a fixed, predictable price.",
    "按 Token 透明计费，用多少付多少。": "Transparent per-Token billing — pay only for what you use.",
    "* 价格为当前分组实时报价，最终以控制台实际计费为准。更多模型持续接入中。": "* Prices are live quotes for your current group; final billing follows the console. More models coming.",

    // 模型广场补充
    "/百万tokens": "/M tokens",
    "上下文": "Context",
    "AI 厂商": "AI Vendors",
    "搜索模型": "Search models",
    "货币": "Currency",
    "Loading...": "Loading...",
    "、": ", ",
    "平台优选": "Platform Pick",

    // Category Tabs
    "All": "All",
    "Text Generation": "Text",
    "Reasoning": "Reasoning",
    "Code": "Code",
    "Image": "Image",
    "Video": "Video"
  }
}

export function useAijiniuTranslation() {
  const { i18n } = useTranslation()
  const { systemName, logo, footerHtml } = useSystemConfig()
  const currentLanguage = normalizeInterfaceLanguage(i18n.language)
  const isZh = currentLanguage === 'zhCN' || currentLanguage === 'zhTW'
  const lang = isZh ? 'zh' : 'en'
  const brandName = systemName?.trim() || ''
  const displayBrandName = resolveBrandName(brandName, lang)
  const displayShortBrandName = resolveShortBrandName(brandName, lang)

  const lookup = (key: string): string =>
    TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['zh']?.[key] ?? key

  const applyVars = (
    text: string,
    vars?: Record<string, string | number>
  ): string => {
    if (!vars) return text
    return Object.entries(vars).reduce(
      (acc, [name, value]) =>
        acc.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
      text
    )
  }

  const t = (
    key: string,
    vars?: Record<string, string | number>
  ): string => applyVars(lookup(key), vars)

  /** 品牌名（后台） · 标语（独立翻译） */
  const tBrandPhrase = (taglineKey: string, separator = ' · ') =>
    `${displayBrandName}${separator}${lookup(taglineKey)}`

  /** 句内嵌入品牌：模板用 {brand} 占位，short 时用简称 */
  const tBrandIn = (templateKey: string, opts?: { short?: boolean }) => {
    const brand = opts?.short ? displayShortBrandName : displayBrandName
    return lookup(templateKey).replace(/\{brand\}/g, brand)
  }

  return {
    t,
    tBrandPhrase,
    tBrandIn,
    lang,
    isZh,
    i18n,
    systemName: brandName,
    displayBrandName,
    displayShortBrandName,
    logo,
    footerHtml,
  }
}
