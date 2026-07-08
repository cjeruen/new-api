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
import { QUOTA_TYPE_VALUES, TOKEN_UNIT_DIVISORS } from '@/features/pricing/constants'
import type { PriceType, PricingModel, TokenUnit } from '@/features/pricing/types'

export type AijiniuPriceCurrency = 'usd' | 'cny'
type ForcedBillingCurrency = 'USD' | 'CNY'

function removeTrailingDecimalZeros(value: string): string {
  if (!value.includes('.')) return value
  return value.replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '')
}

function formatForcedBillingCurrency(
  amountUSD: number | null | undefined,
  currency: ForcedBillingCurrency,
  usdExchangeRate: number,
  options?: { digitsLarge?: number; digitsSmall?: number }
): string {
  if (amountUSD == null || Number.isNaN(amountUSD)) return '-'

  const digitsLarge = options?.digitsLarge ?? 4
  const digitsSmall = options?.digitsSmall ?? 6
  const converted =
    currency === 'CNY' ? amountUSD * usdExchangeRate : amountUSD
  const abs = Math.abs(converted)
  const digits = abs >= 1 ? digitsLarge : digitsSmall
  const formatted = removeTrailingDecimalZeros(converted.toFixed(digits))

  return currency === 'CNY' ? `¥${formatted}` : `$${formatted}`
}

function getMinGroupRatio(
  enableGroups: string[],
  groupRatio: Record<string, number>
): number {
  if (enableGroups.length === 0) return 1

  let minRatio = Number.POSITIVE_INFINITY

  for (const group of enableGroups) {
    const ratio = groupRatio[group]
    if (ratio !== undefined && ratio < minRatio) {
      minRatio = ratio
    }
  }

  return minRatio === Number.POSITIVE_INFINITY ? 1 : minRatio
}

function calculateTokenPrice(
  model: PricingModel,
  type: PriceType,
  ratio: number
): number {
  const base = model.model_ratio * 2 * ratio

  switch (type) {
    case 'input':
      return base
    case 'output':
      return base * model.completion_ratio
    default:
      return NaN
  }
}

function toForcedCurrency(currency: AijiniuPriceCurrency): ForcedBillingCurrency {
  return currency === 'cny' ? 'CNY' : 'USD'
}

function formatPriceInCurrency(
  model: PricingModel,
  type: PriceType,
  tokenUnit: TokenUnit,
  currency: ForcedBillingCurrency,
  usdExchangeRate: number
): string {
  if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) {
    return '-'
  }

  const enableGroups = Array.isArray(model.enable_groups)
    ? model.enable_groups
    : []
  const groupRatio = model.group_ratio || {}
  const minRatio = getMinGroupRatio(enableGroups, groupRatio)
  const priceInUSD = calculateTokenPrice(model, type, minRatio)
  const price = priceInUSD / TOKEN_UNIT_DIVISORS[tokenUnit]

  return formatForcedBillingCurrency(price, currency, usdExchangeRate, {
    digitsLarge: 4,
    digitsSmall: 6,
  })
}

function formatRequestPriceInCurrency(
  model: PricingModel,
  currency: ForcedBillingCurrency,
  usdExchangeRate: number
): string {
  if (model.quota_type !== QUOTA_TYPE_VALUES.REQUEST) {
    return '-'
  }

  const enableGroups = Array.isArray(model.enable_groups)
    ? model.enable_groups
    : []
  const groupRatio = model.group_ratio || {}
  const minRatio = getMinGroupRatio(enableGroups, groupRatio)
  const priceInUSD = (model.model_price || 0) * minRatio

  return formatForcedBillingCurrency(priceInUSD, currency, usdExchangeRate, {
    digitsLarge: 4,
    digitsSmall: 4,
  })
}

export function formatStaticCnyAmount(
  amountCny: number,
  currency: AijiniuPriceCurrency,
  usdExchangeRate: number
): string {
  if (currency === 'cny') {
    const abs = Math.abs(amountCny)
    const digits = abs >= 1 ? 2 : 4
    let numStr = amountCny.toFixed(digits)
    if (numStr.includes('.')) {
      numStr = numStr.replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '')
    }
    return `¥${numStr}`
  }

  return formatForcedBillingCurrency(
    amountCny / usdExchangeRate,
    'USD',
    1,
    { digitsLarge: 4, digitsSmall: 4 }
  )
}

export function getAijiniuModelDisplayPrices(
  model: {
    kind: 'db' | 'static'
    pricingModel?: PricingModel
    quota_type: number
    input_cny?: number
    output_cny?: number
    price_cny?: number
  },
  currency: AijiniuPriceCurrency,
  usdExchangeRate: number
) {
  const forced = toForcedCurrency(currency)

  if (model.kind === 'db' && model.pricingModel) {
    const pricingModel = model.pricingModel
    if (pricingModel.quota_type === 1) {
      return {
        price_val: formatRequestPriceInCurrency(
          pricingModel,
          forced,
          usdExchangeRate
        ),
        input_price: '',
        output_price: '',
      }
    }

    return {
      input_price: formatPriceInCurrency(
        pricingModel,
        'input',
        'M',
        forced,
        usdExchangeRate
      ),
      output_price: formatPriceInCurrency(
        pricingModel,
        'output',
        'M',
        forced,
        usdExchangeRate
      ),
      price_val: '',
    }
  }

  if (model.quota_type === 1) {
    return {
      price_val: formatStaticCnyAmount(
        model.price_cny ?? 0,
        currency,
        usdExchangeRate
      ),
      input_price: '',
      output_price: '',
    }
  }

  return {
    input_price: formatStaticCnyAmount(
      model.input_cny ?? 0,
      currency,
      usdExchangeRate
    ),
    output_price: formatStaticCnyAmount(
      model.output_cny ?? 0,
      currency,
      usdExchangeRate
    ),
    price_val: '',
  }
}