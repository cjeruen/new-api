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
import { useAijiniuTranslation } from './locales'

export function AijiniuFooter() {
  const { footerHtml, displayBrandName } = useAijiniuTranslation()
  const footerContent = footerHtml?.trim()

  if (!footerContent) {
    const name = displayBrandName
    return (
      <footer className="site-beian">
        <div className="container">
          <div className="bn-copy">
            © {new Date().getFullYear()} {name}. All rights reserved
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="site-beian">
      <div className="container">
        <div
          className="aijiniu-footer-html"
          dangerouslySetInnerHTML={{ __html: footerContent }}
        />
      </div>
    </footer>
  )
}