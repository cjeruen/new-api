import React from 'react'
import { AijiniuHome } from './aijiniu'

export interface HomeTheme {
  value: string
  labelKey: string // Translation key
  component?: React.ComponentType
}

export const HOME_THEMES: HomeTheme[] = [
  {
    value: 'default',
    labelKey: 'Default Theme',
  },
  {
    value: 'aijiniu',
    labelKey: 'Aijiniu Theme',
    component: AijiniuHome,
  },
]
