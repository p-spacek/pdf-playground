/**
 * Generates a PDF HTML template with form data.
 * NOTE: index.html (playground) inlines a copy of this function — update it when changing this file.
 * @param {{
 *   title: string,
 *   description?: string,
 *   submittedAt?: string,
 *   sections: Array<{
 *     title: string,
 *     children: Array<FieldDescriptor | Section>
 *   }>,
 *   files?: Array<{ fileName: string, createdAt?: string, fieldName?: string, localPath?: string, thumbnail?: string }>
 * }} data - FieldDescriptor may include `maxColumns` (number) on array fields to control table-vs-card threshold (default 6)
 * @returns {string} HTML string for PDF generation
 */
export function create(data) {
  const rawFiles = data?.files
  const files = Array.isArray(rawFiles) ? rawFiles : rawFiles ? [rawFiles] : []

  // ── File helpers ──

  const isImage = (fileName) => {
    if (!fileName) return false
    const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0]
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext || '')
  }

  const getMimeType = (fileName) => {
    if (!fileName) return 'image/png'
    const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0]
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }

  // Group files by fieldName for display in fields
  const filesByFieldName = {}
  files.forEach((file) => {
    if (file.fieldName) {
      if (!filesByFieldName[file.fieldName]) {
        filesByFieldName[file.fieldName] = []
      }
      filesByFieldName[file.fieldName].push(file)
    }
  })

  // ── Per-type value renderers ──

  function renderTextValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    return String(field.value)
  }

  function renderCheckboxValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    return field.value ? 'Yes' : 'No'
  }

  function renderRatingValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    const val = Number(field.value)
    const max = Number(field.maximum) || 5
    if (isNaN(val)) return String(field.value)
    const filled = Math.min(Math.max(Math.round(val), 0), max)
    const empty = max - filled
    return `<span class="rating-stars">${'\u2605'.repeat(filled)}${'\u2606'.repeat(empty)}</span>`
  }

  function renderSliderValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    if (field.maximum != null) {
      return `${field.value} / ${field.maximum}`
    }
    return String(field.value)
  }

  function renderDropdownValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    if (field.displayValue != null && field.displayValue !== '') {
      return String(field.displayValue)
    }
    if (Array.isArray(field.value)) {
      return field.value.map(String).join(', ')
    }
    return String(field.value)
  }

  function renderChoiceValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    if (Array.isArray(field.options) && field.options.length > 0) {
      const match = field.options.find((opt) => String(opt.value) === String(field.value))
      if (match) return String(match.label)
    }
    return String(field.value)
  }

  function renderDateValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    return formatDateValue(field.value, field.mode)
  }

  /**
   * Formats a date/time/datetime value into a human-readable string.
   */
  function formatDateValue(value, mode) {
    const d = new Date(String(value))
    if (isNaN(d.getTime())) return String(value)

    const dateOpts = { year: 'numeric', month: 'short', day: 'numeric' }
    const timeOpts = { hour: 'numeric', minute: '2-digit' }

    if (mode === 'time') return d.toLocaleTimeString('en-US', timeOpts)
    if (mode === 'datetime') return d.toLocaleString('en-US', { ...dateOpts, ...timeOpts })
    return d.toLocaleDateString('en-US', dateOpts)
  }

  /**
   * Formats seconds into "Xh Ym" string.
   */
  function formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const parts = []
    if (h > 0) parts.push(`${h}h`)
    if (m > 0) parts.push(`${m}m`)
    return parts.length > 0 ? parts.join(' ') : '0m'
  }

  function renderDurationValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    const totalSeconds = Number(field.value)
    if (isNaN(totalSeconds)) return String(field.value)
    return formatDuration(totalSeconds)
  }

  function renderLocationValue(field) {
    if (field.value === null || field.value === undefined) return '<span class="null">None</span>'
    return String(field.value)
  }

  /**
   * Renders an array field as a table or row-based cards.
   * Uses field.maxColumns (default 6) as the threshold: table if columns <= maxColumns, cards otherwise.
   */
  function renderArrayValue(field) {
    if (!Array.isArray(field.value) || field.value.length === 0) {
      return '<span class="null">None</span>'
    }

    const subFields = Array.isArray(field.fields) ? field.fields : []
    if (subFields.length === 0) {
      return '<span class="null">None</span>'
    }

    const maxCols = field.maxColumns ?? 6

    if (subFields.length <= maxCols) {
      const headers = subFields.map((sf) => `<th>${sf.label || sf.name}</th>`).join('')
      const rows = field.value
        .map((item) => {
          const cells = subFields
            .map((sf) => {
              const cellField = buildCellField(item[sf.name], sf, item)
              return `<td>${renderFieldValue(cellField)}</td>`
            })
            .join('')
          return `<tr>${cells}</tr>`
        })
        .join('')
      return `<table class="array-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
    }

    // Wide arrays: render each item as a card with label/value rows
    return field.value
      .map((item, index) => {
        const title = item.item_title || `#${index + 1}`
        const rows = subFields
          .map((sf) => {
            const cellField = buildCellField(item[sf.name], sf, item)
            const label = sf.label || sf.name
            return `<div class="array-card-row"><span class="array-card-label">${label}</span><span class="array-card-value">${renderFieldValue(cellField)}</span></div>`
          })
          .join('')
        return `<div class="array-card"><div class="array-card-title">${title}</div>${rows}</div>`
      })
      .join('')
  }

  /**
   * Builds a virtual field descriptor from an array item's cell for renderFieldValue reuse.
   * Dropdown labels in array items are stored as item[fieldName_label].
   */
  function buildCellField(cellValue, subField, item) {
    const field = { ...subField, value: cellValue }
    // Array items store dropdown labels as fieldName_label on the item
    if (subField.type === 'dropdown') {
      const labelKey = subField.name + '_label'
      field.displayValue = item[labelKey] ?? null
    }
    return field
  }

  // ── Dispatcher ──

  /**
   * Renders a field value by checking file-based fields first, then dispatching by type.
   */
  function renderFieldValue(field) {
    // Check for file-based fields (avatar, media, signature)
    const fieldFiles = filesByFieldName[field.name]
    if (fieldFiles && fieldFiles.length > 0) {
      return renderFileField(fieldFiles)
    }

    switch (field.type) {
      case 'checkbox':
        return renderCheckboxValue(field)
      case 'rating':
        return renderRatingValue(field)
      case 'slider':
        return renderSliderValue(field)
      case 'dropdown':
        return renderDropdownValue(field)
      case 'choice':
        return renderChoiceValue(field)
      case 'date':
        return renderDateValue(field)
      case 'duration':
        return renderDurationValue(field)
      case 'location':
        return renderLocationValue(field)
      case 'array':
        return renderArrayValue(field)
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
      default:
        return renderTextValue(field)
    }
  }

  /**
   * Renders file-based field content (images or file names).
   */
  function renderFileField(fieldFiles) {
    const fileItems = fieldFiles
      .map((file) => {
        if (isImage(file.fileName)) {
          if (file.thumbnail) {
            const mimeType = getMimeType(file.fileName)
            return `<img class="field-image" src="data:${mimeType};base64,${file.thumbnail}" alt="${file.fileName || 'Image'}" />`
          }
          if (file.localPath) {
            return `<img class="field-image" src="${file.localPath}" alt="${file.fileName || 'Image'}" />`
          }
        }
        return `<div class="field-file-item">\u{1F4CE} ${file.fileName || 'Unnamed file'}</div>`
      })
      .join('')
    return `<div class="field-files">${fileItems}</div>`
  }

  // ── Recursive section/field rendering ──

  /**
   * Checks whether a child item is a nested section (has children array) vs a field.
   */
  function isSection(child) {
    return child && Array.isArray(child.children)
  }

  /**
   * Renders a field as a label/value row. Array fields use a stacked layout
   * with the label above the table so wide tables aren't constrained.
   */
  function renderField(field) {
    const label = field.label || field.name
    const valueHtml = renderFieldValue(field)
    if (field.type === 'array') {
      return `
        <div class="field-array">
          <div class="field-array-label">${label}</div>
          ${valueHtml}
        </div>`
    }
    return `
        <div class="field">
          <span class="field-name">${label}</span>
          <span class="field-value">${valueHtml}</span>
        </div>`
  }

  /**
   * Renders children recursively. Nested sections get h3, fields get label/value rows.
   */
  function renderChildren(children) {
    return (children || [])
      .map((child) => {
        if (isSection(child)) {
          const titleHtml = child.title
            ? `<div class="subsection"><h3>${child.title}</h3></div>`
            : ''
          return `${titleHtml}${renderChildren(child.children)}`
        }
        return renderField(child)
      })
      .join('')
  }

  /**
   * Renders a top-level section (step) with h2 title and recursive children.
   */
  function renderSection(section) {
    return `
      <div class="section">
        <h2>${section.title || ''}</h2>
        ${renderChildren(section.children)}
      </div>`
  }

  // ── Main ──

  const sections = (data?.sections || []).map(renderSection).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 60px 80px;
      background-color: white;
      color: #333;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      margin-bottom: 32px;
      border-bottom: 2px solid #000;
    }
    .header-content {
      flex: 1;
    }
    .logo {
      height: 28px;
      margin-left: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
      color: #000;
    }
    .description {
      font-size: 14px;
      color: #666;
      margin: 6px 0 0 0;
    }
    .submitted-at {
      font-size: 12px;
      color: #999;
      margin: 4px 0 0 0;
    }
    .section {
      margin-bottom: 32px;
    }
    h2 {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #ddd;
    }
    .subsection h3 {
      font-size: 13px;
      font-weight: 600;
      color: #666;
      margin: 16px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #f0f0f0;
    }
    .field {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .field:last-child {
      border-bottom: none;
    }
    .field-name {
      width: 180px;
      flex-shrink: 0;
      color: #666;
      font-size: 13px;
      align-self: flex-start;
    }
    .field-value {
      color: #333;
      font-size: 13px;
      flex: 1;
    }
    .null {
      color: #ccc;
      font-style: italic;
    }
    .field-image {
      max-width: 280px;
      max-height: 180px;
      border: 1px solid #eee;
      border-radius: 4px;
    }
    .field-files {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .field-file-item {
      color: #666;
      font-size: 12px;
      padding: 4px 0;
    }
    .rating-stars {
      font-size: 16px;
      letter-spacing: 2px;
    }
    .field-array {
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .field-array:last-child {
      border-bottom: none;
    }
    .field-array-label {
      color: #666;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .array-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .array-table th {
      background-color: #f8f8f8;
      border: 1px solid #e0e0e0;
      padding: 6px 10px;
      text-align: left;
      font-weight: 600;
      color: #555;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .array-table td {
      border: 1px solid #e0e0e0;
      padding: 6px 10px;
      color: #333;
    }
    .array-table tbody tr:nth-child(even) {
      background-color: #fafafa;
    }
    .array-card {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .array-card:last-child {
      margin-bottom: 0;
    }
    .array-card-title {
      background-color: #f8f8f8;
      border-bottom: 1px solid #e0e0e0;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #555;
    }
    .array-card-row {
      display: flex;
      padding: 4px 10px;
      border-bottom: 1px solid #f5f5f5;
      font-size: 12px;
    }
    .array-card-row:last-child {
      border-bottom: none;
    }
    .array-card-label {
      width: 140px;
      flex-shrink: 0;
      color: #666;
    }
    .array-card-value {
      color: #333;
      flex: 1;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <h1>${data?.title || 'Form'}</h1>
      ${data?.description ? `<p class="description">${data.description}</p>` : ''}
      ${data?.submittedAt ? `<p class="submitted-at">Submitted ${data.submittedAt}</p>` : ''}
    </div>
    <img class="logo" src="https://images.jigx.com/jigxforms/jigx-forms-horizontal-light.svg" alt="Jigx Forms" />
  </div>
  ${sections}
</body>
</html>`
}
