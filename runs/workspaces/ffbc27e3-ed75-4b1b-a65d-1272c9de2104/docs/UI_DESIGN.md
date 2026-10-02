# UI Design Document

## 1. Design Philosophy
Overall design approach: Modern, premium, and user-friendly. The UI should evoke a sense of sophistication and ease of use while providing a premium experience.

## 2. Design Tokens

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| --color-primary | #1A73E8 | Primary actions, CTAs |
| --color-secondary | #6C757D | Secondary elements |
| --color-background | #FFFFFF | Page backgrounds |
| --color-surface | #F9FAFB | Card/panel backgrounds |
| --color-text-primary | #111827 | Main text |
| --color-text-secondary | #4B5563 | Supporting text |
| --color-success | #28A745 | Success states |
| --color-warning | #FFC107 | Warning states |
| --color-error | #DC3545 | Error states |
| --color-border | #E2E8F0 | Borders and dividers |

### Typography Scale
| Token | Font Family | Size | Weight | Line Height | Usage |
|-------|------------|------|--------|-------------|-------|
| --font-heading-1 | Inter, Bold | 32px | 700 | 1.2 | Page titles |
| --font-heading-2 | Inter, SemiBold | 24px | 600 | 1.3 | Section headers |
| --font-body | Inter, Regular | 16px | 400 | 1.5 | Body text |
| --font-small | Inter, Medium | 14px | 500 | 1.4 | Captions |
| --font-caption | Inter, Bold | 12px | 700 | 1.3 | Labels |

### Spacing System
| Token | Value | Usage |
|-------|-------|-------|
| --space-xs | 4px | Tight spacing |
| --space-sm | 8px | Element padding |
| --space-md | 16px | Section padding |
| --space-lg | 24px | Card padding |
| --space-xl | 32px | Section margins |
| --space-2xl | 48px | Page margins |

## 3. Component Hierarchy
```mermaid
graph TD
    [App] --> [Layout]
    [Layout] --> [Header]
    [Layout] --> [Sidebar]
    [Layout] --> [Main Content]
    [Main Content] --> [Income/Spending Form]
    [Main Content] --> [Transaction List]
    [Main Content] --> [Budget Chart]
    [Main Content] --> [Expense Prediction Card]
```

## 4. Page/Screen Inventory

### Home Screen
- **Purpose:** Overview of income, spending, and budget status.
- **Components Used:** Income/Spending Form, Transaction List, Budget Chart, Expense Prediction Card.
- **Layout:** Grid layout with a sidebar for navigation.
- **Key Interactions:** Hover over transactions to see details, click on budget categories to edit.

### Income Screen
- **Purpose:** Record income sources and amounts.
- **Components Used:** Income/Spending Form, Transaction List.
- **Layout:** Single column form layout.
- **Key Interactions:** Add new income source, edit existing entries.

### Spending Screen
- **Purpose:** Record spending transactions.
- **Components Used:** Income/Spending Form, Transaction List.
- **Layout:** Single column form layout.
- **Key Interactions:** Add new expense, categorize expenses.

### Budget Screen
- **Purpose:** Set and manage monthly budgets.
- **Components Used:** Budget Chart, Editable budget categories.
- **Layout:** Grid layout with a sidebar for navigation.
- **Key Interactions:** Edit budget amounts, add new categories.

### Charts Screen
- **Purpose:** Visualize spending trends and budget adherence.
- **Components Used:** Line charts, pie charts.
- **Layout:** Single column chart display.
- **Key Interactions:** Zoom in/out on charts, hover to see data points.

## 5. Responsive Breakpoints
| Breakpoint | Width | Layout Changes |
|-----------|-------|---------------|
| Mobile | < 768px | Single column layout, collapsed sidebar |
| Tablet | 768-1024px | Two column layout, side navigation |
| Desktop | > 1024px | Full layout with sidebar |

## 6. Animation & Micro-Interactions
| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Button | Hover | Scale 1.02, shadow lift | 200ms | ease-out |
| Card | Enter viewport | Fade up + slide | 300ms | ease-out |
| Modal | Open | Fade + scale from 0.95 | 250ms | ease-out |
| Page transition | Route change | Fade | 200ms | ease-in-out |

## 7. Navigation Flow
```mermaid
flowchart TD
    [Home] --> [Income]
    [Home] --> [Spending]
    [Home] --> [Budget]
    [Home] --> [Charts]
```

## 8. Accessibility (WCAG 2.1 AA)
- Color contrast ratios: Minimum 4.5:1 for text.
- Keyboard navigation patterns: Tab to navigate through elements, use arrow keys in form fields.
- Screen reader considerations: Proper ARIA labels and roles for interactive elements.
- Focus management strategy: Clear focus indicators on active elements.
- ARIA labels for interactive elements: Ensure all buttons, inputs, and links have appropriate ARIA labels.